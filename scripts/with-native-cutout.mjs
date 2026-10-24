import { spawn, spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkCutoutHealth } from "./check-cutout-health.mjs";
import { inspectCutoutConfiguration } from "./project-environment.mjs";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Python needs only OS/runtime settings and its own token, never database/payment secrets.
export function cutoutEnvironment(root, source = process.env, { setup = false } = {}) {
  const names = new Set(["path", "systemroot", "windir", "comspec", "pathext", "temp", "tmp", "tmpdir", "home", "userprofile", "localappdata", "appdata", "programfiles", "programfiles(x86)", "programw6432", "allusersprofile", "programdata", "processor_architecture", "processor_architew6432", "number_of_processors", "lang", "lc_all", "ssl_cert_file", "requests_ca_bundle", "https_proxy", "http_proxy", "no_proxy"]);
  const env = Object.fromEntries(Object.entries(source).filter(([name]) => names.has(name.toLowerCase())));
  const cache = path.join(root, ".cache", "eloria-cutout");
  Object.assign(env, {
    PYTHONUTF8: "1", PYTHONNOUSERSITE: "1", PYTHONDONTWRITEBYTECODE: "1",
    OMP_NUM_THREADS: "2", U2NET_HOME: cache, NUMBA_CACHE_DIR: path.join(cache, "numba"),
    PIP_DISABLE_PIP_VERSION_CHECK: "1",
  });
  if (!setup) env.ELORIA_CUTOUT_TOKEN = source.ELORIA_CUTOUT_TOKEN;
  return env;
}

function launch(command, args, options) {
  const child = spawn(command, args, { ...options, shell: false });
  child.stdin?.on("error", () => {}); // Parent may close its pipe after the worker has exited.
  child.done = new Promise(resolve => {
    child.once("error", () => resolve(1));
    child.once("close", code => resolve(code ?? 1));
  });
  return child;
}

async function stopOwnedProcess(child, graceful = false) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (graceful) child.stdin?.end();
  else if (process.platform !== "win32") child.kill("SIGTERM");
  if (await Promise.race([child.done.then(() => true), sleep(graceful ? 3000 : 250).then(() => false)])) return;
  if (process.platform === "win32") {
    // The PID is from our own spawn, never a port lookup or a persisted PID file.
    spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", timeout: 5000, windowsHide: true });
  } else child.kill("SIGKILL");
  await child.done;
}

async function portIsOccupied() {
  return new Promise(resolve => {
    const socket = createConnection({ host: "127.0.0.1", port: 8765 });
    const finish = occupied => { socket.destroy(); resolve(occupied); };
    socket.setTimeout(1000, () => finish(true));
    socket.once("connect", () => finish(true));
    socket.once("error", error => finish(error.code !== "ECONNREFUSED"));
  });
}

async function prepareWindows(root, env, signal) {
  if (process.platform !== "win32") throw new Error("This native installer is for Windows. Use the existing service on other hosts.");
  const setup = launch("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "scripts", "setup-native-cutout.ps1"), "-ProjectRoot", root], {
    cwd: root, env: cutoutEnvironment(root, env, { setup: true }), stdio: "inherit",
  });
  const stop = () => { void stopOwnedProcess(setup); };
  signal?.addEventListener("abort", stop, { once: true });
  try {
    if (signal?.aborted) stop();
    if (await setup.done !== 0) throw new Error("Native background-removal setup stopped. See the error above; rerun the same command to continue.");
  } finally { signal?.removeEventListener("abort", stop); }
}

/** Start only an owned loopback worker, supervise it with the application, then clean it up. */
export async function runWithNativeCutout({
  root = process.cwd(), command, args = [], env = process.env,
  prepare = prepareWindows, health = checkCutoutHealth, occupied = portIsOccupied,
  workerCommand = path.join(root, ".venv-cutout", "Scripts", "python.exe"),
  workerArgs = [path.join(root, "services", "cutout", "worker.py"), "--bind", "127.0.0.1", "--port", "8765", "--watch-stdin"],
  startupTimeout = 30_000, log = console.log,
} = {}) {
  if (!command) throw new Error("A command to run with background removal is required.");
  const status = await health(env);
  if (status === 4) {
    const config = inspectCutoutConfiguration(env);
    throw new Error(`Cutout configuration: URL=${config.url}; TOKEN=${config.token}. Existing settings were preserved.`);
  }
  if (status === 3) throw new Error("The configured remote background remover is unavailable. Existing URL and token were preserved.");
  let worker;
  let application;
  let interrupted = false;
  const cancellation = new AbortController();
  const interrupt = () => {
    interrupted = true;
    cancellation.abort();
    void stopOwnedProcess(application);
    if (worker) worker.stdin?.end();
  };
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  try {
    if (status === 2) {
      if (await occupied()) throw new Error("Local port 8765 is already in use by a service that did not authenticate. Close that service before retrying; no process was stopped.");
      await prepare(root, env, cancellation.signal);
      if (interrupted) return 130;
      worker = launch(workerCommand, workerArgs, { cwd: root, env: cutoutEnvironment(root, env), stdio: ["pipe", "inherit", "inherit"], windowsHide: true });
      const deadline = Date.now() + startupTimeout;
      let ready = false;
      let workerClosed = false;
      void worker.done.then(() => { workerClosed = true; });
      while (Date.now() < deadline && !workerClosed && !interrupted) {
        if (await health(env) === 0 && !workerClosed) { ready = true; break; }
        await sleep(250);
      }
      if (interrupted) return 130;
      if (!ready || workerClosed) throw new Error("The native background remover did not become ready. See the worker error above.");
      log("Background removal is running locally with Python. Keep this window open while using Eloria.");
    }
    application = launch(command, args, { cwd: root, env, stdio: "inherit" });
    const result = await Promise.race([
      application.done.then(code => ({ code })),
      ...(worker ? [worker.done.then(() => ({ workerStopped: true }))] : []),
    ]);
    if (interrupted) return 130;
    if (result.workerStopped) throw new Error("The local background remover stopped unexpectedly. The paired application was stopped; rerun the launch command.");
    return result.code;
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
    await stopOwnedProcess(application);
    await stopOwnedProcess(worker, true);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  try { process.exitCode = await runWithNativeCutout({ command, args }); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

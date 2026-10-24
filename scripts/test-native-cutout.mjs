import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runWithNativeCutout, cutoutEnvironment } from "./with-native-cutout.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloria-native-tests-"));
const env = { ...process.env, ELORIA_CUTOUT_URL: "http://127.0.0.1:8765", ELORIA_CUTOUT_TOKEN: "test-native-secret-".repeat(3), DATABASE_URL: "test-only-never-send-to-worker" };
const worker = path.join(root, "worker.mjs");
fs.writeFileSync(worker, `
import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert/strict';
const [portFile, stoppedFile, mode] = process.argv.slice(2);
assert.equal(process.env.DATABASE_URL, undefined);
assert.equal(process.env.PYTHONPATH, undefined);
if (mode === 'fail') process.exit(2);
const server = http.createServer((req,res) => {
  if(req.headers.authorization !== 'Bearer ' + process.env.ELORIA_CUTOUT_TOKEN) {res.writeHead(401);res.end();return;}
  res.end('ready');
}).listen(0,'127.0.0.1',()=>fs.writeFileSync(portFile,String(server.address().port)));
process.stdin.resume(); process.stdin.on('end',()=>server.close(()=>{fs.writeFileSync(stoppedFile,'stopped');process.exit(0);}));
if (mode === 'crash') setTimeout(()=>process.exit(3),800);
`);
let fixture = 0;
function options(mode = "normal") {
  const id = ++fixture;
  const portFile = path.join(root, `port-${id}`);
  const stoppedFile = path.join(root, `stopped-${id}`);
  let prepared = 0;
  return {
    stoppedFile, prepared: () => prepared,
    run: {
      root, env, command: process.execPath, args: ["-e", "process.exit(0)"],
      workerCommand: process.execPath, workerArgs: [worker, portFile, stoppedFile, mode],
      startupTimeout: 2000, log: () => {}, occupied: async () => false,
      prepare: async () => { prepared += 1; },
      health: async () => {
        if (!fs.existsSync(portFile)) return 2;
        try {
          const response = await fetch('http://127.0.0.1:' + fs.readFileSync(portFile,'utf8'), {headers:{Authorization:'Bearer '+env.ELORIA_CUTOUT_TOKEN}, signal:AbortSignal.timeout(300)});
          return response.ok ? 0 : 2;
        } catch { return 2; }
      },
    },
  };
}
try {
  const privateEnv = cutoutEnvironment(root, { ...env, PYTHONPATH: "untrusted-imports", PIP_INDEX_URL: "https://secret@example.invalid" });
  assert.equal(privateEnv.ELORIA_CUTOUT_TOKEN, env.ELORIA_CUTOUT_TOKEN);
  for (const name of ["DATABASE_URL", "PYTHONPATH", "PIP_INDEX_URL", "ELORIA_CUTOUT_URL"]) assert.equal(privateEnv[name], undefined);
  assert.equal(cutoutEnvironment(root, env, { setup: true }).ELORIA_CUTOUT_TOKEN, undefined);
  const configBefore = JSON.stringify(env);
  fs.writeFileSync(path.join(root, ".env"), "PRESERVE=exactly\r\n");
  fs.writeFileSync(path.join(root, ".env.local"), "PRESERVE_LOCAL=exactly\n");
  const success = options();
  success.run.args = ["-e", "const a=require('node:assert/strict');a.equal(process.env.DATABASE_URL,'test-only-never-send-to-worker');a.equal(process.env.ELORIA_CUTOUT_TOKEN,'test-native-secret-'.repeat(3));"];
  assert.equal(await runWithNativeCutout(success.run), 0);
  assert.equal(success.prepared(), 1);
  assert.ok(fs.existsSync(success.stoppedFile), "Owned worker shuts down with its application");
  const failedApp = options();
  failedApp.run.args = ["-e", "process.exit(7)"];
  assert.equal(await runWithNativeCutout(failedApp.run), 7);
  assert.ok(fs.existsSync(failedApp.stoppedFile), "Application failure cleans up worker");
  const reuse = options();
  assert.equal(await runWithNativeCutout({ ...reuse.run, health: async () => 0 }), 0);
  assert.equal(reuse.prepared(), 0, "Existing healthy service is reused without installation");
  const busy = options();
  await assert.rejects(runWithNativeCutout({ ...busy.run, occupied: async () => true }), /already in use/);
  assert.equal(busy.prepared(), 0, "Occupied port is never replaced or killed");
  for (const [status, pattern] of [[3, /remote/], [4, /configuration/]]) {
    const blocked = options();
    await assert.rejects(runWithNativeCutout({ ...blocked.run, health: async () => status }), pattern);
    assert.equal(blocked.prepared(), 0);
  }
  await assert.rejects(runWithNativeCutout(options("fail").run), /did not become ready/);
  const crash = options("crash");
  crash.run.args = ["-e", "setInterval(()=>{},1000)"];
  await assert.rejects(runWithNativeCutout(crash.run), /stopped unexpectedly/);
  assert.equal(fs.readFileSync(path.join(root, ".env"), "utf8"), "PRESERVE=exactly\r\n");
  assert.equal(fs.readFileSync(path.join(root, ".env.local"), "utf8"), "PRESERVE_LOCAL=exactly\n");
  assert.ok(JSON.stringify(env) === configBefore, "No source environment mutation");
  console.log("PASS: native worker startup/auth/private env; healthy service reuse; occupied/remote/invalid guards; application and worker failures; shutdown; env files unchanged.");
} finally { fs.rmSync(root, { recursive: true, force: true }); }

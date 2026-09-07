import { spawnSync } from "node:child_process";

const maxAttempts = 3;

const networkPatterns = [
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /EAI_AGAIN/i,
  /ENETUNREACH/i,
  /ECONNREFUSED/i,
  /socket hang up/i,
  /audit endpoint returned an error/i,
  /network timeout/i,
  /request to .* failed/i,
];

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function runAudit() {
  if (process.platform === "win32") {
    return spawnSync(
      "cmd.exe",
      [
        "/d",
        "/s",
        "/c",
        "npm audit --omit=dev --audit-level=high",
      ],
      {
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        windowsHide: true,
      }
    );
  }

  return spawnSync(
    "npm",
    [
      "audit",
      "--omit=dev",
      "--audit-level=high",
    ],
    {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    }
  );
}

for (
  let attempt = 1;
  attempt <= maxAttempts;
  attempt++
) {
  console.log(
    `npm audit attempt ${attempt}/${maxAttempts}`
  );

  const result = runAudit();

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  if (stdout) {
    process.stdout.write(stdout);
  }

  if (stderr) {
    process.stderr.write(stderr);
  }

  if (result.error) {
    console.error(result.error);
  }

  const code =
    typeof result.status === "number"
      ? result.status
      : 1;

  if (code === 0) {
    console.log(
      "PASS  Dependency security audit"
    );

    process.exit(0);
  }

  const combined = [
    stdout,
    stderr,
    result.error?.message ?? "",
  ].join("\n");

  const isNetworkFailure =
    networkPatterns.some(pattern =>
      pattern.test(combined)
    );

  if (!isNetworkFailure) {
    console.error(
      "FAIL  npm audit returned a non-network failure."
    );

    console.error(
      "Retry disabled because this may be a real security finding."
    );

    process.exit(code);
  }

  if (attempt === maxAttempts) {
    console.error(
      "FAIL  npm audit network failure persisted after 3 attempts."
    );

    process.exit(code);
  }

  const delayMs = attempt * 4000;

  console.warn(
    `Transient npm registry error. Retrying in ${delayMs / 1000}s...`
  );

  await sleep(delayMs);
}

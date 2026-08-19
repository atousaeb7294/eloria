import {
  spawnSync,
} from "node:child_process";

import {
  resolve,
} from "node:path";

const node =
  process.execPath;

const tsxCli =
  resolve(
    "node_modules/tsx/dist/cli.mjs",
  );

const playwrightCli =
  resolve(
    "node_modules/@playwright/test/cli.js",
  );

const cleanupScript =
  resolve(
    "scripts/cleanup-e2e-data.ts",
  );

function run(
  label,
  args,
) {
  console.log(
    `\n=== ${label} ===`,
  );

  const result =
    spawnSync(
      node,
      args,
      {
        stdio:
          "inherit",

        env:
          process.env,
      },
    );

  if (
    result.error
  ) {
    console.error(
      `${label} process error:`,
      result.error,
    );

    return 1;
  }

  return (
    result.status ??
    1
  );
}

const preCleanup =
  run(
    "E2E pre-cleanup",
    [
      tsxCli,
      cleanupScript,
    ],
  );

if (
  preCleanup !==
  0
) {
  process.exitCode =
    preCleanup;
} else {
  const testCode =
    run(
      "Playwright",
      [
        playwrightCli,
        "test",
      ],
    );

  const postCleanup =
    run(
      "E2E post-cleanup",
      [
        tsxCli,
        cleanupScript,
      ],
    );

  process.exitCode =
    testCode !== 0
      ? testCode
      : postCleanup;
}

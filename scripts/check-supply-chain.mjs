import fs from "node:fs";

const errors = [];

const ci =
  fs.readFileSync(
    ".github/workflows/ci.yml",
    "utf8"
  );

for (const line of ci.split("\n")) {
  const text = line.trim();

  if (!text.startsWith("uses: ")) {
    continue;
  }

  const spec =
    text
      .slice(6)
      .split(" ")[0];

  if (spec.startsWith("./")) {
    continue;
  }

  const at =
    spec.lastIndexOf("@");

  if (at < 1) {
    errors.push(
      "Invalid action reference: " + spec
    );
    continue;
  }

  const ref =
    spec.slice(at + 1);

  const isHex =
    ref.length === 40 &&
    [...ref].every(
      character =>
        "0123456789abcdef".includes(
          character.toLowerCase()
        )
    );

  if (!isHex) {
    errors.push(
      "Action not SHA-pinned: " + spec
    );
  }
}

if (
  ci.includes(
    "runs-on: ubuntu-latest"
  )
) {
  errors.push(
    "ubuntu-latest must not be used"
  );
}

if (
  !ci.includes(
    "runs-on: ubuntu-24.04"
  )
) {
  errors.push(
    "ubuntu-24.04 is missing"
  );
}

if (
  !ci.includes(
    "persist-credentials: false"
  )
) {
  errors.push(
    "Checkout credentials are persisted"
  );
}

if (
  ci.includes(
    "pull_request_target:"
  )
) {
  errors.push(
    "pull_request_target is prohibited"
  );
}

if (
  !ci.includes(
    "npm ci --no-audit --no-fund"
  )
) {
  errors.push(
    "npm ci lockfile install missing"
  );
}

const dependabot =
  fs.readFileSync(
    ".github/dependabot.yml",
    "utf8"
  );

if (
  !dependabot.includes(
    'package-ecosystem: "npm"'
  )
) {
  errors.push(
    "Dependabot npm missing"
  );
}

if (
  !dependabot.includes(
    'package-ecosystem: "github-actions"'
  )
) {
  errors.push(
    "Dependabot GitHub Actions missing"
  );
}

const pkg =
  JSON.parse(
    fs.readFileSync(
      "package.json",
      "utf8"
    )
  );

if (
  pkg.scripts["test:supply-chain"] !==
  "node scripts/check-supply-chain.mjs"
) {
  errors.push(
    "test:supply-chain script missing"
  );
}

for (
  const name of
  [
    "verify:ci",
    "verify:full"
  ]
) {
  if (
    !pkg.scripts[name].includes(
      "npm run test:supply-chain"
    )
  ) {
    errors.push(
      name +
      " missing supply-chain test"
    );
  }
}

if (errors.length) {

  for (const error of errors) {
    console.error(
      "FAIL  " + error
    );
  }

  process.exitCode = 1;

} else {

  console.log(
    "PASS  GitHub Actions pinned to SHA"
  );

  console.log(
    "PASS  Checkout credentials disabled"
  );

  console.log(
    "PASS  Ubuntu runner pinned"
  );

  console.log(
    "PASS  Dependabot configured"
  );

  console.log(
    "PASS  npm ci lockfile contract"
  );

  console.log("");

  console.log(
    "PASS  ELORIA CI supply-chain policy"
  );
}

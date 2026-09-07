import { readFile, stat } from "node:fs/promises";

const checks = [];

async function expectFileContains(file, fragments) {
  const source = await readFile(file, "utf8");
  for (const fragment of fragments) {
    checks.push({
      name: `${file} contains ${fragment}`,
      ok: source.includes(fragment),
    });
  }
}

await expectFileContains("src/components/section-background.tsx", [
  "<picture",
  'media="(min-width: 768px)"',
  "getImageProps",
]);
await expectFileContains("src/components/home-header-controller.tsx", [
  "<FloatingLogo compact />",
]);
await expectFileContains("src/components/deferred-site-tools.tsx", [
  "requestIdleCallback",
  'ssr: false',
]);

const videoBudgets = [
  ["public/videos/eloria-opening-v4.mp4", 4.5 * 1024 * 1024],
  ["public/videos/eloria-opening-mobile-v1.mp4", 2.1 * 1024 * 1024],
];

for (const [file, budget] of videoBudgets) {
  const info = await stat(file);
  checks.push({ name: `${file} is within its byte budget`, ok: info.size <= budget });
}

const failures = checks.filter(check => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
}

if (failures.length > 0) process.exit(1);

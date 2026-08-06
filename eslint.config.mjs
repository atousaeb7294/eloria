import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    ".eloria-backups/**",
    ".github/.github/**",
    "docs/archive/**",
    "src/generated/prisma/**",
    "next-env.d.ts",
    "**/*.tsbuildinfo",
  ]),
  ...nextVitals,
  ...nextTs,
]);

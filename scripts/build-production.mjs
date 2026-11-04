import { randomUUID } from "node:crypto";
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ensureModel } from '../services/cutout/model.mjs';
const root = realpathSync.native(process.cwd());
await ensureModel(root);
const cli = realpathSync.native(resolve(root, 'node_modules/next/dist/bin/next'));
// All replicas built from this artifact share one version for navigation and assets.
const deploymentId = process.env.ELORIA_DEPLOYMENT_ID || process.env.GITHUB_SHA || process.env.NEXT_DEPLOYMENT_ID || randomUUID();
const result = spawnSync(process.execPath, [cli, 'build', root, '--webpack'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, ELORIA_DEPLOYMENT_ID: deploymentId, INIT_CWD: root, PWD: root }
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);

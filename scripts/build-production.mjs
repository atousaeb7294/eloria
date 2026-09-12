import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = realpathSync.native(process.cwd());
const cli = realpathSync.native(resolve(root, 'node_modules/next/dist/bin/next'));
const result = spawnSync(process.execPath, [cli, 'build', root, '--webpack'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, INIT_CWD: root, PWD: root }
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);

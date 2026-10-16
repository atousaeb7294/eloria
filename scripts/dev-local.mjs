import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

/** Match the production build's canonical paths, including Windows drive case
 * and junctions. Resolve Next directly rather than relying on a .bin shim. */
export function devInvocation(project, forwarded = [], executable = process.execPath, environment = process.env) {
  const root = realpathSync.native(project);
  const cli = realpathSync.native(resolve(root, 'node_modules/next/dist/bin/next'));
  const bundler = forwarded.some(value => ['--webpack', '--turbopack', '--turbo'].includes(value)) ? [] : ['--webpack'];
  return {
    command: executable,
    args: [cli, 'dev', root, ...bundler, ...forwarded],
    options: { cwd: root, stdio: 'inherit', env: { ...environment, INIT_CWD: root, PWD: root } },
  };
}

if (process.argv[1] && realpathSync.native(process.argv[1]) === realpathSync.native(fileURLToPath(import.meta.url))) {
  const invocation = devInvocation(process.cwd(), process.argv.slice(2));
  const result = spawnSync(invocation.command, invocation.args, invocation.options);
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

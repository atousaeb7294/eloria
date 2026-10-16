import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { devInvocation } from './dev-local.mjs';

const fixture = mkdtempSync(join(tmpdir(), 'eloria-dev-'));
try {
  const project = join(fixture, 'project');
  const cli = join(project, 'node_modules/next/dist/bin/next');
  mkdirSync(resolve(cli, '..'), { recursive: true });
  writeFileSync(cli, '// fixture');
  const environment = { PATH: 'kept', INIT_CWD: 'noncanonical', PWD: 'noncanonical', TEST_ONLY: 'kept' };
  const invocation = devInvocation(join(project, '..', 'project', '.'), ['--port', '3010'], process.execPath, environment);
  assert.equal(invocation.options.cwd, realpathSync.native(project));
  assert.equal(invocation.command, process.execPath);
  assert.deepEqual(invocation.args, [realpathSync.native(cli), 'dev', realpathSync.native(project), '--webpack', '--port', '3010']);
  assert.equal(invocation.options.env.INIT_CWD, realpathSync.native(project));
  assert.equal(invocation.options.env.PWD, realpathSync.native(project));
  assert.equal(invocation.options.env.TEST_ONLY, 'kept');
  assert.equal(environment.INIT_CWD, 'noncanonical', 'Do not mutate the parent environment');
  assert.equal(devInvocation(project, ['--turbopack']).args.includes('--webpack'), false);
  assert.equal(devInvocation(project, ['--webpack']).args.filter(value => value === '--webpack').length, 1);
  if (process.platform === 'win32') {
    assert.equal(devInvocation(project.toLowerCase()).options.cwd, devInvocation(project.toUpperCase()).options.cwd);
  }
  console.log('PASS: canonical project and Next paths; current Node executable; no .bin dependency; argument forwarding; environment preservation; explicit bundler selection.');
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

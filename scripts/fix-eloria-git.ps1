#requires -Version 5.1
[CmdletBinding()]
param([string]$ProjectPath = 'C:\eloria')

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$oldPath = $env:PATH
$backup = $null
$committed = $false
$pushed = $false
$locationPushed = $false

function Assert-LastExit([string]$Step) {
    if ($LASTEXITCODE -ne 0) { throw ($Step + ' failed (exit ' + $LASTEXITCODE + '). Nothing will be pushed.') }
}
function Write-Source([string]$RelativePath, [string]$Content) {
    $destination = Join-Path $ProjectPath $RelativePath
    New-Item -ItemType Directory -Force -Path (Split-Path $destination -Parent) | Out-Null
    [IO.File]::WriteAllText($destination, ($Content.TrimEnd() + "`n"), (New-Object Text.UTF8Encoding($false)))
}
function Get-EnvSnapshot {
    $result = @{}
    foreach ($file in @(Get-ChildItem -LiteralPath $ProjectPath -Force -File | Where-Object { $_.Name -like '.env*' })) {
        $result[$file.Name] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    }
    return ,$result
}
function Assert-EnvUnchanged {
    $after = Get-EnvSnapshot
    if ($after.Count -ne $envBefore.Count) { throw 'The env file set changed. Push was stopped.' }
    foreach ($key in $envBefore.Keys) {
        if (!$after.ContainsKey($key) -or $after[$key] -ne $envBefore[$key]) { throw 'An env file changed. Push was stopped.' }
    }
}

try {
    Get-Command git.exe -ErrorAction Stop | Out-Null
    $ProjectPath = (Get-Item -LiteralPath $ProjectPath -ErrorAction Stop).FullName
    foreach ($required in @('package.json', 'package-lock.json', 'scripts/test-palace-recovery.ts', 'src/components/home-palace/palace-entry.ts', 'src/components/home-palace/palace-reference-assets.json')) {
        if (!(Test-Path -LiteralPath (Join-Path $ProjectPath $required) -PathType Leaf)) { throw ('The installed treasury source is missing: ' + $required) }
    }
    $gitRoot = & git -C $ProjectPath rev-parse --show-toplevel
    Assert-LastExit 'Git repository check'
    if ([IO.Path]::GetFullPath($gitRoot.Trim()) -ne [IO.Path]::GetFullPath($ProjectPath)) { throw 'ProjectPath must be the Git repository root.' }
    & git -C $ProjectPath diff --cached --quiet
    if ($LASTEXITCODE -ne 0) { throw 'The Git index already has staged changes. Commit or unstage them first, then run this script again.' }
    $authorName = & git -C $ProjectPath config user.name
    $authorEmail = & git -C $ProjectPath config user.email
    if (!$authorName -or !$authorEmail) { throw 'Set your own git user.name and user.email, then run this script again.' }
    $fetchUrls = @(& git -C $ProjectPath remote get-url --all origin)
    Assert-LastExit 'Git origin check'
    $pushUrls = @(& git -C $ProjectPath remote get-url --push --all origin)
    Assert-LastExit 'Git push origin check'
    $expectedRemote = '^(https://github\.com/atousaeb7294/eloria(?:\.git)?/?|git@github\.com:atousaeb7294/eloria(?:\.git)?|ssh://git@github\.com/atousaeb7294/eloria(?:\.git)?)$'
    if ($fetchUrls.Count -ne 1 -or $pushUrls.Count -ne 1 -or $fetchUrls[0] -notmatch $expectedRemote -or $pushUrls[0] -notmatch $expectedRemote) {
        throw 'Origin must point only to atousaeb7294/eloria. No remote settings were changed.'
    }

    $nodeExecutable = $null
    $toolsRoot = Join-Path $env:LOCALAPPDATA 'EloriaTools'
    $candidates = @(Get-ChildItem -Path (Join-Path $toolsRoot 'node-v22*-win-*\node.exe') -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
    $installedNode = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($null -ne $installedNode) { $candidates += Get-Item -LiteralPath $installedNode.Source }
    foreach ($candidate in $candidates) {
        $version = & $candidate.FullName --version
        if ($LASTEXITCODE -eq 0 -and $version -match '^v22\.') { $nodeExecutable = $candidate.FullName; break }
    }
    if (!$nodeExecutable) { throw 'Node 22 was not found. The portable Node installed by the treasury installer is required.' }
    $nodeDirectory = Split-Path $nodeExecutable -Parent
    $npmCli = Join-Path $nodeDirectory 'node_modules/npm/bin/npm-cli.js'
    if (!(Test-Path -LiteralPath $npmCli -PathType Leaf)) { throw 'npm is missing from the selected Node 22 runtime.' }
    $env:PATH = $nodeDirectory + ';' + $oldPath
    $envBefore = Get-EnvSnapshot
    $lockHash = (Get-FileHash -LiteralPath (Join-Path $ProjectPath 'package-lock.json') -Algorithm SHA256).Hash
    $stamp = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 6)
    $backup = Join-Path $ProjectPath ('.eloria-backups/git-ready-' + $stamp)
    New-Item -ItemType Directory -Force -Path $backup | Out-Null
    & git -C $ProjectPath check-ignore --quiet -- '.eloria-backups/probe'
    Assert-LastExit 'Backup exclusion check'
    $sourceFiles = @('package.json', 'scripts/dev-local.mjs', 'scripts/test-dev-local.mjs', 'scripts/test-treasury-browser.mjs', 'scripts/fix-eloria-git.ps1')
    foreach ($relative in $sourceFiles) {
        $existing = Join-Path $ProjectPath $relative
        if (Test-Path -LiteralPath $existing -PathType Leaf) {
            $saved = Join-Path $backup ('source/' + $relative)
            New-Item -ItemType Directory -Force -Path (Split-Path $saved -Parent) | Out-Null
            Copy-Item -LiteralPath $existing -Destination $saved
        }
    }
    Write-Host ('Backup: ' + $backup)
    Write-Host 'Refreshing dependencies and Next caches. Existing dev servers must be stopped.'
    foreach ($directory in @('node_modules', '.next')) {
        $existing = Join-Path $ProjectPath $directory
        if (Test-Path -LiteralPath $existing) {
            Move-Item -LiteralPath $existing -Destination (Join-Path $backup $directory) -ErrorAction Stop
        }
    }

    $source0 = @'
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
'@
    Write-Source 'scripts/dev-local.mjs' $source0

    $source1 = @'
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
'@
    Write-Source 'scripts/test-dev-local.mjs' $source1

    $source2 = @'
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const root = realpathSync.native(process.cwd());
const output = resolve(process.argv[2] || '.eloria-backups/router-browser-check');
const port = Number(process.argv[3] || 4021);
assert.ok(Number.isInteger(port) && port > 1023 && port < 65536);
const origin = `http://127.0.0.1:${port}`;
const introConfig = readFileSync(resolve(root, 'src/components/intro/eloria-intro-config.ts'), 'utf8');
const introKey = introConfig.match(/INTRO_SESSION_KEY\s*=\s*["']([^"']+)["']/)?.[1];
assert.ok(introKey, 'Could not read the existing intro-complete session key');
mkdirSync(output, { recursive: true });
let existing;
try { existing = await fetch(`${origin}/api/health?mode=live`, { signal: AbortSignal.timeout(800) }); } catch {}
if (existing) throw new Error(`Port ${port} is already in use; stop that preview or choose another port.`);

const log = createWriteStream(resolve(output, 'dev-server.log'));
const child = spawn(process.execPath, [resolve(root, 'scripts/dev-local.mjs'), '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'development' },
});
child.stdout.pipe(log, { end: false });
child.stderr.pipe(log, { end: false });
let startupError;
child.on('error', error => { startupError = error; });
let browser;
try {
  console.log(`[browser check] Starting a fresh dev server on ${origin}; diagnostics: ${output}`);
  const deadline = Date.now() + 180000;
  let ready = false;
  while (Date.now() < deadline) {
    if (startupError) throw startupError;
    if (child.exitCode !== null) throw new Error(`Dev server exited (${child.exitCode}). See dev-server.log.`);
    try {
      const response = await fetch(`${origin}/api/health?mode=live`, { signal: AbortSignal.timeout(1200) });
      if (response.ok) { ready = true; break; }
    } catch {}
    await delay(700);
  }
  if (!ready) throw new Error('Dev server did not become ready. See dev-server.log.');
  const attempts = [];
  for (const channel of ['msedge', 'chrome', undefined]) {
    try { browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) }); break; }
    catch (error) { attempts.push(`${channel || 'bundled chromium'}: ${String(error.message).split('\n')[0]}`); }
  }
  if (!browser) throw new Error(`No browser could launch. ${attempts.join('; ')}`);
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    try {
      await context.addInitScript(key => { try { sessionStorage.setItem(key, '1'); } catch {} }, introKey);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && /expected layout router to be mounted/i.test(message.text())) errors.push(message.text());
      });
      await page.goto(`${origin}/fa#hero`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      const palace = page.locator('#eloria-home-palace');
      await palace.waitFor({ state: 'visible', timeout: 45000 });
      await palace.scrollIntoViewIfNeeded();
      // Decode below-fold artwork for the screenshot without changing source loading policy.
      await palace.locator('img').evaluateAll(images => {
        for (const img of images) if (img.getBoundingClientRect().width > 0 && img.getBoundingClientRect().height > 0) img.loading = 'eager';
      });
      await page.waitForFunction(() => [...document.querySelectorAll('#eloria-home-palace img')]
        .filter(img => img.getBoundingClientRect().width > 0 && img.getBoundingClientRect().height > 0)
        .every(img => img.complete && img.naturalWidth > 0), null, { timeout: 20000 });
      await delay(800);
      assert.deepEqual(errors, [], `Unhandled home-page errors at ${width}px: ${errors.join('; ')}`);
      assert.equal(await palace.locator('.ep-enter').count(), 3);
      assert.equal(await palace.locator('.ep-stage').innerText().then(text => text.includes('invariant expected layout router')), false);
      await palace.screenshot({ path: resolve(output, `home-${width}.png`), animations: 'disabled' });
      const firstEntry = palace.locator('.ep-enter').first();
      await firstEntry.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL(url => url.pathname === '/fa/collections/gold', { timeout: 90000 }),
        firstEntry.click({ timeout: 15000 }),
      ]);
      await delay(800);
      assert.deepEqual(errors, [], `Unhandled route errors at ${width}px: ${errors.join('; ')}`);
      await page.locator('h1').first().waitFor({ state: 'visible', timeout: 30000 });
      assert.equal(/expected layout router to be mounted/i.test(await page.locator('body').innerText()), false);
      console.log(`[browser check] PASS: ${width}px home hydration, reference artwork and native gold-treasury navigation.`);
    } finally { await context.close(); }
  }
  console.log(`[browser check] PASS: no layout-router invariant in the tested paths. Screenshots: ${output}`);
} finally {
  try { await browser?.close(); }
  finally {
    if (child.exitCode === null && child.pid) {
      if (process.platform === 'win32') {
        // Stop only this check's server tree, never other Node processes.
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
        await new Promise(resolveExit => { killer.once('exit', resolveExit); killer.once('error', resolveExit); });
      } else { child.kill('SIGTERM'); }
    }
    child.stdout.unpipe(log);
    child.stderr.unpipe(log);
    await new Promise(resolveEnd => log.end(resolveEnd));
  }
}
'@
    Write-Source 'scripts/test-treasury-browser.mjs' $source2

    $packageUpdate = @'
const fs = require('node:fs');
const file = process.argv[2];
const original = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const value = JSON.parse(original);
value.scripts ||= {};
value.scripts.dev = 'node scripts/dev-local.mjs';
value.scripts['test:dev-local'] = 'node scripts/test-dev-local.mjs';
value.scripts['test:treasury-browser'] = 'node scripts/test-treasury-browser.mjs';
fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
'@
    $packageUpdatePath = Join-Path $backup 'update-package.cjs'
    [IO.File]::WriteAllText($packageUpdatePath, $packageUpdate, (New-Object Text.UTF8Encoding($false)))
    & $nodeExecutable $packageUpdatePath (Join-Path $ProjectPath 'package.json')
    Assert-LastExit 'Package scripts update'
    $savedScript = Join-Path $ProjectPath 'scripts/fix-eloria-git.ps1'
    if ([IO.Path]::GetFullPath($PSCommandPath) -ne [IO.Path]::GetFullPath($savedScript)) {
        Copy-Item -LiteralPath $PSCommandPath -Destination $savedScript -Force
    }

    Push-Location -LiteralPath $ProjectPath
    $locationPushed = $true
    & $nodeExecutable $npmCli ci '--include=dev' --no-audit --no-fund
    Assert-LastExit 'Clean dependency installation'
    & $nodeExecutable $npmCli run prebuild
    Assert-LastExit 'Prisma client generation'
    & $nodeExecutable (Join-Path $ProjectPath 'node_modules/next/dist/bin/next') typegen $ProjectPath
    Assert-LastExit 'Next route type generation'
    & $nodeExecutable $npmCli run typecheck
    Assert-LastExit 'TypeScript check'
    & $nodeExecutable 'scripts/test-dev-local.mjs'
    Assert-LastExit 'Canonical Windows dev launcher tests'
    & $nodeExecutable --import tsx 'scripts/test-palace-recovery.ts'
    Assert-LastExit 'Treasury component, motion and image tests'
    & $nodeExecutable 'scripts/test-source-integrity.mjs'
    Assert-LastExit 'Source integrity check'
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
    try { $listener.Start(); $port = $listener.LocalEndpoint.Port } finally { $listener.Stop() }
    & $nodeExecutable 'scripts/test-treasury-browser.mjs' (Join-Path $backup 'browser-check') ([string]$port)
    Assert-LastExit 'Mobile and desktop browser route check'
    & $nodeExecutable $npmCli run build
    Assert-LastExit 'Production build'
    Assert-EnvUnchanged
    if ((Get-FileHash -LiteralPath 'package-lock.json' -Algorithm SHA256).Hash -ne $lockHash) { throw 'The dependency lock changed. Push was stopped.' }
    & git diff --check
    Assert-LastExit 'Diff whitespace check'

    $originalFiles = @'
[
  "docs/palace-reference-delivery-fa.md",
  "docs/palace-reference-design.md",
  "public/images/palace/reference/ancient-337-b83b6d439c.webp",
  "public/images/palace/reference/brazier-180-5ec58d56bc.webp",
  "public/images/palace/reference/delbar-337-0b9b9335e4.webp",
  "public/images/palace/reference/featured-1126-09d1f38ca5.webp",
  "public/images/palace/reference/featured-900-7f0e7adf1a.webp",
  "public/images/palace/reference/gold-open-desktop-244-6a070ff3da.webp",
  "public/images/palace/reference/gold-open-mobile-360-3293417e63.webp",
  "public/images/palace/reference/gold-open-mobile-724-51a0d2a97d.webp",
  "public/images/palace/reference/gold-plinth-360-e976d95e4f.webp",
  "public/images/palace/reference/gold-plinth-724-6207d054c7.webp",
  "public/images/palace/reference/gold-reference-360-8f90a689c0.webp",
  "public/images/palace/reference/gold-reference-724-7a92d4b75a.webp",
  "public/images/palace/reference/midnight-337-8a2aa6c616.webp",
  "public/images/palace/reference/palace-1126-c7e31aa2e9.webp",
  "public/images/palace/reference/palace-640-7743e0e9e4.webp",
  "public/images/palace/reference/silver-moon-337-d01818a57e.webp",
  "public/images/palace/reference/silver-open-desktop-233-0198a715f2.webp",
  "public/images/palace/reference/silver-open-mobile-360-0d36ae4a72.webp",
  "public/images/palace/reference/silver-open-mobile-724-a219c83c75.webp",
  "public/images/palace/reference/silver-plinth-360-f2ad89c6fe.webp",
  "public/images/palace/reference/silver-plinth-724-71f61c017b.webp",
  "public/images/palace/reference/silver-reference-360-d475ca655e.webp",
  "public/images/palace/reference/silver-reference-724-8a8f202085.webp",
  "public/images/palace/reference/weave-open-desktop-244-d5a77a968b.webp",
  "public/images/palace/reference/weave-open-mobile-360-2a44255706.webp",
  "public/images/palace/reference/weave-open-mobile-724-f74d57f091.webp",
  "public/images/palace/reference/weave-plinth-360-2a18cfe3bc.webp",
  "public/images/palace/reference/weave-plinth-724-13d729d9d0.webp",
  "public/images/palace/reference/weave-reference-360-ff64eadf56.webp",
  "public/images/palace/reference/weave-reference-724-28b4cf4ecb.webp",
  "scripts/generate-palace-reference-assets.mjs",
  "scripts/test-palace-recovery.ts",
  "src/components/home-palace/index.tsx",
  "src/components/home-palace/palace-entry.ts",
  "src/components/home-palace/palace-reference-assets.json",
  "src/components/home-palace/palace.css",
  "src/components/treasury-transition.tsx"
]
'@ | ConvertFrom-Json
    $allowedPaths = @($originalFiles) + $sourceFiles
    foreach ($relative in $allowedPaths) {
        if (!(Test-Path -LiteralPath (Join-Path $ProjectPath $relative) -PathType Leaf)) { throw ('A required source file is missing: ' + $relative) }
    }
    & git add -- $allowedPaths
    Assert-LastExit 'Staging the treasury source'
    $staged = @(& git diff --cached --name-only)
    Assert-LastExit 'Staged source review'
    foreach ($relative in $staged) {
        if ($allowedPaths -notcontains $relative -or $relative -match '(^|/)\.env') { throw 'Unexpected staged path. Push was stopped.' }
    }
    if ($staged.Count -eq 0) {
        Write-Host 'All checks passed; there are no new treasury changes to commit or push.' -ForegroundColor Green
    } else {
        $branch = 'fix/eloria-treasuries-' + $stamp
        & git switch -c $branch
        Assert-LastExit 'Creating the review branch'
        & git commit -m 'Fix Windows Next launcher and update treasury reference scenes'
        Assert-LastExit 'Git commit'
        $committed = $true
        Assert-EnvUnchanged
        & git push -u origin $branch
        Assert-LastExit 'Git push'
        $pushed = $true
        Write-Host ('SUCCESS: checks and production build passed; pushed branch ' + $branch) -ForegroundColor Green
        Write-Host ('Review: https://github.com/atousaeb7294/eloria/compare/' + $branch + '?expand=1')
        Write-Host 'Env files are unchanged. No deployment or merge was performed.'
    }
} catch {
    Write-Host ('STOPPED: ' + $_.Exception.Message) -ForegroundColor Red
    if ($committed -and !$pushed) { Write-Host 'The validated commit is saved locally. After resolving the GitHub error, run: git push -u origin HEAD' }
    elseif (!$pushed) { Write-Host 'Nothing was pushed. Source and dependency backups, plus browser diagnostics, are retained.' }
    if ($backup) { Write-Host ('Backup: ' + $backup) }
    exit 1
} finally {
    if ($locationPushed) { Pop-Location }
    $env:PATH = $oldPath
}

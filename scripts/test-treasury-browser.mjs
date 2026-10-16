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

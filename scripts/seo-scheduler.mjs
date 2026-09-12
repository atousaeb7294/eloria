/** One bounded background request per process; database lease serializes replicas. */
export function startSeoScheduler({ port, env = process.env, fetcher = fetch, log = console }) {
  if (env.ELORIA_SEO_AUTOPILOT_ENABLED === 'false') return () => {};
  const secret = env.CRON_SECRET?.trim();
  if (!secret || secret.length < 48) {
    log.warn('[SEO] Scheduled repair is inactive: CRON_SECRET must contain at least 48 characters.');
    return () => {};
  }
  let stopped = false, busy = false, controller;
  const run = async () => {
    if (stopped || busy) return;
    busy = true; controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    try {
      const response = await fetcher(`http://127.0.0.1:${port}/api/cron/content-health`, {
        headers: { Authorization: `Bearer ${secret}` }, signal: controller.signal, cache: 'no-store'
      });
      log.log(`[SEO] Scheduled audit returned HTTP ${response.status}.`);
    } catch { if (!stopped) log.warn('[SEO] Scheduled audit unavailable; next run will retry.'); }
    finally { clearTimeout(timeout); busy = false; }
  };
  const first = setTimeout(() => void run(), 60000);
  const timer = setInterval(() => void run(), 30 * 60000);
  return () => { stopped = true; clearTimeout(first); clearInterval(timer); controller?.abort(); };
}

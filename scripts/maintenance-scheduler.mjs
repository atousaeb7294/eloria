/** Essential operational jobs; their database leases serialize replicas. */
export function startMaintenanceScheduler({ port, env = process.env, fetcher = fetch, log = console }) {
  if (env.ELORIA_MAINTENANCE_ENABLED === "false") return () => {};
  const secret = env.CRON_SECRET?.trim();
  if (!secret || secret.length < 48) {
    log.warn("[Maintenance] Inactive: configure CRON_SECRET.");
    return () => {};
  }
  const jobs = [
    { name: "expired-orders", period: 60000, timeout: 90000, due: 0 },
    { name: "security-alerts", period: 60000, timeout: 60000, due: 0 },
    { name: "data-retention", period: 86400000, timeout: 180000, due: 0 },
  ];
  let stopped = false, busy = false, controller;
  const tick = async () => {
    if (stopped || busy) return;
    busy = true;
    try {
      for (const job of jobs) {
        if (stopped) break;
        if (Date.now() < job.due) continue;
        controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), job.timeout);
        try {
          const response = await fetcher(`http://127.0.0.1:${port}/api/cron/${job.name}`, {
            headers: { Authorization: `Bearer ${secret}` }, signal: controller.signal,
            redirect: "error", cache: "no-store",
          });
          job.due = Date.now() + (response.ok ? job.period : 60000);
          log.log(`[Maintenance] ${job.name}: HTTP ${response.status}`);
        } catch {
          job.due = Date.now() + 60000;
          if (!stopped) log.warn(`[Maintenance] ${job.name} failed; retry scheduled.`);
        } finally { clearTimeout(timer); }
      }
    } finally { busy = false; }
  };
  const first = setTimeout(() => void tick(), 60000);
  const interval = setInterval(() => void tick(), 60000);
  return () => { stopped = true; clearTimeout(first); clearInterval(interval); controller?.abort(); };
}

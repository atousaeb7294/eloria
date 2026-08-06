const jobs = new Set(["expired-orders", "metal-prices"]);
const job = process.argv[2];

if (!jobs.has(job)) {
  console.error("Usage: node scripts/run-cron-once.mjs <expired-orders|metal-prices>");
  process.exit(2);
}

const baseUrl = (process.env.ELORIA_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "")
  .trim()
  .replace(/\/$/, "");
const secret = process.env.CRON_SECRET?.trim() || "";

if (!baseUrl || secret.length < 32) {
  console.error("ELORIA_INTERNAL_BASE_URL/NEXT_PUBLIC_SITE_URL and CRON_SECRET are required.");
  process.exit(2);
}

try {
  const response = await fetch(`${baseUrl}/api/cron/${job}`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.text();
  if (!response.ok && response.status !== 202) {
    console.error(`Cron ${job} failed with ${response.status}: ${body.slice(0, 500)}`);
    process.exit(1);
  }
  console.log(`Cron ${job} completed with ${response.status}.`);
} catch (error) {
  console.error(`Cron ${job} request failed.`, error);
  process.exit(1);
}

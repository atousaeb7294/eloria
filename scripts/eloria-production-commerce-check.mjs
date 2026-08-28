const base = (process.env.ELORIA_CHECK_BASE_URL || "https://eloriagallery.ir").replace(/\/+$/, "");

async function read(path) {
  const response = await fetch(`${base}${path}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); }
  catch { body = text.slice(0, 500); }
  return { status: response.status, ok: response.ok, body };
}

const health = await read("/api/health");
const metals = await read("/api/metal-prices");

console.log("\neloria production commerce check");
console.log("base:", base);
console.log("health:", JSON.stringify(health, null, 2));
console.log("metal-prices:", JSON.stringify(metals, null, 2));

const prices = Array.isArray(metals?.body?.prices) ? metals.body.prices : [];
const seeded = prices.filter((item) => String(item?.source || "").includes("TEST_SEED"));
const stale = prices.filter((item) => item?.isStale === true);

if (seeded.length) console.warn("\nwarning: production metal prices are still using test seed data.");
if (stale.length) console.warn("warning: one or more metal prices are stale.");
if (!prices.length) console.warn("warning: metal price api returned no price rows.");

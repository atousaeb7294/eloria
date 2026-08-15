import "dotenv/config";

const raw =
  process.env.ELORIA_RUNTIME_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!raw) {
  throw new Error("DATABASE_URL missing");
}

const u = new URL(raw);

console.log({
  host: u.hostname,
  port: u.port || "5432",
  database: u.pathname.slice(1),
  sslmode: u.searchParams.get("sslmode"),
  runtimeOverride: Boolean(process.env.ELORIA_RUNTIME_DATABASE_URL),
});

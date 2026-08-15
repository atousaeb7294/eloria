import "dotenv/config";

for (const name of [
  "DATABASE_URL",
  "DIRECT_URL",
  "ELORIA_RUNTIME_DATABASE_URL",
  "ELORIA_CHECKOUT_DATABASE_URL",
]) {
  const raw = process.env[name];

  if (!raw) {
    console.log(name, "=> NOT SET");
    continue;
  }

  try {
    const u = new URL(raw);

    console.log(name, "=>", {
      host: u.hostname,
      port: u.port || "5432",
      database: u.pathname.slice(1),
      sslmode: u.searchParams.get("sslmode"),
    });
  } catch {
    console.log(name, "=> INVALID URL");
  }
}

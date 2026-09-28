/** Read-only storage diagnosis. Does not upload, delete, or print credentials. */
import "dotenv/config";
async function main() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.ELORIA_STORAGE_BUCKET?.trim();
  for (const [name, value] of [
    ["SUPABASE_URL", url],
    ["SUPABASE_SERVICE_ROLE_KEY", key],
    ["ELORIA_STORAGE_BUCKET", bucket],
  ])
    console.log(`${name}: ${value ? "configured" : "MISSING"}`);
  if (!url || !key || !bucket) {
    process.exitCode = 1;
    return;
  }
  if (new URL(url).protocol !== "https:")
    throw new Error("Storage URL must use HTTPS.");
  const headers: Record<string, string> = { apikey: key };
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(
    `${url}/storage/v1/bucket/${encodeURIComponent(bucket)}`,
    { headers, signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok) {
    console.log(
      `Storage access failed (HTTP ${response.status}). Check the server key, bucket name and permissions.`,
    );
    process.exitCode = 1;
    return;
  }
  const result = (await response.json()) as {
    public?: boolean;
    file_size_limit?: number | null;
  };
  console.log(
    `Bucket readable: yes. Public images: ${result.public ? "yes" : "NO (storefront images require a public bucket)"}.`,
  );
  if (result.file_size_limit)
    console.log(`Bucket file limit: ${result.file_size_limit} bytes.`);
  console.log(
    "No files were uploaded or deleted. Next permits 10 MiB per request; the new uploader sends one file per request.",
  );
  if (!result.public) process.exitCode = 1;
}
main().catch(() => {
  console.error(
    "Storage check failed: verify the URL, network access and server configuration. Credentials were not printed.",
  );
  process.exitCode = 1;
});

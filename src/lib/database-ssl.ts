import type { ConnectionOptions } from "node:tls";

export const DATABASE_SSL_MODES = ["disable", "require", "verify-ca", "verify-full"] as const;
export type DatabaseSslMode = typeof DATABASE_SSL_MODES[number];

export function resolveDatabaseSslMode(rawUrl: string, explicitMode?: string): DatabaseSslMode {
  const mode = (explicitMode?.trim() || new URL(rawUrl).searchParams.get("sslmode")?.trim() || "verify-full").toLowerCase();
  if (!(DATABASE_SSL_MODES as readonly string[]).includes(mode)) {
    throw new Error("Unsupported DATABASE_SSL_MODE; use disable, require, verify-ca or verify-full.");
  }
  return mode as DatabaseSslMode;
}

/** Preserve the operator's explicit transport choice; never retry with weaker TLS. */
export function databaseSslOptions(rawUrl: string, explicitMode?: string, certificate?: string): false | ConnectionOptions {
  const mode = resolveDatabaseSslMode(rawUrl, explicitMode);
  if (mode === "disable") return false;
  if (mode === "require") return { rejectUnauthorized: false };
  const ca = certificate?.trim().replace(/\\n/g, "\n");
  return {
    rejectUnauthorized: true,
    ...(ca ? { ca } : {}),
    ...(mode === "verify-ca" ? { checkServerIdentity: () => undefined } : {}),
  };
}

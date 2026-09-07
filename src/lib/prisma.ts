import "dotenv/config";

import {
  PrismaPg,
} from "@prisma/adapter-pg";

import {
  Prisma,
  PrismaClient,
} from "@/generated/prisma/client";

import {
  Pool,
} from "pg";

type EloriaDatabaseGlobal =
  typeof globalThis & {
    __eloriaPgPool?: Pool;
    __eloriaPrisma?: PrismaClient;
    __eloriaCheckoutPgPool?: Pool;
    __eloriaCheckoutPrisma?: PrismaClient;
  };

const databaseGlobal =
  globalThis as EloriaDatabaseGlobal;

const isProductionBuild =
  process.env.NEXT_PHASE ===
  "phase-production-build";

function getIntegerEnvironmentValue({
  name,
  fallback,
  minimum,
  maximum,
}: {
  name: string;
  fallback: number;
  minimum: number;
  maximum: number;
}): number {
  const rawValue =
    process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const parsedValue =
    Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(
    Math.max(parsedValue, minimum),
    maximum,
  );
}

function getOptionalDatabaseUrl(
  name: string,
): string | null {
  const value =
    process.env[name]?.trim();

  if (!value) {
    return null;
  }

  try {
    return new URL(value).toString();
  } catch {
    throw new Error(
      `ساختار ${name} معتبر نیست.`,
    );
  }
}

function getRequiredDatabaseUrl(
  name: "DATABASE_URL" | "DIRECT_URL",
): string {
  const value =
    getOptionalDatabaseUrl(name);

  if (!value) {
    throw new Error(
      `متغیر ${name} تنظیم نشده است.`,
    );
  }

  return value;
}

function getPrimaryRawDatabaseUrl(): string {
  /*
   * Runtime همیشه از URL صریح Runtime یا DATABASE_URL استفاده می‌کند.
   * DIRECT_URL فقط برای migration و ابزارهای مدیریتی نگه داشته می‌شود.
   */
  return (
    getOptionalDatabaseUrl(
      "ELORIA_RUNTIME_DATABASE_URL",
    ) ??
    getRequiredDatabaseUrl(
      "DATABASE_URL",
    )
  );
}

function getCheckoutRawDatabaseUrl(
  primaryUrl: string,
): string {
  return (
    getOptionalDatabaseUrl(
      "ELORIA_CHECKOUT_DATABASE_URL",
    ) ??
    primaryUrl
  );
}

function sanitizeDatabaseUrl(
  rawUrl: string,
): string {
  const parsedUrl =
    new URL(rawUrl);

  for (
    const parameterName of [
      "sslmode",
      "sslcert",
      "sslkey",
      "sslrootcert",
      "sslpassword",
      "uselibpqcompat",
      "connect_timeout",
      "pool_timeout",
      "connection_limit",
    ]
  ) {
    parsedUrl.searchParams.delete(
      parameterName,
    );
  }

  return parsedUrl.toString();
}

function databaseSsl(
  rawUrl: string,
): false | { rejectUnauthorized: boolean } {
  const explicitMode =
    process.env.DATABASE_SSL_MODE
      ?.trim()
      .toLowerCase();

  const urlMode =
    new URL(rawUrl)
      .searchParams
      .get("sslmode")
      ?.trim()
      .toLowerCase();

  const mode =
    explicitMode ||
    urlMode ||
    "require";

  if (mode === "disable") {
    return false;
  }

  if (
    mode === "verify-full" ||
    mode === "verify-ca"
  ) {
    return {
      rejectUnauthorized: true,
    };
  }

  return {
    rejectUnauthorized: false,
  };
}

function collectDatabaseErrorDetails(
  error: unknown,
): {
  codes: string[];
  message: string;
} {
  const codes = new Set<string>();
  const messages: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  for (
    let depth = 0;
    depth < 8;
    depth += 1
  ) {
    if (
      current === null ||
      current === undefined ||
      seen.has(current)
    ) {
      break;
    }

    seen.add(current);

    if (typeof current !== "object") {
      messages.push(String(current));
      break;
    }

    const candidate = current as {
      code?: unknown;
      message?: unknown;
      cause?: unknown;
      meta?: unknown;
    };

    if (typeof candidate.code === "string") {
      codes.add(candidate.code);
    }

    if (typeof candidate.message === "string") {
      messages.push(candidate.message);
    }

    const meta = candidate.meta as
      | {
          code?: unknown;
          driverAdapterError?: unknown;
        }
      | undefined;

    if (typeof meta?.code === "string") {
      codes.add(meta.code);
    }

    current =
      candidate.cause ??
      meta?.driverAdapterError;
  }

  return {
    codes: Array.from(codes),
    message: messages.join(" | "),
  };
}

function isExpectedDisconnect(
  error: unknown,
): boolean {
  const details =
    collectDatabaseErrorDetails(error);

  const knownCodes = new Set([
    "ECONNRESET",
    "ETIMEDOUT",
    "EPIPE",
    "P1001",
    "P2024",
    "P2028",
    "08000",
    "08003",
    "08006",
    "08001",
    "57P01",
  ]);

  const message =
    details.message.toLowerCase();

  return (
    details.codes.some(code => knownCodes.has(code)) ||
    message.includes("connection terminated unexpectedly") ||
    message.includes("connection terminated due to connection timeout") ||
    message.includes("timeout exceeded when trying to connect") ||
    message.includes("read econnreset") ||
    message.includes("unable to start a transaction in the given time")
  );
}

function createPostgresPool({
  rawUrl,
  applicationName,
  maximumConnections,
  connectionTimeoutMilliseconds,
  label,
}: {
  rawUrl: string;
  applicationName: string;
  maximumConnections: number;
  connectionTimeoutMilliseconds: number;
  label: "primary" | "checkout";
}): Pool {
  const pool = new Pool({
    connectionString:
      sanitizeDatabaseUrl(rawUrl),

    ssl:
      databaseSsl(rawUrl),

    min: 0,
    max: maximumConnections,

    /*
     * هم زمان اتصال جدید و هم انتظار برای یک Client آزاد را محدود می‌کند.
     * شکست سریع بهتر از صف‌های ۳۰ تا ۶۰ ثانیه‌ای است.
     */
    connectionTimeoutMillis:
      connectionTimeoutMilliseconds,

    /*
     * اتصال‌های idle قبل از آن‌که Supavisor آن‌ها را به‌صورت ناگهانی ببندد
     * بازیافت می‌شوند. این مقدار در صورت نیاز از env قابل تغییر است.
     */
    idleTimeoutMillis:
      getIntegerEnvironmentValue({
        name: "DATABASE_IDLE_TIMEOUT_MS",
        fallback: 15_000,
        minimum: 5_000,
        maximum: 300_000,
      }),

    maxLifetimeSeconds:
      getIntegerEnvironmentValue({
        name: "DATABASE_MAX_LIFETIME_SECONDS",
        fallback: 120,
        minimum: 30,
        maximum: 1_800,
      }),

    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,

    /* Build workerها باید بتوانند بعد از idle خارج شوند. */
    allowExitOnIdle:
      process.env.NODE_ENV !== "development",

    application_name:
      applicationName,
  });

  pool.on("error", error => {
    if (isExpectedDisconnect(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[Eloria Database] اتصال ${label} قطع و از Pool حذف شد؛ درخواست بعدی اتصال تازه می‌سازد.`,
        );
      }
      return;
    }

    console.error(
      `[Eloria Database] PostgreSQL ${label} pool error.`,
      error,
    );
  });

  return pool;
}

const primaryRawDatabaseUrl =
  getPrimaryRawDatabaseUrl();

const checkoutRawDatabaseUrl =
  getCheckoutRawDatabaseUrl(
    primaryRawDatabaseUrl,
  );

export const databasePool =
  databaseGlobal.__eloriaPgPool ??
  createPostgresPool({
    rawUrl: primaryRawDatabaseUrl,
    applicationName: "neweloria-runtime",
    maximumConnections:
      getIntegerEnvironmentValue({
        name: "DATABASE_POOL_MAX",
        fallback:
          isProductionBuild
            ? 1
            : 4,
        minimum: 1,
        maximum: 8,
      }),
    connectionTimeoutMilliseconds:
      getIntegerEnvironmentValue({
        name: "DATABASE_CONNECTION_TIMEOUT_MS",
        fallback: 8_000,
        minimum: 2_000,
        maximum: 20_000,
      }),
    label: "primary",
  });

databaseGlobal.__eloriaPgPool =
  databasePool;

const checkoutUsesPrimaryPool =
  sanitizeDatabaseUrl(
    checkoutRawDatabaseUrl,
  ) ===
  sanitizeDatabaseUrl(
    primaryRawDatabaseUrl,
  );

export const checkoutDatabasePool =
  checkoutUsesPrimaryPool
    ? databasePool
    : databaseGlobal.__eloriaCheckoutPgPool ??
      createPostgresPool({
        rawUrl: checkoutRawDatabaseUrl,
        applicationName: "neweloria-checkout",
        maximumConnections:
          getIntegerEnvironmentValue({
            name: "CHECKOUT_DATABASE_POOL_MAX",
            fallback:
              isProductionBuild
                ? 1
                : 2,
            minimum: 1,
            maximum: 4,
          }),
        connectionTimeoutMilliseconds:
          getIntegerEnvironmentValue({
            name: "CHECKOUT_DATABASE_CONNECTION_TIMEOUT_MS",
            fallback: 8_000,
            minimum: 2_000,
            maximum: 20_000,
          }),
        label: "checkout",
      });

if (!checkoutUsesPrimaryPool) {
  databaseGlobal.__eloriaCheckoutPgPool =
    checkoutDatabasePool;
}

function createPrismaClient(
  pool: Pool,
): PrismaClient {
  const adapter =
    new PrismaPg(pool);

  return new PrismaClient({
    adapter,

    transactionOptions: {
      maxWait: 5_000,
      timeout: 20_000,
    },

    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

export const prisma =
  databaseGlobal.__eloriaPrisma ??
  createPrismaClient(databasePool);

databaseGlobal.__eloriaPrisma =
  prisma;

export const checkoutPrisma =
  checkoutUsesPrimaryPool
    ? prisma
    : databaseGlobal.__eloriaCheckoutPrisma ??
      createPrismaClient(
        checkoutDatabasePool,
      );

if (!checkoutUsesPrimaryPool) {
  databaseGlobal.__eloriaCheckoutPrisma =
    checkoutPrisma;
}

function wait(
  milliseconds: number,
): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

export function isTransientDatabaseError(
  error: unknown,
): boolean {
  return isExpectedDisconnect(error);
}

async function runWithDatabaseRetry<T>({
  operation,
  attempts,
  delayMilliseconds,
}: {
  operation: () => Promise<T>;
  attempts: number;
  delayMilliseconds: number;
}): Promise<T> {
  for (
    let attempt = 1;
    attempt <= attempts;
    attempt += 1
  ) {
    try {
      return await operation();
    } catch (error) {
      if (
        attempt >= attempts ||
        !isTransientDatabaseError(error)
      ) {
        throw error;
      }

      await wait(
        delayMilliseconds * attempt,
      );
    }
  }

  throw new Error(
    "Database retry exhausted.",
  );
}

export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  options: {
    attempts?: number;
    delayMilliseconds?: number;
  } = {},
): Promise<T> {
  return runWithDatabaseRetry({
    operation,
    attempts: Math.min(
      Math.max(options.attempts ?? 2, 1),
      2,
    ),
    delayMilliseconds:
      options.delayMilliseconds ?? 150,
  });
}

export async function withCheckoutDatabaseRetry<T>(
  operation: () => Promise<T>,
  options: {
    attempts?: number;
    delayMilliseconds?: number;
  } = {},
): Promise<T> {
  return runWithDatabaseRetry({
    operation,
    attempts: Math.min(
      Math.max(options.attempts ?? 2, 1),
      2,
    ),
    delayMilliseconds:
      options.delayMilliseconds ?? 150,
  });
}

export async function withDatabaseStatementTimeout<T>(
  timeoutMilliseconds: number,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const boundedTimeout = Math.min(
    Math.max(Math.trunc(timeoutMilliseconds), 250),
    30_000,
  );

  return withDatabaseRetry(
    () =>
      prisma.$transaction(
        async transaction => {
          await transaction.$queryRaw`
            SELECT set_config(
              'statement_timeout',
              ${String(boundedTimeout)},
              true
            )
          `;

          return operation(transaction);
        },
        {
          maxWait: Math.min(5_000, boundedTimeout),
          timeout: boundedTimeout + 2_000,
        },
      ),
    {
      attempts: 1,
      delayMilliseconds: 0,
    },
  );
}

export async function ensureDatabaseReady(): Promise<void> {
  await withDatabaseRetry(
    async () => {
      await databasePool.query("SELECT 1");
    },
    {
      attempts: 2,
      delayMilliseconds: 150,
    },
  );
}

export async function ensureCheckoutDatabaseReady(): Promise<void> {
  await withCheckoutDatabaseRetry(
    async () => {
      await checkoutDatabasePool.query("SELECT 1");
    },
    {
      attempts: 2,
      delayMilliseconds: 150,
    },
  );
}

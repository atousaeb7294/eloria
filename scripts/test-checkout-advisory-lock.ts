import "dotenv/config";

import {
  checkoutPrisma,
  ensureCheckoutDatabaseReady,
} from "../src/lib/prisma";

const TEST_ATTEMPTS =
  3;

function wait(
  milliseconds: number,
): Promise<void> {
  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

function getErrorText(
  error: unknown,
): string {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return String(error)
      .toLowerCase();
  }

  const candidate =
    error as {
      code?: unknown;
      message?: unknown;
      cause?: unknown;
    };

  return [
    candidate.code,
    candidate.message,
    candidate.cause,
  ]
    .filter(
      (value) =>
        value !== undefined,
    )
    .map(
      (value) =>
        String(value),
    )
    .join(" ")
    .toLowerCase();
}

function isRetryable(
  error: unknown,
): boolean {
  const text =
    getErrorText(
      error,
    );

  return (
    text.includes("p2028") ||
    text.includes("econnreset") ||
    text.includes("etimedout") ||
    text.includes(
      "connection terminated unexpectedly",
    ) ||
    text.includes(
      "connection terminated due to connection timeout",
    )
  );
}

async function runLockTest() {
  return checkoutPrisma.$transaction(
    async (
      transaction,
    ) => {
      return transaction.$queryRaw<
        Array<{
          lockAcquired:
            boolean;
        }>
      >`
        SELECT
          pg_try_advisory_xact_lock(
            hashtext(
              ${"eloria-checkout-hotfix-test-v6-6"}
            )
          ) AS "lockAcquired"
      `;
    },
    {
      maxWait:
        5_000,

      timeout:
        25_000,
    },
  );
}

async function main():
  Promise<void> {
  let lastError:
    unknown;

  for (
    let attempt = 1;
    attempt <= TEST_ATTEMPTS;
    attempt += 1
  ) {
    try {
      await ensureCheckoutDatabaseReady();

      const startedAt =
        Date.now();

      const result =
        await runLockTest();

      const elapsedMilliseconds =
        Date.now() - startedAt;

      console.log(
        JSON.stringify(
          {
            successful:
              true,

            attempt,

            elapsedMilliseconds,

            rows:
              result,
          },
          null,
          2,
        ),
      );

      return;
    } catch (error) {
      lastError =
        error;

      if (
        !isRetryable(
          error,
        ) ||
        attempt === TEST_ATTEMPTS
      ) {
        throw error;
      }

      await wait(
        attempt * 1_000,
      );
    }
  }

  throw lastError;
}

main()
  .catch(
    (
      error,
    ) => {
      console.error(
        "Checkout advisory-lock test failed.",
        error,
      );

      process.exitCode =
        1;
    },
  )
  .finally(
    async () => {
      await checkoutPrisma.$disconnect();
    },
  );

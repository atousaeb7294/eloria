import assert from "node:assert/strict";

import {
  NextRequest,
} from "next/server";

import {
  GET,
} from "../src/app/api/cron/metal-prices/route";

const originalCronSecret =
  process.env.CRON_SECRET;

function createRequest(
  authorization?: string,
) {
  const headers =
    new Headers();

  if (authorization) {
    headers.set(
      "authorization",
      authorization,
    );
  }

  return new NextRequest(
    "http://localhost:3000/api/cron/metal-prices",
    {
      method:
        "GET",

      headers,
    },
  );
}

async function runTests() {
  try {
    /**
     * حالت اول:
     * رمز کرون روی سرور تنظیم نشده است.
     */
    delete process.env
      .CRON_SECRET;

    const missingConfigurationResponse =
      await GET(
        createRequest(),
      );

    assert.equal(
      missingConfigurationResponse.status,
      503,
    );

    const missingConfigurationBody =
      await missingConfigurationResponse.json();

    assert.deepEqual(
      missingConfigurationBody,
      {
        successful:
          false,

        code:
          "CRON_SECRET_NOT_CONFIGURED",

        message:
          "Server cron authentication is not configured.",
      },
    );

    /**
     * حالت دوم:
     * رمز تنظیم شده اما Authorization ارسال نشده است.
     */
    process.env.CRON_SECRET =
      "eloria-test-cron-secret";

    const missingAuthorizationResponse =
      await GET(
        createRequest(),
      );

    assert.equal(
      missingAuthorizationResponse.status,
      401,
    );

    const missingAuthorizationBody =
      await missingAuthorizationResponse.json();

    assert.equal(
      missingAuthorizationBody.successful,
      false,
    );

    assert.equal(
      missingAuthorizationBody.code,
      "UNAUTHORIZED",
    );

    assert.equal(
      missingAuthorizationResponse.headers.get(
        "www-authenticate",
      ),
      "Bearer",
    );

    /**
     * حالت سوم:
     * رمز اشتباه ارسال شده است.
     */
    const invalidSecretResponse =
      await GET(
        createRequest(
          "Bearer wrong-secret",
        ),
      );

    assert.equal(
      invalidSecretResponse.status,
      401,
    );

    const invalidSecretBody =
      await invalidSecretResponse.json();

    assert.equal(
      invalidSecretBody.code,
      "UNAUTHORIZED",
    );

    /**
     * حالت چهارم:
     * نوع Authorization اشتباه است.
     */
    const invalidSchemeResponse =
      await GET(
        createRequest(
          "Basic eloria-test-cron-secret",
        ),
      );

    assert.equal(
      invalidSchemeResponse.status,
      401,
    );

    assert.equal(
      invalidSchemeResponse.headers.get(
        "cache-control",
      ),
      "no-store, no-cache, must-revalidate",
    );

    console.log(
      "PASS: cron metal-price route rejects missing and invalid authorization.",
    );
  } finally {
    if (
      originalCronSecret ===
      undefined
    ) {
      delete process.env
        .CRON_SECRET;
    } else {
      process.env.CRON_SECRET =
        originalCronSecret;
    }
  }
}

runTests().catch(
  (error: unknown) => {
    console.error(
      "FAIL: cron metal-price authorization test failed.",
      error,
    );

    process.exitCode =
      1;
  },
);
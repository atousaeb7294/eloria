import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  sendSms,
} from "@/lib/notifications/kavenegar";
import {
  isSupportEnabled,
} from "@/lib/runtime-features";
import {
  readJsonBody,
} from "@/lib/security/json-body";
import {
  consumeRateLimit,
} from "@/lib/security/rate-limit";
import {
  hasTrustedOrigin,
  requestIp,
} from "@/lib/security/request";
import {
  verifyTurnstileToken,
} from "@/lib/security/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(
  value: unknown,
  max: number,
) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function isPrivateHostname(
  hostname: string,
): boolean {
  const host =
    hostname.toLowerCase();

  if (
    host === "localhost" ||
    host === "::1" ||
    host.endsWith(".local")
  ) {
    return true;
  }

  const ipv4 =
    host.match(
      /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
    );

  if (!ipv4) return false;

  const a = Number(ipv4[1]);
  const b = Number(ipv4[2]);

  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (
      a === 169 &&
      b === 254
    ) ||
    (
      a === 192 &&
      b === 168
    ) ||
    (
      a === 172 &&
      b >= 16 &&
      b <= 31
    )
  );
}

function supportWebhook():
  string | null {
  const raw =
    process.env
      .ELORIA_SUPPORT_WEBHOOK_URL
      ?.trim();

  if (!raw) return null;

  try {
    const url = new URL(raw);

    if (
      url.protocol !== "https:" ||
      isPrivateHostname(
        url.hostname,
      )
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function turnstileRequired():
  boolean {
  const raw =
    process.env
      .ELORIA_SUPPORT_TURNSTILE_REQUIRED
      ?.trim()
      .toLowerCase();

  if (
    raw === "false" ||
    raw === "0"
  ) {
    return false;
  }

  return (
    raw === "true" ||
    raw === "1" ||
    process.env.NODE_ENV ===
      "production"
  );
}

export async function POST(
  request: NextRequest,
) {
  if (!isSupportEnabled()) {
    return NextResponse.json(
      { successful: false, message: "پشتیبانی آنلاین در حال حاضر غیرفعال است." },
      { status: 503 },
    );
  }

  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(
      {
        successful: false,
        message:
          "مبدأ درخواست معتبر نیست.",
      },
      { status: 403 },
    );
  }

  const ip =
    requestIp(request);

  const rate =
    await consumeRateLimit({
      key: `contact:${ip}`,
      limit: 5,
      windowMs:
        10 * 60_000,
    });

  if (!rate.allowed) {
    return NextResponse.json(
      {
        successful: false,
        message:
          "تعداد پیام‌های ارسالی بیش از حد مجاز است.",
      },
      {
        status: 429,
        headers: {
          "Retry-After":
            String(
              rate.retryAfterSeconds,
            ),
        },
      },
    );
  }

  const body =
    await readJsonBody<
      Record<string, unknown>
    >(
      request,
      24 * 1024,
    ).catch(() => null);

  if (!body) {
    return NextResponse.json(
      {
        successful: false,
        message:
          "ساختار پیام معتبر نیست.",
      },
      { status: 400 },
    );
  }

  const name =
    clean(body.name, 120);
  const phone =
    clean(body.phone, 30);
  const subject =
    clean(body.subject, 160);
  const message =
    clean(body.message, 1200);

  if (
    !name ||
    !phone ||
    !subject ||
    message.length < 10
  ) {
    return NextResponse.json(
      {
        successful: false,
        message:
          "اطلاعات فرم کامل نیست.",
      },
      { status: 400 },
    );
  }

  const phoneRate =
    await consumeRateLimit({
      key:
        `contact-phone:${phone}`,
      limit: 3,
      windowMs:
        30 * 60_000,
    });

  if (!phoneRate.allowed) {
    return NextResponse.json(
      {
        successful: false,
        message:
          "برای این شماره اخیراً چند درخواست ثبت شده است.",
      },
      {
        status: 429,
        headers: {
          "Retry-After":
            String(
              phoneRate.retryAfterSeconds,
            ),
        },
      },
    );
  }

  if (turnstileRequired()) {
    const challenge =
      await verifyTurnstileToken({
        token:
          typeof body.turnstileToken ===
          "string"
            ? body.turnstileToken
            : null,
        ip,
        expectedAction:
          "support-contact",
      });

    if (!challenge.successful) {
      return NextResponse.json(
        {
          successful: false,
          message:
            "تأیید امنیتی ناموفق بود.",
        },
        { status: 403 },
      );
    }
  }

  const webhook =
    supportWebhook();
  const configuredWebhookRaw =
    process.env
      .ELORIA_SUPPORT_WEBHOOK_URL
      ?.trim();

  if (
    configuredWebhookRaw &&
    !webhook
  ) {
    console.error(
      "[Eloria Support] Invalid or unsafe support webhook URL.",
    );
  }

  const supportMobile =
    process.env
      .ELORIA_SUPPORT_MOBILE
      ?.trim();

  let delivered = false;
  const errors: string[] = [];

  if (webhook) {
    try {
      const response =
        await fetch(
          webhook,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              "User-Agent":
                "Eloria-Support/1.0",
            },
            body:
              JSON.stringify({
                source:
                  "ELORIA_CONTACT",
                name,
                phone,
                subject,
                message,
                receivedAt:
                  new Date()
                    .toISOString(),
              }),
            cache: "no-store",
            signal:
              AbortSignal.timeout(
                5_000,
              ),
          },
        );

      if (response.ok) {
        delivered = true;
      } else {
        errors.push(
          "وب‌هوک پشتیبانی پاسخ موفق نداد.",
        );
      }
    } catch {
      errors.push(
        "ارتباط با وب‌هوک پشتیبانی برقرار نشد.",
      );
    }
  }

  if (
    supportMobile &&
    /^09\d{9}$/.test(
      supportMobile,
    )
  ) {
    const sms =
      await sendSms(
        supportMobile,
        `درخواست جدید الوریا\n${name} - ${phone}\n${subject}\n${message.slice(
          0,
          600,
        )}`,
      );

    if (sms.successful) {
      delivered = true;
    } else {
      console.error(
        "[Eloria Support] SMS delivery failed.",
        sms.message,
      );
      errors.push(
        "ارسال پیامک پشتیبانی ناموفق بود.",
      );
    }
  }

  if (
    !webhook &&
    !supportMobile
  ) {
    return NextResponse.json(
      {
        successful: false,
        message:
          "کانال پشتیبانی هنوز پیکربندی نشده است.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      successful: delivered,
      message: delivered
        ? "درخواست شما ثبت و برای پشتیبانی ارسال شد."
        : errors.join(" ") ||
          "ارسال انجام نشد.",
    },
    {
      status: delivered
        ? 200
        : 502,
    },
  );
}

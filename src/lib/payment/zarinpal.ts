import { isPaymentEnabled } from "@/lib/runtime-features";

const DEFAULT_API_BASE =
  "https://payment.zarinpal.com/pg/v4/payment";
const DEFAULT_START_BASE =
  "https://payment.zarinpal.com/pg/StartPay";
const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;

function requestTimeoutMilliseconds(): number {
  const raw = Number.parseInt(
    process.env.ZARINPAL_REQUEST_TIMEOUT_MS?.trim() ?? "",
    10,
  );

  if (!Number.isFinite(raw)) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }

  return Math.min(Math.max(raw, 3_000), 30_000);
}

export type ZarinpalRequestResult = {
  authority: string;
  code: number;
  message: string;
  fee?: number;
  feeType?: string;
};

export type ZarinpalVerifyResult = {
  code: number;
  message: string;
  referenceId: string;
  cardPan?: string;
  cardHash?: string;
  fee?: number;
  feeType?: string;
};

export class ZarinpalError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message);
    this.name = "ZarinpalError";
  }
}

function officialProviderUrl(
  raw: string | undefined,
  fallback: string,
  requiredPathPrefix: string,
): string {
  const selected = raw?.trim() || fallback;

  let url: URL;
  try {
    url = new URL(selected);
  } catch {
    throw new ZarinpalError("آدرس سرویس زرین‌پال معتبر نیست.");
  }

  if (url.protocol !== "https:") {
    throw new ZarinpalError("سرویس زرین‌پال باید از HTTPS استفاده کند.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    (
      url.hostname.toLowerCase() !== "payment.zarinpal.com" ||
      !url.pathname.startsWith(requiredPathPrefix)
    )
  ) {
    throw new ZarinpalError(
      "در Production فقط endpoint رسمی زرین‌پال مجاز است.",
    );
  }

  return url.toString().replace(/\/$/, "");
}

function config() {
  return {
    merchantId:
      process.env.ZARINPAL_MERCHANT_ID?.trim() ?? "",
    apiBase: officialProviderUrl(
      process.env.ZARINPAL_API_BASE,
      DEFAULT_API_BASE,
      "/pg/v4/payment",
    ),
    startBase: officialProviderUrl(
      process.env.ZARINPAL_STARTPAY_BASE,
      DEFAULT_START_BASE,
      "/pg/StartPay",
    ),
  };
}

function hasZarinpalCredentials(): boolean {
  try {
    const current = config();
    return /^[0-9a-fA-F-]{36}$/.test(current.merchantId);
  } catch {
    return false;
  }
}

export function isZarinpalConfigured(): boolean {
  return isPaymentEnabled() && hasZarinpalCredentials();
}

function amountRial(toman: string): number {
  const value = BigInt(toman) * BigInt(10);

  if (
    value < BigInt(10000) ||
    value > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new ZarinpalError(
      "مبلغ پرداخت برای درگاه معتبر نیست.",
    );
  }

  return Number(value);
}

async function post(
  path: "request.json" | "verify.json",
  body: Record<string, unknown>,
) {
  const current = config();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    requestTimeoutMilliseconds(),
  );

  try {
    const response = await fetch(
      `${current.apiBase}/${path}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: controller.signal,
      },
    );

    const payload =
      (await response.json().catch(() => null)) as
        | {
            data?: Record<string, unknown>;
            errors?: Record<string, unknown>;
          }
        | null;

    if (!response.ok || !payload?.data) {
      const errorCode = Number(
        payload?.errors?.code ?? response.status,
      );
      const errorMessage = String(
        payload?.errors?.message ??
          "پاسخ معتبر از درگاه دریافت نشد.",
      );
      throw new ZarinpalError(
        errorMessage,
        errorCode,
      );
    }

    return payload.data;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new ZarinpalError(
        "پاسخ درگاه پرداخت بیش از حد طول کشید. سفارش ثبت شد؛ چند لحظه بعد دوباره پرداخت را آغاز کنید.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestZarinpalPayment(input: {
  amountToman: string;
  description: string;
  callbackUrl: string;
  mobile?: string | null;
  email?: string | null;
}): Promise<ZarinpalRequestResult> {
  if (!isZarinpalConfigured()) {
    throw new ZarinpalError(
      "درگاه زرین‌پال پیکربندی نشده است.",
    );
  }

  const current = config();
  const data = await post("request.json", {
    merchant_id: current.merchantId,
    amount: amountRial(input.amountToman),
    callback_url: input.callbackUrl,
    description: input.description,
    metadata: {
      mobile: input.mobile || undefined,
      email: input.email || undefined,
    },
  });

  const code = Number(data.code);
  const authority =
    typeof data.authority === "string"
      ? data.authority.trim()
      : "";

  if (
    code !== 100 ||
    !authority ||
    authority.length > 128
  ) {
    throw new ZarinpalError(
      String(
        data.message ??
          "ساخت درخواست پرداخت ناموفق بود.",
      ),
      code,
    );
  }

  return {
    authority,
    code,
    message: String(data.message ?? "Success"),
    fee: Number(data.fee ?? 0),
    feeType: String(data.fee_type ?? ""),
  };
}

function requiredReferenceId(
  value: unknown,
  code: number,
): string {
  const reference =
    value === undefined || value === null
      ? ""
      : String(value).trim();

  if (
    !reference ||
    reference.length > 64 ||
    !/^\d+$/.test(reference)
  ) {
    throw new ZarinpalError(
      "زرین‌پال پرداخت را موفق اعلام کرد اما شناسه مرجع معتبر برنگرداند؛ پرداخت باید بررسی دستی شود.",
      code,
    );
  }

  return reference;
}

export async function verifyZarinpalPayment(input: {
  amountToman: string;
  authority: string;
}): Promise<ZarinpalVerifyResult> {
  /*
   * Callbackهای درحال‌پرواز باید حتی اگر شروع پرداخت جدید موقتاً غیرفعال
   * شده باشد قابل Verify بمانند. Feature flag فقط ایجاد پرداخت جدید را می‌بندد.
   */
  if (!hasZarinpalCredentials()) {
    throw new ZarinpalError(
      "درگاه زرین‌پال پیکربندی نشده است.",
    );
  }

  const current = config();
  const data = await post("verify.json", {
    merchant_id: current.merchantId,
    amount: amountRial(input.amountToman),
    authority: input.authority,
  });

  const code = Number(data.code);

  if (code !== 100 && code !== 101) {
    throw new ZarinpalError(
      String(
        data.message ??
          "تأیید پرداخت ناموفق بود.",
      ),
      code,
    );
  }

  return {
    code,
    message: String(data.message ?? "Success"),
    referenceId: requiredReferenceId(
      data.ref_id,
      code,
    ),
    cardPan:
      typeof data.card_pan === "string"
        ? data.card_pan
        : undefined,
    cardHash:
      typeof data.card_hash === "string"
        ? data.card_hash
        : undefined,
    fee: Number(data.fee ?? 0),
    feeType: String(data.fee_type ?? ""),
  };
}

export function zarinpalStartUrl(
  authority: string,
): string {
  const safeAuthority = authority.trim();

  if (
    !safeAuthority ||
    safeAuthority.length > 128
  ) {
    throw new ZarinpalError(
      "Authority زرین‌پال معتبر نیست.",
    );
  }

  return `${config().startBase}/${encodeURIComponent(
    safeAuthority,
  )}`;
}

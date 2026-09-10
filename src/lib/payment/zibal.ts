import { isPaymentEnabled } from "@/lib/runtime-features";

const DEFAULT_API_BASE = "https://gateway.zibal.ir/v1/request";
const DEFAULT_VERIFY_BASE = "https://gateway.zibal.ir/v1/verify";
const DEFAULT_START_BASE = "https://gateway.zibal.ir/start/";

const DEFAULT_TIMEOUT_MS = 5000;

function requestTimeoutMilliseconds(): number {
  const raw = Number.parseInt(
    process.env.ZIBAL_REQUEST_TIMEOUT_MS?.trim() ?? "",
    10,
  );

  if (!Number.isFinite(raw)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.min(Math.max(raw, 3000), 30000);
}

export class ZibalError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message);
    this.name = "ZibalError";
  }
}

function config() {
  return {
    merchant:
      process.env.ZIBAL_MERCHANT?.trim() ?? "",

    requestBase:
      process.env.ZIBAL_REQUEST_BASE?.trim() ||
      DEFAULT_API_BASE,

    verifyBase:
      process.env.ZIBAL_VERIFY_BASE?.trim() ||
      DEFAULT_VERIFY_BASE,

    startBase:
      process.env.ZIBAL_START_BASE?.trim() ||
      DEFAULT_START_BASE,
  };
}

function hasZibalCredentials() {
  return Boolean(config().merchant);
}

export function isZibalConfigured() {
  return isPaymentEnabled() && hasZibalCredentials();
}

function amountRial(toman: string) {
  return Number(BigInt(toman) * BigInt(10));
}

async function post(url: string, body: Record<string, unknown>) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    requestTimeoutMilliseconds(),
  );

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ZibalError(
        "خطا در ارتباط با زیبال",
        response.status,
      );
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestZibalPayment(input: {
  amountToman: string;
  description: string;
  callbackUrl: string;
  mobile?: string | null;
  email?: string | null;
}) {
  if (!hasZibalCredentials()) {
    throw new ZibalError(
      "درگاه زیبال پیکربندی نشده است.",
    );
  }

  const current = config();

  const data = await post(current.requestBase, {
    merchant: current.merchant,
    amount: amountRial(input.amountToman),
    callbackUrl: input.callbackUrl,
    description: input.description,
  });

  if (data.result !== 100 || !data.trackId) {
    throw new ZibalError(
      data.message || "شروع پرداخت زیبال ناموفق بود.",
      data.result,
    );
  }

  return {
    authority: String(data.trackId),
    code: data.result,
    message: data.message,
  };
}

export async function verifyZibalPayment(input: {
  authority: string;
  amountToman: string;
}) {
  const current = config();

  const data = await post(current.verifyBase, {
    merchant: current.merchant,
    trackId: input.authority,
  });

  if (data.result !== 100) {
    throw new ZibalError(
      data.message || "تایید پرداخت زیبال ناموفق بود.",
      data.result,
    );
  }

  return {
    code: data.result,
    message: data.message,
      referenceId: String(data.refNumber ?? data.cardNumber ?? ""),
    fee: Number(data.fee ?? 0),
    feeType: String(data.fee_type ?? ""), 
  };
}

export function zibalStartUrl(trackId: string) {
  return `${config().startBase}${encodeURIComponent(trackId)}`;
}





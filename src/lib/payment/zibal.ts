import { isPaymentEnabled } from "@/lib/runtime-features";

const ENDPOINTS = {
  request: "https://gateway.zibal.ir/v1/request",
  verify: "https://gateway.zibal.ir/v1/verify",
  inquiry: "https://gateway.zibal.ir/v1/inquiry",
  start: "https://gateway.zibal.ir/start/",
} as const;

export class ZibalError extends Error {
  constructor(message: string, readonly code?: number) {
    super(message); this.name = "ZibalError";
  }
}

function endpoint(kind: keyof typeof ENDPOINTS): string {
  const value = process.env[`ZIBAL_${kind.toUpperCase()}_BASE`]?.trim() || ENDPOINTS[kind];
  const url = new URL(value);
  const expected = new URL(ENDPOINTS[kind]);
  if (url.origin !== expected.origin || url.pathname !== expected.pathname || url.search || url.hash || url.username || url.password) {
    throw new ZibalError("نشانی درگاه باید دقیقاً نشانی رسمی زیبال باشد.");
  }
  return url.href;
}

function merchant(): string {
  const value = process.env.ZIBAL_MERCHANT?.trim() || "";
  if (!value || (process.env.NODE_ENV === "production" && value.toLowerCase() === "zibal")) {
    throw new ZibalError("شناسه پذیرنده واقعی زیبال تنظیم نشده است.");
  }
  return value;
}

export function isZibalConfigured(): boolean {
  if (!isPaymentEnabled()) return false;
  try { merchant(); endpoint("request"); endpoint("verify"); endpoint("inquiry"); endpoint("start"); return true; }
  catch { return false; }
}

export function zibalAmountRial(toman: string): number {
  if (!/^\d+$/.test(toman)) throw new ZibalError("مبلغ پرداخت معتبر نیست.");
  const rial = BigInt(toman) * 10n;
  if (rial <= 0n || rial > BigInt(Number.MAX_SAFE_INTEGER)) throw new ZibalError("مبلغ پرداخت خارج از محدوده مجاز است.");
  return Number(rial);
}

type GatewayResponse = Record<string, unknown>;
async function post(kind: "request" | "verify" | "inquiry", body: Record<string, unknown>): Promise<GatewayResponse> {
  const parsed = Number(process.env.ZIBAL_REQUEST_TIMEOUT_MS || 15000);
  const timeout = Number.isFinite(parsed) ? Math.min(30000, Math.max(3000, parsed)) : 15000;
  try {
    const response = await fetch(endpoint(kind), {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ merchant: merchant(), ...body }), cache: "no-store",
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) throw new ZibalError("پاسخ سرویس زیبال ناموفق بود؛ دوباره تلاش کنید.", response.status);
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new ZibalError("پاسخ زیبال معتبر نیست.");
    return data as GatewayResponse;
  } catch (error) {
    if (error instanceof ZibalError) throw error;
    throw new ZibalError("ارتباط با زیبال برقرار نشد؛ اتصال سرور و زمان پاسخ درگاه را بررسی کنید.");
  }
}

const resultMessages: Record<number, string> = {
  102: "شناسه پذیرنده زیبال پیدا نشد؛ تنظیم ZIBAL_MERCHANT را بررسی کنید.",
  103: "پذیرنده زیبال غیرفعال است؛ وضعیت درگاه را در پنل زیبال بررسی کنید.",
  104: "پذیرنده زیبال نامعتبر است.",
  105: "مبلغ پرداخت کمتر از حد مجاز زیبال است.",
  106: "نشانی بازگشت با دامنه ثبت‌شده در زیبال مطابقت ندارد.",
  113: "مبلغ پرداخت بیش از حد مجاز زیبال است.",
};

export async function requestZibalPayment(input: {
  amountToman: string; description: string; callbackUrl: string;
  mobile?: string | null; email?: string | null;
}) {
  const callback = new URL(input.callbackUrl);
  if (process.env.NODE_ENV === "production" && callback.protocol !== "https:") throw new ZibalError("نشانی بازگشت باید HTTPS باشد.");
  const data = await post("request", {
    amount: zibalAmountRial(input.amountToman), description: input.description,
    callbackUrl: input.callbackUrl, ...(input.mobile ? { mobile: input.mobile } : {}),
  });
  const code = Number(data.result);
  if (code !== 100 || !/^\d+$/.test(String(data.trackId)) || (typeof data.trackId === "number" && !Number.isSafeInteger(data.trackId))) {
    throw new ZibalError(resultMessages[code] || "شروع پرداخت زیبال ناموفق بود.", code);
  }
  return { authority: String(data.trackId), code, message: "درخواست زیبال ایجاد شد." };
}

export async function verifyZibalPayment(input: { authority: string; amountToman: string }) {
  if (!/^\d+$/.test(input.authority)) throw new ZibalError("شناسه تراکنش زیبال معتبر نیست.");
  const expected = zibalAmountRial(input.amountToman);
  let data = await post("verify", { trackId: input.authority });
  // 201 means already verified. Confirm status and amount through server inquiry.
  if (Number(data.result) === 201) {
    data = await post("inquiry", { trackId: input.authority });
    if (Number(data.result) !== 100 || Number(data.status) !== 2) throw new ZibalError("استعلام تراکنش تأییدشده زیبال ناموفق بود.", 201);
  } else if (Number(data.result) !== 100) {
    throw new ZibalError("تأیید پرداخت زیبال ناموفق بود؛ نیاز به تلاش مجدد دارد.", Number(data.result));
  }
  const amount = String(data.amount ?? "");
  if (!/^\d+$/.test(amount) || BigInt(amount) !== BigInt(expected)) {
    // A successful provider response with missing/mismatched money needs review, never fulfilment.
    throw new ZibalError("مبلغ تأییدشده زیبال با سفارش مطابقت ندارد؛ بررسی مالی لازم است.", 100);
  }
  const referenceId = String(data.refNumber ?? "");
  if (!/^\d+$/.test(referenceId) || BigInt(referenceId) <= 0n || (typeof data.refNumber === "number" && !Number.isSafeInteger(data.refNumber))) {
    throw new ZibalError("شناسه مرجع معتبر در پاسخ موفق زیبال موجود نیست؛ بررسی مالی لازم است.", 100);
  }
  return { code: 100, message: "پرداخت تأیید شد.", referenceId,
    fee: Number(data.fee ?? 0), feeType: String(data.fee_type ?? "") };
}

export function zibalStartUrl(trackId: string): string {
  if (!/^\d+$/.test(trackId)) throw new ZibalError("شناسه تراکنش معتبر نیست.");
  return `${endpoint("start")}${trackId}`;
}

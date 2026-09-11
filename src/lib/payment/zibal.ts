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
    throw new ZibalError("Ù†Ø´Ø§Ù†ÛŒ Ø¯Ø±Ú¯Ø§Ù‡ Ø¨Ø§ÛŒØ¯ Ø¯Ù‚ÛŒÙ‚Ø§Ù‹ Ù†Ø´Ø§Ù†ÛŒ Ø±Ø³Ù…ÛŒ Ø²ÛŒØ¨Ø§Ù„ Ø¨Ø§Ø´Ø¯.");
  }
  return url.href;
}

function merchant(): string {
  const value = process.env.ZIBAL_MERCHANT?.trim() || "";
  if (!value || (process.env.NODE_ENV === "production" && value.toLowerCase() === "zibal")) {
    throw new ZibalError("Ø´Ù†Ø§Ø³Ù‡ Ù¾Ø°ÛŒØ±Ù†Ø¯Ù‡ ÙˆØ§Ù‚Ø¹ÛŒ Ø²ÛŒØ¨Ø§Ù„ ØªÙ†Ø¸ÛŒÙ… Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.");
  }
  return value;
}

export function isZibalConfigured(): boolean {
  if (!isPaymentEnabled()) return false;
  try { merchant(); endpoint("request"); endpoint("verify"); endpoint("inquiry"); endpoint("start"); return true; }
  catch { return false; }
}

export function zibalAmountRial(toman: string): number {
  if (!/^\d+$/.test(toman)) throw new ZibalError("Ù…Ø¨Ù„Øº Ù¾Ø±Ø¯Ø§Ø®Øª Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.");
  const rial = BigInt(toman) * 10n;
  if (rial <= 0n || rial > BigInt(Number.MAX_SAFE_INTEGER)) throw new ZibalError("Ù…Ø¨Ù„Øº Ù¾Ø±Ø¯Ø§Ø®Øª Ø®Ø§Ø±Ø¬ Ø§Ø² Ù…Ø­Ø¯ÙˆØ¯Ù‡ Ù…Ø¬Ø§Ø² Ø§Ø³Øª.");
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
    if (!response.ok) throw new ZibalError("Ù¾Ø§Ø³Ø® Ø³Ø±ÙˆÛŒØ³ Ø²ÛŒØ¨Ø§Ù„ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯Ø› Ø¯ÙˆØ¨Ø§Ø±Ù‡ ØªÙ„Ø§Ø´ Ú©Ù†ÛŒØ¯.", response.status);
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new ZibalError("Ù¾Ø§Ø³Ø® Ø²ÛŒØ¨Ø§Ù„ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.");
    return data as GatewayResponse;
  } catch (error) {
    if (error instanceof ZibalError) throw error;
    throw new ZibalError("Ø§Ø±ØªØ¨Ø§Ø· Ø¨Ø§ Ø²ÛŒØ¨Ø§Ù„ Ø¨Ø±Ù‚Ø±Ø§Ø± Ù†Ø´Ø¯Ø› Ø§ØªØµØ§Ù„ Ø³Ø±ÙˆØ± Ùˆ Ø²Ù…Ø§Ù† Ù¾Ø§Ø³Ø® Ø¯Ø±Ú¯Ø§Ù‡ Ø±Ø§ Ø¨Ø±Ø±Ø³ÛŒ Ú©Ù†ÛŒØ¯.");
  }
}

const resultMessages: Record<number, string> = {
  102: "Ø´Ù†Ø§Ø³Ù‡ Ù¾Ø°ÛŒØ±Ù†Ø¯Ù‡ Ø²ÛŒØ¨Ø§Ù„ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯Ø› ØªÙ†Ø¸ÛŒÙ… ZIBAL_MERCHANT Ø±Ø§ Ø¨Ø±Ø±Ø³ÛŒ Ú©Ù†ÛŒØ¯.",
  103: "Ù¾Ø°ÛŒØ±Ù†Ø¯Ù‡ Ø²ÛŒØ¨Ø§Ù„ ØºÛŒØ±ÙØ¹Ø§Ù„ Ø§Ø³ØªØ› ÙˆØ¶Ø¹ÛŒØª Ø¯Ø±Ú¯Ø§Ù‡ Ø±Ø§ Ø¯Ø± Ù¾Ù†Ù„ Ø²ÛŒØ¨Ø§Ù„ Ø¨Ø±Ø±Ø³ÛŒ Ú©Ù†ÛŒØ¯.",
  104: "Ù¾Ø°ÛŒØ±Ù†Ø¯Ù‡ Ø²ÛŒØ¨Ø§Ù„ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª.",
  105: "Ù…Ø¨Ù„Øº Ù¾Ø±Ø¯Ø§Ø®Øª Ú©Ù…ØªØ± Ø§Ø² Ø­Ø¯ Ù…Ø¬Ø§Ø² Ø²ÛŒØ¨Ø§Ù„ Ø§Ø³Øª.",
  106: "Ù†Ø´Ø§Ù†ÛŒ Ø¨Ø§Ø²Ú¯Ø´Øª Ø¨Ø§ Ø¯Ø§Ù…Ù†Ù‡ Ø«Ø¨Øªâ€ŒØ´Ø¯Ù‡ Ø¯Ø± Ø²ÛŒØ¨Ø§Ù„ Ù…Ø·Ø§Ø¨Ù‚Øª Ù†Ø¯Ø§Ø±Ø¯.",
  113: "Ù…Ø¨Ù„Øº Ù¾Ø±Ø¯Ø§Ø®Øª Ø¨ÛŒØ´ Ø§Ø² Ø­Ø¯ Ù…Ø¬Ø§Ø² Ø²ÛŒØ¨Ø§Ù„ Ø§Ø³Øª.",
};

export async function requestZibalPayment(input: {
  amountToman: string; description: string; callbackUrl: string;
  mobile?: string | null; email?: string | null;
}) {
  const callback = new URL(input.callbackUrl);
  if (process.env.NODE_ENV === "production" && callback.protocol !== "https:") throw new ZibalError("Ù†Ø´Ø§Ù†ÛŒ Ø¨Ø§Ø²Ú¯Ø´Øª Ø¨Ø§ÛŒØ¯ HTTPS Ø¨Ø§Ø´Ø¯.");
  const data = await post("request", {
    amount: zibalAmountRial(input.amountToman), description: input.description,
    callbackUrl: input.callbackUrl, ...(input.mobile ? { mobile: input.mobile } : {}),
  });
  const code = Number(data.result);
  if (code !== 100 || !/^\d+$/.test(String(data.trackId)) || (typeof data.trackId === "number" && !Number.isSafeInteger(data.trackId))) {
    throw new ZibalError(resultMessages[code] || "Ø´Ø±ÙˆØ¹ Ù¾Ø±Ø¯Ø§Ø®Øª Ø²ÛŒØ¨Ø§Ù„ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯.", code);
  }
  return { authority: String(data.trackId), code, message: "Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø²ÛŒØ¨Ø§Ù„ Ø§ÛŒØ¬Ø§Ø¯ Ø´Ø¯." };
}

export async function verifyZibalPayment(input: { authority: string; amountToman: string }) {
  if (!/^\d+$/.test(input.authority)) throw new ZibalError("Ø´Ù†Ø§Ø³Ù‡ ØªØ±Ø§Ú©Ù†Ø´ Ø²ÛŒØ¨Ø§Ù„ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.");
  const expected = zibalAmountRial(input.amountToman);
  let data = await post("verify", { trackId: input.authority });
  // 201 means already verified. Confirm status and amount through server inquiry.
  if (Number(data.result) === 201) {
    data = await post("inquiry", { trackId: input.authority });
    if (Number(data.result) !== 100 || Number(data.status) !== 2) throw new ZibalError("Ø§Ø³ØªØ¹Ù„Ø§Ù… ØªØ±Ø§Ú©Ù†Ø´ ØªØ£ÛŒÛŒØ¯Ø´Ø¯Ù‡ Ø²ÛŒØ¨Ø§Ù„ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯.", 201);
  } else if (Number(data.result) !== 100) {
    throw new ZibalError("ØªØ£ÛŒÛŒØ¯ Ù¾Ø±Ø¯Ø§Ø®Øª Ø²ÛŒØ¨Ø§Ù„ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯Ø› Ù†ÛŒØ§Ø² Ø¨Ù‡ ØªÙ„Ø§Ø´ Ù…Ø¬Ø¯Ø¯ Ø¯Ø§Ø±Ø¯.", Number(data.result));
  }
  const amount = String(data.amount ?? "");
  if (!/^\d+$/.test(amount) || BigInt(amount) !== BigInt(expected)) {
    // A successful provider response with missing/mismatched money needs review, never fulfilment.
    throw new ZibalError("Ù…Ø¨Ù„Øº ØªØ£ÛŒÛŒØ¯Ø´Ø¯Ù‡ Ø²ÛŒØ¨Ø§Ù„ Ø¨Ø§ Ø³ÙØ§Ø±Ø´ Ù…Ø·Ø§Ø¨Ù‚Øª Ù†Ø¯Ø§Ø±Ø¯Ø› Ø¨Ø±Ø±Ø³ÛŒ Ù…Ø§Ù„ÛŒ Ù„Ø§Ø²Ù… Ø§Ø³Øª.", 100);
  }
  const referenceId = String(data.refNumber ?? "");
  if (!/^\d+$/.test(referenceId) || BigInt(referenceId) <= 0n || (typeof data.refNumber === "number" && !Number.isSafeInteger(data.refNumber))) {
    throw new ZibalError("Ø´Ù†Ø§Ø³Ù‡ Ù…Ø±Ø¬Ø¹ Ù…Ø¹ØªØ¨Ø± Ø¯Ø± Ù¾Ø§Ø³Ø® Ù…ÙˆÙÙ‚ Ø²ÛŒØ¨Ø§Ù„ Ù…ÙˆØ¬ÙˆØ¯ Ù†ÛŒØ³ØªØ› Ø¨Ø±Ø±Ø³ÛŒ Ù…Ø§Ù„ÛŒ Ù„Ø§Ø²Ù… Ø§Ø³Øª.", 100);
  }
  return { code: 100, message: "Ù¾Ø±Ø¯Ø§Ø®Øª ØªØ£ÛŒÛŒØ¯ Ø´Ø¯.", referenceId,
    fee: Number(data.fee ?? 0), feeType: String(data.fee_type ?? "") };
}

export function zibalStartUrl(trackId: string): string {
  if (!/^\d+$/.test(trackId)) throw new ZibalError("Ø´Ù†Ø§Ø³Ù‡ ØªØ±Ø§Ú©Ù†Ø´ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.");
  return `${endpoint("start")}${trackId}`;
}


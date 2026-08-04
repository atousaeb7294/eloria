import { createHmac, timingSafeEqual } from "node:crypto";

type ReceiptPayload = {
  orderId: string;
  attemptId: string;
  outcome: "success" | "review" | "failed";
  exp: number;
};

function secret(): string {
  const configured = process.env.ELORIA_PAYMENT_RECEIPT_SECRET?.trim();
  if (configured && configured.length >= 32) return configured;
  const fallback = process.env.ELORIA_TRACKING_SECRET?.trim();
  if (fallback && fallback.length >= 32) return fallback;
  const sessionFallback = process.env.ELORIA_ADMIN_SESSION_SECRET?.trim();
  if (sessionFallback && sessionFallback.length >= 32) return sessionFallback;
  throw new Error("ELORIA_PAYMENT_RECEIPT_SECRET تنظیم نشده است.");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createPaymentReceiptToken(input: Omit<ReceiptPayload, "exp">): string {
  const encoded = Buffer.from(JSON.stringify({
    ...input,
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
  } satisfies ReceiptPayload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyPaymentReceiptToken(token: string): ReceiptPayload | null {
  const [encoded, supplied] = token.split(".");
  if (!encoded || !supplied) return null;
  const expected = sign(encoded);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<ReceiptPayload>;
    if (
      typeof payload.orderId !== "string" ||
      typeof payload.attemptId !== "string" ||
      !["success", "review", "failed"].includes(payload.outcome ?? "") ||
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) return null;
    return payload as ReceiptPayload;
  } catch {
    return null;
  }
}

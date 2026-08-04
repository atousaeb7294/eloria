import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 15 * 60;

type TrackingPayload = {
  orderId: string;
  exp: number;
};

function secret(): string {
  const configured = process.env.ELORIA_TRACKING_SECRET?.trim();
  if (configured && configured.length >= 32) return configured;
  const fallback = process.env.ELORIA_ADMIN_SESSION_SECRET?.trim();
  if (fallback && fallback.length >= 32) return fallback;
  throw new Error("ELORIA_TRACKING_SECRET تنظیم نشده است.");
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createOrderTrackingToken(orderId: string): string {
  const payload = encode(JSON.stringify({
    orderId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  } satisfies TrackingPayload));
  return `${payload}.${signature(payload)}`;
}

export function verifyOrderTrackingToken(token: string): TrackingPayload | null {
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return null;
  const expected = signature(payload);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(decode(payload)) as Partial<TrackingPayload>;
    if (typeof parsed.orderId !== "string" || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return { orderId: parsed.orderId, exp: parsed.exp };
  } catch {
    return null;
  }
}

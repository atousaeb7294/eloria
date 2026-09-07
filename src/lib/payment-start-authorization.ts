import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const PAYMENT_START_COOKIE_PREFIX =
  process.env.NODE_ENV === "production"
    ? "__Host-eloria_payment_start_"
    : "eloria_payment_start_";

function cookieName(orderId: string): string {
  const safeOrderId = orderId.trim();
  if (!/^[0-9a-fA-F-]{36}$/.test(safeOrderId)) {
    throw new Error("شناسه سفارش برای مجوز پرداخت معتبر نیست.");
  }
  return `${PAYMENT_START_COOKIE_PREFIX}${safeOrderId}`;
}

type PaymentStartPayload = {
  orderId: string;
  amountToman: string;
  mobileHash: string;
  exp: number;
};

function secret(): string {
  const configured =
    process.env.ELORIA_PAYMENT_START_SECRET?.trim() ?? "";

  if (configured.length >= 48) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ELORIA_PAYMENT_START_SECRET برای Production تنظیم نشده است.",
    );
  }

  return "eloria-development-payment-start-secret-not-for-production-123456";
}

function mobileHash(mobile: string): string {
  return createHmac("sha256", secret())
    .update(`payment-mobile:${mobile.trim()}`)
    .digest("base64url");
}

function signature(encoded: string): string {
  return createHmac("sha256", secret())
    .update(`payment-start:${encoded}`)
    .digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createPaymentStartAuthorization(input: {
  orderId: string;
  amountToman: string;
  mobile: string;
  ttlSeconds?: number;
}): string {
  const ttl = Math.min(
    Math.max(Math.trunc(input.ttlSeconds ?? 20 * 60), 60),
    30 * 60,
  );

  const payload: PaymentStartPayload = {
    orderId: input.orderId,
    amountToman: input.amountToman,
    mobileHash: mobileHash(input.mobile),
    exp: Math.floor(Date.now() / 1000) + ttl,
  };

  const encoded = Buffer.from(
    JSON.stringify(payload),
    "utf8",
  ).toString("base64url");

  return `${encoded}.${signature(encoded)}`;
}

export function verifyPaymentStartAuthorization(
  token: string,
  expected: {
    orderId: string;
    amountToman: string;
    mobile: string;
  },
): boolean {
  const [encoded, suppliedSignature, ...extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra.length) return false;

  const expectedSignature = signature(encoded);
  if (!safeEqual(suppliedSignature, expectedSignature)) return false;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<PaymentStartPayload>;

    if (
      typeof parsed.orderId !== "string" ||
      typeof parsed.amountToman !== "string" ||
      typeof parsed.mobileHash !== "string" ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= Math.floor(Date.now() / 1000)
    ) {
      return false;
    }

    return (
      parsed.orderId === expected.orderId &&
      parsed.amountToman === expected.amountToman &&
      safeEqual(parsed.mobileHash, mobileHash(expected.mobile))
    );
  } catch {
    return false;
  }
}

export function setPaymentStartAuthorizationCookie(
  response: NextResponse,
  input: {
    orderId: string;
    amountToman: string;
    mobile: string;
  },
): void {
  response.cookies.set(
    cookieName(input.orderId),
    createPaymentStartAuthorization(input),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 20 * 60,
    },
  );
}

export function readPaymentStartAuthorizationCookie(
  request: NextRequest,
  orderId: string,
): string | null {
  return request.cookies.get(cookieName(orderId))?.value ?? null;
}

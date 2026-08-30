import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

import { getCustomerFromRequest } from "@/lib/customer-auth";
import {
  addVisitorSupportMessage,
  getPublicSupportSnapshot,
  setSupportChatCookie,
  supportChatIsEnabled,
  supportChatTurnstileRequired,
  SUPPORT_CHAT_COOKIE,
} from "@/lib/support-chat";
import { JsonRequestBodyError, readJsonBody } from "@/lib/security/json-body";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const requestSchema = z.object({
  locale: z.enum(["fa", "en"]).default("fa"),
  message: z.string().trim().min(1).max(1200),
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().min(5).max(30).optional(),
  turnstileToken: z.string().trim().min(1).max(4096).nullable().optional(),
});

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Vary: "Cookie",
  };
}

function disabled() {
  return NextResponse.json(
    { successful: false, enabled: false, message: "گفت‌وگوی پشتیبانی در حال حاضر فعال نیست." },
    { status: 503, headers: noStoreHeaders() },
  );
}

export async function GET(request: NextRequest) {
  if (!supportChatIsEnabled()) return disabled();

  const rate = await consumeRateLimit({
    key: `support-chat-read:${requestIp(request)}`,
    limit: 120,
    windowMs: 10 * 60_000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { successful: false, message: "تعداد بررسی گفت‌وگو بیش از حد مجاز است." },
      {
        status: 429,
        headers: { ...noStoreHeaders(), "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  try {
    const snapshot = await getPublicSupportSnapshot(
      request.cookies.get(SUPPORT_CHAT_COOKIE)?.value,
    );

    return NextResponse.json(
      { successful: true, enabled: true, ...snapshot },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    console.error("[Eloria Support Chat] Unable to read visitor conversation.", error);
    return NextResponse.json(
      { successful: false, message: "دریافت گفت‌وگو موقتاً ممکن نیست." },
      { status: 503, headers: noStoreHeaders() },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!supportChatIsEnabled()) return disabled();

  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(
      { successful: false, message: "مبدأ درخواست معتبر نیست." },
      { status: 403, headers: noStoreHeaders() },
    );
  }

  const ip = requestIp(request);
  const rate = await consumeRateLimit({
    key: `support-chat-write:${ip}`,
    limit: 12,
    windowMs: 10 * 60_000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { successful: false, message: "تعداد پیام‌ها بیش از حد مجاز است." },
      {
        status: 429,
        headers: { ...noStoreHeaders(), "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await readJsonBody(request, 12 * 1024);
  } catch (error) {
    return NextResponse.json(
      { successful: false, message: "ساختار پیام معتبر نیست." },
      {
        status: error instanceof JsonRequestBodyError ? error.status : 400,
        headers: noStoreHeaders(),
      },
    );
  }

  const parsed = requestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { successful: false, message: "اطلاعات پیام کامل یا معتبر نیست." },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  if (supportChatTurnstileRequired()) {
    const challenge = await verifyTurnstileToken({
      token: parsed.data.turnstileToken ?? null,
      ip,
      expectedAction: "support-chat",
    });

    if (!challenge.successful) {
      return NextResponse.json(
        { successful: false, message: "تأیید امنیتی پیام ناموفق بود." },
        { status: 403, headers: noStoreHeaders() },
      );
    }
  }

  try {
    const customer = await getCustomerFromRequest(request).catch(() => null);
    const saved = await addVisitorSupportMessage({
      accessToken: request.cookies.get(SUPPORT_CHAT_COOKIE)?.value,
      locale: parsed.data.locale,
      message: parsed.data.message,
      name: parsed.data.name ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      customerId: customer?.customer.id ?? null,
    });

    const response = NextResponse.json(
      {
        successful: true,
        message: "پیام شما ثبت شد. پاسخ پشتیبانی در همین گفت‌وگو نمایش داده می‌شود.",
        conversationId: saved.conversationId,
        supportMessage: saved.message,
      },
      { headers: noStoreHeaders() },
    );

    if (saved.tokenForCookie) {
      setSupportChatCookie(response, saved.tokenForCookie);
    }

    return response;
  } catch (error) {
    console.error("[Eloria Support Chat] Unable to save visitor message.", error);
    return NextResponse.json(
      { successful: false, message: "ثبت پیام موقتاً ممکن نیست. دوباره تلاش کنید." },
      { status: 503, headers: noStoreHeaders() },
    );
  }
}

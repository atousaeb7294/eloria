import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

import { hasValidAdminSession } from "@/lib/admin-auth";
import {
  getSupportConversationForAdmin,
  getSupportInbox,
  replyToSupportConversation,
  setSupportConversationStatus,
  supportChatIsEnabled,
  touchSupportAgentPresence,
} from "@/lib/support-chat";
import { JsonRequestBodyError, readJsonBody } from "@/lib/security/json-body";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const conversationId = z.string().uuid();

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("heartbeat") }),
  z.object({
    action: z.literal("reply"),
    conversationId,
    message: z.string().trim().min(1).max(1200),
  }),
  z.object({
    action: z.literal("status"),
    conversationId,
    status: z.enum(["open", "closed"]),
  }),
]);

function noStoreHeaders() {
  return { "Cache-Control": "no-store, no-cache, must-revalidate" };
}

function unavailable() {
  return NextResponse.json(
    { successful: false, message: "گفت‌وگوی پشتیبانی فعال نیست." },
    { status: 503, headers: noStoreHeaders() },
  );
}

async function authorised() {
  return hasValidAdminSession();
}

export async function GET(request: NextRequest) {
  if (!supportChatIsEnabled()) return unavailable();
  if (!(await authorised())) {
    return NextResponse.json({ successful: false }, { status: 401, headers: noStoreHeaders() });
  }

  const id = request.nextUrl.searchParams.get("conversation") ?? "";
  if (id) {
    if (!conversationId.safeParse(id).success) {
      return NextResponse.json({ successful: false }, { status: 400, headers: noStoreHeaders() });
    }

    const conversation = await getSupportConversationForAdmin(id).catch(() => null);
    if (!conversation) {
      return NextResponse.json({ successful: false, message: "گفت‌وگو پیدا نشد." }, { status: 404, headers: noStoreHeaders() });
    }

    return NextResponse.json({ successful: true, conversation }, { headers: noStoreHeaders() });
  }

  try {
    const conversations = await getSupportInbox();
    return NextResponse.json({ successful: true, conversations }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("[Eloria Admin Support] Unable to load inbox.", error);
    return NextResponse.json(
      { successful: false, message: "دریافت صندوق پشتیبانی ممکن نیست." },
      { status: 503, headers: noStoreHeaders() },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!supportChatIsEnabled()) return unavailable();
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ successful: false }, { status: 403, headers: noStoreHeaders() });
  }
  if (!(await authorised())) {
    return NextResponse.json({ successful: false }, { status: 401, headers: noStoreHeaders() });
  }

  const rate = await consumeRateLimit({
    key: `admin-support:${requestIp(request)}`,
    limit: 180,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { successful: false, message: "تعداد درخواست‌های مدیریت پشتیبانی بیش از حد مجاز است." },
      { status: 429, headers: { ...noStoreHeaders(), "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await readJsonBody(request, 12 * 1024);
  } catch (error) {
    return NextResponse.json(
      { successful: false },
      { status: error instanceof JsonRequestBodyError ? error.status : 400, headers: noStoreHeaders() },
    );
  }

  const parsed = actionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { successful: false, message: "درخواست مدیریت پشتیبانی معتبر نیست." },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  try {
    if (parsed.data.action === "heartbeat") {
      await touchSupportAgentPresence();
      return NextResponse.json({ successful: true }, { headers: noStoreHeaders() });
    }

    if (parsed.data.action === "reply") {
      const message = await replyToSupportConversation(parsed.data);
      await touchSupportAgentPresence();
      return NextResponse.json({ successful: true, message }, { headers: noStoreHeaders() });
    }

    await setSupportConversationStatus(parsed.data);
    await touchSupportAgentPresence();
    return NextResponse.json({ successful: true }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("[Eloria Admin Support] Unable to update inbox.", error);
    return NextResponse.json(
      { successful: false, message: "به‌روزرسانی گفت‌وگو ممکن نیست." },
      { status: 503, headers: noStoreHeaders() },
    );
  }
}

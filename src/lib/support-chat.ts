import { createHmac, randomBytes } from "node:crypto";
import type { NextResponse } from "next/server";

import { legalBusinessIdentity } from "@/lib/legal-business";
import { prisma } from "@/lib/prisma";
import { isSupportChatEnabled } from "@/lib/runtime-features";

const PRESENCE_WINDOW_MS = 90_000;
const VISITOR_TOKEN_BYTES = 32;

export const SUPPORT_CHAT_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-eloria_support_chat"
    : "eloria_support_chat";

type SupportMessageRecord = {
  id: string;
  author: "VISITOR" | "ADMIN";
  body: string;
  createdAt: Date;
};

export type SupportMessageDto = {
  id: string;
  author: "visitor" | "admin";
  body: string;
  createdAt: string;
};

type ConversationRecord = {
  id: string;
  status: "OPEN" | "CLOSED";
  locale: string;
  lastMessageAt: Date;
  createdAt: Date;
  visitorName: string | null;
  visitorEmail: string | null;
  visitorPhone: string | null;
};

function supportSecret(): string {
  const configured = process.env.ELORIA_SUPPORT_CHAT_SECRET?.trim() ?? "";
  if (configured.length >= 48) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error("ELORIA_SUPPORT_CHAT_SECRET must be configured in production.");
  }

  return "eloria-development-support-chat-secret-not-for-production";
}

function hmac(value: string): string {
  return createHmac("sha256", supportSecret())
    .update(`support-chat:${value}`)
    .digest("hex");
}

function tokenHash(token: string | null | undefined): string | null {
  const normalized = token?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(normalized)) return null;
  return hmac(`visitor:${normalized}`);
}

function createVisitorToken(): string {
  return randomBytes(VISITOR_TOKEN_BYTES).toString("base64url");
}

function clean(value: string | null | undefined, maximum: number): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ").slice(0, maximum) ?? "";
  return normalized || null;
}

function messageDto(message: SupportMessageRecord): SupportMessageDto {
  return {
    id: message.id,
    author: message.author === "ADMIN" ? "admin" : "visitor",
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

function conversationDto(conversation: ConversationRecord) {
  return {
    id: conversation.id,
    status: conversation.status === "CLOSED" ? "closed" : "open",
    locale: conversation.locale === "en" ? "en" : "fa",
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    createdAt: conversation.createdAt.toISOString(),
  } as const;
}

export function supportChatIsEnabled(): boolean {
  return isSupportChatEnabled();
}

export function supportChatTurnstileRequired(): boolean {
  const raw = process.env.ELORIA_SUPPORT_TURNSTILE_REQUIRED?.trim().toLowerCase();
  if (raw === "false" || raw === "0") return false;
  return raw === "true" || raw === "1" || process.env.NODE_ENV === "production";
}

export function setSupportChatCookie(response: NextResponse, token: string): void {
  response.cookies.set(SUPPORT_CHAT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
    priority: "high",
  });
}

export async function getPublicSupportSnapshot(token: string | null | undefined) {
  const hash = tokenHash(token);

  const [conversation, presence] = await Promise.all([
    hash
      ? prisma.supportConversation.findUnique({
          where: { accessTokenHash: hash },
          select: {
            id: true,
            status: true,
            locale: true,
            lastMessageAt: true,
            createdAt: true,
            visitorName: true,
            visitorEmail: true,
            visitorPhone: true,
            messages: {
              orderBy: { createdAt: "asc" },
              take: 120,
              select: { id: true, author: true, body: true, createdAt: true },
            },
          },
        })
      : Promise.resolve(null),
    prisma.supportAgentPresence.findUnique({
      where: { id: "primary" },
      select: { lastSeenAt: true },
    }),
  ]);

  const agentOnline = Boolean(
    presence && Date.now() - presence.lastSeenAt.getTime() <= PRESENCE_WINDOW_MS,
  );
  const legal = legalBusinessIdentity();

  return {
    agentOnline,
    supportEmail: legal.supportEmail || null,
    conversation: conversation ? conversationDto(conversation) : null,
    messages: conversation ? conversation.messages.map(messageDto) : [],
  };
}

export async function addVisitorSupportMessage(input: {
  accessToken: string | null | undefined;
  locale: "fa" | "en";
  message: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  customerId?: string | null;
}) {
  const currentHash = tokenHash(input.accessToken);
  const now = new Date();
  const body = clean(input.message, 1200);

  if (!body) throw new Error("Support message is empty.");

  const name = clean(input.name, 120);
  const email = clean(input.email, 254)?.toLowerCase() ?? null;
  const phone = clean(input.phone, 30);
  const locale = input.locale === "en" ? "en" : "fa";

  return prisma.$transaction(async (transaction) => {
    let tokenForCookie: string | null = null;
    let conversation = currentHash
      ? await transaction.supportConversation.findUnique({
          where: { accessTokenHash: currentHash },
          select: { id: true },
        })
      : null;

    if (!conversation) {
      const token = createVisitorToken();
      tokenForCookie = token;
      conversation = await transaction.supportConversation.create({
        data: {
          accessTokenHash: hmac(`visitor:${token}`),
          customerId: input.customerId ?? null,
          locale,
          visitorName: name,
          visitorEmail: email,
          visitorPhone: phone,
          status: "OPEN",
          lastMessageAt: now,
        },
        select: { id: true },
      });
    } else {
      await transaction.supportConversation.update({
        where: { id: conversation.id },
        data: {
          ...(input.customerId ? { customerId: input.customerId } : {}),
          ...(name ? { visitorName: name } : {}),
          ...(email ? { visitorEmail: email } : {}),
          ...(phone ? { visitorPhone: phone } : {}),
          locale,
          status: "OPEN",
          closedAt: null,
          lastMessageAt: now,
        },
      });
    }

    const message = await transaction.supportMessage.create({
      data: {
        conversationId: conversation.id,
        author: "VISITOR",
        body,
      },
      select: { id: true, author: true, body: true, createdAt: true },
    });

    return {
      tokenForCookie,
      message: messageDto(message),
    };
  });
}

export async function touchSupportAgentPresence() {
  const now = new Date();
  await prisma.supportAgentPresence.upsert({
    where: { id: "primary" },
    create: { id: "primary", lastSeenAt: now },
    update: { lastSeenAt: now },
  });
}

export async function getSupportInbox() {
  const conversations = await prisma.supportConversation.findMany({
    take: 80,
    orderBy: [{ status: "asc" }, { lastMessageAt: "desc" }],
    select: {
      id: true,
      status: true,
      locale: true,
      visitorName: true,
      visitorEmail: true,
      visitorPhone: true,
      lastMessageAt: true,
      createdAt: true,
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { body: true, author: true, createdAt: true },
      },
      _count: {
        select: {
          messages: {
            where: { author: "VISITOR", readAt: null },
          },
        },
      },
    },
  });

  return conversations.map((conversation) => ({
    ...conversationDto(conversation),
    visitor: {
      name: conversation.visitorName,
      email: conversation.visitorEmail,
      phone: conversation.visitorPhone,
    },
    unreadCount: conversation._count.messages,
    lastMessage: conversation.messages[0]
      ? {
          body: conversation.messages[0].body,
          author: conversation.messages[0].author === "ADMIN" ? "admin" : "visitor",
          createdAt: conversation.messages[0].createdAt.toISOString(),
        }
      : null,
  }));
}

export async function getSupportConversationForAdmin(conversationId: string) {
  const conversation = await prisma.supportConversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      status: true,
      locale: true,
      visitorName: true,
      visitorEmail: true,
      visitorPhone: true,
      lastMessageAt: true,
      createdAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        select: { id: true, author: true, body: true, createdAt: true },
      },
    },
  });

  if (!conversation) return null;

  return {
    ...conversationDto(conversation),
    visitor: {
      name: conversation.visitorName,
      email: conversation.visitorEmail,
      phone: conversation.visitorPhone,
    },
    messages: conversation.messages.map(messageDto),
  };
}

export async function replyToSupportConversation(input: {
  conversationId: string;
  message: string;
}) {
  const body = clean(input.message, 1200);
  if (!body) throw new Error("Support reply is empty.");

  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    const conversation = await transaction.supportConversation.findUnique({
      where: { id: input.conversationId },
      select: { id: true },
    });

    if (!conversation) throw new Error("Support conversation was not found.");

    await transaction.supportConversation.update({
      where: { id: conversation.id },
      data: { status: "OPEN", closedAt: null, lastMessageAt: now },
    });

    await transaction.supportMessage.updateMany({
      where: { conversationId: conversation.id, author: "VISITOR", readAt: null },
      data: { readAt: now },
    });

    const message = await transaction.supportMessage.create({
      data: { conversationId: conversation.id, author: "ADMIN", body },
      select: { id: true, author: true, body: true, createdAt: true },
    });

    return messageDto(message);
  });
}

export async function setSupportConversationStatus(input: {
  conversationId: string;
  status: "open" | "closed";
}) {
  const now = new Date();
  const updated = await prisma.supportConversation.updateMany({
    where: { id: input.conversationId },
    data: {
      status: input.status === "closed" ? "CLOSED" : "OPEN",
      closedAt: input.status === "closed" ? now : null,
    },
  });

  if (!updated.count) throw new Error("Support conversation was not found.");
}

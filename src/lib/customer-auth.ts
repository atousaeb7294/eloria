import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const CUSTOMER_SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-eloria_customer_session"
    : "eloria_customer_session";

const DEFAULT_SESSION_DAYS = 30;
const DEFAULT_OTP_MINUTES = 5;

export type CustomerOtpChannel = "SMS" | "EMAIL";

function authSecret(): string {
  const explicit = process.env.ELORIA_CUSTOMER_AUTH_SECRET?.trim();

  if (explicit && explicit.length >= 48) {
    return explicit;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ELORIA_CUSTOMER_AUTH_SECRET must be at least 48 characters in production.",
    );
  }

  return (
    process.env.ELORIA_ADMIN_SESSION_SECRET?.trim() ||
    "eloria-development-customer-auth-secret-not-for-production"
  );
}

function intEnv(
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = Number.parseInt(
    process.env[name]?.trim() ?? "",
    10,
  );

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(
    Math.max(value, min),
    max,
  );
}

export function customerSessionDays(): number {
  return intEnv(
    "ELORIA_CUSTOMER_SESSION_DAYS",
    DEFAULT_SESSION_DAYS,
    1,
    90,
  );
}

export function customerOtpMinutes(): number {
  return intEnv(
    "ELORIA_CUSTOMER_OTP_TTL_MINUTES",
    DEFAULT_OTP_MINUTES,
    2,
    15,
  );
}

export function normalizeIranMobile(
  value: string,
): string {
  const translated = value
    .trim()
    .replace(/[Û°-Û¹]/g, c =>
      String("Û°Û±Û²Û³Û´ÛµÛ¶Û·Û¸Û¹".indexOf(c)),
    )
    .replace(/[Ù -Ù©]/g, c =>
      String("Ù Ù¡Ù¢Ù£Ù¤Ù¥Ù¦Ù§Ù¨Ù©".indexOf(c)),
    )
    .replace(/[\s()-]/g, "");

  let mobile = translated;

  if (mobile.startsWith("+98")) {
    mobile = `0${mobile.slice(3)}`;
  } else if (mobile.startsWith("0098")) {
    mobile = `0${mobile.slice(4)}`;
  } else if (
    mobile.startsWith("98") &&
    mobile.length === 12
  ) {
    mobile = `0${mobile.slice(2)}`;
  }

  if (!/^09\d{9}$/.test(mobile)) {
    throw new Error(
      "Ø´Ù…Ø§Ø±Ù‡ Ù…ÙˆØ¨Ø§ÛŒÙ„ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.",
    );
  }

  return mobile;
}

export function normalizeCustomerAuthEmail(
  value: string,
): string {
  const email = value
    .trim()
    .toLowerCase();

  if (
    email.length < 5 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error(
      "Ù†Ø´Ø§Ù†ÛŒ Ø§ÛŒÙ…ÛŒÙ„ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.",
    );
  }

  return email;
}

function hmac(
  value: string,
): string {
  return createHmac(
    "sha256",
    authSecret(),
  )
    .update(value)
    .digest("hex");
}

export function hashRequestIp(
  ip: string | null | undefined,
): string | null {
  const normalized = ip?.trim();

  if (!normalized) {
    return null;
  }

  return createHash("sha256")
    .update(
      `${authSecret()}:ip:${normalized}`,
    )
    .digest("hex");
}

export function createOtpCode(): string {
  const dev =
    process.env.NODE_ENV !== "production"
      ? process.env.ELORIA_CUSTOMER_OTP_DEV_CODE?.trim()
      : "";

  if (
    dev &&
    /^\d{6}$/.test(dev)
  ) {
    return dev;
  }

  return String(
    randomInt(100000, 1000000),
  );
}

export function hashOtp(
  challengeId: string,
  code: string,
): string {
  return hmac(
    `otp:${challengeId}:${code}`,
  );
}

export function safeEqualHex(
  a: string,
  b: string,
): boolean {
  if (
    !/^[a-f0-9]{64}$/i.test(a) ||
    !/^[a-f0-9]{64}$/i.test(b)
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(a, "hex"),
    Buffer.from(b, "hex"),
  );
}

export async function createCustomerOtpChallenge(
  input:
    | {
        channel?: "SMS";
        mobile: string;
        ip?: string | null;
      }
    | {
        channel: "EMAIL";
        email: string;
        mobile: string;
        ip?: string | null;
      },
) {
  const id = randomUUID();
  const code = createOtpCode();
  const now = new Date();

  const expiresAt = new Date(
    now.getTime() +
      customerOtpMinutes() * 60_000,
  );

  const mobile =
    normalizeIranMobile(input.mobile);

  const email =
    input.channel === "EMAIL"
      ? normalizeCustomerAuthEmail(
          input.email,
        )
      : null;

  const lockIdentity =
    input.channel === "EMAIL"
      ? email
      : mobile;

  await prisma.$transaction(
    async tx => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${`customer-otp:${input.channel}:${lockIdentity}`})
        )
      `;

      await tx.customerOtpChallenge.updateMany({
        where: {
          channel: input.channel,
          ...(input.channel === "EMAIL"
            ? { email }
            : { mobile }),
          consumedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          consumedAt: now,
        },
      });

      await tx.customerOtpChallenge.create({
        data: {
          id,
          channel: input.channel,
          mobile,
          email,
          codeHash: hashOtp(
            id,
            code,
          ),
          expiresAt,
          requestIpHash:
            hashRequestIp(input.ip),
        },
      });
    },
  );

  return {
    id,
    channel: input.channel,
    mobile,
    email,
    code,
    expiresAt,
  };
}

export async function consumeCustomerOtp(
  input:
    | {
        challengeId: string;
        channel?: "SMS";
        mobile: string;
        code: string;
      }
    | {
        challengeId: string;
        channel: "EMAIL";
        email: string;
        mobile: string;
        code: string;
      },
) {
  const mobile =
    normalizeIranMobile(input.mobile);

  const email =
    input.channel === "EMAIL"
      ? normalizeCustomerAuthEmail(
          input.email,
        )
      : null;

  const code = input.code.trim();

  if (!/^\d{6}$/.test(code)) {
    throw new Error(
      "Ú©Ø¯ ØªØ£ÛŒÛŒØ¯ Ø¨Ø§ÛŒØ¯ Û¶ Ø±Ù‚Ù… Ø¨Ø§Ø´Ø¯.",
    );
  }

  const now = new Date();

  const result =
    await prisma.$transaction(
      async tx => {
        await tx.$queryRaw`
          SELECT id
          FROM customer_otp_challenges
          WHERE id = ${input.challengeId}::uuid
          FOR UPDATE
        `;

        const challenge =
          await tx.customerOtpChallenge.findUnique({
            where: {
              id: input.challengeId,
            },
          });

        if (!challenge) {
          throw new Error(
            "Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ú©Ø¯ ØªØ£ÛŒÛŒØ¯ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.",
          );
        }

        if (
          challenge.channel !==
          input.channel
        ) {
          throw new Error(
            "Ú©Ø§Ù†Ø§Ù„ Ú©Ø¯ ØªØ£ÛŒÛŒØ¯ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.",
          );
        }

        if (
          challenge.mobile !== mobile
        ) {
          throw new Error(
            "Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ú©Ø¯ ØªØ£ÛŒÛŒØ¯ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.",
          );
        }

        if (
          input.channel === "EMAIL" &&
          challenge.email !== email
        ) {
          throw new Error(
            "Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ú©Ø¯ ØªØ£ÛŒÛŒØ¯ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.",
          );
        }

        if (
          challenge.purpose !== "LOGIN"
        ) {
          throw new Error(
            "Ù‡Ø¯Ù Ú©Ø¯ ØªØ£ÛŒÛŒØ¯ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.",
          );
        }

        if (challenge.consumedAt) {
          throw new Error(
            "Ø§ÛŒÙ† Ú©Ø¯ Ù‚Ø¨Ù„Ø§ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ø´Ø¯Ù‡ Ø§Ø³Øª.",
          );
        }

        if (
          challenge.expiresAt.getTime() <=
          now.getTime()
        ) {
          throw new Error(
            "Ù…Ù‡Ù„Øª Ú©Ø¯ ØªØ£ÛŒÛŒØ¯ Ù¾Ø§ÛŒØ§Ù† ÛŒØ§ÙØªÙ‡ Ø§Ø³Øª.",
          );
        }

        if (
          challenge.attempts >=
          challenge.maxAttempts
        ) {
          throw new Error(
            "ØªØ¹Ø¯Ø§Ø¯ ØªÙ„Ø§Ø´Ù‡Ø§ÛŒ Ú©Ø¯ ØªØ£ÛŒÛŒØ¯ Ø¨ÛŒØ´ Ø§Ø² Ø­Ø¯ Ù…Ø¬Ø§Ø² Ø§Ø³Øª.",
          );
        }

        const valid =
          safeEqualHex(
            challenge.codeHash,
            hashOtp(
              challenge.id,
              code,
            ),
          );

        if (!valid) {
          await tx.customerOtpChallenge.update({
            where: {
              id: challenge.id,
            },
            data: {
              attempts: {
                increment: 1,
              },
            },
          });

          return {
            successful: false as const,
            message:
              "Ú©Ø¯ ØªØ£ÛŒÛŒØ¯ ØµØ­ÛŒØ­ Ù†ÛŒØ³Øª.",
          };
        }

        await tx.customerOtpChallenge.update({
          where: {
            id: challenge.id,
          },
          data: {
            attempts: {
              increment: 1,
            },
            consumedAt: now,
          },
        });

        if (
          input.channel === "SMS"
        ) {
          const existingCustomer =
            await tx.customer.findUnique({
              where: {
                mobile,
              },
            });

          if (
            existingCustomer &&
            !existingCustomer.isActive
          ) {
            return {
              successful: false as const,
              message:
                "Ø§ÛŒÙ† Ø­Ø³Ø§Ø¨ Ú©Ø§Ø±Ø¨Ø±ÛŒ ØºÛŒØ±ÙØ¹Ø§Ù„ Ø§Ø³Øª.",
            };
          }

          const customer =
            await tx.customer.upsert({
              where: {
                mobile,
              },
              create: {
                mobile,
                mobileVerifiedAt: now,
                lastLoginAt: now,
                isActive: true,
              },
              update: {
                mobileVerifiedAt: now,
                lastLoginAt: now,
              },
            });

          return {
            successful: true as const,
            customer,
          };
        }

        const existingByEmail =
          await tx.customer.findUnique({
            where: {
              email: email!,
            },
          });

        const existingByMobile =
          await tx.customer.findUnique({
            where: {
              mobile,
            },
          });

        if (
          existingByEmail &&
          existingByMobile &&
          existingByEmail.id !==
            existingByMobile.id
        ) {
          return {
            successful: false as const,
            message:
              "Ø§ÛŒÙ† Ø§ÛŒÙ…ÛŒÙ„ Ùˆ Ø´Ù…Ø§Ø±Ù‡ Ù…ÙˆØ¨Ø§ÛŒÙ„ Ø¨Ù‡ Ø¯Ùˆ Ø­Ø³Ø§Ø¨ Ù…ØªÙØ§ÙˆØª Ù…ØªØµÙ„ Ù‡Ø³ØªÙ†Ø¯.",
          };
        }

        const existingCustomer =
          existingByEmail ??
          existingByMobile;

        if (
          existingCustomer &&
          !existingCustomer.isActive
        ) {
          return {
            successful: false as const,
            message:
              "Ø§ÛŒÙ† Ø­Ø³Ø§Ø¨ Ú©Ø§Ø±Ø¨Ø±ÛŒ ØºÛŒØ±ÙØ¹Ø§Ù„ Ø§Ø³Øª.",
          };
        }

        if (
          existingCustomer &&
          existingCustomer.email &&
          existingCustomer.email !== email
        ) {
          return {
            successful: false as const,
            message:
              "Ø§ÛŒÙ† Ø´Ù…Ø§Ø±Ù‡ Ù…ÙˆØ¨Ø§ÛŒÙ„ Ø¨Ù‡ Ø§ÛŒÙ…ÛŒÙ„ Ø¯ÛŒÚ¯Ø±ÛŒ Ù…ØªØµÙ„ Ø§Ø³Øª.",
          };
        }

        if (existingCustomer) {
          const customer =
            await tx.customer.update({
              where: {
                id: existingCustomer.id,
              },
              data: {
                email,
                emailVerifiedAt: now,
                lastLoginAt: now,
              },
            });

          return {
            successful: true as const,
            customer,
          };
        }

        const customer =
          await tx.customer.create({
            data: {
              mobile,
              email,
              emailVerifiedAt: now,
              lastLoginAt: now,
              isActive: true,
            },
          });

        return {
          successful: true as const,
          customer,
        };
      },
    );

  if (!result.successful) {
    throw new Error(
      result.message,
    );
  }

  return result.customer;
}

export async function createCustomerSession(
  input: {
    customerId: string;
    ip?: string | null;
    userAgent?: string | null;
  },
) {
  const token =
    randomBytes(32).toString(
      "base64url",
    );

  const expiresAt = new Date(
    Date.now() +
      customerSessionDays() *
        24 *
        60 *
        60_000,
  );

  await prisma.customerSession.create({
    data: {
      customerId:
        input.customerId,
      sessionHash:
        hmac(`session:${token}`),
      ipHash:
        hashRequestIp(input.ip),
      userAgent:
        input.userAgent?.slice(
          0,
          500,
        ) || null,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}

export function setCustomerSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set(
    CUSTOMER_SESSION_COOKIE,
    token,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    },
  );
}

export function clearCustomerSessionCookie(
  response: NextResponse,
) {
  response.cookies.set(
    CUSTOMER_SESSION_COOKIE,
    "",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    },
  );
}

export async function getCustomerBySessionToken(
  token: string | null | undefined,
) {
  if (!token) {
    return null;
  }

  const now = new Date();

  const session =
    await prisma.customerSession.findUnique({
      where: {
        sessionHash:
          hmac(`session:${token}`),
      },
      include: {
        customer: true,
      },
    });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= now ||
    !session.customer.isActive
  ) {
    return null;
  }

  if (
    session.lastSeenAt.getTime() <
    now.getTime() - 5 * 60_000
  ) {
    void prisma.customerSession
      .update({
        where: {
          id: session.id,
        },
        data: {
          lastSeenAt: now,
        },
      })
      .catch(
        () => undefined,
      );
  }

  return {
    session,
    customer: session.customer,
  };
}

export async function getCustomerFromRequest(
  request: NextRequest,
) {
  return getCustomerBySessionToken(
    request.cookies.get(
      CUSTOMER_SESSION_COOKIE,
    )?.value,
  );
}

export async function getCurrentCustomer() {
  const store = await cookies();

  return getCustomerBySessionToken(
    store.get(
      CUSTOMER_SESSION_COOKIE,
    )?.value,
  );
}

export async function revokeCustomerSession(
  token: string | null | undefined,
) {
  if (!token) {
    return;
  }

  await prisma.customerSession.updateMany({
    where: {
      sessionHash:
        hmac(`session:${token}`),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
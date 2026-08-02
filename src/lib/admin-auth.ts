import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import {
  cookies,
} from "next/headers";

import {
  redirect,
} from "next/navigation";

const ADMIN_COOKIE_NAME =
  "eloria_admin_session";

const SESSION_LIFETIME_SECONDS =
  8 * 60 * 60;

type AdminSessionPayload = {
  expiresAt: number;
  nonce: string;
};

function getAdminPassword(): string {
  return process.env.ELORIA_ADMIN_PASSWORD?.trim() ?? "";
}

function getAdminSessionSecret(): string {
  return process.env.ELORIA_ADMIN_SESSION_SECRET?.trim() ?? "";
}

export function isAdminConfigured(): boolean {
  return (
    getAdminPassword().length >= 12 &&
    getAdminSessionSecret().length >= 32
  );
}

function safeEqual(
  left: string,
  right: string,
): boolean {
  const leftBuffer =
    Buffer.from(left);

  const rightBuffer =
    Buffer.from(right);

  if (
    leftBuffer.length !==
    rightBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    leftBuffer,
    rightBuffer,
  );
}

function signPayload(
  encodedPayload: string,
): string {
  return createHmac(
    "sha256",
    getAdminSessionSecret(),
  )
    .update(encodedPayload)
    .digest("base64url");
}

function createSessionToken(): {
  token: string;
  expiresAt: number;
} {
  const expiresAt =
    Math.floor(Date.now() / 1000) +
    SESSION_LIFETIME_SECONDS;

  const payload: AdminSessionPayload = {
    expiresAt,
    nonce:
      randomBytes(24).toString("base64url"),
  };

  const encodedPayload =
    Buffer.from(
      JSON.stringify(payload),
      "utf8",
    ).toString("base64url");

  const signature =
    signPayload(encodedPayload);

  return {
    token:
      `${encodedPayload}.${signature}`,
    expiresAt,
  };
}

function verifySessionToken(
  token: string,
): boolean {
  if (!isAdminConfigured()) {
    return false;
  }

  const [
    encodedPayload,
    suppliedSignature,
  ] = token.split(".");

  if (
    !encodedPayload ||
    !suppliedSignature
  ) {
    return false;
  }

  const expectedSignature =
    signPayload(encodedPayload);

  if (
    !safeEqual(
      suppliedSignature,
      expectedSignature,
    )
  ) {
    return false;
  }

  try {
    const payload =
      JSON.parse(
        Buffer.from(
          encodedPayload,
          "base64url",
        ).toString("utf8"),
      ) as Partial<AdminSessionPayload>;

    return (
      typeof payload.expiresAt ===
        "number" &&
      typeof payload.nonce ===
        "string" &&
      payload.nonce.length >= 16 &&
      payload.expiresAt >
        Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export function verifyAdminPassword(
  suppliedPassword: string,
): boolean {
  if (!isAdminConfigured()) {
    return false;
  }

  return safeEqual(
    suppliedPassword,
    getAdminPassword(),
  );
}

export async function createAdminSession(): Promise<void> {
  const session =
    createSessionToken();

  const cookieStore =
    await cookies();

  cookieStore.set(
    ADMIN_COOKIE_NAME,
    session.token,
    {
      httpOnly: true,
      sameSite: "strict",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge:
        SESSION_LIFETIME_SECONDS,
      expires:
        new Date(
          session.expiresAt * 1000,
        ),
    },
  );
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore =
    await cookies();

  cookieStore.set(
    ADMIN_COOKIE_NAME,
    "",
    {
      httpOnly: true,
      sameSite: "strict",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    },
  );
}

export async function hasValidAdminSession(): Promise<boolean> {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      ADMIN_COOKIE_NAME,
    )?.value;

  return token
    ? verifySessionToken(token)
    : false;
}

export async function requireAdmin(
  locale: string,
): Promise<void> {
  if (
    !(await hasValidAdminSession())
  ) {
    redirect(
      `/${locale}/admin/login`,
    );
  }
}

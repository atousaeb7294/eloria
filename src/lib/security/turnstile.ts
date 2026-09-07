type TurnstileResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

export type TurnstileVerificationResult = {
  successful: boolean;
  configured: boolean;
  errors: string[];
};

function configuredSecret(): string {
  return process.env.TURNSTILE_SECRET_KEY?.trim() ?? "";
}

export function getAllowedTurnstileHostnames(
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "",
  allowedOrigins = process.env.ELORIA_ALLOWED_ORIGINS ?? "",
): string[] {
  const hostnames = new Set<string>();

  for (const rawUrl of [siteUrl, ...allowedOrigins.split(",")]) {
    const normalized = rawUrl.trim();
    if (!normalized) {
      continue;
    }

    try {
      const url = new URL(normalized);
      if (url.protocol === "http:" || url.protocol === "https:") {
        hostnames.add(url.hostname.toLowerCase());
      }
    } catch {
      // Invalid origins are rejected by the production environment audit. They
      // must never widen the Turnstile hostname allowlist at runtime.
    }
  }

  return [...hostnames];
}

export function isTurnstileHostnameAllowed(
  returnedHostname: string,
  allowedHostnames: readonly string[],
  strict: boolean,
): boolean {
  const returned = returnedHostname.trim().toLowerCase();

  if (strict) {
    return Boolean(
      returned &&
      allowedHostnames.length > 0 &&
      allowedHostnames.includes(returned),
    );
  }

  return (
    allowedHostnames.length === 0 ||
    !returned ||
    allowedHostnames.includes(returned)
  );
}

function cleanAction(action: string | undefined): string | null {
  const normalized = action?.trim().toLowerCase();
  if (!normalized) return null;
  return /^[a-z0-9_-]{1,32}$/.test(normalized)
    ? normalized
    : null;
}

export async function verifyTurnstileToken(input: {
  token: string | null;
  ip?: string | null;
  expectedAction?: string;
}): Promise<TurnstileVerificationResult> {
  const secret = configuredSecret();

  if (!secret) {
    return process.env.NODE_ENV === "production"
      ? {
          successful: false,
          configured: false,
          errors: ["turnstile-not-configured"],
        }
      : {
          successful: true,
          configured: false,
          errors: [],
        };
  }

  const token = input.token?.trim() ?? "";
  if (!token || token.length > 4096) {
    return {
      successful: false,
      configured: true,
      errors: ["missing-or-invalid-token"],
    };
  }

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);

  const remoteIp = input.ip?.trim();
  if (remoteIp && remoteIp !== "unknown") {
    form.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      },
    );

    const payload =
      (await response.json().catch(() => null)) as TurnstileResponse | null;

    if (!response.ok || !payload) {
      return {
        successful: false,
        configured: true,
        errors: [`turnstile-http-${response.status}`],
      };
    }

    const allowedHostnames = getAllowedTurnstileHostnames();
    const returnedHostname = payload.hostname?.trim().toLowerCase() ?? "";
    const expectedAction = cleanAction(input.expectedAction);
    const returnedAction = cleanAction(payload.action);

    const strictProduction = process.env.NODE_ENV === "production";

    const hostnameMatches = isTurnstileHostnameAllowed(
      returnedHostname,
      allowedHostnames,
      strictProduction,
    );

    const actionMatches = expectedAction
      ? returnedAction === expectedAction
      : true;

    const successful =
      payload.success === true &&
      hostnameMatches &&
      actionMatches;

    return {
      successful,
      configured: true,
      errors: successful
        ? []
        : [
            ...(payload["error-codes"] ?? []),
            ...(hostnameMatches ? [] : ["hostname-mismatch"]),
            ...(actionMatches ? [] : ["action-mismatch"]),
          ],
    };
  } catch (error) {
    return {
      successful: false,
      configured: true,
      errors: [
        error instanceof Error && error.name === "TimeoutError"
          ? "turnstile-timeout"
          : "turnstile-network-error",
      ],
    };
  }
}

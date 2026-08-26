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

function domesticNetworkMode(): boolean {
  return ["1", "true", "yes", "on"].includes(
    process.env.ELORIA_DOMESTIC_NETWORK_MODE?.trim().toLowerCase() ?? "",
  );
}

function expectedHostname(): string | null {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) return null;

  try {
    return new URL(siteUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
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
  // In Iran-only mode the external Cloudflare challenge may be unreachable.
  // Origin checks, bounded JSON, IP/mobile rate limits and idempotency remain
  // active; operators should keep this mode off while Turnstile is reachable.
  if (domesticNetworkMode()) {
    return { successful: true, configured: false, errors: [] };
  }

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

    const configuredHostname = expectedHostname();
    const returnedHostname = payload.hostname?.trim().toLowerCase() ?? "";
    const expectedAction = cleanAction(input.expectedAction);
    const returnedAction = cleanAction(payload.action);

    const strictProduction = process.env.NODE_ENV === "production";

    const hostnameMatches = strictProduction
      ? Boolean(
          configuredHostname &&
            returnedHostname &&
            returnedHostname === configuredHostname,
        )
      : !configuredHostname ||
        !returnedHostname ||
        returnedHostname === configuredHostname;

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

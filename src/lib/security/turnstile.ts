type TurnstileResponse = {
  success?: boolean;
  "error-codes"?: string[];
  hostname?: string;
  action?: string;
};

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

function expectedHostname(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return null;

  try {
    return new URL(configured).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export async function verifyTurnstileToken(input: {
  token: string | null;
  ip: string;
}): Promise<{ successful: boolean; errors: string[] }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return { successful: true, errors: [] };
  if (!input.token) {
    return { successful: false, errors: ["missing-input-response"] };
  }

  const body = new URLSearchParams({
    secret,
    response: input.token,
  });

  if (input.ip && input.ip !== "unknown") {
    body.set("remoteip", input.ip);
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      },
    );

    const payload = (await response.json()) as TurnstileResponse;
    const hostname = payload.hostname?.toLowerCase();
    const expected = expectedHostname();
    const hostnameMatches = !expected || !hostname || hostname === expected;

    return {
      successful:
        response.ok &&
        payload.success === true &&
        hostnameMatches,
      errors:
        hostnameMatches
          ? payload["error-codes"] ?? []
          : [...(payload["error-codes"] ?? []), "hostname-mismatch"],
    };
  } catch (error) {
    return {
      successful: false,
      errors: [
        error instanceof DOMException && error.name === "TimeoutError"
          ? "verification-timeout"
          : "verification-unavailable",
      ],
    };
  }
}

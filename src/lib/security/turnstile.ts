type TurnstileResponse = {
  success?: boolean;
  "error-codes"?: string[];
  hostname?: string;
  action?: string;
};

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export async function verifyTurnstileToken(input: {
  token: string | null;
  ip: string;
}): Promise<{ successful: boolean; errors: string[] }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return { successful: true, errors: [] };
  if (!input.token) return { successful: false, errors: ["missing-input-response"] };

  const body = new URLSearchParams({
    secret,
    response: input.token,
  });
  if (input.ip && input.ip !== "unknown") body.set("remoteip", input.ip);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
    });
    const payload = (await response.json()) as TurnstileResponse;
    return {
      successful: response.ok && payload.success === true,
      errors: payload["error-codes"] ?? [],
    };
  } catch {
    return { successful: false, errors: ["verification-unavailable"] };
  }
}

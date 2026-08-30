type EmailOtpResult = {
  configured: boolean;
  successful: boolean;
  errorCode?: string;
};

function emailConfig() {
  return {
    apiKey:
      process.env.RESEND_API_KEY?.trim() ?? "",
    from:
      process.env.ELORIA_EMAIL_FROM?.trim() ?? "",
  };
}

export function isEmailOtpConfigured(): boolean {
  const config = emailConfig();

  return Boolean(
    config.apiKey &&
    config.from,
  );
}

export async function sendEmailOtp(
  email: string,
  code: string,
  expiresInMinutes: number,
): Promise<EmailOtpResult> {
  const config = emailConfig();

  if (!config.apiKey || !config.from) {
    return {
      configured: false,
      successful: false,
      errorCode: "EMAIL_NOT_CONFIGURED",
    };
  }

  try {
    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: config.from,
          to: [email],
          subject: "کد ورود به حساب الاریا",
          html: `
            <div
              dir="rtl"
              style="
                font-family:Tahoma,Arial,sans-serif;
                max-width:520px;
                margin:0 auto;
                padding:32px;
                background:#071f18;
                color:#f3e6c5;
                border-radius:24px;
              "
            >
              <h2 style="margin:0 0 18px">
                الاریا
              </h2>

              <p>
                کد ورود شما:
              </p>

              <div
                style="
                  font-size:32px;
                  letter-spacing:8px;
                  font-weight:700;
                  margin:24px 0;
                  color:#e5ca7c;
                "
              >
                ${code}
              </div>

              <p style="font-size:13px;opacity:.75">
                این کد تا ${expiresInMinutes} دقیقه معتبر است.
              </p>

              <p style="font-size:12px;opacity:.55;margin-top:28px">
                اگر شما درخواست ورود ندادهاید این ایمیل را نادیده بگیرید.
              </p>
            </div>
          `,
          text:
            `کد ورود الاریا: ${code}\n` +
            `این کد تا ${expiresInMinutes} دقیقه معتبر است.`,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) {
      const providerBody = await response.text().catch(() => "");
      console.error(
        "[Eloria Email OTP] Resend rejected the request",
        {
          status: response.status,
          body: providerBody.slice(0, 800),
          from: config.from,
        },
      );

      return {
        configured: true,
        successful: false,
        errorCode:
          `RESEND_HTTP_${response.status}`,
      };
    }

    return {
      configured: true,
      successful: true,
    };
  } catch {
    return {
      configured: true,
      successful: false,
      errorCode: "RESEND_NETWORK_ERROR",
    };
  }
}
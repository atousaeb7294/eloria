import { createHash } from "node:crypto";
import { Resend } from "resend";

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
    const resend = new Resend(config.apiKey);
    const result = await resend.emails.send(
        {
          from: config.from,
          to: [email],
          subject: "کد ورود امن به حساب الوریا",
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
                الوریا
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
                اگر شما درخواست ورود نداده‌اید، این ایمیل را نادیده بگیرید.
              </p>
            </div>
          `,
          text:
            `کد ورود الوریا: ${code}\n` +
            `این کد تا ${expiresInMinutes} دقیقه معتبر است.`,
          tags: [{ name: "category", value: "customer_login_otp" }],
        },
        {
          // A provider retry must not create two emails for the same code.
          idempotencyKey: createHash("sha256")
            .update(`eloria-login:${email.toLowerCase()}:${code}`)
            .digest("hex"),
        },
      );

    if (result.error) {
      const providerCode = result.error.name || "provider_error";
      console.error("[Eloria Email OTP] Resend rejected the request", {
        code: providerCode,
        message: result.error.message.slice(0, 500),
        from: config.from,
      });

      return {
        configured: true,
        successful: false,
        errorCode: `RESEND_${providerCode.toUpperCase().replace(/[^A-Z0-9_]/g, "_")}`,
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

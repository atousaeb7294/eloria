type SmsIrResponse = {
  status?: number;
  message?: string;
  data?: {
    messageId?: number | string | null;
    packId?: string | null;
    messageIds?: Array<number | string | null>;
  } | null;
};

export type SmsResult = {
  configured: boolean;
  successful: boolean;
  messageId?: string;
  message: string;
};

type SmsIrEnvironment = Record<string, string | undefined>;

function config(environment: SmsIrEnvironment = process.env) {
  return {
    apiKey: environment.SMS_IR_API_KEY?.trim() ?? "",
    templateId: environment.SMS_IR_VERIFY_TEMPLATE_ID?.trim() ?? "",
    parameterName:
      environment.SMS_IR_VERIFY_PARAMETER?.trim() || "Code",
    lineNumber: environment.SMS_IR_LINE_NUMBER?.trim() ?? "",
  };
}

function hasApiKey(environment: SmsIrEnvironment = process.env): boolean {
  return config(environment).apiKey.length >= 16;
}

export function isSmsIrVerifyConfigured(
  environment: SmsIrEnvironment = process.env,
): boolean {
  const value = config(environment);
  return (
    value.apiKey.length >= 16 &&
    /^\d+$/.test(value.templateId)
  );
}

export function isSmsIrConfigured(
  environment: SmsIrEnvironment = process.env,
): boolean {
  const value = config(environment);
  return (
    value.apiKey.length >= 16 &&
    (/^\d+$/.test(value.templateId) || /^\d+$/.test(value.lineNumber))
  );
}

function messageIdFrom(
  payload: SmsIrResponse | null,
): string | undefined {
  const single = payload?.data?.messageId;
  if (single !== undefined && single !== null) {
    return String(single);
  }

  const first = payload?.data?.messageIds?.[0];
  return first === undefined || first === null
    ? undefined
    : String(first);
}

function providerMessage(
  payload: SmsIrResponse | null,
  fallback: string,
): string {
  const message = payload?.message?.trim();
  return message || fallback;
}

async function post(
  path: "verify" | "bulk",
  body: unknown,
): Promise<SmsResult> {
  const value = config();

  if (!hasApiKey()) {
    return {
      configured: false,
      successful: false,
      message: "سامانه پیامک پیکربندی نشده است.",
    };
  }

  try {
    const response = await fetch(
      `https://api.sms.ir/v1/send/${path}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-API-KEY": value.apiKey,
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );

    const payload = (await response
      .json()
      .catch(() => null)) as SmsIrResponse | null;

    if (!response.ok || payload?.status !== 1) {
      return {
        configured: true,
        successful: false,
        message: providerMessage(
          payload,
          "ارسال پیامک ناموفق بود.",
        ),
      };
    }

    return {
      configured: true,
      successful: true,
      messageId: messageIdFrom(payload),
      message: "پیامک ارسال شد.",
    };
  } catch (error) {
    console.error("[Eloria SMS.ir] Request failed.", {
      error: error instanceof Error ? error.name : "unknown",
    });

    return {
      configured: true,
      successful: false,
      message: "خطای ارتباط با سامانه پیامک.",
    };
  }
}

export async function sendVerificationSms(
  receptor: string,
  code: string,
): Promise<SmsResult> {
  const value = config();

  if (!isSmsIrVerifyConfigured()) {
    return {
      configured: false,
      successful: false,
      message:
        "کلید API یا قالب کد تأیید SMS.ir پیکربندی نشده است.",
    };
  }

  return post("verify", {
    mobile: receptor,
    templateId: Number(value.templateId),
    parameters: [
      {
        name: value.parameterName,
        value: code,
      },
    ],
  });
}

export async function sendSms(
  receptor: string,
  message: string,
): Promise<SmsResult> {
  const value = config();

  if (
    !hasApiKey() ||
    !/^\d+$/.test(value.lineNumber)
  ) {
    return {
      configured: false,
      successful: false,
      message:
        "کلید API یا خط ارسال SMS.ir پیکربندی نشده است.",
    };
  }

  return post("bulk", {
    lineNumber: Number(value.lineNumber),
    messageText: message,
    mobiles: [receptor],
  });
}

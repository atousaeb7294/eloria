const DEFAULT_API_BASE =
  "https://payment.zarinpal.com/pg/v4/payment";

const DEFAULT_START_BASE =
  "https://payment.zarinpal.com/pg/StartPay";

export type ZarinpalRequestResult = {
  authority: string;
  code: number;
  message: string;
  fee?: number;
  feeType?: string;
};

export type ZarinpalVerifyResult = {
  code: number;
  message: string;
  referenceId?: string;
  cardPan?: string;
  cardHash?: string;
  fee?: number;
  feeType?: string;
};

type ZarinpalResponsePayload = {
  data?: Record<string, unknown>;
  errors?: Record<string, unknown>;
};

type RequestPaymentInput = {
  amountToman: string;
  description: string;
  callbackUrl: string;
  mobile?: string | null;
  email?: string | null;
};

type VerifyPaymentInput = {
  amountToman: string;
  authority: string;
};

export class ZarinpalError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message);
    this.name = "ZarinpalError";
  }
}

function getZarinpalConfig() {
  return {
    merchantId:
      process.env.ZARINPAL_MERCHANT_ID?.trim() ?? "",

    apiBase:
      process.env.ZARINPAL_API_BASE
        ?.trim()
        .replace(/\/$/, "") || DEFAULT_API_BASE,

    startBase:
      process.env.ZARINPAL_STARTPAY_BASE
        ?.trim()
        .replace(/\/$/, "") || DEFAULT_START_BASE,
  };
}

export function isZarinpalConfigured(): boolean {
  const { merchantId } = getZarinpalConfig();

  return /^[0-9a-fA-F-]{36}$/.test(merchantId);
}

function normalizeTomanAmount(toman: string): string {
  const normalized = toman
    .trim()
    .replace(/[,_\s]/g, "");

  if (!/^\d+$/.test(normalized)) {
    throw new ZarinpalError(
      "\u0645\u0628\u0644\u063a \u067e\u0631\u062f\u0627\u062e\u062a \u0646\u0627\u0645\u0639\u062a\u0628\u0631 \u0627\u0633\u062a.",
    );
  }

  return normalized;
}

function amountRial(toman: string): number {
  const normalizedToman =
    normalizeTomanAmount(toman);

  const value =
    BigInt(normalizedToman) * BigInt(10);

  if (
    value < BigInt(10000) ||
    value > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new ZarinpalError(
      "\u0645\u0628\u0644\u063a \u067e\u0631\u062f\u0627\u062e\u062a \u0628\u0631\u0627\u06cc \u062f\u0631\u06af\u0627\u0647 \u0645\u0639\u062a\u0628\u0631 \u0646\u06cc\u0633\u062a.",
    );
  }

  return Number(value);
}

async function postToZarinpal(
  path: "request.json" | "verify.json",
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { apiBase } = getZarinpalConfig();

  let response: Response;

  try {
    response = await fetch(`${apiBase}/${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ZarinpalError(
      "\u0627\u0631\u062a\u0628\u0627\u0637 \u0628\u0627 \u062f\u0631\u06af\u0627\u0647 \u0632\u0631\u06cc\u0646\u200c\u067e\u0627\u0644 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062f.",
    );
  }

  const payload =
    (await response
      .json()
      .catch(() => null)) as
      | ZarinpalResponsePayload
      | null;

  if (!response.ok || !payload?.data) {
    const errorCode = Number(
      payload?.errors?.code ?? response.status,
    );

    const errorMessage = String(
      payload?.errors?.message ??
        "\u067e\u0627\u0633\u062e \u0645\u0639\u062a\u0628\u0631\u06cc \u0627\u0632 \u062f\u0631\u06af\u0627\u0647 \u062f\u0631\u06cc\u0627\u0641\u062a \u0646\u0634\u062f.",
    );

    throw new ZarinpalError(
      errorMessage,
      errorCode,
    );
  }

  return payload.data;
}

export async function requestZarinpalPayment(
  input: RequestPaymentInput,
): Promise<ZarinpalRequestResult> {
  if (!isZarinpalConfigured()) {
    throw new ZarinpalError(
      "\u062f\u0631\u06af\u0627\u0647 \u0632\u0631\u06cc\u0646\u200c\u067e\u0627\u0644 \u067e\u06cc\u06a9\u0631\u0628\u0646\u062f\u06cc \u0646\u0634\u062f\u0647 \u0627\u0633\u062a.",
    );
  }

  const { merchantId } =
    getZarinpalConfig();

  const data = await postToZarinpal(
    "request.json",
    {
      merchant_id: merchantId,
      amount: amountRial(
        input.amountToman,
      ),
      callback_url: input.callbackUrl,
      description: input.description,
      metadata: {
        mobile:
          input.mobile?.trim() ||
          undefined,
        email:
          input.email?.trim() ||
          undefined,
      },
    },
  );

  const code = Number(data.code);

  const authority =
    typeof data.authority === "string"
      ? data.authority
      : "";

  if (code !== 100 || !authority) {
    throw new ZarinpalError(
      String(
        data.message ??
          "\u0633\u0627\u062e\u062a \u062f\u0631\u062e\u0648\u0627\u0633\u062a \u067e\u0631\u062f\u0627\u062e\u062a \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062f.",
      ),
      code,
    );
  }

  return {
    authority,
    code,
    message: String(
      data.message ?? "Success",
    ),
    fee:
      data.fee === undefined
        ? undefined
        : Number(data.fee),
    feeType:
      data.fee_type === undefined
        ? undefined
        : String(data.fee_type),
  };
}

export async function verifyZarinpalPayment(
  input: VerifyPaymentInput,
): Promise<ZarinpalVerifyResult> {
  if (!isZarinpalConfigured()) {
    throw new ZarinpalError(
      "\u062f\u0631\u06af\u0627\u0647 \u0632\u0631\u06cc\u0646\u200c\u067e\u0627\u0644 \u067e\u06cc\u06a9\u0631\u0628\u0646\u062f\u06cc \u0646\u0634\u062f\u0647 \u0627\u0633\u062a.",
    );
  }

  const authority =
    input.authority.trim();

  if (!authority) {
    throw new ZarinpalError(
      "\u06a9\u062f Authority \u062f\u0631\u06af\u0627\u0647 \u0645\u0639\u062a\u0628\u0631 \u0646\u06cc\u0633\u062a.",
    );
  }

  const { merchantId } =
    getZarinpalConfig();

  const data = await postToZarinpal(
    "verify.json",
    {
      merchant_id: merchantId,
      amount: amountRial(
        input.amountToman,
      ),
      authority,
    },
  );

  const code = Number(data.code);

  if (code !== 100 && code !== 101) {
    throw new ZarinpalError(
      String(
        data.message ??
          "\u062a\u0623\u06cc\u06cc\u062f \u067e\u0631\u062f\u0627\u062e\u062a \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062f.",
      ),
      code,
    );
  }

  return {
    code,
    message: String(
      data.message ?? "Success",
    ),
    referenceId:
      data.ref_id === undefined
        ? undefined
        : String(data.ref_id),

    cardPan:
      typeof data.card_pan === "string"
        ? data.card_pan
        : undefined,

    cardHash:
      typeof data.card_hash === "string"
        ? data.card_hash
        : undefined,

    fee:
      data.fee === undefined
        ? undefined
        : Number(data.fee),

    feeType:
      data.fee_type === undefined
        ? undefined
        : String(data.fee_type),
  };
}

export function zarinpalStartUrl(
  authority: string,
): string {
  const { startBase } =
    getZarinpalConfig();

  return `${startBase}/${encodeURIComponent(
    authority.trim(),
  )}`;
}
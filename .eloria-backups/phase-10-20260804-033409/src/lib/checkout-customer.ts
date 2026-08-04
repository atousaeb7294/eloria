export type CheckoutCustomerInput = {
  fullName: string;
  mobile: string;
  email?: string | null;
  province: string;
  city: string;
  postalCode: string;
  address: string;
};

export type NormalizedCheckoutCustomer = {
  fullName: string;
  mobile: string;
  email: string | null;
  province: string;
  city: string;
  postalCode: string;
  address: string;
};

export type CheckoutCustomerErrorCode =
  | "INVALID_CUSTOMER_NAME"
  | "INVALID_CUSTOMER_MOBILE"
  | "INVALID_CUSTOMER_EMAIL"
  | "INVALID_CUSTOMER_PROVINCE"
  | "INVALID_CUSTOMER_CITY"
  | "INVALID_CUSTOMER_POSTAL_CODE"
  | "INVALID_CUSTOMER_ADDRESS";

export class CheckoutCustomerError extends Error {
  readonly code: CheckoutCustomerErrorCode;

  constructor(
    code: CheckoutCustomerErrorCode,
    message: string,
  ) {
    super(message);

    this.name =
      "CheckoutCustomerError";

    this.code =
      code;
  }
}

function normalizeDigits(
  value: string,
): string {
  const persianDigits =
    "۰۱۲۳۴۵۶۷۸۹";

  const arabicDigits =
    "٠١٢٣٤٥٦٧٨٩";

  return value
    .replace(
      /[۰-۹]/g,
      (digit) =>
        String(
          persianDigits.indexOf(
            digit,
          ),
        ),
    )
    .replace(
      /[٠-٩]/g,
      (digit) =>
        String(
          arabicDigits.indexOf(
            digit,
          ),
        ),
    );
}

function normalizeText(
  value: string,
): string {
  return value
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function normalizeFullName(
  value: unknown,
): string {
  if (
    typeof value !==
    "string"
  ) {
    throw new CheckoutCustomerError(
      "INVALID_CUSTOMER_NAME",
      "نام و نام خانوادگی معتبر نیست.",
    );
  }

  const normalized =
    normalizeText(value);

  if (
    normalized.length < 3 ||
    normalized.length > 120
  ) {
    throw new CheckoutCustomerError(
      "INVALID_CUSTOMER_NAME",
      "نام و نام خانوادگی باید بین ۳ تا ۱۲۰ نویسه باشد.",
    );
  }

  return normalized;
}

function normalizeMobile(
  value: unknown,
): string {
  if (
    typeof value !==
    "string"
  ) {
    throw new CheckoutCustomerError(
      "INVALID_CUSTOMER_MOBILE",
      "شماره موبایل معتبر نیست.",
    );
  }

  let normalized =
    normalizeDigits(value)
      .replace(
        /[\s()-]/g,
        "",
      )
      .trim();

  if (
    normalized.startsWith(
      "+98",
    )
  ) {
    normalized =
      `0${normalized.slice(3)}`;
  } else if (
    normalized.startsWith(
      "0098",
    )
  ) {
    normalized =
      `0${normalized.slice(4)}`;
  } else if (
    normalized.startsWith(
      "98",
    )
  ) {
    normalized =
      `0${normalized.slice(2)}`;
  }

  if (
    !/^09\d{9}$/.test(
      normalized,
    )
  ) {
    throw new CheckoutCustomerError(
      "INVALID_CUSTOMER_MOBILE",
      "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم داشته باشد.",
    );
  }

  return normalized;
}

function normalizeEmail(
  value: unknown,
): string | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !==
    "string"
  ) {
    throw new CheckoutCustomerError(
      "INVALID_CUSTOMER_EMAIL",
      "نشانی ایمیل معتبر نیست.",
    );
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalized,
    )
  ) {
    throw new CheckoutCustomerError(
      "INVALID_CUSTOMER_EMAIL",
      "نشانی ایمیل معتبر نیست.",
    );
  }

  return normalized;
}

function normalizeLocation(
  value: unknown,
  field:
    | "province"
    | "city",
): string {
  const isProvince =
    field === "province";

  if (
    typeof value !==
    "string"
  ) {
    throw new CheckoutCustomerError(
      isProvince
        ? "INVALID_CUSTOMER_PROVINCE"
        : "INVALID_CUSTOMER_CITY",

      isProvince
        ? "نام استان معتبر نیست."
        : "نام شهر معتبر نیست.",
    );
  }

  const normalized =
    normalizeText(value);

  if (
    normalized.length < 2 ||
    normalized.length > 100
  ) {
    throw new CheckoutCustomerError(
      isProvince
        ? "INVALID_CUSTOMER_PROVINCE"
        : "INVALID_CUSTOMER_CITY",

      isProvince
        ? "نام استان معتبر نیست."
        : "نام شهر معتبر نیست.",
    );
  }

  return normalized;
}

function normalizePostalCode(
  value: unknown,
): string {
  if (
    typeof value !==
    "string"
  ) {
    throw new CheckoutCustomerError(
      "INVALID_CUSTOMER_POSTAL_CODE",
      "کد پستی معتبر نیست.",
    );
  }

  const normalized =
    normalizeDigits(value)
      .replace(
        /\D/g,
        "",
      );

  if (
    !/^\d{10}$/.test(
      normalized,
    )
  ) {
    throw new CheckoutCustomerError(
      "INVALID_CUSTOMER_POSTAL_CODE",
      "کد پستی باید دقیقاً ۱۰ رقم باشد.",
    );
  }

  return normalized;
}

function normalizeAddress(
  value: unknown,
): string {
  if (
    typeof value !==
    "string"
  ) {
    throw new CheckoutCustomerError(
      "INVALID_CUSTOMER_ADDRESS",
      "نشانی تحویل معتبر نیست.",
    );
  }

  const normalized =
    normalizeText(value);

  if (
    normalized.length < 10 ||
    normalized.length > 1000
  ) {
    throw new CheckoutCustomerError(
      "INVALID_CUSTOMER_ADDRESS",
      "نشانی تحویل باید بین ۱۰ تا ۱۰۰۰ نویسه باشد.",
    );
  }

  return normalized;
}

export function normalizeCheckoutCustomer(
  input: CheckoutCustomerInput,
): NormalizedCheckoutCustomer {
  if (
    typeof input !==
      "object" ||
    input === null
  ) {
    throw new CheckoutCustomerError(
      "INVALID_CUSTOMER_NAME",
      "اطلاعات خریدار معتبر نیست.",
    );
  }

  return {
    fullName:
      normalizeFullName(
        input.fullName,
      ),

    mobile:
      normalizeMobile(
        input.mobile,
      ),

    email:
      normalizeEmail(
        input.email,
      ),

    province:
      normalizeLocation(
        input.province,
        "province",
      ),

    city:
      normalizeLocation(
        input.city,
        "city",
      ),

    postalCode:
      normalizePostalCode(
        input.postalCode,
      ),

    address:
      normalizeAddress(
        input.address,
      ),
  };
}
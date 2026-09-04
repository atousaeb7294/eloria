import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export const CUSTOMER_PASSWORD_MIN_LENGTH = 8;
export const CUSTOMER_PASSWORD_MAX_LENGTH = 128;

export class CustomerPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerPasswordError";
  }
}

export function normalizeCustomerPassword(
  value: unknown,
): string {
  if (typeof value !== "string") {
    throw new CustomerPasswordError(
      "رمز عبور معتبر نیست.",
    );
  }

  if (
    value.length < CUSTOMER_PASSWORD_MIN_LENGTH ||
    value.length > CUSTOMER_PASSWORD_MAX_LENGTH
  ) {
    throw new CustomerPasswordError(
      `رمز عبور باید بین ${CUSTOMER_PASSWORD_MIN_LENGTH} تا ${CUSTOMER_PASSWORD_MAX_LENGTH} نویسه باشد.`,
    );
  }

  if (!value.trim()) {
    throw new CustomerPasswordError(
      "رمز عبور نمی‌تواند فقط فاصله باشد.",
    );
  }

  return value;
}

export function hashCustomerPassword(
  password: string,
): string {
  const normalized = normalizeCustomerPassword(
    password,
  );
  const salt = randomBytes(16);
  const digest = scryptSync(
    normalized,
    salt,
    64,
  );

  return `scrypt$${salt.toString("hex")}$${digest.toString("hex")}`;
}

export function verifyCustomerPassword(
  password: unknown,
  storedHash: string | null | undefined,
): boolean {
  if (
    typeof password !== "string" ||
    !storedHash
  ) {
    return false;
  }

  if (
    password.length < CUSTOMER_PASSWORD_MIN_LENGTH ||
    password.length > CUSTOMER_PASSWORD_MAX_LENGTH
  ) {
    return false;
  }

  const match = storedHash.match(
    /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/i,
  );

  if (!match) {
    return false;
  }

  try {
    const supplied = scryptSync(
      password,
      Buffer.from(match[1]!, "hex"),
      64,
    );
    const expected = Buffer.from(
      match[2]!,
      "hex",
    );

    return (
      supplied.length === expected.length &&
      timingSafeEqual(supplied, expected)
    );
  } catch {
    return false;
  }
}

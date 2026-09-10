import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const INACTIVE_ORDER_STATUSES: Array<"CANCELLED" | "EXPIRED" | "REFUNDED"> = [
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
];

const FIRST_PURCHASE_COUPON_CODE = "ELORIA50";
const FIRST_PURCHASE_DISCOUNT_TOMAN = 50_000n;

export type CouponApplication = {
  id: string;
  code: string;
  discountType: "PERCENT" | "FIXED_TOMAN";
  discountToman: bigint;
  minSubtotalToman: bigint;
  maxDiscountToman: bigint | null;
};

export class CouponValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponValidationError";
  }
}

export function normalizeCouponCode(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new CouponValidationError("کد تخفیف معتبر نیست.");
  }

  let normalized = value.trim().toUpperCase();
  if (normalized === "ELORIA10") normalized = FIRST_PURCHASE_COUPON_CODE;
  if (!/^[A-Z0-9_-]{3,40}$/.test(normalized)) {
    throw new CouponValidationError("ساختار کد تخفیف معتبر نیست.");
  }
  return normalized;
}

function decimalToBigInt(value: { toString(): string } | bigint | number): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  const raw = value.toString();
  const integer = raw.includes(".") ? raw.slice(0, raw.indexOf(".")) : raw;
  return BigInt(integer || "0");
}

function percentDiscount(subtotalToman: bigint, percentText: string): bigint {
  // Prisma stores percent with three decimals. Integer arithmetic prevents any
  // floating-point drift in financial calculations.
  const [whole = "0", fraction = ""] = percentText.split(".");
  const perThousand = BigInt(whole) * 1000n + BigInt((fraction + "000").slice(0, 3));
  return (subtotalToman * perThousand) / 100_000n;
}

function calculateDiscount(
  coupon: {
    discountType: "PERCENT" | "FIXED_TOMAN";
    value: { toString(): string };
    maxDiscountToman: { toString(): string } | null;
  },
  subtotalToman: bigint,
): bigint {
  let discount =
    coupon.discountType === "PERCENT"
      ? percentDiscount(subtotalToman, coupon.value.toString())
      : decimalToBigInt(coupon.value);

  if (coupon.maxDiscountToman) {
    const max = decimalToBigInt(coupon.maxDiscountToman);
    if (discount > max) discount = max;
  }

  if (discount > subtotalToman) discount = subtotalToman;
  return discount < 0n ? 0n : discount;
}

async function validateCouponRecord(
  tx: Prisma.TransactionClient,
  input: {
    code: string;
    subtotalToman: bigint;
    customerMobile: string;
    lock: boolean;
  },
): Promise<CouponApplication> {
  const now = new Date();
  const coupon = await tx.coupon.findUnique({
    where: { code: input.code },
    select: {
      id: true,
      code: true,
      discountType: true,
      value: true,
      minSubtotalToman: true,
      maxDiscountToman: true,
      usageLimit: true,
      perCustomerLimit: true,
      firstPurchaseOnly: true,
      startsAt: true,
      expiresAt: true,
      isActive: true,
    },
  });

  if (!coupon || !coupon.isActive) {
    throw new CouponValidationError("این کد تخفیف فعال نیست.");
  }
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new CouponValidationError("زمان استفاده از این کد تخفیف هنوز شروع نشده است.");
  }
  if (coupon.expiresAt && coupon.expiresAt <= now) {
    throw new CouponValidationError("مهلت استفاده از این کد تخفیف به پایان رسیده است.");
  }

  const minSubtotal = decimalToBigInt(coupon.minSubtotalToman);
  if (input.subtotalToman < minSubtotal) {
    throw new CouponValidationError(
      `حداقل مبلغ خرید برای این کد ${minSubtotal.toString()} تومان است.`,
    );
  }

  if (input.lock) {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${`coupon:${coupon.id}`}))
    `;
  }

  const activeOrderFilter = {
    status: { notIn: INACTIVE_ORDER_STATUSES },
  };

  if (coupon.usageLimit !== null) {
    const totalUsed = await tx.couponRedemption.count({
      where: { couponId: coupon.id, order: activeOrderFilter },
    });
    if (totalUsed >= coupon.usageLimit) {
      throw new CouponValidationError("ظرفیت استفاده از این کد تخفیف تکمیل شده است.");
    }
  }

  if (coupon.firstPurchaseOnly) {
    const previousPurchase = await tx.order.count({
      where: {
        customerMobile: input.customerMobile,
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] },
      },
    });
    if (previousPurchase > 0) {
      throw new CouponValidationError("این کد فقط برای نخستین خرید قابل استفاده است.");
    }
  }

  const customerUsed = await tx.couponRedemption.count({
    where: {
      couponId: coupon.id,
      order: {
        ...activeOrderFilter,
        customerMobile: input.customerMobile,
      },
    },
  });
  if (customerUsed >= coupon.perCustomerLimit) {
    throw new CouponValidationError("سقف استفاده شما از این کد تخفیف تکمیل شده است.");
  }

  // ELORIA50 is the public first-purchase code. Legacy ELORIA10 input is normalized
  // to the same record so there is only one redemption path per customer.
  const discountToman =
    coupon.code === FIRST_PURCHASE_COUPON_CODE && coupon.firstPurchaseOnly
      ? (input.subtotalToman < FIRST_PURCHASE_DISCOUNT_TOMAN
          ? input.subtotalToman
          : FIRST_PURCHASE_DISCOUNT_TOMAN)
      : calculateDiscount(coupon, input.subtotalToman);
  if (discountToman <= 0n) {
    throw new CouponValidationError("این کد برای سبد فعلی تخفیفی ایجاد نمی‌کند.");
  }

  return {
    id: coupon.id,
    code: coupon.code,
    discountType:
      coupon.code === FIRST_PURCHASE_COUPON_CODE && coupon.firstPurchaseOnly
        ? "FIXED_TOMAN"
        : coupon.discountType,
    discountToman,
    minSubtotalToman: minSubtotal,
    maxDiscountToman: coupon.maxDiscountToman
      ? decimalToBigInt(coupon.maxDiscountToman)
      : null,
  };
}

export async function validateCouponForCheckout(
  tx: Prisma.TransactionClient,
  input: { code: string; subtotalToman: bigint; customerMobile: string },
): Promise<CouponApplication> {
  return validateCouponRecord(tx, { ...input, lock: true });
}

export async function previewCoupon(input: {
  code: string;
  subtotalToman: bigint;
  customerMobile: string;
}): Promise<CouponApplication> {
  return prisma.$transaction((tx) =>
    validateCouponRecord(tx, { ...input, lock: false }),
  );
}

import { getProductLivePrice, ProductPricingError } from "@/lib/product-pricing";
import { CheckoutOrderError, type CheckoutOrderItemInput, type PricedCheckoutItem } from "@/lib/checkout-order/contracts";
import { toJsonValue } from "@/lib/checkout-order/helpers";

export async function priceCheckoutItem(
  item:
    CheckoutOrderItemInput,
): Promise<PricedCheckoutItem> {
  try {
    const result =
      await getProductLivePrice({
        slug:
          item.slug,

        variantId:
          item.variantId,
      });

    if (
      !result.product
        .isPurchasable
    ) {
      throw new CheckoutOrderError(
        "PRODUCT_UNAVAILABLE",

        `محصول «${result.product.nameFa}» در حال حاضر قابل سفارش نیست.`,

        409,
      );
    }

    const availableStock =
      result.variant
        ?.stock ??
      result.product.stock;

    if (
      availableStock <
      item.quantity
    ) {
      throw new CheckoutOrderError(
        "INSUFFICIENT_STOCK",

        `موجودی محصول «${result.product.nameFa}» برای تعداد انتخاب‌شده کافی نیست.`,

        409,
      );
    }

    const unitPriceToman =
      result.pricing
        .finalPriceToman;

    const lineTotalToman =
      (
        BigInt(
          unitPriceToman,
        ) *
        BigInt(
          item.quantity,
        )
      ).toString();

    return {
      input:
        item,

      result,

      unitPriceToman,

      lineTotalToman,

      pricingSnapshot:
        toJsonValue({
          product:
            result.product,

          variant:
            result.variant,

          pricing:
            result.pricing,

          liveRate:
            result.liveRate,

          policy:
            result.policy,

          quote:
            result.quote,

          quantity:
            item.quantity,

          unitPriceToman,

          lineTotalToman,
        }),
    };
  } catch (error) {
    if (
      error instanceof
      CheckoutOrderError
    ) {
      throw error;
    }

    if (
      error instanceof
      ProductPricingError
    ) {
      throw new CheckoutOrderError(
        "PRICING_FAILED",

        error.message,

        error.status,
      );
    }

    throw error;
  }
}

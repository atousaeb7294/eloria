"use client";

import type { CheckoutPageClientProps } from "@/components/checkout/checkout-page-model";
import { CheckoutPageView } from "@/components/checkout/checkout-page-view";
import { useCheckoutPageController } from "@/components/checkout/use-checkout-page-controller";

export function CheckoutPageClient(props: CheckoutPageClientProps) {
  const controller = useCheckoutPageController(props);
  return <CheckoutPageView {...props} controller={controller} />;
}

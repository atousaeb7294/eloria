"use client";

import type { CartPageClientProps } from "@/components/cart/cart-page-model";
import { CartPageView } from "@/components/cart/cart-page-view";
import { useCartPageController } from "@/components/cart/use-cart-page-controller";

export function CartPageClient(props: CartPageClientProps) {
  const controller = useCartPageController(props);
  return <CartPageView {...props} controller={controller} />;
}

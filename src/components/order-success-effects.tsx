"use client";

import { useEffect } from "react";

import { clearCart } from "@/lib/cart-storage";

const CHECKOUT_SESSION_KEY = "eloria-checkout-idempotency-v1";

export function OrderSuccessEffects() {
  useEffect(() => {
    clearCart();
    window.sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
  }, []);

  return null;
}

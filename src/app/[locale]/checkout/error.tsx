"use client";

import {
  CommerceRouteError,
} from "@/components/commerce-route-error";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  return (
    <CommerceRouteError
      error={error}
      reset={reset}
      section="checkout"
    />
  );
}

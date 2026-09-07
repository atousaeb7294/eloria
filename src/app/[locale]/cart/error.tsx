"use client";

import {
  CommerceRouteError,
} from "@/components/commerce-route-error";

export default function CartError({
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
      section="cart"
    />
  );
}

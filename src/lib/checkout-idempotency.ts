export function hasMatchingCheckoutIdempotencyOwner(
  existingCustomerMobile: string | null,
  requestedCustomerMobile: string,
): boolean {
  return (
    existingCustomerMobile !==
    null &&
    existingCustomerMobile ===
    requestedCustomerMobile
  );
}

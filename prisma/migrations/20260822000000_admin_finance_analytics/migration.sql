-- ELORIA_ADMIN_FINANCE_ANALYTICS_V1
-- Keep the protected finance dashboard fast as paid/refunded order history grows.

CREATE INDEX IF NOT EXISTS
  "orders_status_paidAt_idx"
  ON "orders"("status", "paidAt");

CREATE INDEX IF NOT EXISTS
  "payment_attempts_status_verifiedAt_idx"
  ON "payment_attempts"("status", "verifiedAt");

CREATE INDEX IF NOT EXISTS
  "payment_attempts_status_refundedAt_idx"
  ON "payment_attempts"("status", "refundedAt");

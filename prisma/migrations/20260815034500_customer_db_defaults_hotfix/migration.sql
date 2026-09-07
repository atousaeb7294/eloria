-- ELORIA V3 HOTFIX: align customer-account database defaults with Prisma schema.
-- Safe additive migration. Does not remove or rewrite customer/order data.

ALTER TABLE "customers"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "customer_sessions"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "customer_otp_challenges"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "customer_addresses"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "customer_notifications"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

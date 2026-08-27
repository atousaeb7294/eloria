-- ELORIA public first-purchase gift code.
-- Preserve redemption history by renaming the existing coupon row when possible.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "coupons" WHERE "code" = 'ELORIA50') THEN
    UPDATE "coupons"
    SET
      "titleFa" = 'هدیه ۵۰ هزار تومانی خرید اول الوریا',
      "titleEn" = 'Eloria first-purchase 50,000 Toman gift',
      "discountType" = 'FIXED_TOMAN',
      "value" = 50000,
      "maxDiscountToman" = NULL,
      "firstPurchaseOnly" = TRUE,
      "perCustomerLimit" = 1,
      "isActive" = TRUE,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "code" = 'ELORIA50';

    UPDATE "coupons" SET "isActive" = FALSE, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "code" = 'ELORIA10';
  ELSIF EXISTS (SELECT 1 FROM "coupons" WHERE "code" = 'ELORIA10') THEN
    UPDATE "coupons"
    SET
      "code" = 'ELORIA50',
      "titleFa" = 'هدیه ۵۰ هزار تومانی خرید اول الوریا',
      "titleEn" = 'Eloria first-purchase 50,000 Toman gift',
      "discountType" = 'FIXED_TOMAN',
      "value" = 50000,
      "maxDiscountToman" = NULL,
      "firstPurchaseOnly" = TRUE,
      "perCustomerLimit" = 1,
      "isActive" = TRUE,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "code" = 'ELORIA10';
  ELSE
    INSERT INTO "coupons" (
      "id", "code", "titleFa", "titleEn", "discountType", "value",
      "minSubtotalToman", "maxDiscountToman", "perCustomerLimit",
      "firstPurchaseOnly", "isActive", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), 'ELORIA50', 'هدیه ۵۰ هزار تومانی خرید اول الوریا',
      'Eloria first-purchase 50,000 Toman gift', 'FIXED_TOMAN', 50000,
      0, NULL, 1, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
  END IF;
END $$;

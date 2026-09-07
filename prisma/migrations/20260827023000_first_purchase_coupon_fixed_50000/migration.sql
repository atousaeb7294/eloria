-- ELORIA first-purchase promotion: fixed 50,000 Toman.
-- Keeps the historical public code ELORIA10 so existing links/materials do not break.
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
WHERE "code" = 'ELORIA10';

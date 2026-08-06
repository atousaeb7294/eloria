# گزارش بازآرایی معماری الوریا — فاز ۱۱

## هدف

حذف فایل‌های چند‌هزارخطی و تبدیل آن‌ها به ماژول‌های قابل نگهداری، بدون تغییر قراردادهای عمومی، مسیرهای URL یا رفتار کاربر.

## نتیجه نهایی

| حوزه | قبل | فایل ورودی پس از بازآرایی | ماژول‌های جدید |
|---|---:|---:|---|
| سبد خرید | ۱۹۸۶ خط | ۱۰ خط | model، controller، view |
| تسویه‌حساب | ۲۳۰۹ خط | ۱۰ خط | model، controller، view |
| Intro سینمایی | ۲۰۱۴ خط | ۱۰ خط | config، controller، view، sigil button |
| سرویس ایجاد سفارش | ۱۸۸۸ خط | ۹۷۸ خط | contracts، helpers، pricing، existing-order |
| صفحه جزئیات محصول | ۱۲۲۷ خط | ۹۸۷ خط | metadata، product-detail UI |

پس از این فاز، هیچ فایل TypeScript یا TSX در `src` بیش از ۱۰۰۰ خط نیست.

## ساختار جدید

### Cart

- `src/components/cart-page-client.tsx`: نقطه ورود پایدار
- `src/components/cart/cart-page-model.ts`: انواع، guardها و محاسبات خالص
- `src/components/cart/use-cart-page-controller.ts`: state، effect و orchestration
- `src/components/cart/cart-page-view.tsx`: لایه ارائه

### Checkout

- `src/components/checkout-page-client.tsx`: نقطه ورود پایدار
- `src/components/checkout/checkout-page-model.ts`: قرارداد پاسخ‌ها، متن‌ها و utilityها
- `src/components/checkout/use-checkout-page-controller.ts`: مدیریت فرم، quote و ثبت سفارش
- `src/components/checkout/checkout-page-view.tsx`: رابط کاربری

### Intro

- `src/components/eloria-intro-experience.tsx`: facade پایدار
- `src/components/intro/eloria-intro-config.ts`: زمان‌بندی، asset و typeها
- `src/components/intro/use-eloria-intro-controller.ts`: ماشین حالت و کنترل ویدئو
- `src/components/intro/eloria-intro-view.tsx`: رندر سینمایی
- `src/components/intro/eloria-sigil-entry-button.tsx`: انیمیشن مستقل مهر ورود

### Checkout Order

- `src/lib/checkout-order.ts`: orchestration تراکنش
- `src/lib/checkout-order/contracts.ts`: قراردادها، خطاها و typeها
- `src/lib/checkout-order/helpers.ts`: normalization، serialization و concurrency
- `src/lib/checkout-order/pricing.ts`: قیمت‌گذاری اقلام
- `src/lib/checkout-order/existing-order.ts`: بازیابی idempotent سفارش قبلی

### Product Detail

- `src/app/[locale]/products/[slug]/page.tsx`: بارگذاری داده و ساخت صفحه
- `src/lib/product-page-metadata.ts`: metadata مستقل
- `src/components/product-detail/product-detail-ui.tsx`: اجزای نمایشی و formatterها

## سازگاری

نام exportهای عمومی زیر حفظ شده‌اند:

- `CartPageClient`
- `CheckoutPageClient`
- `EloriaIntroExperience`
- `createCheckoutOrder`
- `CheckoutOrderError`
- `CheckoutOrderItemInput`
- `generateMetadata`

بنابراین importهای فعلی صفحات و APIها نیاز به تغییر ندارند.

## کنترل‌های انجام‌شده

- بررسی Syntax روی ۲۰۱ فایل TypeScript/TSX
- بررسی مسیر همه importهای داخلی؛ تنها importهای تولیدی Prisma قبل از `prisma generate` غایب‌اند
- TypeScript semantic check روی تمام ماژول‌های تغییرکرده
- فعال‌سازی موقت `noUnusedLocals` و `noUnusedParameters` و دریافت صفر خطا
- `git diff --check` بدون خطای whitespace
- بررسی سقف خطوط: بزرگ‌ترین فایل اجرایی ۹۸۷ خط

## محدودیت محیط ممیزی

اجرای کامل `npm ci` در محیط ممیزی به‌دلیل timeout و محدودیت رجیستری کامل نشد. در نتیجه اجرای نهایی موارد زیر باید در محیط توسعه یا CI پروژه انجام شود:

```bash
npm ci
npm run prisma:generate
npm run lint
npm run build
npm run test:e2e
```

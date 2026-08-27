# ELORIA Luxury Intelligence R6 — ممیزی نهایی محصول، طراحی و هوشمندی

این نسخه ادامه‌ی مستقیم **Smart Production R4** است و بدون Migration جدیدِ پرریسک، ظاهر Home، هوشمندی فروش، سرعت، SEO، امنیت و تماس مستقیم را تقویت می‌کند.

## 1) Luxury Fashion UI — اجرا شد
- حذف حس «گرید فروشگاهی تکراری» از آثار بیشتر Home.
- کاور Campaign بزرگ برای اثر اول.
- دو Satellite Editorial برای آثار دوم و سوم.
- ELORIA RUNWAY افقی با Snap طبیعی و حرکت لمسی روان.
- Gallery نامتقارن شبیه Lookbook برای آثار بیشتر.
- نمایش تا 16 اثر هوشمند روزانه.
- Hover shine، scale و reveal فقط با transform/opacity.
- Respect کامل برای `prefers-reduced-motion`.

## 2) Motion — رایگان و Production-safe
- Motion موجود پروژه برای Scroll/Viewport/Transform استفاده می‌شود.
- GSAP موجود فقط برای Intro حفظ شده است.
- Motion+، افزونه خصوصی یا سرویس پولی اضافه نشده است.
- هیچ Smooth-scroll جعلی که لمس یا Accessibility را خراب کند اضافه نشده است.

## 3) Smart Merchandising — اجرا شد
امتیاز روزانه Home از این سیگنال‌ها ساخته می‌شود:
- تازگی محصول
- فروش واقعی
- بازدیدهای 7 و 14 روز اخیر
- Favorite
- Featured بودن
- موجودی
- Conversion تقریبی
- شتاب هفته جاری نسبت به هفته قبل
- تنوع Collection
- Nudge روزانه‌ی پایدار برای جلوگیری از ویترین کاملاً ثابت

## 4) Search & Discovery — اجرا شد
- Smart Persian normalization و budget parser قبلی حفظ شده است.
- جست‌وجوی مستقیم طبیعی در Home اضافه شده است.
- عباراتی مثل «گردنبند طلا زیر ۳۰ میلیون» وارد کاتالوگ واقعی می‌شوند.
- هیچ LLM پولی برای جست‌وجو لازم نیست.

## 5) Marketing & Conversion Intelligence — اجرا/حفظ شد
- Funnel: Product → Cart → Checkout → Paid.
- UTM Attribution تا Order.
- RFM: VIP / Loyal / New / At Risk / Active.
- High-view / low-sale opportunities.
- Weekly product momentum.
- Coupon success/rejection events.
- ELORIA50: مبلغ ثابت 50,000 تومان، خرید اول، یک بار برای هر مشتری.
- Customer Notes از Cart تا Order و دیتابیس.

## 6) SEO — تقویت شد
- Product/Offer schema موجود حفظ شد.
- Organization logo به لوگوی واقعی برند متصل شد.
- ContactPoint با شماره مستقیم پشتیبانی اضافه شد.
- MerchantReturnPolicy در صورت تنظیم بازه مرجوعی فعال می‌شود.
- Sitemap / Canonical / Robots / noindex فیلترهای غیرضروری حفظ شدند.
- Internal linking و Journal حفظ شدند.

## 7) Performance — تقویت شد
- Home data در زمان Intro Warm-fetch می‌شود.
- Product routes مهم Prefetch می‌شوند.
- Next/Image responsive + lazy loading برای تصاویر پایین صفحه.
- Media cache برای تصاویر، ویدئو و فونت محلی.
- `content-visibility` برای بخش‌های پایین Home.
- افکت‌های Ambient/Home به‌صورت Dynamic بعد از Intro بارگذاری می‌شوند.
- Intro 1 برای شروع سریع preload می‌شود.

## 8) Security — حفظ/تقویت شد
- Next.js هدف نصب: 16.3.3.
- CSP / HSTS Production / X-Frame / Referrer policy حفظ شده‌اند.
- Admin Session + TOTP + Audit/Security Event حفظ شده‌اند.
- Pricing / Coupon / Payment در سرور دوباره اعتبارسنجی می‌شوند.
- API افسانه محصول با Admin Session محافظت می‌شود.
- Provider پولی OpenAI در کد R6 وجود ندارد.

## 9) AI رایگان — اجرا شد
پیش‌فرض:
`ELORIA_AI_PROVIDER="template"`

اختیاری و رایگان روی سیستم خودتان:
`ELORIA_AI_PROVIDER="ollama"`

اگر Ollama در دسترس نباشد، سیستم به Template برمی‌گردد و خرید/فروش مختل نمی‌شود.

## 10) Contact — اجرا شد
- شماره مستقیم فعال: **09180079556**.
- `tel:` واقعی در صفحه تماس.
- شماره به نمایش نشانی عمومی وابسته نیست.
- فرم رسمی تماس همچنان به Support API و دیتابیس وصل است.

## 11) قابلیت‌هایی که عمداً خودکار وارد R6 نشدند
این موارد مفیدند، اما برای یک دیتابیس فعال نیاز به Migration و مهاجرت داده‌ی واقعی دارند و نباید کورکورانه وارد Release شوند:
- InventoryPiece سریال‌محور هر قطعه طلا
- Wallet / Cashback مالی
- QR Certificate دائمی و فرآیند صدور اصالت
- AR Try-on سنگین

این تصمیم برای جلوگیری از خرابی Production گرفته شده است، نه کمبود قابلیت.

## وضعیت بسته انتشار نهایی

- Installer با `npm install` وابستگی‌ها و `package-lock.json` را روی مقصد همگام می‌کند تا Next.js 16.3.3 و حذف Provider پولی دقیقاً اعمال شوند.
- سپس Prisma، TypeScript، ESLint و Production Build را اجرا می‌کند و در اولین خطا متوقف می‌شود.
- `db:seed` اجرا نمی‌شود.
- هیچ فایل `.env` واقعی، `node_modules`، `.next` یا `.git` در بسته انتشار قرار داده نشده است.

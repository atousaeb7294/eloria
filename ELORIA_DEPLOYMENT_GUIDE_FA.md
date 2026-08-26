# راهنمای ساده استقرار ELORIA روی Web Application پارس‌پک

آخرین بازبینی: ۴ شهریور ۱۴۰۵ / 26 August 2026

## انتخاب مناسب

برای ELORIA سرویس `PaaS > Next.js` با لوکیشن ایران انتخاب شود. این روش برخلاف VPS نیازی به نصب و نگهداری Ubuntu، Nginx، Docker یا SSL روی سرور ندارد. سورس از GitHub یا ZIP دریافت و توسط پلتفرم build و deploy می‌شود.

- خرید مستقیم سرویس Next.js: https://parspack.com/paas/nextjs
- راهنمای رسمی Next.js: https://docs.parspack.com/paas/deploy/programming-languages/next-js/
- راهنمای استقرار سورس: https://docs.parspack.com/paas/deploy/building-the-application/deploy-code/

## منابع شروع

- لوکیشن: ایران
- نوع برنامه: Next.js، نه Node.js عمومی
- پورت: `3000`
- CPU اجرا: `1 vCore`
- RAM اجرا: `2 GB`
- فضای SSD: `10 GB`
- منابع Build: در صورت امکان `2 vCore / 4 GB RAM`؛ build پروژه Next/Prisma از زمان اجرای عادی سنگین‌تر است.
- یک Replica در شروع و Backup خودکار فعال

اگر build با `Out of Memory` متوقف شد، فقط RAM مرحله Build را به ۴GB یا بیشتر افزایش دهید. اگر پس از افتتاح RAM اجرای برنامه بالای ۸۰٪ یا پاسخ p95 بالای ۸۰۰ms بود، اجرای برنامه به `2 vCore / 4 GB` ارتقا داده شود.

## سرویس‌های همراه

### PostgreSQL

یک PostgreSQL داخل همان پروژه PaaS و در لوکیشن ایران بسازید. دسترسی عمومی دیتابیس خاموش باشد و برنامه با آدرس داخلی متصل شود. `DATABASE_URL` برای اجرای برنامه و `DIRECT_URL` برای migration لازم‌اند. Backup خودکار کافی نیست؛ بازیابی آزمایشی دوره‌ای نیز لازم است.

### Cloud Storage

یک Bucket عمومی مخصوص تصاویر محصولات در Cloud Storage پارس‌پک بسازید. فایل‌های خصوصی و backup دیتابیس را در Bucket جدا و خصوصی نگه دارید.

- خرید Storage: https://parspack.com/cloud-storage
- مستندات: https://docs.parspack.com/cloud-storage/

## مرحله اول — آماده‌سازی همین بسته کامل روی ویندوز

فایل `eloria-production-final.zip` را در یک مسیر کوتاه مانند `C:\eloria` از حالت فشرده خارج کنید. هنگام بازکردن پوشه باید فایل `package.json` را مستقیماً ببینید. سپس PowerShell را باز کنید و وارد پوشه شوید:

```powershell
cd C:\eloria
node --version
npm --version
```

نسخه Node.js باید 20 یا 22 LTS باشد. بعد، وابستگی‌ها را دقیقاً از روی lockfile نصب و کنترل‌های مستقل از دیتابیس را اجرا کنید:

```powershell
npm ci
npm run verify:release
npm run typecheck
npm run lint
npm run audit:security
npm run audit:quality
```

این تحویل یک پروژه کامل است و هیچ پچی لازم ندارد. برای اتصال به GitHub، داخل همین پوشه یک مخزن تازه بسازید یا محتویات را جایگزین محتوای مخزن فعلی کنید؛ فایل‌های `.env` واقعی، `node_modules` و `.next` را هرگز commit نکنید:

```powershell
git init
git remote add origin https://github.com/atousaeb7294/eloria.git
git add -A
git commit -m "Complete production-ready ELORIA release"
git branch -M main
git push -u origin main --force-with-lease
```

دستور آخر تاریخچه شاخه مقصد را تغییر می‌دهد؛ فقط وقتی اجرا کنید که مطمئن هستید همین بسته باید جایگزین نسخه فعلی مخزن شود. راه کم‌ریسک‌تر این است که ابتدا روی شاخه `release/eloria-production` push کنید و سپس Pull Request بسازید.

## مرحله دوم — خرید و ساخت PaaS

1. وارد https://parspack.com/paas شوید.
2. پروژه‌ای با نام `eloria-production` بسازید.
3. «ایجاد اپلیکیشن» و سپس پلتفرم اختصاصی `Next.js` را انتخاب کنید.
4. نام اپلیکیشن را `eloria-web` بگذارید.
5. پورت را `3000` و `context_dir` را `/` قرار دهید.
6. لوکیشن ایران، یک replica و منابع شروع بالا را انتخاب کنید.
7. Backup خودکار را فعال کنید.

## مرحله سوم — اتصال کد

روش پیشنهادی، اتصال مخزن GitHub است:

1. `Private Repository` و سپس GitHub OAuth را انتخاب کنید.
2. مخزن `atousaeb7294/eloria` و branch اصلی خود را انتخاب کنید.
3. Webhook/Auto Deploy را فعلاً خاموش نگه دارید تا محیط Production کامل شود.

اگر GitHub در دسترس نبود، از Upload ZIP استفاده کنید. محتویات داخل پوشه پروژه را ZIP کنید؛ هنگام بازکردن ZIP باید `package.json` مستقیماً دیده شود و داخل یک پوشه اضافه نباشد. `node_modules`، `.git`، فایل `.env` و patchهای قدیمی داخل ZIP نباشند.

## مرحله چهارم — متغیرهای Build

این سه مقدار را در بخش Build Variables اضافه کنید و بعد از هر مورد دکمه «افزودن متغیر» را بزنید:

```env
NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN.IR
NEXT_PUBLIC_ELORIA_DOMESTIC_NETWORK_MODE=true
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

برای build پروژه، `DATABASE_URL` و `DIRECT_URL` نیز باید به‌صورت Secret در دسترس باشند، چون Prisma در prebuild اجرا می‌شود. هیچ secretی را در Git قرار ندهید.

## مرحله پنجم — متغیرهای Runtime

از `.env.example` یک فایل محلی با نام `.env` بسازید و تمام placeholderها را با مقدار واقعی پر کنید. سپس آن را از بخش Env Vars پنل بارگذاری کنید یا secretها را جداگانه ثبت کنید. حداقل موارد ضروری:

```env
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN.IR
ELORIA_INTERNAL_BASE_URL=https://YOUR_DOMAIN.IR

DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
DATABASE_SSL_MODE=verify-full

ELORIA_DOMESTIC_NETWORK_MODE=true
NEXT_PUBLIC_ELORIA_DOMESTIC_NETWORK_MODE=true

ELORIA_S3_ENDPOINT=https://ENDPOINT_FROM_PARSPACK
ELORIA_S3_REGION=REGION_FROM_PARSPACK
ELORIA_S3_BUCKET=product-images
ELORIA_S3_ACCESS_KEY=REAL_ACCESS_KEY
ELORIA_S3_SECRET_KEY=REAL_SECRET_KEY
ELORIA_S3_PUBLIC_URL=https://PUBLIC_STORAGE_DOMAIN

ELORIA_LEGAL_SELLER_NAME=REAL_SELLER_NAME
ELORIA_LEGAL_BUSINESS_ADDRESS=REAL_ADDRESS
ELORIA_LEGAL_SUPPORT_PHONE=REAL_PHONE
ELORIA_LEGAL_SUPPORT_EMAIL=REAL_EMAIL
ELORIA_SOCIAL_INSTAGRAM_URL=https://instagram.com/REAL_ID
ELORIA_SOCIAL_TELEGRAM_URL=https://t.me/REAL_ID
ELORIA_SOCIAL_BALE_URL=https://ble.ir/REAL_ID
```

تمام کلیدهای امنیتی `.env.example` باید تصادفی، مستقل و واقعی باشند. در شروع این flagها خاموش بمانند:

```env
ELORIA_COMMERCE_ENABLED=false
ELORIA_PAYMENT_ENABLED=false
ELORIA_DYNAMIC_PRICING_ENABLED=false
```

## مرحله ششم — Build و Migration

1. اولین Deploy را آغاز کنید و Build Logs را باز نگه دارید.
2. پس از build موفق، migration دیتابیس را یک‌بار در محیط امن اجرا کنید: `npm run db:migrate`.
3. برنامه را redeploy کنید.
4. health، صفحه خانه، محصول، سبد، ورود مدیر و آپلود تصویر را بررسی کنید.

Migration نباید هم‌زمان توسط چند replica اجرا شود. آن را job یک‌باره اجرا کنید، نه دستور startup دائمی هر replica.

## مرحله هفتم — دامنه و SSL

1. در تنظیمات اپلیکیشن دامنه اصلی را اضافه کنید.
2. رکورد DNS اعلام‌شده پنل را در DNS دامنه ثبت کنید.
3. منتظر تأیید دامنه و صدور SSL بمانید.
4. فقط پس از فعال‌شدن HTTPS، `NEXT_PUBLIC_SITE_URL` و `ELORIA_INTERNAL_BASE_URL` را روی دامنه نهایی قرار دهید و دوباره build کنید.

## مرحله هشتم — اینترنت ملی

- اپلیکیشن، PostgreSQL، تصاویر، فونت و ویدئو باید همگی در ایران باشند.
- حالت داخلی وابستگی اجباری فرم‌ها به Turnstile خارجی را حذف می‌کند؛ rate limit، origin، OTP، honeypot، محدودیت بدنه و idempotency باقی می‌مانند.
- GitHub فقط برای deploy لازم است و جزو مسیر استفاده مشتری نیست؛ در زمان قطعی خارجی، نسخه deploy‌شده ادامه کار می‌دهد.
- سرویس نرخ فلز، پیامک و درگاه باید از خود سرور ایران آزمایش شوند.

## مرحله نهم — تست قبل از فروش

1. Intro در ورودهای متوالی، شبکه کند و قطع ویدئو.
2. نمایش موبایل در عرض‌های 360، 390، 768 و 1440.
3. آپلود و حذف تصویر از Storage داخلی.
4. پشتیبانی آنلاین و پاسخ ادمین.
5. کد `ELORIA50` برای اولین خرید و جلوگیری از مصرف دوباره.
6. دو checkout هم‌زمان برای آخرین موجودی.
7. OTP همراه اول و ایرانسل.
8. پرداخت sandbox: موفق، لغو، timeout، callback تکراری و دیرهنگام.
9. قطع دسترسی خارجی و اجرای کامل صفحه محصول تا پرداخت آزمایشی.
10. restore یک backup روی دیتابیس آزمایشی.

فقط پس از موفقیت همه موارد، Commerce و سپس Payment را مرحله‌ای فعال کنید.

## نکته درباره «ایجنت هوشمند»

ELORIA اکنون پیشنهادگر خرید و ست‌کردن داخلی دارد که بدون OpenAI یا سرویس خارجی کار می‌کند، هزینه ندارد و در اینترنت ملی از کار نمی‌افتد. نصب چت‌بات مولد خارجی در شروع توصیه نمی‌شود؛ هم هزینه و تأخیر اضافه می‌کند، هم داده مشتری را به سرویس ثالث می‌فرستد و هم هنگام قطع اینترنت خارجی غیرفعال می‌شود. اگر بعداً موجودی و سفارش‌ها زیاد شد، یک موتور پیشنهادگر داخلی مبتنی بر رفتار رضایت‌داده‌شده مشتری می‌تواند به‌صورت سرویس جدا اضافه شود.

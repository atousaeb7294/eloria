# مرحله ۷.۴ — امنیت، تست و انتشار ELORIA

## ۱. آماده‌سازی متغیرهای محیطی

```powershell
npm run admin:secret
npm run check:env
```

حداقل متغیرهای تولید:

- `DATABASE_URL`
- `NEXT_PUBLIC_SITE_URL` با HTTPS
- `ELORIA_ADMIN_PASSWORD`
- `ELORIA_ADMIN_SESSION_SECRET`
- `CRON_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ELORIA_STORAGE_BUCKET`

برای پرداخت و پیامک:

- `ZARINPAL_MERCHANT_ID`
- `KAVENEGAR_API_KEY`
- `KAVENEGAR_SENDER`

## ۲. آماده‌سازی دیتابیس و Build

```powershell
npm ci
npx prisma generate
npx prisma generate
npm run verify
```

> این چهار بسته Schema دیتابیس را تغییر نمی‌دهند؛ Migration جدید لازم نیست.

## ۳. Cronهای ضروری

دو مسیر زیر را با هدر `Authorization: Bearer <CRON_SECRET>` اجرا کنید:

- `/api/cron/metal-prices`
- `/api/cron/expired-orders`

پیشنهاد: نرخ فلز هر ۵ تا ۱۵ دقیقه و آزادسازی سفارش‌های منقضی هر ۵ دقیقه.

## ۴. بررسی سلامت

```text
GET /api/health
```

این مسیر اتصال دیتابیس و فعال‌بودن تنظیمات مدیر، پرداخت، پیامک و محیط تولید را گزارش می‌کند؛ هیچ Secret را نمایش نمی‌دهد.

## ۵. پشتیبان‌گیری PostgreSQL

پیش از هر انتشار یا Migration:

```powershell
pg_dump "$env:DATABASE_URL" --format=custom --file="eloria-backup.dump"
```

بازیابی فقط در محیط کنترل‌شده:

```powershell
pg_restore --clean --if-exists --dbname="$env:DATABASE_URL" "eloria-backup.dump"
```

## ۶. Docker

```powershell
docker build -t eloria:7.4 .
docker run --env-file .env -p 3000:3000 eloria:7.4
```

## ۷. کنترل نهایی

- خرید آزمایشی با مبلغ واقعی کم
- تأیید Callback و کد پیگیری در دیتابیس
- بررسی کاهش موجودی و عدم کاهش دوباره
- لغو سفارش پرداخت‌نشده و بازگشت موجودی
- بررسی پیامک و فرم تماس
- بررسی پنل مدیریت در موبایل و دسکتاپ
- تست `npm run test:visual`
- تست `npm run audit:security`

## محدودیت Rate Limit

Rate Limit داخلی برای اجرای تک‌سرور کامل است. در معماری چندسروری یا Serverless، برای محدودسازی سراسری باید همان رابط با Redis/Upstash جایگزین شود.

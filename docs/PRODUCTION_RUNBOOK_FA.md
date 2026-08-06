# راهنمای انتشار Production الوریا

## ۱. پیش‌نیاز

1. Backup قابل بازیابی از PostgreSQL تهیه شود.
2. `DIRECT_URL` به اتصال مستقیم و `DATABASE_URL` به Pooler اشاره کند.
3. تمام Secretها با `npm run secrets:generate` تولید و در Secret Manager ثبت شوند.
4. Origin فقط از Reverse Proxy یا CDN مجاز قابل دسترسی باشد.

## ۲. Release Gate

در Commit مورد انتشار، Workflow «ELORIA Release Gate» باید کاملاً سبز باشد. مراحل اجباری:

1. نصب از Lockfile
2. Prisma Generate
3. Migration روی دیتابیس تازه
4. Seed قطعی
5. Type-check و Lint
6. آزمون Token، Pricing و Commerce
7. Build
8. Playwright
9. Security Audit
10. Docker Build

## ۳. Migration

برای دیتابیس تازه:

```bash
npx prisma migrate deploy
```

برای دیتابیس قدیمی که پیش از Prisma Migrate ایجاد شده است، ابتدا Schema واقعی با Migration baseline تطبیق داده و سپس فقط یک بار:

```bash
npx prisma migrate resolve --applied 00000000000000_existing_schema_baseline
npx prisma migrate deploy
```

`prisma db push` در Production اجرا نشود.

## ۴. Cron خارجی

Scheduler باید درخواست‌های زیر را با `Authorization: Bearer $CRON_SECRET` بفرستد:

```text
*/1  * * * *  /api/cron/expired-orders
*/10 * * * *  /api/cron/metal-prices
```

هر دو Route دارای Distributed Lease هستند؛ بااین‌حال Scheduler واحد ترجیح داده می‌شود.

## ۵. Health و Rollout

1. Container با Liveness بالا بیاید.
2. پیش از ورود Traffic، Readiness باید ۲۰۰ باشد.
3. Rollout به‌صورت تدریجی انجام شود.
4. در خطای پرداخت، سفارش یا موجودی Rollback فوری انجام شود؛ Migrationهای destructive بدون برنامه بازگشت ممنوع‌اند.

## ۶. پایش

حداقل هشدارها:

- Readiness 503
- افزایش `PAYMENT_REVIEW`
- نرخ منقضی یا ناموجود فلز
- خطای callback درگاه
- شکست آزادسازی موجودی
- Rate Limiter unavailable
- خطای Supabase Storage
- زمان پاسخ Checkout و Payment

## ۷. آزمون پس از انتشار

- صفحه فارسی و انگلیسی
- Home → Collection → Product
- افزودن به سبد و Refresh قیمت
- Checkout آزمایشی
- Callback موفق، ناموفق و تکراری در Sandbox
- ورود و خروج مدیریت
- آپلود و حذف تصویر
- Sitemap، Robots و Metadata
- Viewportهای 320، 375، 430 و Desktop

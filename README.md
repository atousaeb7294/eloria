# ELORIA / الوریا

فروشگاه دو‌زبانه جواهرات با هویت بصری الهام‌گرفته از ایران باستان و شاهنامه.

## فناوری

- Next.js 16، React 19 و TypeScript سخت‌گیرانه
- Tailwind CSS 4 و Base UI
- next-intl برای فارسی/انگلیسی و RTL/LTR
- Prisma 7 با PostgreSQL/Supabase
- Playwright برای آزمون مرورگر

## شروع توسعه

```bash
cp .env.example .env
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

آدرس پیش‌فرض: `http://localhost:3000/fa`

## کنترل کیفیت

```bash
npm run typecheck
npm run lint
npm run test:tokens
npm run test:pricing
npm run test:commerce
npm run build
npm run test:e2e
npm run audit:security
```

CI همین زنجیره را روی PostgreSQL کاملاً خالی اجرا می‌کند. استفاده از `prisma db push` در Release و Production ممنوع است.

## دیتابیس

- `DATABASE_URL`: اتصال Pooler برای Runtime
- `DIRECT_URL`: اتصال مستقیم برای Migration
- Migration اولیه واقعی در `prisma/migrations/00000000000000_existing_schema_baseline`
- Seed قطعی در `prisma/seed.ts`

برای دیتابیس موجودی که baseline قبلاً با `db push` ساخته شده، پیش از اولین Deploy فقط یک بار baseline را applied علامت بزنید؛ این کار باید پس از تطبیق Schema و تهیه Backup انجام شود:

```bash
npx prisma migrate resolve --applied 00000000000000_existing_schema_baseline
npx prisma migrate deploy
```

برای دیتابیس تازه فقط `npx prisma migrate deploy` اجرا می‌شود.

## Cron

Cron داخل Process وب اجرا نمی‌شود. Scheduler خارجی باید با هدر Bearer مسیرهای زیر را فراخوانی کند:

- هر ۱ دقیقه: `/api/cron/expired-orders`
- هر ۱۰ دقیقه: `/api/cron/metal-prices`

نمونه:

```bash
node scripts/run-cron-once.mjs expired-orders
node scripts/run-cron-once.mjs metal-prices
```

## Health Check

- Liveness: `/api/health?mode=live`
- Readiness: `/api/health?mode=ready`

Readiness فقط زمانی ۲۰۰ برمی‌گرداند که دیتابیس و متغیرهای ضروری آماده باشند.

## امنیت عملیاتی

- در Production، Rate Limiter به‌طور پیش‌فرض fail-closed است.
- برای Cloudflare مقدار `ELORIA_PROXY_PROVIDER=cloudflare` تنظیم شود.
- Origin سرور باید در سطح شبکه فقط از CDN/Proxy مورد اعتماد قابل دسترسی باشد.
- آپلود تصویر با Magic Bytes، ابعاد، تعداد پیکسل و حذف متادیتا اعتبارسنجی می‌شود.
- Secretها هرگز وارد Git نمی‌شوند.

## ساختار مرجع

```text
src/                 کد اصلی برنامه
prisma/              Schema، Migration و Seed
scripts/             ابزارهای عملیاتی و آزمون‌های مستقل
tests/               آزمون‌های Playwright
messages/            ترجمه‌های فارسی و انگلیسی
.github/workflows/    Release Gate
```

پوشه‌های Backup، Test Result و کپی‌های ابزارها Source of Truth نیستند و نباید وارد TypeScript، ESLint، Docker یا Git شوند.

## انتشار

راهنمای مرحله‌به‌مرحله در `docs/PRODUCTION_RUNBOOK_FA.md` قرار دارد. انتشار فقط از Artifact همان اجرای سبز CI انجام شود.

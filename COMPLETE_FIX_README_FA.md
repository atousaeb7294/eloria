# بسته اصلاح کامل ELORIA — ۱۴۰۵/۰۵/۱۵

این بسته مشکلات شناخته‌شده فعلی را یکجا اصلاح می‌کند:

- استفاده از `DIRECT_URL` برای Prisma Migration و `DATABASE_URL` روی Transaction Pooler برای Runtime.
- Baseline امن دیتابیس موجود بدون Reset یا حذف داده.
- ساخت و کنترل جدول‌های `rate_limit_buckets`، `cron_leases`، `admin_sessions` و `admin_security_events`.
- سیاست فروش بازار بسته تا ۱۰ روز با حاشیه پلکانی:
  - طلا: ۳٪، ۵٪، ۸٪، ۱۲٪ و از روز چهارم تا دهم ۱۵٪.
  - نقره: ۵٪، ۸٪، ۱۲٪، ۱۸٪ و از روز چهارم تا دهم ۲۵٪.
- توقف خودکار فروش بعد از ۱۰ روز یا در صورت نامعتبر بودن زمان منبع.
- ابزار Sync و تشخیص دقیق نرخ.
- ابزار ثبت نرخ دستی با تأیید صریح برای زمان خرابی یا عقب‌ماندگی منبع BRS.
- Task اختیاری ویندوز برای Sync هر ۱۰ دقیقه.
- اصلاح هشدار اجرای `<script>` داخل React.
- بهبود بارگذاری تصویر LCP و پاک‌سازی هشدار ESLint تصویر پنل مدیریت.
- حذف کپی‌های اشتباه سورس از داخل `.github`؛ فقط Workflow نگه داشته شده است.

## نصب روی پروژه فعلی

پیش از اجرا از Supabase بکاپ بگیرید. فایل `.env` داخل این بسته نیست و نباید جایگزین یا Commit شود.

پس از Extract، PowerShell را داخل پوشه بسته باز کنید:

```powershell
powershell -ExecutionPolicy Bypass -File .\APPLY_COMPLETE_FIX.ps1
```

مسیر پیش‌فرض پروژه:

```text
C:\Users\MNP\Desktop\neweloria\neweloria
```

برای مسیر دیگر:

```powershell
powershell -ExecutionPolicy Bypass -File .\APPLY_COMPLETE_FIX.ps1 -ProjectPath "D:\path\to\neweloria"
```

## راه‌اندازی پس از کپی

```powershell
cd C:\Users\MNP\Desktop\neweloria\neweloria
npm ci
npm run db:repair-existing
npm run metal:diagnose-sync
npm run typecheck
npm run lint
npm run test:pricing
npm run build
```

خروجی دیتابیس باید این پیام را داشته باشد:

```text
PASS: database hardening and 10-day closed-market policy are active.
```

## اجرای سایت

```powershell
npm run dev
```

سپس:

```text
http://localhost:3000/fa
```

## اگر BRS نرخ جدید نداد

ابتدا وضعیت را بررسی کنید:

```powershell
npm run metal:diagnose-sync
```

ثبت نرخ دستی فقط بعد از کنترل نرخ واقعی بازار و بر حسب **تومان برای هر گرم** انجام شود:

```powershell
npm run metal:set-manual -- --gold=PRICE --silver=PRICE --source-at="2026-08-06T03:00:00+03:30" --confirm=SET_MANUAL_METAL_RATES
```

این ابزار نرخ را با منبع `MANUAL_OPERATOR` و زمان مشخص ثبت و در History ذخیره می‌کند. قیمت نمونه داخل دستور قرار ندهید؛ مقدار واقعی و تأییدشده را وارد کنید.

## Sync خودکار روی ویندوز محلی

```powershell
npm run metal:install-windows-task
```

Task با نام `Eloria Metal Price Sync` هر ۱۰ دقیقه اجرا می‌شود و Log را اینجا می‌نویسد:

```text
logs\metal-price-sync.log
```

در Production بهتر است Route زیر توسط Scheduler بیرونی با Bearer Token فراخوانی شود:

```text
GET /api/cron/metal-prices
Authorization: Bearer <CRON_SECRET>
```

## ثبت Git

```powershell
git status
git add -A
git commit -m "fix: complete database and metal-pricing repair"
git push
```

## دستورات ممنوع روی دیتابیس موجود

```powershell
npx prisma migrate reset
npx prisma db push --force-reset
```

این دستورات ممکن است داده‌های فعلی را حذف کنند.

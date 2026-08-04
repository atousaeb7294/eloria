# ELORIA — سخت‌سازی کامل در ۱۰ مرحله

این نسخه نتیجه بازبینی پرداخت، موجودی، امنیت، دیتابیس، Cron، پنل، استقرار، SEO و تست‌های فروشگاه است.

## ۱. ماشین وضعیت پرداخت

- شروع پرداخت Idempotent با `activeKey`
- قفل Verify و جلوگیری از Callback هم‌زمان
- Callback قدیمی سفارش پرداخت‌شده را تنزل نمی‌دهد
- پرداخت دیرهنگام یا پرداخت اضافه به `REQUIRES_REVIEW` می‌رود
- خطای موقت Verify، Authority را نابود نمی‌کند و قابل تلاش مجدد است
- ثبت نهایی پرداخت پس از تأیید بانک سه بار با تراکنش Serializable تکرار می‌شود
- پرداخت تأییدشده بانکی هیچ‌وقت به‌اشتباه `FAILED` نمی‌شود

## ۲. موجودی

- موجودی تنوع‌ها منبع محاسبه موجودی محصول مادر است
- رزرو و بازگردانی داخل تراکنش انجام می‌شود
- لغو، انقضا و بازپرداخت از تابع مشترک استفاده می‌کنند
- ابزارهای `stock:sync` و `check:inventory` اضافه شده‌اند

## ۳. ضد سوءاستفاده

- Rate Limit مشترک PostgreSQL با Fallback پردازشی
- محدودیت IP و موبایل
- سقف سه سفارش باز با قفل Advisory دیتابیس
- Turnstile اختیاری
- اعتماد به Proxy فقط با `ELORIA_TRUST_PROXY=true`

## ۴. Migration و Constraint

- Baseline برای دیتابیس موجود
- Migration سخت‌سازی Commerce
- Constraint موجودی، قیمت، درصد، مبلغ و تعداد
- اسکریپت جدا برای دیتابیس موجود و دیتابیس تازه

## ۵. Cron و Environment

- Lease دیتابیسی برای جلوگیری از اجرای هم‌زمان Cron
- آزادسازی سفارش منقضی هر دقیقه
- همگام‌سازی نرخ فلز هر ده دقیقه
- پاک‌سازی Bucketهای Rate Limit
- توقف Startup در Production با Environment ناقص

## ۶. پیگیری خصوصی سفارش

- شماره موبایل در URL قرار نمی‌گیرد
- لینک پیگیری HMAC و ۱۵ دقیقه‌ای است
- Rate Limit مستقل برای پیگیری سفارش
- صفحات پیگیری `noindex` هستند

## ۷. امنیت پنل

- نام کاربری و رمز قوی
- TOTP اختیاری
- Session قابل ابطال در دیتابیس
- ثبت رویداد ورود و شکست ورود
- نسخه Session برای خروج اجباری همه مدیران
- پرداخت اضافه به‌صورت مستقل بعد از بازپرداخت واقعی قابل ثبت است

## ۸. استقرار

- خروجی Standalone برای Next.js
- Docker چندمرحله‌ای و کاربر غیر Root
- Healthcheck بدون افشای جزئیات عمومی
- TLS دیتابیس با `verify-full`
- کلید ثابت Server Actions و Deployment ID

## ۹. SEO و کارایی

- Sitemap پویا
- Robots
- Manifest
- Canonical و hreflang
- Metadata اختصاصی محصول
- Intro یک‌بار در Session و Skip برای Reduced Motion

## ۱۰. رسید امن و تست Commerce

- رسید پرداخت HMAC و کوتاه‌عمر
- شماره سفارش و Ref ID در Query String قرار نمی‌گیرد
- تست Tokenها
- تست Lease پرداخت و انقضای موجودی
- تست جلوگیری از تنزل سفارش پرداخت‌شده
- تست بازپرداخت پرداخت اضافه بدون تغییر سفارش و موجودی

---

# روش نصب پیشنهادی

برای پروژه فعلی فقط بسته شماره ۱۰ را جایگزین کنید. بسته‌های ۱ تا ۹ برای نصب مرحله‌ای، بررسی و Rollback هستند.

1. از پوشه پروژه و دیتابیس Backup بگیرید.
2. فایل `.env` فعلی را نگه دارید.
3. محتوای `eloria-main` بسته دهم را روی پروژه جایگزین کنید.
4. دستورات زیر را اجرا کنید:

```powershell
cd "C:\Users\MNP\Desktop\neweloria\neweloria"
npm install
npx prisma generate
```

## دیتابیس موجود Supabase

فقط یک‌بار:

```powershell
npm run db:preflight
powershell -ExecutionPolicy Bypass -File scripts/baseline-production-db.ps1
```

## دیتابیس تازه

```powershell
powershell -ExecutionPolicy Bypass -File scripts/bootstrap-fresh-db.ps1
```

## تولید کلیدهای Production

```powershell
npm run secrets:generate
npm run admin:totp-secret
```

خروجی Secretها را فقط در Environment هاست ذخیره کنید و داخل Git قرار ندهید.

## کنترل نهایی

```powershell
npm run check:env
npm run lint
npm run build
npm run audit:security
npm run audit:dependencies
npm run test:tokens
npm run test:pricing
npm run check:inventory
npm run test:commerce
npm run test:visual
```

`test:commerce` داده آزمایشی جدا می‌سازد و در پایان حذف می‌کند، اما فقط روی دیتابیسی اجرا شود که Backup دارد.

## استقرار اولیه

- Replica اولیه: `1`
- Start command بدون Docker: `npm start`
- Docker runner: دستور پیش‌فرض Image
- Migration باید قبل از تعویض Traffic اجرا شود
- `DATABASE_URL` برای Runtime از Pooler و `DIRECT_URL` برای Migration از اتصال مستقیم باشد

## نکات مهم

- دکمه «ثبت بازپرداخت دستی» فقط بعد از بازگشت واقعی وجه در زرین‌پال استفاده شود.
- خالی‌گذاشتن هر دو کلید Turnstile آن را غیرفعال می‌کند؛ برای فعال‌سازی هر دو کلید Public و Secret لازم است.
- برای خروج اجباری همه نشست‌های مدیر، مقدار `ELORIA_ADMIN_SESSION_VERSION` را افزایش دهید.
- `npm audit fix --force` بدون بررسی نسخه‌ها اجرا نشود.

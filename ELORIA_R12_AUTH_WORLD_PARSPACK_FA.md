# نسخه R12 الوریا — ورود، جهان روایی و استقرار پارس‌پک

## نتیجه ممیزی این نسخه

- ویدئوهای Intro، تصاویر و پس‌زمینه‌های موجود تغییر نکرده‌اند.
- ساخت تمیز دیگر هنگام `prisma generate` صرفاً به‌خاطر نبود `DIRECT_URL` متوقف نمی‌شود؛ اتصال واقعی برای migration و runtime همچنان الزامی است.
- اعتبارسنجی Turnstile در Production هر hostname موجود در `NEXT_PUBLIC_SITE_URL` و `ELORIA_ALLOWED_ORIGINS` را می‌پذیرد. برای الوریا هر دو دامنه بدون `www` و با `www` باید در Cloudflare نیز مجاز باشند.
- صفحه عمومی `/{locale}/world` اضافه شده و هر اثر منتشرشده را با افسانه، شخصیت ایرانی و خاستگاهش در جهان مادر نمایش می‌دهد.
- هنگام ساخت محصول، افسانه و نام یکتای استفاده‌نشده از کتابخانه صدتایی به آن اختصاص داده می‌شود. استودیوی مدیریت جهان در `/{locale}/admin/world` باقی می‌ماند.
- ابزار `scripts/audit-parspack-env.ps1` مقدار هیچ secretی را چاپ نمی‌کند؛ فقط حضور، طول، کمبودها، وضعیت ساختاری auth و migration را گزارش می‌دهد.

## دستور واحد برای تشخیص وضعیت واقعی سرور

در PowerShell سرور اجرا کنید و کل خروجی را ارسال کنید:

```powershell
Set-Location C:\eloria
powershell -ExecutionPolicy Bypass -File .\scripts\audit-parspack-env.ps1 -ProjectPath C:\eloria -EnvFile .env
```

این گزارش نباید مقدار رمزها، API Keyها یا URL کامل دیتابیس را نمایش دهد. فایل `.env` را هرگز ارسال نکنید.

## علت‌های محتمل خرابی هر دو ورود

1. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` در زمان build وجود نداشته یا پس از تغییر ENV، برنامه دوباره build/restart نشده است.
2. در Cloudflare Turnstile، hostnameهای `eloriagallery.ir` و `www.eloriagallery.ir` هر دو ثبت نشده‌اند.
3. Site Key و Secret Key متعلق به یک Widget نیستند.
4. `NEXT_PUBLIC_SITE_URL` یا `ELORIA_ALLOWED_ORIGINS` با دامنه‌ای که مرورگر باز کرده هماهنگ نیست.
5. migrationهای `admin_sessions` یا `customer_otp_challenges` روی دیتابیس Production اعمال نشده‌اند.
6. برای مدیر، Hash رمز، TOTP یا secret نشست ناقص است؛ برای مشتری، feature gate یا تنظیمات SMS.ir ناقص است.

## حداقل تنظیم صحیح ورود

```dotenv
NEXT_PUBLIC_SITE_URL=https://eloriagallery.ir
ELORIA_INTERNAL_BASE_URL=https://eloriagallery.ir
ELORIA_ALLOWED_ORIGINS=https://eloriagallery.ir,https://www.eloriagallery.ir

ELORIA_CUSTOMER_AUTH_ENABLED=true
ELORIA_CUSTOMER_SMS_OTP_ENABLED=true
SMS_IR_API_KEY=...
SMS_IR_VERIFY_TEMPLATE_ID=...
SMS_IR_VERIFY_PARAMETER=Code
ELORIA_CUSTOMER_AUTH_SECRET=...

NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...

ELORIA_ADMIN_USERNAME=...
ELORIA_ADMIN_PASSWORD_HASH=...
ELORIA_ADMIN_SESSION_SECRET=...
ELORIA_ADMIN_SESSION_VERSION=1
ELORIA_ADMIN_TOTP_SECRET=...
```

نکته: ورود، عضویت و بازیابی رمز مشتری اکنون با کد شش‌رقمی SMS.ir انجام می‌شود و هیچ ورودی ایمیلی در پنل احراز هویت مشتری وجود ندارد.

## تنظیم SMS.ir

1. در پنل SMS.ir یک الگوی Verify بسازید و نام پارامتر آن را دقیقاً در `SMS_IR_VERIFY_PARAMETER` قرار دهید.
2. شناسهٔ عددی الگو را در `SMS_IR_VERIFY_TEMPLATE_ID` و کلید API را در `SMS_IR_API_KEY` قرار دهید.
3. بعد از تغییر ENV، سرویس باید restart شود.
4. از صفحهٔ ورود، عضویت یا فراموشی رمز یک شمارهٔ آزمایشی را بررسی کنید و Logهای `[Eloria SMS.ir]` را ببینید.

## ترتیب نصب و راه‌اندازی روی پارس‌پک

```powershell
Set-Location C:\eloria
npm ci
npm run check:env
npm run check:auth
npm run db:migrate
npm run db:status
npm run build
npm run start:production
```

اگر برنامه به‌صورت سرویس یا پشت IIS/NSSM/PM2 اجرا می‌شود، پس از build همان سرویس را restart کنید؛ دو نمونه برنامه را هم‌زمان روی یک port اجرا نکنید.

## آزمون نهایی

- `https://eloriagallery.ir/api/public/turnstile-config` باید `required: true` و یک `siteKey` غیرخالی برگرداند.
- ورود مدیر باید بعد از Turnstile، رمز و کد شش‌رقمی Authenticator به `/{locale}/admin` برسد.
- ورود، عضویت و بازیابی رمز مشتری باید OTP پیامکی SMS.ir را تحویل دهد و بعد از تأیید به `/{locale}/profile` برسد.
- `npm run db:status` باید همه migrationها را Applied نشان دهد.
- `npm run typecheck`، `npm run lint` و `npm run build` باید موفق شوند.

## نکته امنیتی

کلید خصوصی Turnstile، SMS.ir API Key، TOTP Secret، Session Secret و URLهای دیتابیس نباید در Git، ZIP عمومی، اسکرین‌شات یا پیام قرار گیرند. فقط گزارش ابزار ممیزی بالا را برای بررسی ارسال کنید.

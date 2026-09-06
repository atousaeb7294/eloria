# راهنمای کامل نصب و انتشار نهایی الوریا

این راهنما را دقیقاً از بالا به پایین انجام دهید. مسیر اصلی پروژه در ویندوز باید `C:\eloria` باشد.

## ۱. پیش‌نیازها

Node.js 24، Git for Windows، PowerShell و Google Authenticator باید نصب باشند. کنترل:

```powershell
node -v
npm -v
git --version
```

## ۲. خارج‌کردن فایل نهایی

1. روی ZIP راست‌کلیک و `Extract All` را بزنید.
2. وارد پوشه استخراج‌شده شوید.
3. فایل `INSTALL_ELORIA_FINAL.ps1` باید کنار `package.json` باشد.

## ۳. نصب خودکار با یک دستور

PowerShell را با `Run as administrator` باز کنید. مسیر Downloads را مطابق محل فایل خودتان اصلاح کنید:

```powershell
Set-Location "C:\Users\MNP\Downloads\ELORIA_FINAL_PRODUCTION_2026-08-31"
powershell -ExecutionPolicy Bypass -File .\INSTALL_ELORIA_FINAL.ps1 -InstallPath C:\eloria
```

این دستور فایل‌ها را کنترل می‌کند، از نسخه قبلی Backup می‌گیرد، پروژه را نصب می‌کند، `npm ci`، Prisma، TypeScript، ESLint و Build تولیدی را اجرا می‌کند و متغیرها را بدون چاپ رمزها بررسی می‌کند.

اگر گفت `.env` وجود ندارد، بخش بعدی را انجام دهید و دستور را دوباره اجرا کنید.

## ۴. ساخت `.env` محلی

```powershell
Set-Location C:\eloria
Copy-Item .env.example .env
notepad .env
```

مقادیر عمومی زیر باید دقیقاً تنظیم شوند:

```env
NODE_ENV="production"
NEXT_PUBLIC_SITE_URL="https://eloriagallery.ir"
ELORIA_INTERNAL_BASE_URL="https://eloriagallery.ir"
ELORIA_ALLOWED_ORIGINS="https://eloriagallery.ir,https://www.eloriagallery.ir"
ELORIA_COMMERCE_ENABLED="true"
ELORIA_CUSTOMER_AUTH_ENABLED="true"
ELORIA_DYNAMIC_PRICING_ENABLED="true"
ELORIA_PAYMENT_ENABLED="false"
ELORIA_SUPPORT_ENABLED="true"
ELORIA_SUPPORT_CHAT_ENABLED="true"
ELORIA_MEASUREMENT_ENABLED="false"
ELORIA_CUSTOMER_WATCHES_ENABLED="true"
ELORIA_CONTENT_AUTOPILOT_ENABLED="false"
ELORIA_CONTENT_AUTOPILOT_DAILY_LIMIT="1"
ELORIA_EMBEDDED_METAL_SYNC_ENABLED="true"
ELORIA_EMBEDDED_METAL_SYNC_INTERVAL_MINUTES="5"
ELORIA_TRUST_PROXY="true"
ELORIA_PROXY_PROVIDER="generic"
ELORIA_RATE_LIMIT_FAILURE_MODE="closed"
ELORIA_CUSTOMER_SMS_OTP_ENABLED="true"
SMS_IR_API_KEY="PASTE_SMS_IR_API_KEY"
SMS_IR_VERIFY_TEMPLATE_ID="PASTE_SMS_IR_VERIFY_TEMPLATE_ID"
SMS_IR_VERIFY_PARAMETER="Code"
ELORIA_STORAGE_BUCKET="product-images"
DATABASE_SSL_MODE="require"
DATABASE_POOL_MAX="5"
ELORIA_LEGAL_PAGES_INDEX="false"
ELORIA_SECURITY_ALERT_MIN_SEVERITY="HIGH"
ELORIA_SECURITY_ALERT_COOLDOWN_SECONDS="300"
```

تا زمان گرفتن Merchant ID واقعی زرین‌پال، `ELORIA_PAYMENT_ENABLED=false` بماند.

این متغیرها محرمانه‌اند و باید مقدار واقعی داشته باشند:

```text
DATABASE_URL
DIRECT_URL
ELORIA_ADMIN_PASSWORD_HASH
ELORIA_ADMIN_SESSION_SECRET
ELORIA_ADMIN_TOTP_SECRET
ELORIA_CUSTOMER_AUTH_SECRET
ELORIA_SUPPORT_CHAT_SECRET
CRON_SECRET
ELORIA_HEALTH_SECRET
ELORIA_TRACKING_SECRET
ELORIA_PAYMENT_RECEIPT_SECRET
ELORIA_PAYMENT_START_SECRET
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
SMS_IR_API_KEY
SMS_IR_VERIFY_TEMPLATE_ID
SMS_IR_VERIFY_PARAMETER
NEXT_PUBLIC_TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
BRS_API_KEY
ELORIA_SECURITY_ALERT_WEBHOOK_URL
```

ساخت کلیدهای داخلی جدید:

```powershell
Set-Location C:\eloria
npm run secrets:generate
```

خروجی را فقط در `.env` و متغیرهای پارس‌پک بگذارید؛ داخل GitHub نگذارید.

در تصویر شما `ELORIA_SECURITY_ALERT_WEBHOOK_URL` روی آدرس اصلی Supabase قرار گرفته بود. این آدرس Webhook واقعی نیست و باید حذف یا با یک HTTPS Webhook واقعی جایگزین شود. راه دیگر، تنظیم `ELORIA_SECURITY_ALERT_MOBILE` همراه `SMS_IR_API_KEY` و `SMS_IR_LINE_NUMBER` است. حداقل یکی از این دو کانال باید واقعاً کار کند.

## ۵. رمز و ورود مدیریت

رمزی حداقل ۲۰ نویسه‌ای انتخاب و Hash آن را بسازید:

```powershell
Set-Location C:\eloria
npm run admin:password-hash -- "رمز-طولانی-و-جدید-خودتان"
```

خروجی کامل `scrypt$...` را در `ELORIA_ADMIN_PASSWORD_HASH` بگذارید. اگر `ELORIA_ADMIN_PASSWORD` وجود دارد آن را حذف کنید.

ساخت TOTP:

```powershell
npm run admin:totp-secret
```

خروجی را در `ELORIA_ADMIN_TOTP_SECRET` قرار دهید. سپس در Google Authenticator:

1. `+` را بزنید.
2. `Enter a setup key` را انتخاب کنید.
3. Account: `Eloria Admin`
4. Key: مقدار `ELORIA_ADMIN_TOTP_SECRET`
5. Type: `Time based`
6. Add را بزنید.

برای ورود مدیر از نام کاربری، همان رمز معمولی قبل از Hash و کد شش‌رقمی Authenticator استفاده کنید. اگر رمز یا TOTP عوض شد، `ELORIA_ADMIN_SESSION_VERSION` را یک عدد زیاد کنید.

## ۶. Cloudflare Turnstile

1. وارد Cloudflare شوید.
2. `Turnstile` را باز کنید.
3. Widget الوریا را باز کنید یا `Add widget` بزنید.
4. نام: `Eloria Production`
5. Mode: `Managed`
6. در Hostname Management این دو دامنه را اضافه کنید:

```text
eloriagallery.ir
www.eloriagallery.ir
```

7. Save را بزنید.
8. Site Key را در `NEXT_PUBLIC_TURNSTILE_SITE_KEY` بگذارید.
9. Secret Key همان Widget را در `TURNSTILE_SECRET_KEY` بگذارید.

این دو کلید حتماً باید متعلق به یک Widget باشند. پس از تغییر، پارس‌پک را Redeploy کنید.

## ۷. SMS.ir و ورود موبایلی مشتری

1. در پنل SMS.ir یک الگوی Verify بسازید و نام پارامتر آن را در `SMS_IR_VERIFY_PARAMETER` بگذارید.
2. شناسهٔ عددی الگو را در `SMS_IR_VERIFY_TEMPLATE_ID` و کلید API را در `SMS_IR_API_KEY` بگذارید.
3. برای پیامک‌های عادی پشتیبانی و هشدار، شمارهٔ خط ارسال را در `SMS_IR_LINE_NUMBER` تنظیم کنید.
4. پس از تغییر ENV، سرویس را Redeploy/Restart کنید و یک ورود، عضویت و بازیابی رمز آزمایشی انجام دهید.

```env
ELORIA_CUSTOMER_SMS_OTP_ENABLED="true"
SMS_IR_API_KEY="..."
SMS_IR_VERIFY_TEMPLATE_ID="..."
SMS_IR_VERIFY_PARAMETER="Code"
```

نام `SMS_IR_VERIFY_PARAMETER` باید دقیقاً با پارامتر تعریف‌شده در الگوی Verify یکی باشد.

## ۸. قیمت لحظه‌ای

در پارس‌پک:

```env
ELORIA_DYNAMIC_PRICING_ENABLED="true"
ELORIA_EMBEDDED_METAL_SYNC_ENABLED="true"
ELORIA_EMBEDDED_METAL_SYNC_INTERVAL_MINUTES="5"
BRS_API_KEY="کلید واقعی BRS"
CRON_SECRET="کلید تصادفی حداقل ۴۸ نویسه"
```

در تصویر شما Embedded Metal Sync روی `false` بود؛ حتماً آن را `true` کنید. پس از استقرار باید در لاگ ببینید:

```text
[ELORIA] Embedded metal sync completed
```

کنترل نرخ:

```powershell
Invoke-RestMethod "https://eloriagallery.ir/api/metal-prices" | ConvertTo-Json -Depth 10
```

## ۹. کنترل متغیرها

```powershell
Set-Location C:\eloria
powershell -ExecutionPolicy Bypass -File .\scripts\audit-parspack-env.ps1 -ProjectPath C:\eloria -EnvFile .env -SiteUrl https://eloriagallery.ir -SkipLive
```

تمام ردیف‌های ضروری باید `OK` باشند. رمزها چاپ نمی‌شوند.

## ۱۰. Migration دیتابیس

بعد از درست‌کردن `DATABASE_URL` و `DIRECT_URL`:

```powershell
Set-Location C:\eloria
powershell -ExecutionPolicy Bypass -File .\INSTALL_ELORIA_FINAL.ps1 -InstallPath C:\eloria -RunDatabaseMigration
```

برای جایگزینی متن افسانه‌های قدیمی با روایت جدید، بدون تغییر افسانه اختصاص‌یافته به هر محصول:

```powershell
npm run myths:refresh
```

## ۱۱. ارسال به GitHub

ابتدا در مرورگر وارد حساب GitHub مالک مخزن شوید. روش خودکار:

```powershell
Set-Location C:\eloria
powershell -ExecutionPolicy Bypass -File .\INSTALL_ELORIA_FINAL.ps1 -InstallPath C:\eloria -PushGitHub
```

مقصد `https://github.com/atousaeb7294/eloria.git` و Branch برابر `main` است.

اگر روش خودکار خطا داد:

```powershell
Set-Location C:\eloria
git init
git remote remove origin 2>$null
git remote add origin https://github.com/atousaeb7294/eloria.git
git add .
git commit -m "release: final Eloria production"
git branch -M main
git push -u origin main
```

اگر پنجره ورود باز شد `Sign in with your browser` را انتخاب کنید. `.env` نباید Commit شود. کنترل:

```powershell
git status
git log -1 --oneline
```

## ۱۲. اتصال GitHub به پارس‌پک

1. وارد `my.parspack.com` شوید.
2. `PaaS` و سپس `app-nextjs-jwrm8` را باز کنید.
3. وارد `ویرایش پیکربندی` یا منبع کد شوید.
4. منبع را GitHub Repository انتخاب کنید.
5. Repository: `atousaeb7294/eloria`
6. Branch: `main`
7. Context/Root Directory: `/` یا خالی
8. Build Command:

```text
npm ci && npm run build
```

9. Start Command:

```text
npm start
```

10. Health Check Path:

```text
/api/health?mode=live
```

Port را ثابت نکنید؛ برنامه `PORT` پارس‌پک را می‌خواند و روی `0.0.0.0` اجرا می‌شود.

## ۱۳. متغیرهای پارس‌پک

مسیر: `PaaS ← app-nextjs-jwrm8 ← متغیرهای محیطی`.

متغیر موجود را دوباره نسازید؛ مداد کنار آن را بزنید و مقدار را اصلاح کنید. این سه مورد تصویر شما حتماً باید اصلاح شوند:

```env
ELORIA_EMBEDDED_METAL_SYNC_ENABLED=true
ELORIA_PROXY_PROVIDER=generic
SMS_IR_VERIFY_PARAMETER=Code
```

در بخش `متغیرهای Build` این موارد را نیز قرار دهید:

```text
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_TURNSTILE_SITE_KEY
SUPABASE_URL
ELORIA_ALLOWED_IMAGE_HOSTS
ELORIA_DEPLOYMENT_ID
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
```

برای انتشار جدید:

```env
ELORIA_DEPLOYMENT_ID="eloria-final-20260831-2"
```

## ۱۴. Migration در ترمینال پارس‌پک

بعد از Build موفق، منوی `ترمینال` اپلیکیشن را باز و به‌ترتیب اجرا کنید:

```bash
npx prisma migrate deploy
npx prisma generate
npm run myths:assign
npm run myths:refresh
```

در صورت خطای Migration، از `prisma db push` استفاده نکنید؛ متن خطا را نگه دارید.

## ۱۵. دامنه پارس‌پک

1. `تنظیمات دامنه و IP` را باز کنید.
2. `eloriagallery.ir` و `www.eloriagallery.ir` را اضافه کنید.
3. SSL/HTTPS را فعال کنید.
4. دامنه اصلی `eloriagallery.ir` باشد.
5. `www` به `https://eloriagallery.ir` Redirect شود.

## ۱۶. استقرار

1. آخرین Commit شاخه `main` را انتخاب کنید.
2. `استقرار مجدد` را بزنید.
3. در لاگ باید `Compiled successfully` و سپس شروع سرور دیده شود.
4. پس از سبزشدن وضعیت، سایت را باز و `Ctrl+F5` بزنید.

## ۱۷. تست نهایی

سلامت:

```powershell
Invoke-RestMethod "https://eloriagallery.ir/api/health?mode=live"
```

Turnstile و ورود را در این دو صفحه امتحان کنید:

```text
https://eloriagallery.ir/fa/login
https://eloriagallery.ir/fa/admin/login
```

مدیر باید با Username، رمز معمولی، کد Authenticator و Turnstile وارد `/fa/admin` شود. مشتری می‌تواند با رمز عبور وارد شود یا کد پیامکی SMS.ir بگیرد و سپس وارد `/fa/profile` شود.

تست‌های نهایی:

```powershell
Set-Location C:\eloria
node .\scripts\eloria-production-commerce-check.mjs https://eloriagallery.ir
powershell -ExecutionPolicy Bypass -File .\scripts\audit-parspack-env.ps1 -ProjectPath C:\eloria -EnvFile .env -SiteUrl https://eloriagallery.ir
```

## ۱۸. استفاده از جهان الوریا

مسیر افزودن محصول: `مدیریت ← محصولات ← افزودن محصول`.

برای هر محصول قسمت افسانه فارسی، افسانه انگلیسی، تصویر شخصیت و تصویر فضای افسانه وجود دارد. مسیر همه شخصیت‌ها و خاستگاه‌ها: `/fa/admin/world`.

هر افسانه یک واقعه مستقل دارد، اما یکی از ردهای بایگانی را همراه دارد: هفت گره، رشته نیلی، مهر دروازه شرقی، نشانه چهار کاروان، خط نقشه تالار یا دست‌خط آرمیتا. لینک صفحه محصول خواننده را به تاریخ اصلی الوریا می‌برد.

## خطاهای رایج

| مشکل | علت | راه‌حل |
|---|---|---|
| Turnstile باز نمی‌شود | دامنه مجاز نیست یا کلیدها جفت نیستند | Hostname و کلیدهای همان Widget را اصلاح و Redeploy کنید |
| دکمه مدیر کار نمی‌کند | Turnstile یا Build قدیمی | تأیید، Redeploy و `Ctrl+F5` |
| رمز/کد مدیر اشتباه است | Hash یا TOTP ناهماهنگ | Hash جدید و ثبت Secret در Authenticator |
| کد پیامکی مشتری نمی‌رسد | API Key یا الگوی Verify SMS.ir ناقص است | شناسهٔ الگو، پارامتر و وضعیت خطا را بررسی و Redeploy کنید |
| نرخ لحظه‌ای خاموش است | Embedded Sync خاموش است | مقدار را true کنید و لاگ را ببینید |
| Prisma در Build خطا دارد | DIRECT_URL در Build نیست | DATABASE_URL و DIRECT_URL را به Build اضافه کنید |
| Server Action رد می‌شود | Origin پراکسی شناخته نشده | `ELORIA_ALLOWED_ORIGINS` و Build مجدد |
| تصویر افسانه دیده نمی‌شود | Migration یا Host تصویر | Migration و تنظیم Supabase |

## وضعیت نسخه

- ورود مدیر، TOTP، Turnstile و Session امن: تکمیل
- ورود مشتری با رمز و OTP پیامکی SMS.ir: تکمیل
- قیمت لحظه‌ای و همگام‌سازی داخلی: تکمیل
- پنل مشتری و مدیریت: تکمیل
- افسانه مادر، صد افسانه مرتبط و شخصیت‌ها: تکمیل
- تصویر شخصیت و فضای افسانه: تکمیل
- SEO، Sitemap، امنیت و Health Check: تکمیل
- زرین‌پال: کد آماده؛ تا دریافت Merchant ID غیرفعال

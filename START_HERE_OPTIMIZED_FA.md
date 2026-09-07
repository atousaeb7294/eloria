# نسخهٔ بهینه و امن الوریا — ۱۴۰۵/۰۶/۱۶

این بسته برای جایگزینی امن پروژه در `C:\Eloria` آماده شده است. اسکریپت نصب ابتدا از نسخهٔ فعلی پشتیبان می‌گیرد، فایل `.env` را حفظ می‌کند، وابستگی‌ها را دقیقاً از lockfile نصب می‌کند و سپس تولید Prisma، کنترل TypeScript، lint، آزمون‌های امنیت/سئو/کارایی و build نهایی را اجرا می‌کند.

## نصب در ویندوز با PowerShell

1. فایل ZIP را در یک پوشهٔ موقت Extract کنید.
2. PowerShell را با دسترسی معمولی باز کنید و وارد پوشهٔ استخراج‌شده شوید.
3. اجرا کنید:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\INSTALL_ELORIA_WINDOWS.ps1
```

اگر دیتابیس Production آماده است و می‌خواهید migrationها نیز اجرا شوند:

```powershell
.\INSTALL_ELORIA_WINDOWS.ps1 -RunDatabaseMigrations
```

نسخهٔ قبلی حذف نمی‌شود و با نامی مانند `C:\Eloria-backup-20260907-...` باقی می‌ماند. اگر اسکریپت برای تکمیل `.env` متوقف شد، مقادیر واقعی را در `C:\Eloria\.env` وارد و همان فرمان را دوباره اجرا کنید.

## ثبت و ارسال به شاخهٔ main گیت‌هاب

پس از موفقیت کامل نصب و تست:

```powershell
Set-Location C:\Eloria
git status
git add --all
git commit -m "perf: optimize mobile home security and SEO"
git branch --show-current
git push origin HEAD:main
```

اگر Git اعلام کرد شاخهٔ remote جلوتر است، قبل از push این دستور را اجرا کنید و تعارض احتمالی را بررسی کنید:

```powershell
git pull --rebase origin main
git push origin HEAD:main
```

از `--force` استفاده نکنید.

## استقرار پارس‌پک

اگر هاست از GitHub و شاخهٔ `main` به‌صورت خودکار Deploy می‌کند، پس از push وضعیت build و health check را در پنل بررسی کنید. در استقرار Docker، راهنمای `ELORIA_FINAL_GUIDE_FA.md` و فایل‌های `Dockerfile`، `docker-compose.parspack.yml` و `Caddyfile` مرجع هستند.

## تنظیمات DNS ایمیل (خارج از کد سایت)

SPF، DKIM و DMARC رکورد DNS هستند و با push کد فعال نمی‌شوند. دستور دقیق و امن در `DNS_EMAIL_SECURITY_PARSPACK_FA.md` آمده است. پیش از تغییر SPF باید سرویس واقعی ارسال ایمیل مشخص باشد؛ مقدار حدسی می‌تواند ایمیل‌های معتبر را قطع کند.

## تغییرهای مهم این نسخه

- جلوگیری از دانلود هم‌زمان تصاویر موبایل و دسکتاپ هر بخش با `<picture>` واقعی.
- کاهش حجم ویدئوی دسکتاپ پردهٔ دوم از حدود ۱۲ مگابایت به ۴٫۱ مگابایت و نسخهٔ موبایل به حدود ۲ مگابایت، با Fast Start.
- تبدیل تصاویر سنگین نگهبانان به WebP و حذف فایل‌های تصویری واقعاً بدون مصرف؛ نسخهٔ اولیه از ZIP قبلی قابل بازیابی است.
- تأخیر در بارگیری ابزار انتخاب هوشمند و پشتیبانی تا زمان تعامل یا بیکاری مرورگر.
- حذف prefetch هم‌زمان پنج مسیر سنگین و حفظ prefetch مبتنی بر قصد کاربر.
- رفع هم‌پوشانی لوگو با ورود/عضویت در عرض‌های کوچک موبایل.
- تأیید و نگهداری اینماد در فوتر.
- سخت‌تر شدن CSP و هدرها؛ اجرای اسکریپت inline مسدود و همهٔ کوکی‌های حساس دارای `Secure` در Production، `HttpOnly` و `SameSite=Lax/Strict` هستند.
- sitemap پویا، hreflang، canonical، structured data محصول/سازمان/مقاله و لینک‌های داخلی فروشگاه از قبل موجود بودند و حفظ شدند.

## دربارهٔ هشدار `unsafe-inline`

`script-src` در Production فاقد `unsafe-inline` و مبتنی بر nonce تصادفی است. تنها `style-src-attr 'unsafe-inline'` باقی مانده، چون Next Image و Motion برای اندازه و انیمیشن style attribute تولید می‌کنند؛ حذف کورکورانهٔ آن ظاهر و حرکت سایت را خراب می‌کند. برای کاهش سطح حمله، `script-src-attr 'none'`، `object-src 'none'`، `frame-ancestors 'none'` و nonce برای اسکریپت‌ها فعال است.

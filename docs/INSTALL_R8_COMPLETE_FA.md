# راهنمای کامل نصب ELORIA R8

این بسته نسخه کامل R8 است و امکانات قبلی فروشگاه را حفظ می‌کند. نصب‌کننده پیش از جایگزینی فایل‌ها از پروژه و فایل `.env` نسخه پشتیبان می‌سازد. دستور `db:seed` اجرا نمی‌شود؛ بنابراین محصولات و داده‌های فعلی بازنویسی نمی‌شوند.

## پیش‌نیازها

- ویندوز ۱۰ یا ۱۱
- Node.js نسخه ۲۰ یا جدیدتر
- PostgreSQL فعال
- PowerShell با دسترسی Administrator
- پروژه فعلی و فایل `.env` در `C:\eloria`

## ۱. توقف سایت

در پنجره اجرای سایت `ctrl + c` را بزنید. پنجره‌های VS Code و Terminal متصل به `C:\eloria` را ببندید.

## ۲. استخراج صحیح ZIP

ZIP را مستقیماً از Downloads اجرا نکنید. آن را با `extract all` در پوشه اختصاصی زیر استخراج کنید:

```text
c:\users\نام‌کاربری\downloads\eloria_r8_install
```

داخل پوشه باید فایل‌های زیر وجود داشته باشند:

```text
package.json
install_eloria_final.ps1
```

## ۳. نصب

PowerShell را با `run as administrator` باز کنید:

```powershell
set-location "c:\users\نام‌کاربری\downloads\eloria_r8_install"
get-childitem ".\package.json", ".\install_eloria_final.ps1"
set-executionpolicy -scope process bypass -force
.\install_eloria_final.ps1 -target "c:\eloria"
```

نصب موفق باید Release Gate، Prisma، Migration، TypeScript، ESLint و Build را بدون خطا تمام کند.

## ۴. اجرای محلی

```powershell
set-location "c:\eloria"
npm run dev
```

سپس باز کنید:

```text
http://localhost:3000/fa
```

## ۵. کنترل Home

- تیتر بزرگ Hero وسط صفحه باشد.
- Intro اول، دکمه داخلی ورود، Intro دوم و نور پایانی درست اجرا شوند.
- متن‌های «انتخاب هوشمند» و «تجربه آرام و سریع» دیده نشوند.
- اسلایدشو خودکار، توقف/ادامه، قبلی/بعدی و Swipe موبایل کار کنند.
- رشته‌های مکرومه از دو جهت بافته شوند و گره مرکزی شکل بگیرد.
- در حالت Reduced Motion بافت ثابت باشد و صفحه همچنان قابل استفاده بماند.

## ۶. کنترل فروشگاه

- شماره `09180079556` قابل کلیک باشد.
- کد `eloria50` فقط در اولین خرید، مبلغ ثابت ۵۰٬۰۰۰ تومان کم کند.
- پیام ارسال رایگان در صفحه محصول دیده شود.
- لینک راهنمای اندازه مچ در محصولات دستبند باز شود.

## ۷. اجرای Production

پس از تنظیم دامنه و متغیرهای واقعی:

```powershell
set-location "c:\eloria"
npm run build
npm run start
```

در انتشار واقعی باید PostgreSQL، دامنه، زرین‌پال، Turnstile، Cronها، Backup و شبکه‌های اجتماعی با مقادیر واقعی تنظیم شوند.

## بازگردانی

مسیر Backup در پایان نصب نمایش داده می‌شود. تا پایان بررسی نسخه جدید هیچ Backupی را حذف نکنید. برای بازگردانی، سایت را متوقف کنید، پوشه فعلی را تغییر نام دهید و پوشه Backup را به `C:\eloria` برگردانید.

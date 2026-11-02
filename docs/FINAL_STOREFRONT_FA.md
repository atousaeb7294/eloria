# راهنمای نصب نهایی الوریا — ۱ نوامبر ۲۰۲۶

این بسته برای پروژهٔ `C:\eloria` و نسخهٔ پایهٔ `f0b150b` آماده شده است. پوشهٔ `eloria` سورس کامل است و پوشهٔ `update` اصلاحات همین نوبت را با کنترل SHA-256 اعمال می‌کند.

## نصب روی ویندوز

پیش‌نیاز: Git for Windows و Node.js 22 یا 24. فایل `eloria-final-storefront-20261101.zip` را در Downloads ذخیره کنید. PowerShell عادی کافی است.

```powershell
$ErrorActionPreference = 'Stop'
$zip = Join-Path $env:USERPROFILE 'Downloads\eloria-final-storefront-20261101.zip'
if (-not (Test-Path -LiteralPath $zip)) { throw "ZIP not found: $zip" }
$bundle = Join-Path 'C:\' ('eloria-final-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
Expand-Archive -LiteralPath $zip -DestinationPath $bundle
powershell -NoProfile -ExecutionPolicy Bypass -File "$bundle\eloria\scripts\install-final-storefront.ps1" -ProjectRoot 'C:\eloria' -UpdateDirectory "$bundle\update" -Build
if ($LASTEXITCODE -ne 0) { throw 'Installation stopped. Send the last error before publishing.' }
```

نصب‌کننده قبل از تغییر، سازگاری فایل‌ها را بررسی می‌کند و نسخهٔ قبلی فایل‌های تغییرکرده را کنار پروژه، داخل `C:\eloria-update-backups` نگه می‌دارد. فایل‌های `.env`، داده‌ها، آپلودها و مدل دانلودشده حفظ می‌شوند. نصب دوبارهٔ همین اصلاحات مجاز است. اگر تغییر محلی متعارض وجود داشته باشد، برنامه بدون جایگزینی آن متوقف می‌شود.

اگر پروژه وجود نداشته باشد، نسخهٔ گیت clone می‌شود و سپس اصلاحات اعمال می‌شوند. پوشهٔ کامل سورس داخل ZIP برای بررسی و نگهداری است؛ آن را روی پروژهٔ موجود کپی نکنید.

تست‌ها عمداً از آدرس دیتابیس غیرقابل‌دسترسی محلی در همان فرایند استفاده می‌کنند. هیچ دیتابیس محلی، migration یا seed لازم نیست. هشدار نبود دیتابیس در build آزمایشی انتظار می‌رود. تنظیمات محیطی ذخیره‌شده تغییر نمی‌کنند.

مدل حذف پس‌زمینه داخل ZIP قرار ندارد. اگر نسخهٔ صحیح آن از قبل روی سیستم باشد دوباره دانلود نمی‌شود. در غیر این صورت دانلود از نشانی ثابت با نمایش پیشرفت و بررسی SHA-256 انجام می‌شود. قطع دانلود فایل `.part` را نگه می‌دارد؛ اجرای مجدد نصب/build آن را ادامه می‌دهد. هنگام build دو اجرا را هم‌زمان روی یک پروژه آغاز نکنید.

## ارسال اصلاحات به main

فقط بعد از پایان موفق نصب، این دستور را اجرا کنید:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File 'C:\eloria\scripts\publish-final-storefront.ps1' -ProjectRoot 'C:\eloria'
if ($LASTEXITCODE -ne 0) { throw 'Publish stopped. Send the last error.' }
```

این دستور یک شاخهٔ محلی برای اصلاحات می‌سازد، فقط فایل‌های فهرست `FINAL_STOREFRONT_FILES.txt` را commit می‌کند، main را از origin به‌روز می‌کند و پس از merge، روی `origin/main` می‌فرستد. از force push، reset و stash استفاده نمی‌کند. اگر از قبل فایلی staged باشد یا merge تعارض داشته باشد، ادامه نمی‌دهد. ورود به گیت توسط Git روی سیستم خود شما انجام می‌شود.

## انتشار در پارس‌پک

آخرین commit شاخهٔ main را از پنل پارس‌پک deploy/rebuild کنید. build سرور باید با متغیرهای محیطی واقعی موجود در پارس‌پک انجام شود؛ پوشهٔ `.next` ساخته‌شده برای آزمون آفلاین را آپلود نکنید. تنظیمات دیتابیس فعلی را حفظ کنید. این بسته تغییر schema یا migration ندارد.

پس از انتشار، کش CDN/صفحه را در صورت وجود تازه کنید و سایت را یک بار با Ctrl+F5 باز کنید. مراحل زیر را کنترل کنید:

1. خرید سریع یک محصول موجود: متن کامل موجودی، افزایش/کاهش تعداد، بازشدن سبد.
2. موبایل: لمس تصویر، محدودهٔ گنجینه و نام گنجینه؛ لینک «ورود به گنجینه» پس از بازشدن ظاهر شود.
3. سبد و تکمیل سفارش در عرض‌های باریک: نام محصول و مبلغ کامل باشند و اسکرول افقی ایجاد نشود.
4. `https://eloriagallery.ir/sitemap.xml` باید آدرس محصولات عمومی موجود در دیتابیس را هم نشان دهد. اگر فقط آدرسهای ثابت باقی ماندند، اتصال دیتابیس زمان اجرا و لاگ سرور بررسی شود.
5. تنظیمات واقعی کپچا و درگاه و فرایند رزرو/آزادسازی موجودی روی محیط staging بررسی شوند. این بسته سفارش یا پرداخت واقعی ایجاد نکرده است.

جزئیات اصلاحات و اولویت‌های باقی‌مانده در `FINAL_AUDIT_FA.md` است.

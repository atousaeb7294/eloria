# نصب ELORIA R6

نسخه R6 بر پایه آخرین R4 ساخته شده و نصب‌کننده برای حفظ `.env`، تهیه بکاپ، همگام‌سازی وابستگی‌ها، Prisma، TypeScript، ESLint و Production Build طراحی شده است.

## نصب روی مسیر فعلی

فایل ZIP را در Downloads قرار دهید، سپس PowerShell را با Run as Administrator باز کنید و Installer داخل ZIP را اجرا کنید. Installer از پروژه و `.env` بکاپ می‌گیرد، `db:seed` را اجرا نمی‌کند و در صورت شکست هر تست متوقف می‌شود.

> نکته: پیش از اجرای Installer، `npm ci` اجرا نکنید. R6 نسخه Next.js را به نسخه امنیتی جدیدتر Pin کرده و Installer با `npm install` فایل lock را روی سیستم مقصد همگام می‌کند.

شماره پشتیبانی عمومی این Release: `09180079556`.

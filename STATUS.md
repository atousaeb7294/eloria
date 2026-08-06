# وضعیت مهندسی ELORIA

## رفع‌شده در بسته Hardening ده‌مرحله‌ای

- Source of Truth و محدوده TypeScript/ESLint
- حذف Backupها، Test Resultها و Workflow تودرتو
- Migration اولیه قابل‌بازتولید
- Seed قطعی برای کاتالوگ، سیاست قیمت و نرخ فلز
- CI با PostgreSQL تازه و بدون `db push`
- تست مرورگر مستقل از دیتابیس خالی
- Pagination کاتالوگ و حذف N+1 قیمت‌گذاری فیلتر
- Collectionهای دیتابیس‌محور
- Sitemap مقاوم و Health تفکیک‌شده
- Rate Limit fail-closed در Production
- اعتبارسنجی محتوایی و حذف Metadata تصاویر
- Design Token، تایپوگرافی پایدار و Reduced Motion
- محدودسازی هزینه Intro
- خروج Cron از Process وب

## شرط انتشار

این مخزن تنها پس از سبزشدن Workflow «ELORIA Release Gate» روی Commit نهایی آماده انتشار محسوب می‌شود. این فایل جایگزین نتیجه CI نیست.

## توسعه‌های محصول، نه باگ

موارد زیر به‌عنوان Roadmap باقی می‌مانند و نباید با رفع ایرادهای Release مخلوط شوند:

- حساب و پروفایل مشتری
- تاریخچه سفارش حساب کاربری
- Wishlist
- کیف پول و وفاداری
- Coupon و تخفیف پلکانی
- CRM و تنظیمات اعلان

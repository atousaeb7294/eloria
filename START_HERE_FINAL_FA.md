# شروع سریع نسخه نهایی ELORIA

## سریع‌ترین مسیر

1. Backup پوشه پروژه و Supabase
2. جایگزینی محتوای بسته کامل شماره ۱۰
3. نگه‌داشتن فایل `.env` شخصی
4. اجرا:

```powershell
npm install
npx prisma generate
powershell -ExecutionPolicy Bypass -File scripts/baseline-production-db.ps1
npm run check:env
npm run build
npm run audit:security
npm run test:tokens
npm run test:commerce
npm run test:visual
```

## کلیدها

```powershell
npm run secrets:generate
```

مقادیر تولیدشده را داخل Environment هاست وارد کنید.

## وضعیت بررسی در محیط تحویل

- ۲۰۴ فایل TypeScript/TSX از نظر Syntax بررسی شدند: صفر خطا
- Importهای داخلی `@/` بررسی شدند: صفر فایل گمشده
- Build کامل در محیط تحویل اجرا نشد، چون Registry داخلی امکان دریافت بعضی Dependencyهای قفل‌شده را نداشت. Build باید روی سیستم پروژه که `npm install` روی آن کار می‌کند اجرا شود.

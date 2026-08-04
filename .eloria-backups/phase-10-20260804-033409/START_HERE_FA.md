# شروع مرحله ۷.۴ — امنیت، تست و انتشار

این پروژه کامل‌ترین نسخه است و تمام قابلیت‌های مراحل ۷.۱، ۷.۲ و ۷.۳ را در خود دارد.

## قابلیت‌ها
- هدرهای امنیتی و Content Security Policy
- کنترل Origin و Rate Limit برای APIهای حساس
- قفل موقت ورود مدیر
- Health Check
- بررسی متغیرهای محیطی و Audit امنیتی
- GitHub Actions، Dockerfile و راهنمای استقرار و پشتیبان‌گیری

## نصب و کنترل
```powershell
npm install
npx prisma generate
npm run check:env
npm run build
npm run audit:security
npm run test:visual
```

Migration جدید لازم نیست. راهنمای کامل انتشار در `DEPLOYMENT_PHASE_7_4_FA.md` قرار دارد.

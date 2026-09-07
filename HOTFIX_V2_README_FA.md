# اصلاح کامل ELORIA نسخه ۲

این نسخه دو ایراد مشاهده‌شده پس از نصب نسخه قبلی را اصلاح می‌کند:

1. خطای `Top-level await is currently not supported with the cjs output format` در Preflight دیتابیس.
2. توقف کامل Sync به‌علت خطای `HTTP 404` سرویس نقره.

در نسخه جدید، خطای API نقره مانع Sync طلا نمی‌شود. نرخ قبلی نقره در دیتابیس حفظ می‌شود و سیاست بازار بسته درباره قابل فروش بودن آن تصمیم می‌گیرد.

## نصب

```powershell
powershell -ExecutionPolicy Bypass -File .\APPLY_COMPLETE_FIX.ps1
```

سپس:

```powershell
cd C:\Users\MNP\Desktop\neweloria\neweloria
npm run db:repair-existing
npm run metal:diagnose-sync
npm run typecheck
npm run lint
npm run test:pricing
npm run build
```

دستور `npm audit fix --force` را اجرا نکنید؛ ممکن است نسخه‌های اصلی پروژه را با تغییرات ناسازگار عوض کند.

# Migration دیتابیس ELORIA

## دیتابیس فعلی Supabase

ابتدا از دیتابیس Backup بگیرید. سپس:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/baseline-production-db.ps1
```

Baseline خالی عمداً تاریخچه دیتابیس قدیمی را ثبت می‌کند. Migration دوم تغییرات واقعی Hardening، وضعیت‌های پرداخت، Rate Limit و Constraintها را اعمال می‌کند.

## دیتابیس کاملاً جدید

```powershell
powershell -ExecutionPolicy Bypass -File scripts/bootstrap-fresh-db.ps1
```

بعد از این مرحله، برای تمام تغییرات آینده فقط از این دستور استفاده شود:

```powershell
npx prisma migrate dev --name descriptive_name
```

و در سرور Production:

```powershell
npx prisma migrate deploy
```

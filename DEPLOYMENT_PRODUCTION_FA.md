# استقرار Production ELORIA

## ترتیب استقرار بدون Downtime

1. ساخت Image برنامه:

```bash
docker build --target runner -t eloria-app:latest .
```

2. ساخت و اجرای Migrator قبل از تغییر ترافیک:

```bash
docker build --target migrator -t eloria-migrator:latest .
docker run --rm --env-file .env eloria-migrator:latest
```

3. اجرای برنامه با یک Replica در شروع:

```bash
docker run -d --name eloria --env-file .env -p 3000:3000 eloria-app:latest
```

4. بررسی:

```text
/api/health
```

## تنظیمات لازم

- `DATABASE_SSL_MODE=verify-full`
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` باید یک Base64 ثابت و مشترک بین تمام Replicaها باشد.
- `ELORIA_DEPLOYMENT_ID` در هر Release تغییر کند و در تمام Replicaهای همان Release یکسان باشد.
- ابتدا فقط یک Replica اجرا شود. بعد از تست کامل پرداخت می‌توان Scale کرد.
- Migration در Container اصلی اجرا نمی‌شود؛ همیشه Migrator یک‌باره قبل از Deployment اجرا شود.

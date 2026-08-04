$ErrorActionPreference = "Stop"

Write-Host "ELORIA fresh database bootstrap" -ForegroundColor Cyan
npx prisma generate
npx prisma db push
npx prisma migrate resolve --applied 00000000000000_existing_schema_baseline
npx prisma migrate deploy
npx prisma migrate status
Write-Host "Fresh database schema and migration history are ready." -ForegroundColor Green

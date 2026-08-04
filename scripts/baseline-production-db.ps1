$ErrorActionPreference = "Stop"

Write-Host "ELORIA database migration baseline" -ForegroundColor Cyan
Write-Host "1) Back up the Supabase database before continuing." -ForegroundColor Yellow
Write-Host "2) This command is for the existing ELORIA database only." -ForegroundColor Yellow

npx prisma generate
npm run db:preflight
npx prisma migrate resolve --applied 00000000000000_existing_schema_baseline
npx prisma migrate deploy
npx prisma migrate status

Write-Host "Migration baseline and hardening migration completed." -ForegroundColor Green

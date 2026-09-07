[CmdletBinding()]
param(
  [switch]$RunDatabaseMigrations,
  [switch]$RunLocalServer
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$sourcePath = $PSScriptRoot
$targetPath = "C:\Eloria"
$savedEnvironmentPath = $null

if (-not (Test-Path (Join-Path $sourcePath "package.json"))) {
  throw "این اسکریپت باید از پوشهٔ استخراج‌شدهٔ نسخهٔ نهایی الوریا اجرا شود."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js نصب نیست. ابتدا Node.js نسخهٔ 22 LTS را نصب کنید و PowerShell را دوباره باز کنید."
}

$nodeMajor = [int]((node --version).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 20) {
  throw "نسخهٔ Node.js باید حداقل 20 باشد؛ Node.js 22 LTS پیشنهاد می‌شود."
}

if (Test-Path $targetPath) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupPath = "C:\Eloria-backup-$stamp"
  $existingEnvironmentPath = Join-Path $targetPath ".env"
  if (Test-Path $existingEnvironmentPath) {
    $savedEnvironmentPath = Join-Path $env:TEMP "eloria-env-$stamp"
    Copy-Item -LiteralPath $existingEnvironmentPath -Destination $savedEnvironmentPath -Force
  }
  Write-Host "نسخهٔ قبلی به $backupPath منتقل می‌شود تا قابل بازگشت باشد." -ForegroundColor Yellow
  Move-Item -LiteralPath $targetPath -Destination $backupPath
}

New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
Get-ChildItem -LiteralPath $sourcePath -Force |
  Where-Object { $_.Name -notin @("node_modules", ".next", ".env") } |
  Copy-Item -Destination $targetPath -Recurse -Force

Set-Location $targetPath

if (-not (Test-Path ".env")) {
  if ($savedEnvironmentPath) {
    Move-Item -LiteralPath $savedEnvironmentPath -Destination ".env"
  }
  else {
    Copy-Item ".env.example" ".env"
    Write-Host "فایل C:\Eloria\.env ساخته شد. آن را با اطلاعات واقعی دیتابیس، Storage، پرداخت و کلیدها کامل کنید؛ سپس همین اسکریپت را دوباره اجرا کنید." -ForegroundColor Yellow
    exit 2
  }
}

if ((Get-Content ".env" -Raw) -match "USER:PASSWORD|POOLER_HOST|DIRECT_HOST|CHANGE_ME") {
  throw "فایل C:\Eloria\.env هنوز مقدار نمونه دارد. ابتدا آن را کامل کنید، سپس اسکریپت را دوباره اجرا کنید."
}

npm ci
npx prisma generate

if ($RunDatabaseMigrations) {
  npx prisma migrate deploy
}

npm run typecheck
npm run lint
npm run test:myths
npm run test:content-seo
npm run test:critical
npm run audit:security
npm run audit:quality
npm run audit:performance
npm run build

Write-Host "نصب و کنترل‌های محلی با موفقیت تمام شد." -ForegroundColor Green
Write-Host "برای اجرای محلی: Set-Location C:\Eloria ; npm run start"

if ($RunLocalServer) {
  npm run start
}

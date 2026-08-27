param(
  [string]$Target = "C:\eloria",
  [switch]$StartDev
)

$ErrorActionPreference = "Stop"
$Source = (Resolve-Path $PSScriptRoot).Path

if (-not (Test-Path $Target)) {
  throw "Target project was not found: $Target"
}

$TargetResolved = (Resolve-Path $Target).Path
if ($Source -eq $TargetResolved) {
  throw "Extract this ZIP outside C:\eloria, then run the installer from the extracted folder."
}

Set-Location C:\
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backup = "C:\eloria_backup_r4_$stamp"
$safe = "C:\eloria_safe_r4_$stamp"

New-Item -ItemType Directory -Path $backup -Force | Out-Null
New-Item -ItemType Directory -Path $safe -Force | Out-Null

Write-Host "[1/7] Backing up project files..." -ForegroundColor Cyan
robocopy $Target $backup /E /XD node_modules .next .git /R:1 /W:1 /NFL /NDL /NP | Out-Host
if ($LASTEXITCODE -ge 8) { throw "Project backup failed with Robocopy code $LASTEXITCODE" }

if (Test-Path "$Target\.env") {
  Copy-Item "$Target\.env" "$safe\.env" -Force
}

Write-Host "[2/7] Applying ELORIA Smart Production R4..." -ForegroundColor Cyan
robocopy $Source $Target /E /XF .env /XD node_modules .next .git /R:2 /W:1 /NFL /NDL /NP | Out-Host
if ($LASTEXITCODE -ge 8) { throw "Project copy failed with Robocopy code $LASTEXITCODE" }

if (Test-Path "$safe\.env") {
  Copy-Item "$safe\.env" "$Target\.env" -Force
}

if (Test-Path "$Target\.next") {
  Remove-Item "$Target\.next" -Recurse -Force
}

Set-Location $Target

Write-Host "[3/7] Verifying release files..." -ForegroundColor Cyan
node scripts/verify-final-release.mjs
if ($LASTEXITCODE -ne 0) { throw "Release verification failed" }

Write-Host "[4/7] Generating Prisma Client..." -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate failed" }

Write-Host "[5/7] Checking database migration status..." -ForegroundColor Cyan
npx prisma migrate status
if ($LASTEXITCODE -ne 0) {
  Write-Host "Pending migrations detected. Safe deploy will continue." -ForegroundColor Yellow
}

Write-Host "[6/7] Deploying additive/safe database migrations..." -ForegroundColor Cyan
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
  throw "Database migration failed. Project backup remains at $backup"
}

Write-Host "[7/7] ELORIA R4 upgrade completed successfully." -ForegroundColor Green
Write-Host "Project backup: $backup"
Write-Host "Environment backup: $safe\.env"
Write-Host "db:seed was NOT executed." -ForegroundColor Yellow
Write-Host "Public first-purchase code: ELORIA50 (fixed 50,000 Toman)." -ForegroundColor Green

if ($StartDev) {
  npm run dev
} else {
  Write-Host "Start development: Set-Location C:\eloria; npm run dev" -ForegroundColor Green
  Write-Host "Production verification: npm run typecheck; npm run lint; npm run build" -ForegroundColor Green
}

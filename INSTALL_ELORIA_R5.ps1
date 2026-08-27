param([string]$Target = "C:\eloria", [switch]$StartDev, [switch]$SkipBuild)
$ErrorActionPreference = "Stop"
$Source = (Resolve-Path $PSScriptRoot).Path
if (-not (Test-Path $Target)) { throw "Target project was not found: $Target" }
$TargetResolved = (Resolve-Path $Target).Path
if ($Source -eq $TargetResolved) { throw "Extract this ZIP outside C:\eloria, then run the installer from the extracted folder." }
Set-Location C:\
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backup = "C:\eloria_backup_r5_$stamp"
$safe = "C:\eloria_safe_r5_$stamp"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
New-Item -ItemType Directory -Path $safe -Force | Out-Null
Write-Host "[1/11] Backing up current project..." -ForegroundColor Cyan
robocopy $Target $backup /E /XD node_modules .next .git /R:1 /W:1 /NFL /NDL /NP | Out-Host
if ($LASTEXITCODE -ge 8) { throw "Project backup failed with Robocopy code $LASTEXITCODE" }
if (Test-Path "$Target\.env") { Copy-Item "$Target\.env" "$safe\.env" -Force }
Write-Host "[2/11] Applying ELORIA Smart Fashion R5..." -ForegroundColor Cyan
robocopy $Source $Target /E /XF .env /XD node_modules .next .git /R:2 /W:1 /NFL /NDL /NP | Out-Host
if ($LASTEXITCODE -ge 8) { throw "Project copy failed with Robocopy code $LASTEXITCODE" }
if (Test-Path "$safe\.env") { Copy-Item "$safe\.env" "$Target\.env" -Force }
if (Test-Path "$Target\.next") { Remove-Item "$Target\.next" -Recurse -Force }
Set-Location $Target
Write-Host "[3/11] Verifying R5 release files..." -ForegroundColor Cyan
node scripts/verify-final-release.mjs
if ($LASTEXITCODE -ne 0) { throw "Release verification failed" }
Write-Host "[4/11] Applying Next.js 16.3.3 security patch..." -ForegroundColor Cyan
npm install next@16.3.3 --save-exact --fetch-retries=1 --fetch-timeout=20000
if ($LASTEXITCODE -ne 0) {
  Write-Host "Official npm registry failed. Retrying with npm mirror..." -ForegroundColor Yellow
  npm install next@16.3.3 --save-exact --registry=https://registry.npmmirror.com/ --fetch-retries=1 --fetch-timeout=30000
}
if ($LASTEXITCODE -ne 0) { throw "Next.js security update failed. Backup remains at $backup" }
npm prune
if ($LASTEXITCODE -ne 0) { Write-Host "npm prune returned a warning; continuing." -ForegroundColor Yellow }
Write-Host "[5/11] Generating Prisma Client..." -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate failed" }
Write-Host "[6/11] Checking database migrations..." -ForegroundColor Cyan
npx prisma migrate status
if ($LASTEXITCODE -ne 0) { Write-Host "Pending migrations detected. Safe deploy will continue." -ForegroundColor Yellow }
Write-Host "[7/11] Deploying existing safe migrations..." -ForegroundColor Cyan
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw "Database migration failed. Backup remains at $backup" }
Write-Host "[8/11] Type checking..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "Typecheck failed. Backup remains at $backup" }
Write-Host "[9/11] Linting..." -ForegroundColor Cyan
npm run lint
if ($LASTEXITCODE -ne 0) { throw "Lint failed. Backup remains at $backup" }
if (-not $SkipBuild) {
  Write-Host "[10/11] Creating production build..." -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Production build failed. Backup remains at $backup" }
} else { Write-Host "[10/11] Production build skipped by request." -ForegroundColor Yellow }
Write-Host "[11/11] ELORIA R5 installed successfully." -ForegroundColor Green
Write-Host "Project backup: $backup"
Write-Host "Environment backup: $safe\.env"
Write-Host "db:seed was NOT executed." -ForegroundColor Yellow
Write-Host "Next.js security target: 16.3.3" -ForegroundColor Green
Write-Host "Public first-purchase code: ELORIA50 (fixed 50,000 Toman)." -ForegroundColor Green
Write-Host "No paid AI package is required by R5." -ForegroundColor Green
if ($StartDev) { npm run dev } else { Write-Host "Start development: Set-Location C:\eloria; npm run dev" -ForegroundColor Green }

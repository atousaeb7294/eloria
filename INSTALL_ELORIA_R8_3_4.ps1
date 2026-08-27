param(
  [string]$Target = "C:\eloria",
  [switch]$StartDev
)

$ErrorActionPreference = "Stop"
$Source = (Resolve-Path $PSScriptRoot).Path

if (-not (Test-Path $Target)) { throw "Target project was not found: $Target" }
$TargetResolved = (Resolve-Path $Target).Path
if ($Source -eq $TargetResolved) { throw "Extract the ZIP outside C:\eloria and run this installer from the extracted folder." }

Set-Location C:\
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backup = "C:\eloria_backup_r8_3_4_$stamp"
$safe = "C:\eloria_safe_r8_3_4_$stamp"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
New-Item -ItemType Directory -Path $safe -Force | Out-Null

$oldLockHash = $null
if (Test-Path "$Target\package-lock.json") {
  $oldLockHash = (Get-FileHash "$Target\package-lock.json" -Algorithm SHA256).Hash
}

Write-Host "[1/7] Backing up current ELORIA project..." -ForegroundColor Cyan
robocopy $Target $backup /E /XD node_modules .next .git /R:1 /W:1 /NFL /NDL /NP | Out-Host
if ($LASTEXITCODE -ge 8) { throw "Project backup failed with Robocopy code $LASTEXITCODE" }
if (Test-Path "$Target\.env") { Copy-Item "$Target\.env" "$safe\.env" -Force }

Write-Host "[2/7] Applying ELORIA R8.3.4..." -ForegroundColor Cyan
robocopy $Source $Target /MIR /XF .env /XD node_modules .next .git /R:2 /W:1 /NFL /NDL /NP | Out-Host
if ($LASTEXITCODE -ge 8) { throw "Project copy failed with Robocopy code $LASTEXITCODE" }
if (Test-Path "$safe\.env") { Copy-Item "$safe\.env" "$Target\.env" -Force }
if (Test-Path "$Target\.next") { Remove-Item "$Target\.next" -Recurse -Force }

Set-Location $Target
Write-Host "[3/7] Verifying release files..." -ForegroundColor Cyan
node scripts/verify-final-release.mjs
if ($LASTEXITCODE -ne 0) { throw "Release verification failed" }

$newLockHash = $null
if (Test-Path "$Target\package-lock.json") {
  $newLockHash = (Get-FileHash "$Target\package-lock.json" -Algorithm SHA256).Hash
}
$depsReady = (Test-Path "$Target\node_modules\.bin\next.cmd") -and (Test-Path "$Target\node_modules\.bin\prisma.cmd")
if ((-not $depsReady) -or ($oldLockHash -ne $newLockHash)) {
  Write-Host "[4/7] Installing project dependencies..." -ForegroundColor Cyan
  npm ci --no-audit --no-fund --prefer-offline
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed. Check npm connectivity and rerun the installer." }
} else {
  Write-Host "[4/7] Existing dependencies match this release; reinstall skipped." -ForegroundColor DarkGray
}

Write-Host "[5/7] Preparing Prisma and database migrations..." -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate failed" }
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw "Database migration failed. Backup remains at $backup" }

Write-Host "[6/7] Running typecheck and lint..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "Typecheck failed" }
npm run lint
if ($LASTEXITCODE -ne 0) { throw "Lint failed" }

Write-Host "[7/7] Building production bundle..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Production build failed" }

Write-Host "ELORIA R8.3.4 installed successfully." -ForegroundColor Green
Write-Host "Project backup: $backup"
Write-Host "Environment backup: $safe\.env"
Write-Host "db:seed was NOT executed." -ForegroundColor Yellow

if ($StartDev) {
  npm run dev
} else {
  Write-Host "Start development: Set-Location C:\eloria; npm run dev" -ForegroundColor Green
}

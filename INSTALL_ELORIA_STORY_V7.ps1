param(
  [string]$Target = "C:\eloria",
  [switch]$StartDev
)

$ErrorActionPreference = "Stop"
$Source = (Resolve-Path $PSScriptRoot).Path

if (-not (Test-Path $Target)) { throw "Eloria project was not found: $Target" }
$TargetResolved = (Resolve-Path $Target).Path
if ($Source -eq $TargetResolved) { throw "Extract this release outside C:\eloria, then run the installer from the extracted folder." }

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupRoot = "C:\Eloria-backups"
$backup = Join-Path $backupRoot "Eloria_before_story_v7_$stamp"
$safe = Join-Path $backupRoot "Eloria_env_story_v7_$stamp"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
New-Item -ItemType Directory -Path $safe -Force | Out-Null

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

$envPath = Join-Path $TargetResolved ".env"
$envHashBefore = $null
if (Test-Path $envPath) {
  $envHashBefore = (Get-FileHash $envPath -Algorithm SHA256).Hash
  Copy-Item $envPath (Join-Path $safe ".env") -Force
}

Write-Host "[1/7] Creating a recoverable project backup..." -ForegroundColor Cyan
robocopy $TargetResolved $backup /E /XD node_modules .next .git /R:1 /W:1 /NFL /NDL /NP | Out-Host
if ($LASTEXITCODE -ge 8) { throw "Backup failed with Robocopy code $LASTEXITCODE" }

Write-Host "[2/7] Installing ELORIA Story V7..." -ForegroundColor Cyan
robocopy $Source $TargetResolved /MIR /XF .env /XD node_modules .next .git /R:2 /W:1 /NFL /NDL /NP | Out-Host
if ($LASTEXITCODE -ge 8) { throw "Project copy failed with Robocopy code $LASTEXITCODE" }
if (Test-Path (Join-Path $safe ".env")) { Copy-Item (Join-Path $safe ".env") $envPath -Force }

if ($envHashBefore) {
  $envHashAfter = (Get-FileHash $envPath -Algorithm SHA256).Hash
  if ($envHashBefore -ne $envHashAfter) { throw ".env integrity check failed. Original copy: $safe\.env" }
  Write-Host ".env preserved: $envHashAfter" -ForegroundColor Green
}

Set-Location $TargetResolved
Write-Host "[3/7] Installing dependencies..." -ForegroundColor Cyan
npm ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }

Write-Host "[4/7] Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate failed" }

$migrationChoice = Read-Host "Type APPLY only when this computer can reach the database in .env; otherwise press Enter"
if ($migrationChoice -ceq "APPLY") {
  npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw "Database migration failed. Project backup: $backup" }
} else {
  Write-Host "Database migration skipped. ParsPack can apply it during deployment." -ForegroundColor Yellow
}

Write-Host "[5/7] Running typecheck and lint..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "Typecheck failed" }
npm run lint
if ($LASTEXITCODE -ne 0) { throw "Lint failed" }

Write-Host "[6/7] Building production bundle..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Production build failed" }

Write-Host "[7/7] ELORIA Story V7 installed successfully." -ForegroundColor Green
Write-Host "Backup: $backup"
Write-Host "Protected ENV copy: $safe\.env"

if ($StartDev) {
  npm run dev
} else {
  Write-Host "Start locally: Set-Location C:\eloria; npm run dev" -ForegroundColor Green
}

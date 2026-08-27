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
$backup = "C:\eloria_backup_r6_$stamp"
$safe = "C:\eloria_safe_r6_$stamp"

New-Item -ItemType Directory -Path $backup -Force | Out-Null
New-Item -ItemType Directory -Path $safe -Force | Out-Null

Write-Host "[1/8] Backing up current ELORIA project..." -ForegroundColor Cyan
robocopy $Target $backup /E /XD node_modules .next .git /R:1 /W:1 /NFL /NDL /NP | Out-Host
if ($LASTEXITCODE -ge 8) { throw "Project backup failed with Robocopy code $LASTEXITCODE" }

if (Test-Path "$Target\.env") {
  Copy-Item "$Target\.env" "$safe\.env" -Force
}

Write-Host "[2/8] Applying ELORIA Luxury Intelligence R6..." -ForegroundColor Cyan
robocopy $Source $Target /E /XF .env /XD node_modules .next .git /R:2 /W:1 /NFL /NDL /NP | Out-Host
if ($LASTEXITCODE -ge 8) { throw "Project copy failed with Robocopy code $LASTEXITCODE" }

if (Test-Path "$safe\.env") {
  Copy-Item "$safe\.env" "$Target\.env" -Force
}

$envPath = "$Target\.env"
if (-not (Test-Path $envPath)) {
  New-Item -ItemType File -Path $envPath -Force | Out-Null
}
$envText = Get-Content $envPath -Raw -ErrorAction SilentlyContinue
if ($null -eq $envText) { $envText = "" }
if ($envText -match '(?m)^ELORIA_LEGAL_SUPPORT_PHONE=.*$') {
  $envText = [regex]::Replace($envText, '(?m)^ELORIA_LEGAL_SUPPORT_PHONE=.*$', 'ELORIA_LEGAL_SUPPORT_PHONE="09180079556"')
} else {
  $envText += "`r`nELORIA_LEGAL_SUPPORT_PHONE=`"09180079556`""
}
if ($envText -match '(?m)^NEXT_PUBLIC_ELORIA_SUPPORT_PHONE=.*$') {
  $envText = [regex]::Replace($envText, '(?m)^NEXT_PUBLIC_ELORIA_SUPPORT_PHONE=.*$', 'NEXT_PUBLIC_ELORIA_SUPPORT_PHONE="09180079556"')
} else {
  $envText += "`r`nNEXT_PUBLIC_ELORIA_SUPPORT_PHONE=`"09180079556`""
}
[System.IO.File]::WriteAllText($envPath, $envText, [System.Text.UTF8Encoding]::new($false))

if (Test-Path "$Target\.next") {
  Remove-Item "$Target\.next" -Recurse -Force
}

Set-Location $Target

Write-Host "[3/8] Verifying R6 release files..." -ForegroundColor Cyan
node scripts/verify-final-release.mjs
if ($LASTEXITCODE -ne 0) { throw "Release verification failed" }

Write-Host "[4/8] Synchronizing free dependencies and Next.js security baseline..." -ForegroundColor Cyan
npm install --no-audit --no-fund --prefer-offline
if ($LASTEXITCODE -ne 0) {
  throw "npm install failed. Check network/registry, then rerun this installer. Backup: $backup"
}

Write-Host "[5/8] Generating Prisma Client and checking migrations..." -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate failed" }
npx prisma migrate status
if ($LASTEXITCODE -ne 0) {
  Write-Host "Pending migrations detected. Safe deploy will continue." -ForegroundColor Yellow
}
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw "Database migration failed. Backup remains at $backup" }

Write-Host "[6/8] Type checking..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "Typecheck failed" }

Write-Host "[7/8] Linting..." -ForegroundColor Cyan
npm run lint
if ($LASTEXITCODE -ne 0) { throw "Lint failed" }

Write-Host "[8/8] Building production bundle..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Production build failed" }

Write-Host "ELORIA Luxury Intelligence R6 installed successfully." -ForegroundColor Green
Write-Host "Project backup: $backup"
Write-Host "Environment backup: $safe\.env"
Write-Host "Support phone: 09180079556" -ForegroundColor Green
Write-Host "Paid AI APIs are not required. Template AI is default; Ollama is optional." -ForegroundColor Green
Write-Host "db:seed was NOT executed." -ForegroundColor Yellow

if ($StartDev) {
  npm run dev
} else {
  Write-Host "Start development: Set-Location C:\eloria; npm run dev" -ForegroundColor Green
  Write-Host "Production start after deployment: npm run start" -ForegroundColor Green
}

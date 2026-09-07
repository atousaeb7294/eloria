param(
    [string]$ProjectPath = "C:\Users\MNP\Desktop\neweloria\neweloria"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$source = $PSScriptRoot
$project = [System.IO.Path]::GetFullPath($ProjectPath)

if (-not (Test-Path (Join-Path $source "package.json"))) {
    throw "Run this script from the extracted ELORIA fix package."
}

if (-not (Test-Path (Join-Path $project "package.json"))) {
    throw "ELORIA project was not found: $project"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path (Split-Path -Parent $project) "eloria-fix-backups\$timestamp"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

Write-Host "Backing up the current source (excluding dependencies/build output)..." -ForegroundColor Cyan
& robocopy $project $backupRoot /E `
    /XD ".git" "node_modules" ".next" "test-results" "logs" ".eloria-backups" `
    /XF ".env" ".env.local" ".env.production" ".env.development" `
    /R:1 /W:1 /NFL /NDL /NJH /NJS /NP

$backupCode = $LASTEXITCODE
if ($backupCode -ge 8) {
    throw "Backup failed. Robocopy code: $backupCode"
}

Write-Host "Copying corrected source files..." -ForegroundColor Cyan
& robocopy $source $project /E `
    /XD ".git" "node_modules" ".next" "test-results" "logs" `
    /XF ".env" ".env.local" ".env.production" ".env.development" `
    /R:1 /W:1 /NFL /NDL /NJH /NJS /NP

$copyCode = $LASTEXITCODE
if ($copyCode -ge 8) {
    throw "Copy failed. Robocopy code: $copyCode"
}

Write-Host "Cleaning stale generated and duplicated paths..." -ForegroundColor Cyan
Remove-Item -Recurse -Force (Join-Path $project ".next") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $project "test-results") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $project "src\generated\prisma") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $project ".github\.github") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $project ".github\src") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $project ".github\scripts") -ErrorAction SilentlyContinue
Remove-Item -Force (Join-Path $project ".github\next.config.ts") -ErrorAction SilentlyContinue
Remove-Item -Force (Join-Path $project ".github\package.json") -ErrorAction SilentlyContinue
Remove-Item -Force (Join-Path $project ".github\playwright.config.ts") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $project ".codex\prisma") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $project ".codex\scripts") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $project ".codex\src") -ErrorAction SilentlyContinue
Remove-Item -Force (Join-Path $project "scripts\configure-extended-closed-market.ts") -ErrorAction SilentlyContinue
Remove-Item -Force (Join-Path $project "metal-price-status.json") -ErrorAction SilentlyContinue

if (-not (Test-Path (Join-Path $project ".env"))) {
    Write-Warning ".env was not found. Restore it before running the application."
}

Write-Host "Complete fix copied successfully." -ForegroundColor Green
Write-Host "Backup: $backupRoot" -ForegroundColor DarkCyan
Write-Host "Next commands:" -ForegroundColor Yellow
Write-Host "  cd $project"
Write-Host "  npm ci  # فقط اگر node_modules نصب نیست"
Write-Host "  npm run db:repair-existing"
Write-Host "  npm run metal:diagnose-sync"
Write-Host "  npm run typecheck"
Write-Host "  npm run lint"
Write-Host "  npm run test:pricing"
Write-Host "  npm run build"

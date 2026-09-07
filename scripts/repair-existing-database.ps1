$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$project = Split-Path -Parent $PSScriptRoot
Set-Location $project

Write-Host "ELORIA existing-database repair" -ForegroundColor Cyan
Write-Host "This script never resets or deletes the database." -ForegroundColor Green
Write-Host "Create a Supabase backup before continuing." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    throw ".env was not found in $project"
}

$envLines = Get-Content ".env"
$databaseLines = @($envLines | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' })
$directLines = @($envLines | Where-Object { $_ -match '^\s*DIRECT_URL\s*=' })

if ($databaseLines.Count -ne 1) {
    throw "Exactly one DATABASE_URL entry is required in .env. Found: $($databaseLines.Count)"
}

if ($directLines.Count -ne 1) {
    throw "Exactly one DIRECT_URL entry is required in .env. Found: $($directLines.Count)"
}

$databaseValue = ($databaseLines[0] -replace '^\s*DATABASE_URL\s*=\s*', '').Trim().Trim('"')
$directValue = ($directLines[0] -replace '^\s*DIRECT_URL\s*=\s*', '').Trim().Trim('"')

if ($databaseValue -notmatch ':6543(?:/|\?)') {
    throw "DATABASE_URL must use the transaction pooler on port 6543."
}

if ($directValue -notmatch ':5432(?:/|\?)') {
    throw "DIRECT_URL must use the migration/session connection on port 5432."
}

$config = Get-Content "prisma.config.ts" -Raw
if ($config -notmatch 'env\("DIRECT_URL"\)') {
    throw 'prisma.config.ts must use env("DIRECT_URL") for migrations.'
}

Write-Host "[1/7] Generating Prisma Client..." -ForegroundColor Cyan
& npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "Prisma generate failed." }

Write-Host "[2/7] Checking current data before constraints..." -ForegroundColor Cyan
& npx tsx scripts/preflight-hardening-data.ts
if ($LASTEXITCODE -ne 0) { throw "Database preflight failed. No migration was applied." }

Write-Host "[3/7] Recording the existing schema baseline..." -ForegroundColor Cyan
$resolveOutput = & npx prisma migrate resolve --applied 00000000000000_existing_schema_baseline 2>&1
$resolveCode = $LASTEXITCODE
$resolveOutput | ForEach-Object { Write-Host $_ }

if ($resolveCode -ne 0) {
    $resolveText = ($resolveOutput | Out-String)
    if ($resolveText -notmatch 'P3008|already recorded|already applied') {
        throw "Unable to record the baseline migration."
    }

    Write-Host "Baseline was already recorded; continuing." -ForegroundColor DarkYellow
}

Write-Host "[4/7] Applying idempotent hardening and pricing migrations..." -ForegroundColor Cyan
& npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw "Prisma migrate deploy failed." }

Write-Host "[5/7] Seeding pricing policies..." -ForegroundColor Cyan
& npx tsx scripts/seed-pricing-policies.ts
if ($LASTEXITCODE -ne 0) { throw "Pricing-policy seed failed." }

Write-Host "[6/7] Verifying tables, migrations, and policies..." -ForegroundColor Cyan
& npx tsx scripts/verify-database-hardening.ts
if ($LASTEXITCODE -ne 0) { throw "Database verification failed." }

Write-Host "[7/7] Printing Prisma migration status..." -ForegroundColor Cyan
& npx prisma migrate status
if ($LASTEXITCODE -ne 0) { throw "Prisma migration status is not clean." }

Write-Host "ELORIA database repair completed successfully." -ForegroundColor Green

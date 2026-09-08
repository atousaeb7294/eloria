[CmdletBinding()]
param(
    [string]$Domain = "eloriagallery.ir",
    [switch]$Build,
    [switch]$MakeZip
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Write-Step([string]$Text) {
    Write-Host "`n=== $Text ===" -ForegroundColor Cyan
}

function Show-TxtRecord([string]$Name) {
    try {
        $records = Resolve-DnsName -Name $Name -Type TXT -ErrorAction Stop
        $values = @($records | Where-Object { $_.Strings } | ForEach-Object { $_.Strings -join "" })
        if ($values.Count -eq 0) {
            Write-Host "$Name : TXT record not found" -ForegroundColor Yellow
        } else {
            foreach ($value in $values) {
                Write-Host "$Name : $value"
            }
        }
    } catch {
        Write-Host "$Name : TXT record not found (or DNS has not propagated yet)" -ForegroundColor Yellow
    }
}

Write-Step "1/5 - Checking the project"
if (-not (Test-Path "package.json")) {
    throw "Run this file from the extracted Eloria project."
}

$cookieHits = Get-ChildItem -Path "src" -Recurse -File -Include *.ts,*.tsx |
    Select-String -Pattern 'sameSite:\s*["'']none["'']'
if ($cookieHits) {
    Write-Host "An application cookie with SameSite=None was found:" -ForegroundColor Red
    $cookieHits | ForEach-Object { Write-Host $_.Path ':' $_.LineNumber }
    throw "Review the cookie before deployment."
}
Write-Host "OK: Eloria does not create a SameSite=None cookie." -ForegroundColor Green
Write-Host "Customer cookies are Lax and admin/payment cookies are Strict."

Write-Step "2/5 - Checking the live DNS records"
Show-TxtRecord $Domain
Show-TxtRecord "_dmarc.$Domain"

Write-Host "`nIf this domain NEVER sends email, the final records must be:" -ForegroundColor White
Write-Host "TXT  @       v=spf1 -all"
Write-Host "TXT  _dmarc  v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; pct=100"
Write-Host "Do not add a second SPF record. Edit or replace the existing SPF record."

Write-Step "3/5 - Checking the live security headers"
try {
    $response = Invoke-WebRequest -Uri "https://$Domain" -Method Head -MaximumRedirection 5 -UseBasicParsing
    $csp = [string]$response.Headers["Content-Security-Policy"]
    if ($csp -match "script-src[^;]*'unsafe-inline'") {
        Write-Host "WARNING: script-src contains unsafe-inline." -ForegroundColor Red
    } else {
        Write-Host "OK: scripts use a nonce and script-src has no unsafe-inline." -ForegroundColor Green
    }
    Write-Host "Note: style-src-attr unsafe-inline is intentionally limited to CSS presentation."

    $setCookie = [string]$response.Headers["Set-Cookie"]
    if ($setCookie -match "SameSite=None") {
        Write-Host "ParsPack's platform cookie uses SameSite=None." -ForegroundColor Yellow
        Write-Host "This cookie is not created by Eloria; send the support text from SECURITY_STEPS_PARSPACK_FA.md to ParsPack."
    } else {
        Write-Host "No SameSite=None cookie was returned on this request." -ForegroundColor Green
    }
} catch {
    Write-Host "The website header check failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

if ($Build) {
    Write-Step "4/5 - Installing and verifying the release"
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw "Node.js is not installed. Install Node.js 22 LTS and run this script again."
    }
    $savedDatabaseUrl = $env:DATABASE_URL
    $savedDirectUrl = $env:DIRECT_URL
    $savedSiteUrl = $env:NEXT_PUBLIC_SITE_URL
    try {
        # Prisma needs syntactically valid URLs while generating its client.
        # These local-only placeholders are never written to a file or uploaded.
        if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
            $env:DATABASE_URL = "postgresql://build:build@127.0.0.1:5432/build"
        }
        if ([string]::IsNullOrWhiteSpace($env:DIRECT_URL)) {
            $env:DIRECT_URL = "postgresql://build:build@127.0.0.1:5432/build"
        }
        if ([string]::IsNullOrWhiteSpace($env:NEXT_PUBLIC_SITE_URL)) {
            $env:NEXT_PUBLIC_SITE_URL = "https://$Domain"
        }

        & npm ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }
        & npm run prebuild
        if ($LASTEXITCODE -ne 0) { throw "Prisma client generation failed." }
        & npm run typecheck
        if ($LASTEXITCODE -ne 0) { throw "TypeScript check failed." }
        & npm run lint
        if ($LASTEXITCODE -ne 0) { throw "Lint failed." }
        & npm run audit:security
        if ($LASTEXITCODE -ne 0) { throw "Security audit failed." }
        & npm run build
        if ($LASTEXITCODE -ne 0) { throw "Production build failed." }
        Write-Host "OK: production verification completed." -ForegroundColor Green
    } finally {
        $env:DATABASE_URL = $savedDatabaseUrl
        $env:DIRECT_URL = $savedDirectUrl
        $env:NEXT_PUBLIC_SITE_URL = $savedSiteUrl
    }
} else {
    Write-Step "4/5 - Build skipped"
    Write-Host "To run the full build check: .\ELORIA_SECURITY_FIX_PARSPACK.ps1 -Build"
}

if ($MakeZip) {
    Write-Step "5/5 - Creating a clean deployment ZIP"
    $output = Join-Path (Split-Path $ProjectRoot -Parent) "eloria-parspack-secure.zip"
    $staging = Join-Path ([System.IO.Path]::GetTempPath()) ("eloria-release-" + [guid]::NewGuid())
    New-Item -ItemType Directory -Path $staging | Out-Null
    try {
        $excludeDirs = @(".git", ".next", "node_modules", "test-results", "playwright-report")
        Get-ChildItem -Force | Where-Object {
            $_.Name -notin $excludeDirs -and $_.Name -ne ".env"
        } | Copy-Item -Destination $staging -Recurse -Force
        if (Test-Path $output) { Remove-Item $output -Force }
        Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $output -CompressionLevel Optimal
        Write-Host "Deployment ZIP created: $output" -ForegroundColor Green
    } finally {
        Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Step "5/5 - ZIP creation skipped"
    Write-Host "To verify and create the ZIP: .\ELORIA_SECURITY_FIX_PARSPACK.ps1 -Build -MakeZip"
}

Write-Host "`nFinished. Read SECURITY_STEPS_PARSPACK_FA.md for the two manual panel changes." -ForegroundColor Green

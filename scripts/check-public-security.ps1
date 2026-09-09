param(
    [string]$Domain = "eloriagallery.ir"
)

$ErrorActionPreference = "Stop"
$baseUrl = "https://$Domain"

function Get-HeaderValues {
    param($Response, [string]$Name)
    $values = @($Response.Headers[$Name])
    if ($null -eq $values) { return @() }
    return @($values)
}

Write-Host "Eloria public security check" -ForegroundColor Cyan
Write-Host "Target: $baseUrl"

$response = Invoke-WebRequest -Uri "$baseUrl/" -Method Get -MaximumRedirection 5
$csp = (Get-HeaderValues $response "Content-Security-Policy") -join "; "
$cookies = Get-HeaderValues $response "Set-Cookie"

if ($csp -match "script-src[^;]*'unsafe-inline'") {
    Write-Host "[FAIL] script-src permits unsafe-inline." -ForegroundColor Red
} elseif ($csp -match "script-src[^;]*'nonce-" -and $csp -match "script-src[^;]*'strict-dynamic'") {
    Write-Host "[PASS] Scripts use a nonce and strict-dynamic; script unsafe-inline is absent." -ForegroundColor Green
} else {
    Write-Host "[WARN] No script unsafe-inline was found, but the expected nonce policy was not detected." -ForegroundColor Yellow
}

if ($csp -match "style-src-attr\s+'unsafe-inline'") {
    Write-Host "[INFO] style-src-attr permits inline presentation styles. This does not permit inline JavaScript." -ForegroundColor Yellow
}

$noneCookies = @($cookies | Where-Object { $_ -match "(?i)SameSite=None" })
if ($noneCookies.Count -eq 0) {
    Write-Host "[PASS] No SameSite=None cookie was returned." -ForegroundColor Green
} else {
    Write-Host "[WARN] SameSite=None cookie(s) returned:" -ForegroundColor Yellow
    foreach ($cookie in $noneCookies) {
        $safeCookie = ($cookie -split ";", 2)[0] -replace "=.*$", "=<redacted>"
        Write-Host "       $safeCookie"
    }
    Write-Host "       If the name is not an Eloria cookie, it is normally injected by the hosting load balancer."
}

$txtRoot = Resolve-DnsName -Name $Domain -Type TXT -ErrorAction SilentlyContinue
$spf = @($txtRoot | ForEach-Object { $_.Strings -join "" } | Where-Object { $_ -like "v=spf1*" })
if ($spf.Count -eq 1) {
    Write-Host "[PASS] Exactly one SPF record exists: $($spf[0])" -ForegroundColor Green
} elseif ($spf.Count -eq 0) {
    Write-Host "[FAIL] SPF is missing." -ForegroundColor Red
} else {
    Write-Host "[FAIL] Multiple SPF records exist; they must be merged into one." -ForegroundColor Red
}

$txtDmarc = Resolve-DnsName -Name "_dmarc.$Domain" -Type TXT -ErrorAction SilentlyContinue
$dmarc = @($txtDmarc | ForEach-Object { $_.Strings -join "" } | Where-Object { $_ -like "v=DMARC1*" })
if ($dmarc.Count -eq 1) {
    Write-Host "[PASS] DMARC exists: $($dmarc[0])" -ForegroundColor Green
} elseif ($dmarc.Count -eq 0) {
    Write-Host "[FAIL] DMARC is missing." -ForegroundColor Red
} else {
    Write-Host "[FAIL] Multiple DMARC records exist; keep exactly one." -ForegroundColor Red
}

Write-Host ""
Write-Host "Raw CSP:" -ForegroundColor Cyan
Write-Host $csp


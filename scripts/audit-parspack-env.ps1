param(
  [string]$ProjectPath = "C:\eloria",
  [string]$EnvFile = ".env",
  [string]$SiteUrl = "https://eloriagallery.ir",
  [switch]$SkipLive
)

$ErrorActionPreference = "Stop"
$scriptPath = Join-Path $ProjectPath "scripts\audit-parspack-env.mjs"
if (-not (Test-Path $scriptPath)) { throw "Audit script not found: $scriptPath" }

Push-Location $ProjectPath
try {
  $arguments = @($scriptPath, "--env-file", $EnvFile, "--site-url", $SiteUrl)
  if ($SkipLive) { $arguments += "--skip-live" }
  node @arguments
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
  Pop-Location
}

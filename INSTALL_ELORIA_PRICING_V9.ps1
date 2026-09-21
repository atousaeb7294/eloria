param(
  [string]$Target = "C:\eloria",
  [switch]$StartDev
)

$ErrorActionPreference = "Stop"
$installer = Join-Path $PSScriptRoot "INSTALL_ELORIA_STORY_V7.ps1"
if (-not (Test-Path $installer)) { throw "Release installer payload is missing." }

if ($StartDev) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -Target $Target -StartDev
} else {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -Target $Target
}
if ($LASTEXITCODE -ne 0) { throw "ELORIA Pricing V9 installation failed." }

Write-Host "ELORIA Pricing V9 is ready: zero sales tax and zero closed-market uplift." -ForegroundColor Green

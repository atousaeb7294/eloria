$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$project = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $PSScriptRoot "run-metal-sync.cmd"
$taskName = "Eloria Metal Price Sync"

if (-not (Test-Path $runner)) {
    throw "Runner file was not found: $runner"
}

$taskCommand = '"' + $runner + '"'

schtasks.exe /Create `
  /TN $taskName `
  /SC MINUTE `
  /MO 10 `
  /TR $taskCommand `
  /F

if ($LASTEXITCODE -ne 0) {
    throw "Unable to create Windows Task Scheduler job."
}

Write-Host "Scheduled task created: $taskName" -ForegroundColor Green
Write-Host "The task runs every 10 minutes while this Windows account can run scheduled tasks." -ForegroundColor Cyan
Write-Host "Log: $project\logs\metal-price-sync.log" -ForegroundColor Cyan

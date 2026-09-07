$ErrorActionPreference = "Stop"

$repairScript = Join-Path $PSScriptRoot "repair-existing-database.ps1"

if (-not (Test-Path $repairScript)) {
    throw "Repair script was not found: $repairScript"
}

& $repairScript
exit $LASTEXITCODE

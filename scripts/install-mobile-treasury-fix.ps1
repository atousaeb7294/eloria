[CmdletBinding()]
param(
    [string]$ProjectRoot = 'C:\eloria',
    [switch]$Build
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed (exit $LASTEXITCODE)." }
}

foreach ($tool in @('git', 'node', 'npm.cmd')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw 'Install Git for Windows and Node.js 22 or 24, then reopen PowerShell.'
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot 'package.json'))) {
    throw "Project not found at $ProjectRoot. Clone the repository first."
}

Push-Location -LiteralPath $ProjectRoot
try {
    Write-Host '[1/3] Installing locked dependencies (no database command is run)...'
    Invoke-Checked 'npm.cmd' @('ci', '--no-audit', '--no-fund')
    Write-Host '[2/3] Checking the mobile treasury source fix...'
    Invoke-Checked 'node' @('scripts/test-mobile-treasury-fix.mjs')
    if ($Build) {
        Write-Host '[3/3] Building the storefront...'
        Invoke-Checked 'npm.cmd' @('run', 'build')
    } else {
        Write-Host '[3/3] Build skipped. Use -Build to run it.'
    }
    Write-Host 'Done. Existing .env files and Parspack data were preserved.'
} finally { Pop-Location }

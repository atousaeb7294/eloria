[CmdletBinding()]
param(
    [string]$ProjectRoot = 'C:\eloria',
    [Parameter(Mandatory = $true)][string]$UpdateDirectory,
    [switch]$Build
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed (exit $LASTEXITCODE). Stopped at this step." }
}
foreach ($tool in @('git', 'node', 'npm.cmd')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw 'Install Git for Windows and Node.js 22 or 24, then reopen PowerShell.'
    }
}
$major = [int](& node -p 'process.versions.node.split(String.fromCharCode(46))[0]')
if ($LASTEXITCODE -ne 0 -or $major -lt 22 -or $major -gt 24) { throw 'This project supports Node.js >=22 <25; use 22 or 24.' }
$updater = Join-Path $UpdateDirectory 'apply-floating-home-update.mjs'
if (-not (Test-Path -LiteralPath $updater)) { throw 'Extract the complete ZIP first; the update folder is missing.' }
if (-not (Test-Path -LiteralPath $ProjectRoot)) {
    Invoke-Checked 'git' @('clone', 'https://github.com/atousaeb7294/eloria.git', $ProjectRoot)
}
if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot 'package.json'))) { throw "Project not found at $ProjectRoot." }
Write-Host '[1/3] Applying the verified patch and backing up affected source files...'
Invoke-Checked 'node' @($updater, $ProjectRoot)
Push-Location -LiteralPath $ProjectRoot
try {
    Write-Host '[2/3] Installing locked dependencies...'
    Invoke-Checked 'npm.cmd' @('ci', '--no-audit', '--no-fund')
    Write-Host '[3/3] Checking without a local or remote database...'
    $verifyArguments = @('scripts/verify-storefront-repair.mjs')
    if ($Build) { $verifyArguments += '--build' }
    Invoke-Checked 'node' $verifyArguments
    Write-Host 'Ready. Existing env files and Parspack data were preserved.'
    Write-Host 'Follow docs/STOREFRONT_REPAIR_FA.md to publish main.'
} finally { Pop-Location }

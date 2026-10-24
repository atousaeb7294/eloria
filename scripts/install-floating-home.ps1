[CmdletBinding()]
param(
    [string]$ProjectRoot = 'C:\eloria',
    [switch]$SkipStart,
    [switch]$Resume,
    [switch]$LocalCutout,
    [switch]$ProjectEnvironmentLoaded,
    [switch]$NativeCutoutReady
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-EloriaStep {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed (exit $LASTEXITCODE). Installation stopped at this step." }
}

foreach ($tool in @('git', 'node', 'npm.cmd')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Missing $tool. Install Git for Windows and Node.js 22, then reopen PowerShell." }
}
$nodeMajor = & node -p 'process.versions.node.split(String.fromCharCode(46))[0]'
if ($LASTEXITCODE -ne 0 -or $nodeMajor -ne '22') { throw 'This project needs Node.js 22. Reopen PowerShell after installing it.' }
if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot 'package.json'))) { throw "Eloria was not found in $ProjectRoot." }

if (-not $Resume) {
    Write-Host '[1/7] Applying the floating-photo update (env is never changed)...'
    $packageManifest = Join-Path $PSScriptRoot 'FLOATING-UPDATE.json'
    if (Test-Path -LiteralPath $packageManifest) {
        Invoke-EloriaStep 'node' @((Join-Path $PSScriptRoot 'apply-floating-home-update.mjs'), $ProjectRoot)
    }
}

Push-Location -LiteralPath $ProjectRoot
try {
    if (-not $Resume) {
        Write-Host '[2/7] Installing site dependencies...'
        Invoke-EloriaStep 'npm.cmd' @('ci', '--no-audit', '--no-fund')
    }
    if (-not (Test-Path -LiteralPath 'node_modules/next/package.json')) {
        throw 'Dependencies are not installed. Rerun without -Resume.'
    }
    if (-not $ProjectEnvironmentLoaded) {
        # Child processes (Python, Prisma and Next) must inherit the same effective
        # settings, including .env.local, without exposing or rewriting any values.
        $environmentArgs = @('scripts/with-project-env.mjs')
        if ($LocalCutout) { $environmentArgs += '--local-cutout' }
        $environmentArgs += @('powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath, '-ProjectRoot', $ProjectRoot, '-Resume', '-ProjectEnvironmentLoaded')
        if ($SkipStart) { $environmentArgs += '-SkipStart' }
        Invoke-EloriaStep 'node' $environmentArgs
        return
    }
    if (-not $NativeCutoutReady) {
        Write-Host '[3/7] Preparing background removal directly on Windows (no Docker)...'
        $nativeArgs = @('scripts/with-native-cutout.mjs', 'powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath, '-ProjectRoot', $ProjectRoot, '-Resume', '-ProjectEnvironmentLoaded', '-NativeCutoutReady')
        if ($SkipStart) { $nativeArgs += '-SkipStart' }
        Invoke-EloriaStep 'node' $nativeArgs
        return
    }
    Write-Host '[3/7] Checking the existing background-removal service...'
    & node 'scripts/check-cutout-health.mjs'
    $cutoutStatus = $LASTEXITCODE
    if ($cutoutStatus -eq 4) { throw 'See the URL/TOKEN status above. Existing or partial settings were preserved. No env file was changed.' }
    if ($cutoutStatus -eq 3) { throw 'The configured cutout service is unreachable. Start that existing service on its host. No URL or token was changed.' }
    if ($cutoutStatus -ne 0) { throw 'The background remover did not become ready. Send the last error; do not change env.' }
    Write-Host '[4/7] Generating the database client...'
    Invoke-EloriaStep 'node' @('node_modules/prisma/build/index.js', 'generate')
    Write-Host '[5/7] Checking the update...'
    Invoke-EloriaStep 'npm.cmd' @('run', 'typecheck')
    Invoke-EloriaStep 'npm.cmd' @('run', 'test:product-display')
    Write-Host '[6/7] Applying pending project migrations and building...'
    Invoke-EloriaStep 'node' @('node_modules/prisma/build/index.js', 'migrate', 'deploy')
    Invoke-EloriaStep 'npm.cmd' @('run', 'build')
    Write-Host '[7/7] Ready. Select one product photo at /fa/admin/appearance.'
    Write-Host 'Next time, run scripts\start-eloria-native.ps1 to start the site and background remover together.'
    Write-Host 'This installs your local copy; it does not deploy eloriagallery.ir.'
    if (-not $SkipStart) { Invoke-EloriaStep 'npm.cmd' @('run', 'start:production') }
} finally { Pop-Location }

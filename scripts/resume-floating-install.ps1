[CmdletBinding()]
param([string]$ProjectRoot = 'C:\eloria', [switch]$SkipStart)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Reuse the private Node 22 download from the earlier installation command.
$runtimeCache = Join-Path $env:LOCALAPPDATA 'EloriaRuntime'
if (Test-Path -LiteralPath $runtimeCache) {
    $candidates = Get-ChildItem -LiteralPath $runtimeCache -Directory -Filter 'node-v22.*-win-*' | Sort-Object LastWriteTime -Descending
    foreach ($candidate in $candidates) {
        $binary = Join-Path $candidate.FullName 'node.exe'
        if (-not (Test-Path -LiteralPath $binary)) { continue }
        $version = & $binary -p 'process.versions.node.split(String.fromCharCode(46))[0]'
        if ($LASTEXITCODE -eq 0 -and $version -eq '22') {
            $env:Path = "$($candidate.FullName);$env:Path"
            break
        }
    }
}

if (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'FLOATING-UPDATE.json')) {
    & node (Join-Path $PSScriptRoot 'apply-floating-home-update.mjs') $ProjectRoot
    if ($LASTEXITCODE -ne 0) { throw 'The installer fix could not be applied. No conflicting files were overwritten.' }
}
$installer = Join-Path $ProjectRoot 'scripts\install-floating-home.ps1'
$arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $installer, '-ProjectRoot', $ProjectRoot, '-Resume', '-LocalCutout')
if ($SkipStart) { $arguments += '-SkipStart' }
& powershell.exe @arguments
if ($LASTEXITCODE -ne 0) { throw 'Installation stopped at the message above. No env file was modified.' }

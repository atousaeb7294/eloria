[CmdletBinding()]
param([switch]$ApplyMigrations, [switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed (exit $LASTEXITCODE). Setup stopped." }
}
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $ProjectRoot
try {
    foreach ($tool in @('node', 'npm.cmd', 'docker')) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Install $tool first. Required: Node 22.x and Docker Desktop with Linux containers." }
    }
    $nodeMajor = (& node -p 'process.versions.node.split(".")[0]').Trim()
    if ($nodeMajor -ne '22') { throw "This project requires Node 22.x. Current major: $nodeMajor" }
    if (-not (Test-Path -LiteralPath '.env')) { throw 'Copy your EXISTING working .env to this folder first. The installer never replaces it with example values.' }
    $DockerOs = (& docker info --format '{{.OSType}}').Trim()
    if ($LASTEXITCODE -ne 0 -or $DockerOs -ne 'linux') { throw 'Start Docker Desktop in Linux containers mode first.' }
    Invoke-Checked 'docker' @('compose', 'version')
    Invoke-Checked 'npm.cmd' @('ci', '--no-audit', '--no-fund')
    Invoke-Checked 'node' @('scripts/configure-cutout.mjs')
    Invoke-Checked 'docker' @('compose', '-f', 'docker-compose.cutout-local.yml', 'build', 'eloria-cutout')
    Invoke-Checked 'docker' @('compose', '-f', 'docker-compose.cutout-local.yml', 'run', '--rm', '--no-deps', 'eloria-cutout', 'python', '-m', 'unittest', 'test_worker')
    Invoke-Checked 'node' @('node_modules/prisma/build/index.js', 'generate')
    if ($ApplyMigrations) {
        # Additive migration only; never seed, reset, db push or auto-resolve.
        Invoke-Checked 'node' @('node_modules/prisma/build/index.js', 'migrate', 'deploy')
    }
    Invoke-Checked 'npm.cmd' @('run', 'test:home-design')
    Invoke-Checked 'npm.cmd' @('run', 'typecheck')
    if (-not $SkipBuild) { Invoke-Checked 'npm.cmd' @('run', 'build') }
    Write-Host 'Start two PowerShell windows: npm run cutout:start / npm run dev'
    if (-not $ApplyMigrations) { Write-Host 'Migration was NOT run. Apply it before using /fa/admin/appearance.' }
    Write-Host 'Select a real hero photo and eight featured products at /fa/admin/appearance.'
} finally { Pop-Location }

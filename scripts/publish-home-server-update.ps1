param(
    [string]$ProjectRoot = 'C:\eloria',
    [string]$BundleRoot = '',
    [switch]$Publish
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($BundleRoot)) { $BundleRoot = $PSScriptRoot }
if ([string]::IsNullOrWhiteSpace($BundleRoot)) { throw 'Run the script from the extracted update folder.' }
if (-not (Test-Path -LiteralPath $ProjectRoot -PathType Container)) { throw 'Eloria project folder was not found.' }
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$BundleRoot = (Resolve-Path -LiteralPath $BundleRoot).Path
$manifestPath = Join-Path $BundleRoot 'FLOATING-UPDATE.json'
$updaterPath = Join-Path $BundleRoot 'apply-floating-home-update.mjs'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw 'Extract the complete update ZIP before running this script.' }
if (-not (Test-Path -LiteralPath $updaterPath -PathType Leaf)) { throw 'The update folder is incomplete. Extract the ZIP again.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is not on PATH. Reopen PowerShell after installing Node.js 22.' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is not on PATH. Reopen PowerShell after installing Git.' }
foreach ($name in @('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE')) {
    if ([Environment]::GetEnvironmentVariable($name)) { throw "Unset $name before updating." }
}
$branch = & git -C $ProjectRoot branch --show-current
if ($LASTEXITCODE -ne 0) { throw 'The project folder is not a Git checkout.' }
if ($branch.Trim() -ne 'main') { throw 'Switch the Eloria checkout to main before running this update. No files were changed.' }

Write-Host '[1/3] Applying code changes and backing up affected files...'
& node $updaterPath $ProjectRoot
if ($LASTEXITCODE -ne 0) { throw 'The update stopped safely. Read the message above; no env file was changed.' }

if (-not $Publish) {
    Write-Host 'Code is ready for review. Run the same script with -Publish to commit these files and push main.'
    exit 0
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$files = @($manifest.updates | ForEach-Object { $_.files } | Sort-Object -Unique)
if ($files.Count -eq 0) { throw 'The update manifest has no files.' }
Write-Host '[2/3] Committing only the files listed in this update...'
& git --literal-pathspecs -C $ProjectRoot add -- @files
if ($LASTEXITCODE -ne 0) { throw 'Git could not stage the update files. Nothing was pushed.' }
& git --literal-pathspecs -C $ProjectRoot diff --cached --quiet HEAD -- @files
$diffStatus = $LASTEXITCODE
if ($diffStatus -eq 1) {
    & git --literal-pathspecs -C $ProjectRoot commit --only -m 'Fix server cutouts, mobile typography and direct navigation; remove home replay button' -- @files
    if ($LASTEXITCODE -ne 0) { throw 'Git could not create the commit. Changes were kept; nothing was pushed.' }
} elseif ($diffStatus -ne 0) {
    throw 'Git could not compare the update files. Nothing was pushed.'
}

Write-Host '[3/3] Pushing main to GitHub for the existing Parspack deployment...'
& git -C $ProjectRoot push origin main
if ($LASTEXITCODE -ne 0) { throw 'GitHub push failed. Your changes and commit were kept. Send the Git error above; do not force-push.' }
Write-Host 'Pushed to GitHub. Wait for the Parspack build/deployment to finish before testing Home management.'
Write-Host 'No env files, database connections, Python installation or Docker Desktop were used by this updater.'

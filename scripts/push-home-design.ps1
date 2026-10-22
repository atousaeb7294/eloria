[CmdletBinding()]
param([string]$Branch = 'eloria/home-refinement-20261021')
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
function Git-Checked {
    param([string[]]$Arguments)
    & git @Arguments
    if ($LASTEXITCODE -ne 0) { throw "git failed (exit $LASTEXITCODE). Nothing was force-pushed." }
}
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    Git-Checked @('check-ref-format', '--branch', $Branch)
    $origin = (& git remote get-url origin).Trim()
    if ($LASTEXITCODE -ne 0 -or $origin -notmatch '^(https://github\.com/atousaeb7294/eloria(?:\.git)?|git@github\.com:atousaeb7294/eloria(?:\.git)?)$') { throw 'Origin is not the Eloria repository supplied by you.' }
    $staged = @(& git diff --cached --name-only)
    if ($LASTEXITCODE -ne 0 -or $staged.Count -gt 0) { throw 'The index is not empty or cannot be inspected. Review staged changes first.' }
    $current = (& git branch --show-current).Trim()
    if ($current -ne $Branch) { Git-Checked @('switch', '-c', $Branch) }
    $paths = @(Get-Content -LiteralPath 'docs/HOME_DESIGN_FILES.txt' | Where-Object { $_.Trim() })
    Git-Checked @('diff', '--check')
    Git-Checked (@('--literal-pathspecs', 'add', '--') + $paths)
    Git-Checked @('diff', '--cached', '--check')
    & git diff --cached --quiet
    if ($LASTEXITCODE -eq 1) { Git-Checked @('commit', '-m', 'Refine Eloria home, glass treasury theme and managed hero cutouts') }
    elseif ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged changes.' }
    Git-Checked @('push', '-u', 'origin', $Branch)
    Write-Host "Uploaded branch: $Branch. Review and merge through GitHub when ready."
} finally { Pop-Location }

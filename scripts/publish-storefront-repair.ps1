[CmdletBinding()]
param([string]$ProjectRoot = 'C:\eloria')
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
function Git-Checked {
    param([string[]]$Arguments)
    & git @Arguments
    if ($LASTEXITCODE -ne 0) { throw "git $($Arguments[0]) failed. No force push was used. Resolve this step before continuing." }
}
Push-Location -LiteralPath $ProjectRoot
try {
    $origin = (& git remote get-url origin).Trim()
    if ($LASTEXITCODE -ne 0 -or $origin -notmatch '^(https://github\.com/atousaeb7294/eloria(?:\.git)?|git@github\.com:atousaeb7294/eloria(?:\.git)?)$') { throw 'Origin is not the supplied Eloria repository.' }
    $staged = @(& git diff --cached --name-only)
    if ($LASTEXITCODE -ne 0 -or $staged.Count -gt 0) { throw 'Review already staged changes first; this script stages only the repair files.' }
    $files = @(Get-Content -LiteralPath 'docs/STOREFRONT_REPAIR_FILES.txt' | Where-Object { $_.Trim() })
    Git-Checked @('diff', '--check')
    $branch = 'fix/storefront-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
    Git-Checked @('switch', '-c', $branch)
    Git-Checked (@('--literal-pathspecs', 'add', '--') + $files)
    Git-Checked @('diff', '--cached', '--check')
    & git diff --cached --quiet
    if ($LASTEXITCODE -eq 1) { Git-Checked @('commit', '-m', 'Fix treasury photos, touch controls, Persian text and intro loading') }
    elseif ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged changes.' }
    Git-Checked @('fetch', 'origin')
    & git show-ref --verify --quiet refs/heads/main
    if ($LASTEXITCODE -eq 0) { Git-Checked @('switch', 'main') }
    elseif ($LASTEXITCODE -eq 1) { Git-Checked @('switch', '-c', 'main', '--track', 'origin/main') }
    else { throw 'Could not inspect main.' }
    Git-Checked @('merge', '--ff-only', 'origin/main')
    Git-Checked @('merge', '--no-edit', $branch)
    Git-Checked @('push', 'origin', 'main')
    Write-Host "Pushed main. The repair also remains on local branch $branch."
    Write-Host 'Deploy the latest main commit in Parspack if automatic deployment is not configured.'
} finally { Pop-Location }

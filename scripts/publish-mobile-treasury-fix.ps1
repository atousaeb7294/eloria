[CmdletBinding()]
param([string]$ProjectRoot = 'C:\eloria')
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Git-Checked {
    param([string[]]$Arguments)
    & git @Arguments
    if ($LASTEXITCODE -ne 0) { throw "git $($Arguments[0]) failed. No force push was used." }
}

$files = @(
    'src/app/home-design.css',
    'src/components/eloria-home.tsx',
    'src/components/catalog-category-navigation.tsx',
    'src/components/home-palace/index.tsx',
    'src/components/mobile-site-menu.tsx',
    'src/components/site-footer.tsx',
    'src/components/site-header.tsx',
    'src/lib/treasury-editorial.ts',
    'src/app/[locale]/admin/(protected)/products/actions.ts',
    'src/app/[locale]/collections/[collection]/page.tsx',
    'src/app/[locale]/collections/page.tsx',
    'src/app/[locale]/products/page.tsx',
    'scripts/install-mobile-treasury-fix.ps1',
    'scripts/publish-mobile-treasury-fix.ps1',
    'scripts/test-mobile-treasury-fix.mjs',
    'docs/MOBILE_TREASURY_FIX_FA.md'
)

Push-Location -LiteralPath $ProjectRoot
try {
    $origin = (& git remote get-url origin).Trim()
    if ($origin -notmatch 'github\.com[/:]atousaeb7294/eloria(?:\.git)?$') { throw 'Origin is not the Eloria repository.' }
    Git-Checked @('diff', '--check')
    $branch = 'fix/mobile-treasury-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
    Git-Checked @('switch', '-c', $branch)
    Git-Checked (@('--literal-pathspecs', 'add', '--') + $files)
    Git-Checked @('diff', '--cached', '--check')
    Git-Checked @('commit', '-m', 'Fix mobile treasury entry, naming and storefront performance')
    Git-Checked @('fetch', 'origin')
    Git-Checked @('switch', 'main')
    Git-Checked @('merge', '--ff-only', 'origin/main')
    Git-Checked @('merge', '--no-edit', $branch)
    Git-Checked @('push', 'origin', 'main')
    Write-Host "Published main. Local repair branch: $branch"
} finally { Pop-Location }

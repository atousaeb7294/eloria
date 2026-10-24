[CmdletBinding()]
param([string]$ProjectRoot = 'C:\eloria')
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'use-eloria-node.ps1')
Push-Location -LiteralPath $ProjectRoot
try {
    if (-not (Test-Path -LiteralPath '.next/BUILD_ID')) {
        throw 'Finish the installation with scripts\resume-floating-install.ps1 first.'
    }
    $nodeBinary = (Get-Command node -CommandType Application).Source
    & $nodeBinary 'scripts/with-project-env.mjs' '--local-cutout' $nodeBinary 'scripts/with-native-cutout.mjs' $nodeBinary 'scripts/start-production.mjs'
    if ($LASTEXITCODE -ne 0) { throw 'Eloria stopped. See the message above. No env file was changed.' }
} finally { Pop-Location }

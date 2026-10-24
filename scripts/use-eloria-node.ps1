# Keep the existing portable Node 22 choice local to this PowerShell process.
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
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 22 was not found.' }
$nodeMajor = & node -p 'process.versions.node.split(String.fromCharCode(46))[0]'
if ($LASTEXITCODE -ne 0 -or $nodeMajor -ne '22') { throw 'This project needs Node.js 22. Reuse the EloriaRuntime download.' }

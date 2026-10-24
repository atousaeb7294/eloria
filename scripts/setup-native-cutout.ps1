[CmdletBinding()]
param([string]$ProjectRoot = 'C:\eloria')
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-PythonStep {
    param([string]$Binary, [string[]]$Arguments)
    & $Binary @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Python setup failed (exit $LASTEXITCODE). Rerun the same installer to continue." }
}
function Test-CutoutPython {
    param([string]$Binary)
    if (-not $Binary -or -not (Test-Path -LiteralPath $Binary)) { return $false }
    & $Binary -I -c "import sys, platform; sys.exit(0 if sys.version_info[:2] == (3, 13) and platform.machine().lower() in ('amd64', 'x86_64') and sys.maxsize > 2**32 else 1)" 2>$null
    return ($LASTEXITCODE -eq 0)
}
function Get-VerifiedInstaller {
    param([string]$Uri, [string]$Destination, [string]$Publisher, [string]$ExpectedHash = '')
    $ProgressPreference = 'SilentlyContinue'
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    if (-not (Test-Path -LiteralPath $Destination)) {
        Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile ($Destination + '.partial')
        Move-Item -LiteralPath ($Destination + '.partial') -Destination $Destination -Force
    }
    if ($ExpectedHash -and (Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash -ne $ExpectedHash) {
        Remove-Item -LiteralPath $Destination
        throw 'The downloaded installer checksum did not match. Rerun to download it again.'
    }
    $signature = Get-AuthenticodeSignature -LiteralPath $Destination
    if ($signature.Status -ne 'Valid' -or -not $signature.SignerCertificate -or $signature.SignerCertificate.Subject -notmatch $Publisher) {
        throw 'The installer publisher could not be verified. No unverified installer was executed.'
    }
}

if (-not [Environment]::Is64BitOperatingSystem) { throw 'Local background removal requires 64-bit Windows.' }
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$runtimeCache = Join-Path $env:LOCALAPPDATA 'EloriaRuntime'
$pythonHome = Join-Path $runtimeCache 'Python313'
$venv = Join-Path $ProjectRoot '.venv-cutout'
$venvPython = Join-Path $venv 'Scripts\python.exe'
$cache = Join-Path $ProjectRoot '.cache\eloria-cutout'
New-Item -ItemType Directory -Path $runtimeCache, $cache -Force | Out-Null

if (-not (Test-CutoutPython $venvPython)) {
    $pythonBinary = $null
    $candidates = @((Join-Path $pythonHome 'python.exe'), (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python313\python.exe'))
    foreach ($hive in @('HKCU:', 'HKLM:')) {
        $registered = Get-Item -LiteralPath "$hive\Software\Python\PythonCore\3.13\InstallPath" -ErrorAction SilentlyContinue
        if ($registered) { $candidates += Join-Path ($registered.GetValue('')) 'python.exe' }
    }
    foreach ($candidate in $candidates) {
        if (Test-CutoutPython $candidate) { $pythonBinary = $candidate; break }
    }
    if (-not $pythonBinary) {
        Write-Host 'Downloading and installing Python 3.13 for this user. System PATH is unchanged.'
        $pythonInstaller = Join-Path $runtimeCache 'python-3.13.16-amd64.exe'
        Get-VerifiedInstaller -Uri 'https://www.python.org/ftp/python/3.13.16/python-3.13.16-amd64.exe' -Destination $pythonInstaller -Publisher 'Python Software Foundation' -ExpectedHash 'fb4f9f5d438b2396da0086dc70b935c530cb578e37adc6d354f7ad2037fee83b'
        $installArguments = @('/passive', '/norestart', 'InstallAllUsers=0', ('TargetDir="' + $pythonHome + '"'), 'PrependPath=0', 'AppendPath=0', 'Include_launcher=0', 'InstallLauncherAllUsers=0', 'Include_pip=1', 'Include_test=0', 'Include_doc=0', 'Include_tcltk=0', 'Shortcuts=0', 'AssociateFiles=0')
        $install = Start-Process -FilePath $pythonInstaller -ArgumentList $installArguments -Wait -PassThru
        if ($install.ExitCode -eq 3010) { throw 'Python needs a Windows restart. Save your work, restart, then run this installer again.' }
        if ($install.ExitCode -ne 0) { throw "Python installation failed (exit $($install.ExitCode))." }
        $pythonBinary = Join-Path $pythonHome 'python.exe'
        if (-not (Test-CutoutPython $pythonBinary)) { throw 'Python 3.13 x64 could not be started.' }
    }
    if (Test-Path -LiteralPath $venv) {
        $oldVenv = $venv + '.previous-' + [guid]::NewGuid().ToString('N')
        Move-Item -LiteralPath $venv -Destination $oldVenv
    }
    Invoke-PythonStep $pythonBinary @('-I', '-m', 'venv', $venv)
}

$env:PYTHONUTF8 = '1'
$env:PYTHONNOUSERSITE = '1'
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:OMP_NUM_THREADS = '2'
$env:U2NET_HOME = $cache
$env:NUMBA_CACHE_DIR = Join-Path $cache 'numba'
$env:PIP_DISABLE_PIP_VERSION_CHECK = '1'
$runtimeCheck = Join-Path $ProjectRoot 'services\cutout\check_runtime.py'
& $venvPython $runtimeCheck
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Installing the background-removal libraries in the project virtual environment...'
    Invoke-PythonStep $venvPython @('-m', 'pip', 'install', '--only-binary=:all:', '--disable-pip-version-check', '-r', (Join-Path $ProjectRoot 'services\cutout\requirements.txt'))
}

# Only install the signed Microsoft runtime if ONNX reports a missing DLL.
Write-Host 'Checking the background-removal runtime...'
$savedPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = 'Continue'
    $onnxProbe = & $venvPython $runtimeCheck '--imports' 2>&1
    $onnxExit = $LASTEXITCODE
} finally { $ErrorActionPreference = $savedPreference }
if ($onnxExit -ne 0 -and (($onnxProbe | Out-String) -match 'DLL load failed|WinError 126|VCRUNTIME|MSVCP')) {
    Write-Host 'Installing the Microsoft runtime required by ONNX. Windows may request permission.'
    $vcInstaller = Join-Path $runtimeCache 'vc-redist-eloria-x64.exe'
    Get-VerifiedInstaller -Uri 'https://aka.ms/vc14/vc_redist.x64.exe' -Destination $vcInstaller -Publisher 'Microsoft Corporation'
    $vcInstall = Start-Process -FilePath $vcInstaller -ArgumentList '/install', '/passive', '/norestart' -Wait -PassThru
    if ($vcInstall.ExitCode -eq 3010) { throw 'The Microsoft runtime needs a Windows restart. Restart and rerun this installer.' }
    if ($vcInstall.ExitCode -notin @(0, 1638)) { throw "Microsoft runtime installation failed (exit $($vcInstall.ExitCode))." }
} elseif ($onnxExit -ne 0) {
    # Repair a partially installed dependency set after an interrupted download.
    Invoke-PythonStep $venvPython @('-m', 'pip', 'install', '--only-binary=:all:', '--disable-pip-version-check', '-r', (Join-Path $ProjectRoot 'services\cutout\requirements.txt'))
}
Invoke-PythonStep $venvPython @($runtimeCheck, '--imports')
Write-Host 'Preparing the background-removal model. The first download can take several minutes...'
Invoke-PythonStep $venvPython @((Join-Path $ProjectRoot 'services\cutout\worker.py'), '--download-model')
Write-Host 'Native background removal is installed. No env file was changed.'

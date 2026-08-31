param(
  [string]$InstallPath = "C:\eloria",
  [switch]$RunDatabaseMigration,
  [switch]$RefreshExistingMyths,
  [switch]$PushGitHub
)

$ErrorActionPreference = "Stop"
$SourcePath = $PSScriptRoot
$TimeStamp = Get-Date -Format "yyyyMMdd_HHmmss"

function Step([string]$Text) {
  Write-Host "`n============================================================" -ForegroundColor DarkYellow
  Write-Host $Text -ForegroundColor Yellow
  Write-Host "============================================================" -ForegroundColor DarkYellow
}

function Run([string]$Command, [string[]]$Arguments) {
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Command failed: $Command $($Arguments -join ' ')" }
}

Step "1/8 - Checking the release package"
$RequiredFiles = @(
  "package.json", "package-lock.json", "prisma\schema.prisma",
  "prisma.config.ts", "postcss.config.mjs", "next.config.ts"
)
foreach ($File in $RequiredFiles) {
  if (-not (Test-Path (Join-Path $SourcePath $File))) { throw "Missing file: $File" }
}

$NodeVersion = (& node --version 2>$null)
if (-not $NodeVersion) { throw "Node.js is not installed. Install Node.js 24 LTS first." }
Write-Host "Node: $NodeVersion"

$SourceFull = [IO.Path]::GetFullPath($SourcePath).TrimEnd('\')
$TargetFull = [IO.Path]::GetFullPath($InstallPath).TrimEnd('\')

if ($SourceFull -ne $TargetFull) {
  Step "2/8 - Backing up and installing into $InstallPath"
  if (Test-Path $InstallPath) {
    $BackupPath = "${InstallPath}_backup_$TimeStamp"
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    & robocopy $InstallPath $BackupPath /E /XD node_modules .next .git /XF .env.local | Out-Host
    if ($LASTEXITCODE -ge 8) { throw "Backup failed with Robocopy code $LASTEXITCODE" }
    Write-Host "Backup: $BackupPath" -ForegroundColor Green
  } else {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
  }
  & robocopy $SourcePath $InstallPath /E /XD node_modules .next .git src\generated /XF .env .env.local *.tsbuildinfo | Out-Host
  if ($LASTEXITCODE -ge 8) { throw "Install copy failed with Robocopy code $LASTEXITCODE" }
} else {
  Step "2/8 - Project is already installed in $InstallPath"
}

Set-Location $InstallPath

Step "3/8 - Installing exact dependencies"
Run "npm.cmd" @("ci")

Step "4/8 - Generating Prisma Client"
if (-not (Test-Path ".env")) {
  throw "C:\eloria\.env is missing. Copy .env.example to .env and enter the real values before continuing."
}
Run "npx.cmd" @("prisma", "generate")

Step "5/8 - TypeScript, ESLint and production build"
Run "npm.cmd" @("run", "typecheck")
Run "npm.cmd" @("run", "lint")
Run "npm.cmd" @("run", "build")

Step "6/8 - Checking environment variables without printing secrets"
& powershell -ExecutionPolicy Bypass -File ".\scripts\audit-parspack-env.ps1" -ProjectPath $InstallPath -EnvFile ".env" -SiteUrl "https://eloriagallery.ir" -SkipLive
if ($LASTEXITCODE -ne 0) { throw "Environment audit failed. Correct the ERROR rows and run this installer again." }

Step "7/8 - Database"
if ($RunDatabaseMigration) {
  Run "npx.cmd" @("prisma", "migrate", "deploy")
  Run "npm.cmd" @("run", "myths:assign")
  if ($RefreshExistingMyths) { Run "npm.cmd" @("run", "myths:refresh") }
} else {
  Write-Host "Migration was not run. After checking DATABASE_URL and DIRECT_URL, rerun with -RunDatabaseMigration." -ForegroundColor Cyan
}

Step "8/8 - GitHub"
if ($PushGitHub) {
  if (-not (Test-Path ".git")) { Run "git.exe" @("init") }
  $Remote = (& git remote get-url origin 2>$null)
  if ($LASTEXITCODE -ne 0 -or -not $Remote) {
    Run "git.exe" @("remote", "add", "origin", "https://github.com/atousaeb7294/eloria.git")
  } else {
    Run "git.exe" @("remote", "set-url", "origin", "https://github.com/atousaeb7294/eloria.git")
  }
  Run "git.exe" @("add", ".")
  & git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) { Run "git.exe" @("commit", "-m", "release: final Eloria production") }
  Run "git.exe" @("branch", "-M", "main")
  Run "git.exe" @("push", "-u", "origin", "main")
} else {
  Write-Host "GitHub push was not run. Rerun with -PushGitHub after signing in to GitHub." -ForegroundColor Cyan
}

Write-Host "`nELORIA LOCAL RELEASE IS READY." -ForegroundColor Green
Write-Host "Detailed next steps: $InstallPath\ELORIA_FINAL_INSTALL_FA.md"

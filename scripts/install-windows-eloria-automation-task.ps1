[cmdletbinding()]
param(
  [switch]$remove
)

$erroractionpreference = "stop"
$projectroot = (resolve-path (join-path $psscriptroot "..")).path
$envpath = join-path $projectroot ".env"
$fasttask = "eloria-fast-operations"
$dailytask = "eloria-daily-briefing"

function get-env-file-value([string]$name) {
  if (-not (test-path -literalpath $envpath)) {
    return ""
  }

  $line = get-content -literalpath $envpath |
    where-object { $_ -match ("^\s*" + [regex]::escape($name) + "\s*=") } |
    select-object -first 1

  if ($null -eq $line) {
    return ""
  }

  return $line.split("=", 2)[1].trim().trim('"').trim("'")
}

if ($remove) {
  foreach ($task in @($fasttask, $dailytask)) {
    & schtasks.exe /delete /tn $task /f 2>$null | out-null
  }

  write-host "eloria automation tasks removed."
  exit 0
}

if (-not (test-path -literalpath $envpath)) {
  throw ".env was not found. configure the project first."
}

$secret = get-env-file-value "CRON_SECRET"
$baseurl = get-env-file-value "ELORIA_INTERNAL_BASE_URL"

if (-not $baseurl) {
  $baseurl = get-env-file-value "NEXT_PUBLIC_SITE_URL"
}

if ($secret.length -lt 48 -or -not $baseurl) {
  write-warning "automation tasks were not created. set CRON_SECRET and ELORIA_INTERNAL_BASE_URL (or NEXT_PUBLIC_SITE_URL) in .env first."
  exit 0
}

$runner = join-path $projectroot "scripts\run-eloria-automation-cycle.ps1"
$fastcommand = "powershell.exe -noprofile -executionpolicy bypass -file `"$runner`" -cycle fast"
$dailycommand = "powershell.exe -noprofile -executionpolicy bypass -file `"$runner`" -cycle daily"

& schtasks.exe /create /tn $fasttask /tr $fastcommand /sc minute /mo 15 /f | out-null
& schtasks.exe /create /tn $dailytask /tr $dailycommand /sc daily /st 08:15 /f | out-null

write-host "eloria automation is scheduled."
write-host "fast operations: every 15 minutes"
write-host "daily briefing and content: every day at 08:15"

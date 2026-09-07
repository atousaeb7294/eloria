[cmdletbinding()]
param(
  [validateset("fast", "daily")]
  [string]$cycle = "fast"
)

$erroractionpreference = "continue"
$projectroot = (resolve-path (join-path $psscriptroot "..")).path
set-location $projectroot

if (-not (get-command node -erroraction silentlycontinue)) {
  write-error "node.js is not available. automation was not run."
  exit 1
}

$jobs = if ($cycle -eq "fast") {
  @("metal-prices", "expired-orders", "customer-watches", "security-alerts")
} else {
  @("content-health", "content-drafts", "daily-briefing", "data-retention")
}

$failed = @()

foreach ($job in $jobs) {
  write-host "eloria automation: $job"
  & node scripts/run-cron-once.mjs $job

  if ($lastexitcode -ne 0) {
    $failed += $job
  }
}

if ($failed.count -gt 0) {
  write-error ("eloria automation failed: " + ($failed -join ", "))
  exit 1
}

write-host "eloria automation $cycle cycle completed."

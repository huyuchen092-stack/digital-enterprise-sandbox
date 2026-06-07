param(
  [string]$BaseUrl = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"

$health = Invoke-RestMethod -Uri "$BaseUrl/health"
if ($health.status -ne "ok") {
  throw "Health check failed: $($health | ConvertTo-Json -Compress)"
}

$page = Invoke-WebRequest -Uri "$BaseUrl/" -UseBasicParsing
if (-not $page.Content.Contains('<div id="root"></div>')) {
  throw "Home page did not contain the React root element."
}

Write-Host "OK: $BaseUrl is serving frontend and API."

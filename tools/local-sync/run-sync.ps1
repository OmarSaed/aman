# Run Aman local POS sync (for Windows Task Scheduler)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".\config.json")) {
  Write-Error "config.json not found. Copy config.example.json to config.json first."
}

if (-not (Test-Path ".\node_modules")) {
  Write-Host "Installing dependencies..."
  npm install --omit=dev
}

$logDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir ("sync-" + (Get-Date -Format "yyyy-MM-dd") + ".log")

Write-Host "Logging to $logFile"
node sync.js 2>&1 | Tee-Object -FilePath $logFile -Append

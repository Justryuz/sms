# Segerak harian Google Drive -> dashboard.
# Memanggil GET /api/sync-drive dengan CRON_SECRET daripada .env.local.
# Server Next.js (npm start / npm run dev) mesti sedang berjalan.
param([string]$BaseUrl = "http://localhost:3000")

$root = Split-Path -Parent $PSScriptRoot
$line = Get-Content (Join-Path $root ".env.local") | Where-Object { $_ -match '^CRON_SECRET=' } | Select-Object -First 1
$secret = if ($line) { ($line -split '=', 2)[1].Trim() } else { "" }
if (-not $secret) { Write-Error "CRON_SECRET kosong dalam .env.local"; exit 1 }

$log = Join-Path $root ".data\sync-harian.log"
New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null
$result = curl.exe -s -m 1200 -H "Authorization: Bearer $secret" "$BaseUrl/api/sync-drive"
"$(Get-Date -Format s) $result" | Add-Content $log
Write-Output $result

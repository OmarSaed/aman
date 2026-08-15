# ============================================================
#  Aman ERP - One-Click Setup Script
#  Run this on any new machine to get everything working.
#  Usage:  .\setup.ps1
#          .\setup.ps1 -SkipSeed        (skip data seeding)
#          .\setup.ps1 -Dev             (use dev compose file)
# ============================================================

param(
    [switch]$SkipSeed,
    [switch]$Dev
)

$ErrorActionPreference = "Stop"

# ── Colors ──────────────────────────────────────────────────
function Write-Step  { param($msg) Write-Host "`n► $msg" -ForegroundColor Cyan }
function Write-OK    { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Fail  { param($msg) Write-Host "  [FAIL] $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║       Aman ERP  –  Setup Script      ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Magenta

# ── 1. Check Docker ─────────────────────────────────────────
Write-Step "Checking Docker..."
try {
    docker info | Out-Null
    Write-OK "Docker is running."
} catch {
    Write-Fail "Docker is not running. Please start Docker Desktop and re-run this script."
}

# ── 2. Create .env if missing ────────────────────────────────
Write-Step "Checking .env file..."

$envPath = Join-Path $PSScriptRoot ".env"

if (Test-Path $envPath) {
    Write-OK ".env already exists – skipping creation."
} else {
    Write-Warn ".env not found – creating from defaults..."

    $envContent = @"
# ─── Database ───────────────────────────────────────────────
POSTGRES_DB=aman_erp
POSTGRES_USER=aman_user
POSTGRES_PASSWORD=aman_secure_pass_2024

# ─── Backend ────────────────────────────────────────────────
DATABASE_URL=postgresql://aman_user:aman_secure_pass_2024@postgres:5432/aman_erp
JWT_ACCESS_SECRET=aman_access_secret_key_32chars_min_2024
JWT_REFRESH_SECRET=aman_refresh_secret_key_32chars_min_2024
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
NODE_ENV=production
PORT=5000

# ─── Frontend ───────────────────────────────────────────────
VITE_API_URL=http://localhost/api
"@

    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-OK ".env created successfully."
    Write-Warn "IMPORTANT: Edit .env and change passwords/secrets before going to production!"
}

# ── 3. Choose compose file ───────────────────────────────────
if ($Dev) {
    $composeFile = "docker-compose.dev.yml"
    $backendContainer = "aman_backend_dev"
    Write-Step "Using DEV compose file: $composeFile"
} else {
    $composeFile = "docker-compose.yml"
    $backendContainer = "aman_backend"
    Write-Step "Using PRODUCTION compose file: $composeFile"
}

# ── 4. Pull & start containers ───────────────────────────────
Write-Step "Starting Docker containers..."
docker compose -f $composeFile up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Fail "docker compose up failed. Check the output above."
}
Write-OK "Containers started."

# ── 5. Wait for Postgres to be healthy ───────────────────────
Write-Step "Waiting for PostgreSQL to be ready..."
$maxAttempts = 30
$attempt = 0
do {
    Start-Sleep -Seconds 2
    $attempt++
    $status = docker inspect --format='{{.State.Health.Status}}' aman_db 2>$null
    if (-not $status) {
        $status = docker inspect --format='{{.State.Health.Status}}' aman_db_dev 2>$null
    }
    Write-Host "  Attempt $attempt/$maxAttempts – status: $status" -ForegroundColor DarkGray
} while ($status -ne "healthy" -and $attempt -lt $maxAttempts)

if ($status -ne "healthy") {
    Write-Fail "PostgreSQL did not become healthy in time. Run: docker logs aman_db"
}
Write-OK "PostgreSQL is healthy."

# ── 6. Run Prisma migrations ─────────────────────────────────
Write-Step "Running database migrations..."
docker exec $backendContainer npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Fail "Prisma migrations failed. Check the output above."
}
Write-OK "Migrations applied."

# ── 7. Seed data ─────────────────────────────────────────────
if (-not $SkipSeed) {
    Write-Step "Seeding database with initial data..."
    docker exec $backendContainer node prisma/seed.js

    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Seeding failed or seed already ran (this is okay on re-runs)."
    } else {
        Write-OK "Database seeded successfully."
    }
} else {
    Write-Warn "Skipping seed (--SkipSeed flag used)."
}

# ── 8. Done ──────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║        Setup Complete!               ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  App URL  : http://localhost" -ForegroundColor White
if ($Dev) {
    Write-Host "  Frontend : http://localhost:3000" -ForegroundColor White
    Write-Host "  Backend  : http://localhost:5000" -ForegroundColor White
}
Write-Host "  DB Admin : Run  docker exec -it aman_db psql -U aman_user -d aman_erp" -ForegroundColor DarkGray
Write-Host ""

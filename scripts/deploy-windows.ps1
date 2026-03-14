# RUBLI Deployment Script for Windows (PowerShell)
# Usage: .\scripts\deploy-windows.ps1 37.60.232.109

param(
    [Parameter(Mandatory=$true)] [string] $ServerIP,
    [string] $SSHUser = "root"
)

$RemoteDir = if ($SSHUser -eq "root") { "/opt/rubli" } else { "/home/$SSHUser/rubli" }
$Remote = "$SSHUser@$ServerIP"

Write-Host "=== RUBLI Deploy to $ServerIP (user: $SSHUser) ===" -ForegroundColor Cyan

# 1. Check prerequisites
if (!(Test-Path ".env.prod")) {
    Write-Error ".env.prod not found. Create with: echo 'CORS_ORIGINS=http://$ServerIP' > .env.prod"
    exit 1
}
if (!(Test-Path "backend/RUBLI_DEPLOY.db")) {
    Write-Error "backend/RUBLI_DEPLOY.db not found. Run: cp backend/RUBLI_NORMALIZED.db backend/RUBLI_DEPLOY.db"
    exit 1
}

Write-Host "[1/6] Creating remote directory..." -ForegroundColor Yellow
ssh $Remote "mkdir -p $RemoteDir/backend"

Write-Host "[2/6] Installing Docker (if not present)..." -ForegroundColor Yellow
ssh $Remote "
  if ! command -v docker &>/dev/null; then
    echo 'Installing Docker...'
    curl -fsSL https://get.docker.com | sh
  else
    echo 'Docker already installed.'
  fi
"

Write-Host "[3/6] Opening firewall port 80..." -ForegroundColor Yellow
ssh $Remote "
  if command -v ufw &>/dev/null; then
    sudo ufw allow 80/tcp 2>/dev/null || true
  fi
"

Write-Host "[4/6] Uploading deploy database (~2.4GB, this will take a while)..." -ForegroundColor Yellow
scp "backend/RUBLI_DEPLOY.db" "$Remote`:$RemoteDir/backend/RUBLI_DEPLOY.db"

Write-Host "[5/6] Uploading project files (via tar)..." -ForegroundColor Yellow
# Create tar archive excluding large files
tar --exclude='backend/RUBLI_NORMALIZED.db*' `
    --exclude='backend/*.db.backup*' `
    --exclude='backend/original_data' `
    --exclude='frontend/node_modules' `
    --exclude='frontend/dist' `
    --exclude='.git' `
    --exclude='__pycache__' `
    --exclude='*.pyc' `
    -czf - . | ssh $Remote "cd $RemoteDir && tar -xzf -"

Write-Host "[5b/6] Uploading .env.prod..." -ForegroundColor Yellow
scp ".env.prod" "$Remote`:$RemoteDir/.env.prod"

Write-Host "[6/6] Building and starting containers on server..." -ForegroundColor Yellow
ssh $Remote "
  cd $RemoteDir
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
  echo ''
  echo 'Container status:'
  docker compose -f docker-compose.prod.yml ps
"

Write-Host "`n=== Deployment complete ===" -ForegroundColor Green
Write-Host "   App: http://$ServerIP" -ForegroundColor Green
Write-Host "   API: http://$ServerIP/api/v1/health" -ForegroundColor Green
Write-Host ""
Write-Host "To check logs:" -ForegroundColor Cyan
Write-Host "   ssh $Remote 'docker compose -f $RemoteDir/docker-compose.prod.yml logs -f'"
Write-Host ""
Write-Host "To redeploy after code changes:" -ForegroundColor Cyan
Write-Host "   .\scripts\deploy-windows.ps1 $ServerIP --user $SSHUser"

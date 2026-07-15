@echo off
title CRM Enterprise - Dev Mode

echo ============================================
echo   CRM ENTERPRISE - DEV MODE (watch)
echo ============================================
echo.

echo [1/2] Iniciando Docker...
docker compose up -d postgres redis pgadmin

echo [2/2] Iniciando dev servers...
start "CRM-API-DEV" cmd /k "cd /d D:\CRM && pnpm --filter @crm/api dev"
start "CRM-WEB-DEV" cmd /k "cd /d D:\CRM && pnpm --filter @crm/web dev"

echo.
echo Dev mode iniciado (hot-reload ativo)
echo Frontend: http://localhost:3000
echo.
pause >nul

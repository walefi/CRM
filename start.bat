@echo off
title CRM Enterprise - Iniciando...

echo ============================================
echo   CRM ENTERPRISE - STARTUP
echo ============================================
echo.

REM === Docker ===
echo [1/3] Iniciando Docker (PostgreSQL + Redis + PgAdmin)...
docker compose up -d postgres redis pgadmin
echo.

REM === API ===
echo [2/3] Iniciando API (porta 3001)...
start "CRM-API" cmd /k "cd /d D:\CRM\apps\api && set DATABASE_URL=postgresql://crm_user:crm_password@localhost:5432/crm_db?schema=public && node dist/main.js"
echo API iniciando em http://localhost:3001
echo.

REM === Seed ===
echo [Seed] Executando seed do banco...
timeout /t 5 /nobreak >nul
cd /d D:\CRM\apps\api
set DATABASE_URL=postgresql://crm_user:crm_password@localhost:5432/crm_db?schema=public
call npx ts-node prisma/seed.ts
echo.

REM === Frontend ===
echo [3/3] Iniciando Frontend (porta 3000)...
start "CRM-Web" cmd /k "cd /d D:\CRM\apps\web && npx next start -p 3000"
echo Frontend iniciando em http://localhost:3000
echo.

timeout /t 8 /nobreak >nul

echo ============================================
echo   CRM ENTERPRISE - PRONTO!
echo ============================================
echo.
echo   Frontend:  http://localhost:3000
echo   API:       http://localhost:3001
echo   Swagger:   http://localhost:3001/api/docs
echo   Health:    http://localhost:3001/api/v1/health
echo   PgAdmin:   http://localhost:5050
echo.
echo   Login: admin@crm.com / Admin@123
echo ============================================
echo.
echo Pressione qualquer tecla para fechar...
pause >nul

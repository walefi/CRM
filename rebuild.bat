@echo off
title CRM Enterprise - Rebuild

echo ============================================
echo   REBUILD CRM ENTERPRISE
echo ============================================
echo.

echo [1/4] Gerando Prisma Client...
cd /d D:\CRM\apps\api
set DATABASE_URL=postgresql://crm_user:crm_password@localhost:5432/crm_db?schema=public
call npx prisma generate
echo.

echo [2/4] Executando migrations...
call npx prisma migrate deploy
echo.

echo [3/4] Build Backend...
cd /d D:\CRM
call pnpm --filter @crm/api build
echo.

echo [4/4] Build Frontend...
call pnpm --filter @crm/web build
echo.

echo ============================================
echo   BUILD CONCLUIDO!
echo   Execute start.bat para iniciar
echo ============================================
pause >nul

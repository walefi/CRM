@echo off
title CRM Enterprise - Parando...

echo Parando servidores...
taskkill /FI "WINDOWTITLE eq CRM-*" /T /F >nul 2>&1

echo Parando Docker...
docker compose down

echo.
echo CRM Enterprise parado.
pause >nul

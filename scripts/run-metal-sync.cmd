@echo off
setlocal
cd /d "%~dp0.."
if not exist "logs" mkdir "logs"
call npx tsx scripts\sync-metal-prices.ts >> "logs\metal-price-sync.log" 2>&1
exit /b %ERRORLEVEL%

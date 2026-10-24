@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-floating-home.ps1" -ProjectRoot "C:\eloria"
if errorlevel 1 echo Installation stopped. Send the last error message for help.
pause

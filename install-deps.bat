@echo off
cd /d "%~dp0"
powershell -NoProfile -File setup-windows.ps1
exit /b %errorlevel%

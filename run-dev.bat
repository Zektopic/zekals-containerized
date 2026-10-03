@echo off
cd /d "%~dp0"
call npm --prefix za-frontend start
exit /b %errorlevel%

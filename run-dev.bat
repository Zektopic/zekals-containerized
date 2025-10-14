@echo off
REM Project F.O.N.E - Development Mode Script for Windows

echo [INFO] Project F.O.N.E - Development Mode
echo =====================================
echo.

REM Check if .env file exists
if not exist .env (
    echo [ERROR] .env file not found! Please run setup-windows.ps1 first.
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo [INFO] Installing Python dependencies...
pip install -r pf-backend/requirements.txt

echo [INFO] Installing Node.js dependencies...
cd pf-frontend
npm install
cd ..

REM Start backend and frontend
echo [INFO] Starting services...
start "Backend" python pf-backend/eye_tracker.py
cd pf-frontend
start "Frontend" node server.js
cd ..

echo [SUCCESS] Development mode started.
echo    - Backend (Eye Tracker) is running.
echo    - Frontend (UI) is running on http://localhost:3000
echo.
echo [WARNING] Press Ctrl+C in the console windows to stop the services.
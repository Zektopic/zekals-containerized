@echo off
REM Installs dependencies for testing

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo [INFO] Installing Python dependencies...
pip install -r pf-backend/requirements.txt

echo [INFO] Installing Node.js dependencies...
cd pf-frontend
npm install
cd ..

echo [INFO] Installing test dependencies...
pip install pytest pytest-asyncio
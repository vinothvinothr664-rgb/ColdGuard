@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo   ColdGuard - local startup (NO DOCKER)
echo ============================================
where node >nul 2>nul || (echo ERROR: Install Node.js LTS first.& pause & exit /b 1)
where npm >nul 2>nul || (echo ERROR: npm was not found.& pause & exit /b 1)
py -3.12 --version >nul 2>nul || (echo ERROR: Python 3.12 was not found by the Windows py launcher. Install Python 3.12; do not use global Python 3.14 for this pinned AI environment.& pause & exit /b 1)
if not exist "backend\.env" (
  copy "backend\.env.example" "backend\.env" >nul
  echo Created backend\.env. Set unique JWT_SECRET and SENSOR_API_KEY values before continuing.
  notepad "backend\.env"
  echo Save the file, then run this script again.
  pause
  exit /b 0
)
if not exist "backend\node_modules\.bin\nodemon.cmd" (
  echo Installing backend dependencies...
  pushd backend
  call npm install
  if errorlevel 1 (popd & echo ERROR: Backend dependency installation failed.& pause & exit /b 1)
  popd
)
if not exist "frontend\node_modules\.bin\vite.cmd" (
  echo Installing frontend dependencies...
  pushd frontend
  call npm install
  if errorlevel 1 (popd & echo ERROR: Frontend dependency installation failed.& pause & exit /b 1)
  popd
)
if not exist "sensor-simulator\node_modules\axios" (
  echo Installing simulator dependencies...
  pushd sensor-simulator
  call npm install
  if errorlevel 1 (popd & echo ERROR: Simulator dependency installation failed.& pause & exit /b 1)
  popd
)
start "ColdGuard Backend" cmd /k "cd /d ""%~dp0backend"" && npm run dev"
start "ColdGuard AI Service" cmd /k "cd /d ""%~dp0ai-service"" && call start-ai.bat"
start "ColdGuard Sensor Simulator" cmd /k "cd /d ""%~dp0sensor-simulator"" && npm start"
start "ColdGuard Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"
echo Services are opening in separate terminal windows.
echo Ensure the local MongoDB Community Server is running before the backend starts.
echo Frontend: http://localhost:5173  Backend: http://localhost:5000/health  AI: http://127.0.0.1:8000/health
pause

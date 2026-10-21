@echo off
setlocal
cd /d "%~dp0"
py -3.12 --version >nul 2>nul || (echo ERROR: Python 3.12 is required. The global Python launcher must provide py -3.12.& pause & exit /b 1)
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" -c "import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 12) else 1)"
  if errorlevel 1 (echo ERROR: Existing .venv does not use Python 3.12. Rename or remove this generated virtual environment after checking it, then run this script again.& pause & exit /b 1)
) else (
  py -3.12 -m venv .venv
  if errorlevel 1 (echo ERROR: Could not create the Python 3.12 virtual environment.& pause & exit /b 1)
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
if errorlevel 1 (echo ERROR: pip preparation failed.& pause & exit /b 1)
python -m pip install -r requirements.txt
if errorlevel 1 (echo ERROR: AI dependency installation failed. See the pip error above.& pause & exit /b 1)
python -m uvicorn main:app --host 127.0.0.1 --port 8000

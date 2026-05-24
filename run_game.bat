@echo off
setlocal

REM Windows launcher: runs the Python server, never executes main.js directly.
where py >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Python launcher (py) was not found. Install Python 3.14.5 and try again.
  pause
  exit /b 1
)

py -3.14 run_game.py
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Failed to start with Python 3.14. Make sure Python 3.14.5 is installed.
  pause
  exit /b 1
)

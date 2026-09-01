@echo off
rem Starts DetailFlow on this computer. Everything stays local.
cd /d "%~dp0"

echo.
echo   DetailFlow
echo   ----------
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   Node.js is not installed.
  echo.
  echo   Install it from https://nodejs.org ^(pick the "LTS" button^),
  echo   then run this file again.
  echo.
  start https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo   First run - installing ^(a minute or two, only happens once^)...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   Install failed. Copy the message above and send it over.
    pause
    exit /b 1
  )
)

echo.
echo   Starting... your browser will open at http://localhost:3000
echo   Keep this window open while you use the app. Press Ctrl+C to stop.
echo.

start "" /b cmd /c "timeout /t 8 >nul & start http://localhost:3000"
call npm run dev
pause

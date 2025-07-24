@echo off
echo ========================================
echo Killing all Node.js processes...
echo ========================================
taskkill /F /IM node.exe 2>nul
echo.
echo Waiting for processes to close...
timeout /t 3 /nobreak >nul
echo.
echo ========================================
echo Starting simple server...
echo ========================================
npm run dev-simple 
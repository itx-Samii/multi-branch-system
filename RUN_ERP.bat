@echo off
TITLE School ERP Launcher
COLOR 0A

echo ============================================================
echo                SCHOOL ERP - STARTING SYSTEM
echo ============================================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo [X] ERROR: System is not installed yet.
    echo [!] Please run "INSTALL_ERP.bat" first.
    echo.
    pause
    exit /b
)

echo [!] Local Server is Starting...
echo [!] Once ready, the app will open in your browser automatically.
echo [!] Login Password: admin123
echo.
echo ------------------------------------------------------------
echo Press Ctrl+C and type 'Y' to stop the system.
echo ------------------------------------------------------------
echo.

:: Open browser after a small delay
start "" http://localhost:3001

:: Start the app
npm start

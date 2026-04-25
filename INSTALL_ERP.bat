@echo off
setlocal enabledelayedexpansion

:: ============================================================
::           SCHOOL ERP - PROFESSIONAL SMART INSTALLER
:: ============================================================
:: This script handles automatic elevation, dependency checks, 
:: and unified installation for both School & Fee modules.
:: ============================================================

TITLE School ERP - Smart Installer v2.0
COLOR 0B

:: 1. CRASH GUARD & ADMIN CHECK
:init
:: Force the script to run from its own folder (Fixes System32 error)
cd /d "%~dp0"
echo [!] Initializing Installer...

:: Check for Administrative privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Requesting Administrative Privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: 2. EXTRACTION CHECK (Prevent running from inside ZIP)
echo %CD% | findstr /i "AppData\Local\Temp" >nul
if %errorlevel% == 0 (
    echo.
    echo [X] ERROR: YOU MUST EXTRACT THE FILES FIRST!
    echo [!] It looks like you are running the installer directly from the ZIP file.
    echo [!] Please Right-Click the ZIP, select "Extract All", and run this again 
    echo     from the extracted folder.
    echo.
    pause
    exit /b
)

:: 3. MAIN INSTALLATION WRAPPER
call :main_install
if %errorlevel% neq 0 (
    echo.
    echo [X] INSTALLATION FAILED!
    echo [!] Please check the errors above.
) else (
    echo.
    echo ============================================================
    echo              INSTALLATION SUCCESSFUL!
    echo ============================================================
    echo.
    echo You can now use "RUN_ERP.bat" to start the system.
)

echo.
echo Press any key to close this window...
pause >nul
exit /b

:main_install
echo ============================================================
echo Starting Installation Process...
echo ============================================================
echo.

:: A. Check for Node.js
echo [1/4] Checking for Node.js engine...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Node.js is NOT installed. Downloading Official Installer...
    curl -L "https://nodejs.org/dist/v20.12.2/node-v20.12.2-x64.msi" -o node_installer.msi
    if %errorlevel% neq 0 (
        echo [X] ERROR: Failed to download Node.js. Check your internet connection.
        return 1
    )
    echo [!] Starting Node.js installation...
    msiexec /i node_installer.msi /passive /norestart
    echo [OK] Node.js Engine Installed. 
    echo [!] NOTE: Re-launching script to refresh system paths...
    del node_installer.msi
    start "" "%~f0"
    exit /b
)
echo [OK] Node.js is ready.

:: B. Install Dependencies
echo.
echo [2/4] Installing Required Libraries...
call npm install
if %errorlevel% neq 0 (
    echo [X] ERROR: Failed to install system dependencies.
    exit /b 1
)
echo [OK] Dependencies Ready.

:: C. Build Production Bundle
echo.
echo [3/5] Building System (Creating .next folder)...
call npm run build
if %errorlevel% neq 0 (
    echo [X] ERROR: Failed to build the application.
    exit /b 1
)
echo [OK] Production Bundle Created.

:: D. Initialize Data & Assets
echo.
echo [4/5] Finalizing System Data...
if not exist "data" mkdir data
echo [OK] Data folders initialized.

:: E. Setup Assets & Shortcut
echo.
echo [5/6] Finalizing Professional Assets...
powershell -ExecutionPolicy Bypass -File "ConvertIcon.ps1"
if %errorlevel% neq 0 (
    echo [!] Warning: Could not prepare professional icon.
)

echo.
echo [6/6] Creating Desktop Shortcut...
powershell -ExecutionPolicy Bypass -File "CreateShortcut.ps1"
if %errorlevel% neq 0 (
    echo [!] Warning: Could not create desktop shortcut automatically.
) else (
    echo [OK] Shortcut created on Desktop.
)

echo.
echo ============================================================
echo              INSTALLATION SUCCESSFUL!
echo ============================================================
echo.
echo [!] You can now close this window and use the "Fee Management"
echo     icon on your Desktop to start the system.
echo.
echo ------------------------------------------------------------
echo Press any key to finish...
pause >nul
exit /b

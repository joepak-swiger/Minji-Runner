@echo off
setlocal
cd /d "%~dp0"

echo ===============================================
echo          MINJI RUNNER - EXPO GO v0.7
echo ===============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Expo SDK 57 requires Node.js 22.13 or newer.
  echo Install a current Node.js 22 LTS release, then run this file again.
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -p "process.versions.node"') do set NODE_VERSION=%%v
for /f "tokens=1 delims=." %%m in ("%NODE_VERSION%") do set NODE_MAJOR=%%m

echo Node.js detected: v%NODE_VERSION%
if %NODE_MAJOR% LSS 22 (
  echo.
  echo Expo SDK 57 needs Node.js 22.13 or newer.
  echo Your current Node.js is too old for this mobile build.
  echo.
  pause
  exit /b 1
)

if not exist node_modules\expo-screen-orientation (
  echo.
  echo Installing/updating Expo dependencies for Gold v0.7...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed. Review the error above.
    pause
    exit /b 1
  )
)

echo.
echo Starting Expo on your local network...
echo If Expo asks you to log in, use the SAME Expo account in the terminal and Expo Go app.
echo Scan the QR code with Expo Go once the development server is ready.
echo Minji Runner will rotate and lock into LANDSCAPE for mobile play.
echo.
call npx expo start --lan

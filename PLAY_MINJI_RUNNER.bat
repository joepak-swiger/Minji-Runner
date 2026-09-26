@echo off
setlocal
cd /d "%~dp0"
title Minji Runner Gold v0.7

echo.
echo ==========================================
echo        MINJI RUNNER: GOLD v0.7
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on this PC.
  echo Install Node.js, then run this file again.
  echo.
  pause
  exit /b 1
)

node server.js

if errorlevel 1 (
  echo.
  echo Minji Runner stopped because of an error.
  pause
)

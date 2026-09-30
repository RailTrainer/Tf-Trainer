@echo off
chcp 65001 >nul
title RailTrainer Quiz Battle Server
cd /d "%~dp0"
echo ========================================================
echo   RAILTRAINER LIVE-BATTLE SERVER (PORT 3000)
echo ========================================================
echo.
echo Starte Web-Dashboard und Smartphone-Schnittstelle...
echo.
node scripts/adminServer.js
pause

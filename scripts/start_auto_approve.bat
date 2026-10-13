@echo off
title Antigravity Auto-Approve Daemon
echo Starte Antigravity Auto-Approve Skript...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0auto_approve_antigravity.ps1"
pause

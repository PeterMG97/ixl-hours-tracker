@echo off
title IXL Team Hours Tracker Server
cd /d "%~dp0"

echo ==========================================================
echo Starting IXL Team Hours Tracker Web App...
echo ==========================================================

start "" "http://localhost:8080/"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause

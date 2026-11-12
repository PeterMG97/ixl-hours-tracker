@echo off
title IXL Team Hours Tracker - Public Cloud Link
cd /d "%~dp0.."

echo ==========================================================
echo Starting Instant Public Link for Cairo and Istanbul teams...
echo ==========================================================
echo.
echo Make sure Start-App.bat is running in the background.
echo.
echo Connecting to global network...
echo Your public link will appear below (https://....trycloudflare.com)
echo.
"%~dp0..\tools\cloudflared.exe" tunnel --protocol http2 --url http://localhost:8080
pause

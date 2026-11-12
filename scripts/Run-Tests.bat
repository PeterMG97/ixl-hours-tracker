@echo off
title IXL Hours Tracker - Automated Test Suite
color 0B
cd /d "%~dp0.."
echo ========================================================
echo  Running Automated Test Suite for IXL Hours Tracker
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\tests\test_suite.ps1"
echo.
pause

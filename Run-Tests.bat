@echo off
title IXL Hours Tracker - Automated Test Suite
color 0B
echo ========================================================
echo  Running Automated Test Suite for IXL Hours Tracker
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tests\test_suite.ps1"
echo.
pause

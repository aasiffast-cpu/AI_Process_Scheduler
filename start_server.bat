@echo off
title AI Process Scheduler - Backend Server
cls
echo ======================================================================
echo   Starting AI Process Scheduler Backend (Multi-Wi-Fi Enabled)
echo   Author: Muhammad Asif
echo ======================================================================
echo.

cd /d "%~dp0\backend"

:: Try uv first if available
where uv >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    uv run python app.py
    goto end
)

:: Try python, then py, then python3
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    python app.py
    goto end
)

where py >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    py app.py
    goto end
)

where python3 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    python3 app.py
    goto end
)

echo [ERROR] Python was not found in PATH!
echo Please install Python 3.10+ from python.org and add it to your PATH.
echo.

:end
pause

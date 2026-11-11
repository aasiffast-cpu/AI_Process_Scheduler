@echo off
title Allow AI Process Scheduler in Windows Firewall
cls
echo ======================================================================
echo   Configuring Windows Firewall for Port 5000 (All Wi-Fi Networks)
echo ======================================================================
echo.
echo Adding inbound firewall rule for Port 5000 on both Private and Public networks...
echo (If prompted, please click 'Yes' to grant Administrator permissions)
echo.

netsh advfirewall firewall delete rule name="AI Process Scheduler (Port 5000)" >nul 2>&1
netsh advfirewall firewall add rule name="AI Process Scheduler (Port 5000)" dir=in action=allow protocol=TCP localport=5000 profile=any >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Windows Firewall successfully configured!
    echo Port 5000 is now open on ALL Wi-Fi networks (Home, Hotspot, Office, etc.).
) else (
    echo [NOTICE] Please right-click this file and select 'Run as administrator'
    echo to allow Windows to update firewall rules automatically.
)

echo.
echo ======================================================================
pause

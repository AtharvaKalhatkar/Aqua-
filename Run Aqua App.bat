@echo off
title Aqua Management System
echo Starting Aqua Management System...
echo Do not close this window while the app is running.

java -jar target\aqua-management-system-1.0.0.jar

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Application exited with an error. Please check if Java is installed.
    pause
)

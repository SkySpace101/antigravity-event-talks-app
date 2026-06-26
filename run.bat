@echo off
title BigQuery Release Notes Explorer
echo ===================================================
echo   BigQuery Release Notes Explorer Starter
echo ===================================================
echo.
echo Starting Flask Server (Python 3.11)...
echo.
echo Launching your browser to http://127.0.0.1:5000 ...
start http://127.0.0.1:5000
echo.
py -3.11 app.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Flask server failed to start.
    echo Please make sure dependencies are installed by running:
    echo pip install -r requirements.txt
    echo.
    pause
)

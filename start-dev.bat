@echo off
REM Start SSC Guide dev mode (server + Vite client)
cd /d "%~dp0"
start "ssc-guide-server" cmd /k "set NODE_ENV=%NODE_ENV% && node server.js"
echo Server starting on http://localhost:3001
echo Press Enter to also start the Vite dev client...
start "ssc-guide-client" cmd /k "npx vite"
echo Client starting on http://localhost:5173
echo.
echo Access the app:
echo   PC:        http://localhost:5173
echo   Mobile:    http://YOUR_IP:5173  (same WiFi, use ipconfig to find IP)
echo.
pause
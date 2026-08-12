@echo off
REM Start SSC Guide server (production)
cd /d "%~dp0"
set NODE_ENV=production
start /b node server.js > server.log 2>&1
echo Server starting on http://localhost:3001
timeout /t 3 >nul
type server.log
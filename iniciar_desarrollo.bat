@echo off
echo ===================================================
echo   INICIANDO ENTORNO DE DESARROLLO (LOCAL)
echo ===================================================
echo.

echo 1. Iniciando Backend (Node.js) en puerto 3000...
cd /d "%~dp0\backend"
start "Backend (Desarrollo)" cmd /k "npx nodemon server.js"

echo 2. Iniciando Frontend (Angular) en puerto 4201...
cd /d "%~dp0\frontend-angular"
start "Frontend (Desarrollo)" cmd /k "npm start"

echo 3. Abriendo el navegador...
timeout /t 5 >nul
start http://localhost:4201

echo.
echo Todo listo. Revisa tu navegador en http://localhost:4201
echo (Para apagar el sistema, simplemente cierra todas las ventanas negras).
echo.
pause

@echo off
echo ===================================================
echo   INICIANDO SISTEMA DE REPORTES FARMAPATRIA
echo ===================================================
echo.

echo 1. Encendiendo el Servidor Backend (Node.js)...
cd /d "%~dp0\backend"
start "Servidor Backend" cmd /k "node server.js"

echo 2. Encendiendo la conexion a Internet (Cloudflare)...
cd /d "%~dp0"
start "Tunel Cloudflare" cmd /k "cloudflared tunnel --url http://localhost:3000"

echo.
echo Todo listo. Busca la ventana del Tunel Cloudflare para ver tu enlace "trycloudflare.com".
echo (Para apagar el sistema, simplemente cierra todas las ventanas negras).
echo.
pause

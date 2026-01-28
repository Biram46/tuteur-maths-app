@echo off
echo ========================================
echo   Tuteur Maths App - Serveur Dev
echo ========================================
echo.
echo Demarrage du serveur Next.js...
echo.

cd /d "%~dp0"
node node_modules\next\dist\bin\next dev

pause

@echo off
echo ========================================
echo   Tuteur Maths App - Serveur Dev
echo ========================================
echo.
echo Demarrage du serveur Next.js...
echo.
echo  FONCTIONNALITES GRAPHIQUES :
echo    - Chat : demande a MimiMaths de tracer des courbes
echo    - Fenetre graphique : s'ouvre automatiquement sur /graph
echo    - Commandes : "trace f(x) = x^2", "resous x^2 = 2x+1",
echo                  "tangente de x^3 en x=2", "ajoute g(x) = 2x"
echo.

cd /d "%~dp0"
node node_modules\next\dist\bin\next dev

pause

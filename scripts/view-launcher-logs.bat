@echo off
REM Script para ver logs detallados del launcher
REM Muestra toda la actividad de AppManagementService

echo.
echo ========================================
echo  Ver Logs Detallados del Launcher
echo ========================================
echo.

REM Definir ruta de ADB
set ADB_PATH=C:\Users\elmae\AppData\Local\Android\Sdk\platform-tools\adb.exe

REM Verificar si ADB existe
if not exist "%ADB_PATH%" (
    echo [ERROR] ADB no encontrado en: %ADB_PATH%
    pause
    exit /b 1
)

echo [INFO] Usando ADB: %ADB_PATH%
echo.

REM Limpiar logs antiguos
echo [1/3] Limpiando logs antiguos...
"%ADB_PATH%" logcat -c
echo Logs limpiados.
echo.

REM Reiniciar launcher para generar logs frescos
echo [2/3] Reiniciando Launcher...
"%ADB_PATH%" shell am force-stop com.prologix.launcher
timeout /t 2 /nobreak >nul
"%ADB_PATH%" shell monkey -p com.prologix.launcher 1
echo Launcher reiniciado.
echo.
timeout /t 3 /nobreak >nul

REM Mostrar logs
echo [3/3] Mostrando logs (Ctrl+C para salir)...
echo.
echo Buscando: AppManagementService, MainActivity, FirebaseFirestore
echo ================================================================
echo.
"%ADB_PATH%" logcat | findstr /C:"AppManagementService" /C:"MainActivity" /C:"FirebaseFirestore"

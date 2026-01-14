@echo off
REM Script para probar acceso público a Firestore desde el dispositivo
REM Intenta leer el documento sin autenticación

echo.
echo ========================================
echo  Test de Acceso Publico a Firestore
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

REM Limpiar logs
echo [1/4] Limpiando logs antiguos...
"%ADB_PATH%" logcat -c
echo.

REM Forzar parada del launcher
echo [2/4] Deteniendo Launcher...
"%ADB_PATH%" shell am force-stop com.prologix.launcher
timeout /t 2 /nobreak >nul
echo.

REM Limpiar caché de la app (esto fuerza a re-leer Firestore)
echo [3/4] Limpiando cache del Launcher (fuerza re-conexion a Firestore)...
"%ADB_PATH%" shell pm clear com.prologix.launcher
timeout /t 2 /nobreak >nul
echo.

REM Reiniciar launcher
echo [4/4] Iniciando Launcher y monitoreando conexion a Firestore...
"%ADB_PATH%" shell monkey -p com.prologix.launcher 1
timeout /t 3 /nobreak >nul
echo.

echo Mostrando logs de Firestore (Ctrl+C para salir)...
echo ================================================================
echo.
"%ADB_PATH%" logcat -s FirebaseFirestore:V AppManagementService:D


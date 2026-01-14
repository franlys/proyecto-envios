@echo off
REM Script para forzar chequeo de actualizaciones en el launcher
REM Auto-detecta ADB en Android SDK local

echo.
echo ========================================
echo  Forzar Chequeo de Actualizaciones
echo ========================================
echo.

REM Definir ruta de ADB
set ADB_PATH=C:\Users\elmae\AppData\Local\Android\Sdk\platform-tools\adb.exe

REM Verificar si ADB existe
if not exist "%ADB_PATH%" (
    echo [ERROR] ADB no encontrado en: %ADB_PATH%
    echo.
    echo Por favor verifica la ruta de Android SDK
    echo.
    pause
    exit /b 1
)

echo [INFO] Usando ADB: %ADB_PATH%
echo.

REM Verificar dispositivos conectados
echo [1/3] Verificando dispositivos conectados...
"%ADB_PATH%" devices
echo.

REM Reiniciar el launcher para forzar chequeo
echo [2/3] Reiniciando Launcher (forzara chequeo de actualizaciones)...
"%ADB_PATH%" shell am force-stop com.prologix.launcher
timeout /t 2 /nobreak >nul
"%ADB_PATH%" shell monkey -p com.prologix.launcher 1
echo.
echo Launcher reiniciado. Verificando actualizaciones...
timeout /t 3 /nobreak >nul
echo.

REM Ver logs en tiempo real
echo [3/3] Mostrando logs del Launcher (Ctrl+C para salir)...
echo.
echo Buscando lineas con: AppManagementService, MainActivity
echo ================================================================
"%ADB_PATH%" logcat -s AppManagementService:D MainActivity:D

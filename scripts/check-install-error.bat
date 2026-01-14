@echo off
REM Script para ver el error exacto de instalación del sistema
REM Muestra logs del PackageInstaller y PackageManager

echo.
echo ========================================
echo  Diagnostico de Error de Instalacion
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

echo [1/3] Limpiando logs...
"%ADB_PATH%" logcat -c
echo.

echo [2/3] Forzando nueva instalacion...
"%ADB_PATH%" shell am force-stop com.prologix.launcher
timeout /t 2 /nobreak >nul
"%ADB_PATH%" shell monkey -p com.prologix.launcher 1
echo.
echo Esperando 15 segundos para que descargue...
timeout /t 15 /nobreak >nul
echo.

echo [3/3] Intenta instalar en el dispositivo y presiona cualquier tecla...
pause
echo.

echo Mostrando logs de instalacion (errores del sistema)...
echo ================================================================
echo.
"%ADB_PATH%" logcat -d | findstr /C:"PackageInstaller" /C:"PackageManager" /C:"installd" /C:"INSTALL_FAILED"
echo.

pause

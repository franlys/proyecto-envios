@echo off
REM Script para verificar si la instalación se completó
REM Muestra la versión actual instalada en el dispositivo

echo.
echo ========================================
echo  Verificar Instalacion
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

echo [INFO] Verificando versiones instaladas...
echo.

REM Obtener versión del launcher
echo [Launcher]
"%ADB_PATH%" shell dumpsys package com.prologix.launcher | findstr "versionCode="
echo.

REM Obtener versión de la app principal
echo [ProLogix Repartidor]
"%ADB_PATH%" shell dumpsys package com.prologix.app | findstr "versionCode="
echo.

echo ========================================
echo.
echo Versiones esperadas:
echo   - Launcher: versionCode=1 (actual)
echo   - ProLogix Repartidor: versionCode=3 (si se instalo)
echo.
echo Si ProLogix Repartidor muestra versionCode=3:
echo   SUCCESS - La actualizacion se instalo correctamente!
echo.
echo Si ProLogix Repartidor muestra versionCode=1:
echo   PENDING - Debes aceptar la instalacion en el dispositivo
echo            o habilitar Device Owner mode para instalacion automatica
echo.

pause

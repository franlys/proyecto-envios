@echo off
REM Script para verificar versión instalada en dispositivo Android
REM Auto-detecta ADB en Android SDK local

echo.
echo ========================================
echo  Verificacion de Version en Dispositivo
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
echo [1/4] Verificando dispositivos conectados...
"%ADB_PATH%" devices
echo.

REM Obtener versión del launcher
echo [2/4] Obteniendo version del Launcher...
"%ADB_PATH%" shell dumpsys package com.prologix.launcher | findstr "versionCode"
echo.

REM Obtener versión de la app principal
echo [3/4] Obteniendo version de ProLogix Repartidor...
"%ADB_PATH%" shell dumpsys package com.prologix.app | findstr "versionCode"
echo.

REM Info adicional
echo [4/4] Informacion adicional:
echo.
echo - Firestore config: launcher_config/apps_config
echo - Firebase Storage: https://console.firebase.google.com/project/embarques-7ad6e/storage
echo - GitHub Releases: https://github.com/franlys/proyecto-envios/releases
echo.

echo ========================================
echo  Verificacion Completada
echo ========================================
echo.
pause

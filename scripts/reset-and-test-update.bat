@echo off
REM Script para reiniciar prueba de actualizacion
REM Desinstala la app actual y deja que el launcher instale la nueva version

echo.
echo ========================================
echo  Reset y Test de Actualizacion
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

echo ATENCION:
echo =========
echo Este script va a:
echo   1. Desinstalar ProLogix Repartidor (si existe)
echo   2. Forzar al launcher a descargar la version mas reciente
echo   3. Intentar instalar automaticamente
echo.
echo Esto eliminara todos los datos de la app ProLogix Repartidor.
echo.

pause

REM Paso 1: Desinstalar app actual
echo.
echo [1/5] Desinstalando ProLogix Repartidor (v1)...
"%ADB_PATH%" uninstall com.prologix.app 2>nul
if %ERRORLEVEL% EQU 0 (
    echo App desinstalada exitosamente.
) else (
    echo App no estaba instalada o ya fue desinstalada.
)
echo.
timeout /t 2 /nobreak >nul

REM Paso 2: Habilitar permisos
echo [2/5] Habilitando permisos de instalacion en el launcher...
"%ADB_PATH%" shell appops set com.prologix.launcher REQUEST_INSTALL_PACKAGES allow
echo Permiso habilitado.
echo.
timeout /t 2 /nobreak >nul

REM Paso 3: Limpiar logs y cache del launcher
echo [3/5] Limpiando cache del launcher...
"%ADB_PATH%" logcat -c
"%ADB_PATH%" shell am force-stop com.prologix.launcher
timeout /t 2 /nobreak >nul
echo.

REM Paso 4: Reiniciar launcher
echo [4/5] Reiniciando launcher...
"%ADB_PATH%" shell monkey -p com.prologix.launcher 1
echo.
echo Esperando 15 segundos para que:
echo   - Se conecte a Firestore
echo   - Descargue el APK v3
echo   - Lance la instalacion
echo.
timeout /t 15 /nobreak >nul

REM Paso 5: Instrucciones
echo [5/5] Verificando instalacion...
echo.
echo ========================================
echo  INSTRUCCIONES:
echo ========================================
echo.
echo 1. Mira la pantalla del dispositivo
echo 2. Deberia aparecer un dialogo de instalacion
echo 3. Toca "INSTALAR"
echo 4. Espera a que termine
echo.
echo Si NO aparece el dialogo:
echo   - Es posible que el launcher no sea Device Owner
echo   - Puedes habilitar Device Owner con: scripts\enable-device-owner.bat
echo.
echo Presiona cualquier tecla cuando hayas instalado...
pause
echo.

REM Verificar si se instalo
echo Verificando si ProLogix Repartidor se instalo...
"%ADB_PATH%" shell dumpsys package com.prologix.app | findstr "versionCode="

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo  SUCCESS: App instalada
    echo ========================================
    echo.
) else (
    echo.
    echo ========================================
    echo  ERROR: App no se instalo
    echo ========================================
    echo.
    echo Posibles causas:
    echo   1. Problema de certificado (APK firmado diferente)
    echo   2. No aparecio el dialogo de instalacion
    echo   3. Instalacion fue cancelada
    echo.
    echo Mostrando logs del launcher:
    echo ----------------------------------------------------------------
    "%ADB_PATH%" logcat -d -s AppManagementService:D | findstr /C:"Error" /C:"❌" /C:"✅"
    echo.
)

pause

@echo off
REM Script completo para probar el sistema de actualizaciones
REM Habilita permisos, fuerza actualización y verifica resultado

echo.
echo ========================================
echo  Test Completo de Actualizacion
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

REM Paso 1: Habilitar permisos de instalación
echo [1/5] Habilitando permisos de instalacion...
"%ADB_PATH%" shell appops set com.prologix.launcher REQUEST_INSTALL_PACKAGES allow
echo Permiso habilitado.
echo.
timeout /t 2 /nobreak >nul

REM Paso 2: Verificar versión actual
echo [2/5] Verificando version actual...
"%ADB_PATH%" shell dumpsys package com.prologix.app | findstr "versionCode="
echo.

REM Paso 3: Limpiar caché y reiniciar launcher
echo [3/5] Limpiando cache del launcher...
"%ADB_PATH%" logcat -c
"%ADB_PATH%" shell am force-stop com.prologix.launcher
timeout /t 2 /nobreak >nul
echo.

REM Paso 4: Iniciar launcher y esperar descarga
echo [4/5] Iniciando launcher y esperando descarga...
"%ADB_PATH%" shell monkey -p com.prologix.launcher 1
echo.
echo Esperando 10 segundos para que descargue y lance instalacion...
timeout /t 10 /nobreak >nul
echo.

REM Paso 5: Mostrar instrucciones y verificar resultado
echo [5/5] Verificando instalacion...
echo.
echo ========================================
echo  INSTRUCCIONES:
echo ========================================
echo.
echo 1. Mira la pantalla del dispositivo
echo 2. Deberia aparecer un dialogo de instalacion
echo 3. Toca "INSTALAR" en el dialogo
echo 4. Espera a que termine la instalacion
echo.
echo Presiona cualquier tecla cuando hayas instalado...
pause
echo.

REM Verificar nueva versión
echo Verificando nueva version instalada...
"%ADB_PATH%" shell dumpsys package com.prologix.app | findstr "versionCode="
echo.

echo ========================================
echo  Test Completado
echo ========================================
echo.
echo Si ves versionCode=3, la actualizacion funciono!
echo Si ves versionCode=1, la instalacion se cancelo.
echo.

REM Mostrar logs de errores si los hay
echo Mostrando ultimos logs del launcher...
echo ----------------------------------------------------------------
"%ADB_PATH%" logcat -d -s AppManagementService:D
echo.

pause

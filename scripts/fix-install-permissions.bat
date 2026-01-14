@echo off
REM Script para verificar y habilitar permisos de instalación
REM Permite que el launcher instale APKs de fuentes desconocidas

echo.
echo ========================================
echo  Verificar Permisos de Instalacion
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

echo [1/3] Verificando permisos actuales del launcher...
"%ADB_PATH%" shell dumpsys package com.prologix.launcher | findstr "REQUEST_INSTALL_PACKAGES"
echo.

echo [2/3] Habilitando permiso para instalar apps desconocidas...
"%ADB_PATH%" shell appops set com.prologix.launcher REQUEST_INSTALL_PACKAGES allow
echo.
echo Permiso habilitado.
echo.

echo [3/3] Verificando que se habilito correctamente...
"%ADB_PATH%" shell appops get com.prologix.launcher REQUEST_INSTALL_PACKAGES
echo.

echo ========================================
echo  Permiso Configurado
echo ========================================
echo.
echo El launcher ahora puede instalar APKs de fuentes desconocidas.
echo.
echo NOTA: Si aun no funciona, es posible que necesites habilitar
echo       manualmente en el dispositivo:
echo.
echo   Configuracion ^> Seguridad ^> Instalar apps desconocidas
echo   ^> Prologix Launcher ^> Permitir de esta fuente
echo.

pause

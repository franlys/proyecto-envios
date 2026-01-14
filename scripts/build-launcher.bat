@echo off
REM Script para compilar el launcher APK
REM Usa Gradle directamente desde Android Studio o instalación local

echo.
echo ========================================
echo  Compilar Launcher APK
echo ========================================
echo.

REM Cambiar al directorio del proyecto
cd /d "%~dp0\..\android_launcher"

echo [1/2] Limpiando build anterior...
call gradle clean

echo.
echo [2/2] Compilando APK debug...
call gradle assembleDebug

echo.
echo ========================================
echo  Build Completado
echo ========================================
echo.

REM Mostrar ubicación del APK
echo APK generado en:
echo android_launcher\app\build\outputs\apk\debug\app-debug.apk
echo.

pause

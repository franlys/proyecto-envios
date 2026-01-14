@echo off
REM Script para habilitar el Launcher como Device Owner
REM Esto permite instalación silenciosa de apps sin intervención del usuario

echo.
echo ========================================
echo  Habilitar Device Owner Mode
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

echo IMPORTANTE:
echo ===========
echo Para habilitar Device Owner, el dispositivo debe:
echo.
echo   1. NO tener cuentas de Google configuradas
echo   2. NO tener otros Device Owners activos
echo   3. Estar en modo desarrollador con USB debugging habilitado
echo.
echo Si tienes cuentas de Google, debes eliminarlas temporalmente:
echo   Configuracion ^> Cuentas ^> Google ^> Eliminar cuenta
echo   (Puedes volver a agregarla despues)
echo.

pause

echo.
echo [1/3] Verificando estado actual...
"%ADB_PATH%" shell dumpsys device_policy | findstr "Device Owner"
echo.

echo [2/3] Intentando habilitar Device Owner...
"%ADB_PATH%" shell dpm set-device-owner com.prologix.launcher/.MyDeviceAdminReceiver
echo.

if %ERRORLEVEL% EQU 0 (
    echo [3/3] Verificando que se habilito correctamente...
    "%ADB_PATH%" shell dumpsys device_policy | findstr "Device Owner"
    echo.
    echo ========================================
    echo  SUCCESS: Device Owner Habilitado
    echo ========================================
    echo.
    echo El launcher ahora puede:
    echo   - Instalar apps silenciosamente (sin preguntar al usuario^)
    echo   - Actualizar apps automaticamente
    echo   - Bloquear la pantalla en modo kiosk
    echo.
    echo IMPORTANTE: Si algun dia necesitas deshabilitarlo:
    echo   Configuracion ^> Seguridad ^> Administradores de dispositivo
    echo.
) else (
    echo.
    echo ========================================
    echo  ERROR: No se pudo habilitar Device Owner
    echo ========================================
    echo.
    echo Posibles causas:
    echo   1. Hay cuentas de Google configuradas (eliminalas temporalmente^)
    echo   2. Ya existe otro Device Owner activo
    echo   3. El dispositivo tiene restricciones del fabricante
    echo.
    echo Solucion para cuenta de Google:
    echo   1. Ve a: Configuracion ^> Cuentas ^> Google
    echo   2. Selecciona tu cuenta
    echo   3. Toca "Eliminar cuenta"
    echo   4. Ejecuta este script nuevamente
    echo   5. Luego puedes volver a agregar tu cuenta
    echo.
)

pause

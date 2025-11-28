# 📧 Configuración de Correo en Railway (Producción)

Para que el sistema pueda enviar correos en producción (cuando una compañía no tiene su propio correo configurado), es **OBLIGATORIO** configurar las variables de entorno en Railway.

## 1. Variables Requeridas

Debes agregar las siguientes variables en la sección **Variables** de tu servicio `backend` en Railway:

| Variable | Valor | Descripción |
| :--- | :--- | :--- |
| `EMAIL_SERVICE` | `gmail` | El proveedor de correo. |
| `EMAIL_USER` | `prologixcompany@gmail.com` | **COPIAR ESTO** |
| `EMAIL_PASS` | `ojct wawx wwig mbzv` | **COPIAR ESTO** (Contraseña de Aplicación) |
| `EMAIL_FROM` | `prologixcompany@gmail.com` | Remitente por defecto. |

> [!IMPORTANT]
> **NO uses tu contraseña normal de Gmail.** Debes generar una "Contraseña de Aplicación" en tu cuenta de Google (Seguridad > Verificación en 2 pasos > Contraseñas de aplicaciones).

## 2. Pasos para Configurar en Railway

1.  Entra a tu proyecto en [Railway.app](https://railway.app/).
2.  Selecciona el servicio del **Backend**.
3.  Ve a la pestaña **Variables**.
4.  Haz clic en **New Variable**.
5.  Agrega una por una las variables de la tabla anterior.
6.  Railway reiniciará automáticamente el servicio (Redeploy) para aplicar los cambios.

## 3. ¿Cómo funciona?

*   **Prioridad 1 (Compañía):** Si la compañía tiene configurado su correo en la base de datos, el sistema usará ese.
*   **Prioridad 2 (Sistema/Railway):** Si la compañía **NO** tiene configuración, el sistema buscará estas variables (`EMAIL_USER`, etc.) en Railway y enviará el correo desde ahí.

Si no configuras esto en Railway, los correos fallarán para cualquier compañía que no tenga su propia configuración manual.

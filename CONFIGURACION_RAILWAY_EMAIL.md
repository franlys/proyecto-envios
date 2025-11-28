# 🚂 Configurar Variables de Entorno en Railway

## 📧 Variables de Email Faltantes

Tu backend en Railway no tiene configuradas las credenciales de email, por eso los correos no se envían cuando usas la app desde el móvil.

---

## 🔑 Paso 1: Generar Contraseña de Aplicación de Gmail

Si aún no tienes una contraseña de aplicación de Gmail:

1. Ve a: https://myaccount.google.com/apppasswords
2. Inicia sesión con tu cuenta de Gmail
3. Si te pide activar **verificación en 2 pasos**, hazlo primero
4. Selecciona:
   - **App:** Correo
   - **Dispositivo:** Otro → "ProLogix Railway"
5. Click en **Generar**
6. **COPIA** la contraseña de 16 caracteres (formato: `xxxx xxxx xxxx xxxx`)

---

## 🚂 Paso 2: Configurar Variables en Railway

### Opción A: Desde el Dashboard de Railway (Recomendado)

1. **Ir al proyecto:**
   - Abre https://railway.app/
   - Selecciona tu proyecto del backend

2. **Acceder a Variables:**
   - Click en tu servicio (backend)
   - Ve a la pestaña **"Variables"** o **"Settings"**

3. **Agregar las siguientes variables:**

   Click en **"New Variable"** y agrega una por una:

   | Variable | Valor |
   |----------|-------|
   | `EMAIL_SERVICE` | `gmail` |
   | `EMAIL_USER` | `tu-email-real@gmail.com` |
   | `EMAIL_PASS` | `xxxx xxxx xxxx xxxx` (sin espacios) |
   | `EMAIL_FROM` | `ProLogix Envíos <tu-email-real@gmail.com>` |

   **Ejemplo con valores reales:**
   ```
   EMAIL_SERVICE=gmail
   EMAIL_USER=prologix.envios@gmail.com
   EMAIL_PASS=abcdefghijklmnop
   EMAIL_FROM=ProLogix Envíos <prologix.envios@gmail.com>
   ```

4. **Guardar:**
   - Click en **"Add"** o **"Save"** después de cada variable
   - Railway reiniciará automáticamente el servicio

### Opción B: Desde Railway CLI (Avanzado)

```bash
# Instalar Railway CLI (si no lo tienes)
npm install -g @railway/cli

# Login
railway login

# Vincular proyecto
railway link

# Agregar variables
railway variables set EMAIL_SERVICE=gmail
railway variables set EMAIL_USER=tu-email@gmail.com
railway variables set EMAIL_PASS=tu-contraseña-de-16-caracteres
railway variables set EMAIL_FROM="ProLogix Envíos <tu-email@gmail.com>"
```

---

## ✅ Paso 3: Verificar que Funciona

1. **Espera a que Railway reinicie** (toma ~30 segundos)

2. **Verifica los logs en Railway:**
   - Ve a la pestaña **"Deployments"** o **"Logs"**
   - Busca el mensaje: `⚠️ Advertencia: No hay credenciales de email configuradas`
   - Si NO aparece, las credenciales están bien configuradas ✅

3. **Prueba desde el móvil:**
   - Crea una nueva recolección
   - Verifica que llegue el email al remitente

4. **Revisa los logs del backend:**
   Deberías ver:
   ```
   📦 Creando nueva recolección...
   ✅ Recolección creada: RC-20250128-0001
   📧 Correo de confirmación enviado a remitente@ejemplo.com
   📧 Correo enviado a remitente@ejemplo.com: <message-id>
   ```

---

## 🔍 Variables de Entorno Actuales en Railway

Para ver las variables que tienes configuradas:

1. Dashboard → Tu Proyecto → Variables
2. O por CLI: `railway variables`

**Variables que DEBES tener:**
- ✅ `EMAIL_SERVICE=gmail`
- ✅ `EMAIL_USER=tu-email@gmail.com`
- ✅ `EMAIL_PASS=contraseña-de-aplicacion`
- ✅ `EMAIL_FROM=ProLogix Envíos <tu-email@gmail.com>`
- ✅ `FRONTEND_URL=https://proyecto-envios-sandy.vercel.app`
- ✅ `FIREBASE_PROJECT_ID`
- ✅ `FIREBASE_PRIVATE_KEY`
- ✅ `FIREBASE_CLIENT_EMAIL`
- ✅ `FIREBASE_STORAGE_BUCKET`
- ✅ `JWT_SECRET`

---

## 🆘 Solución de Problemas

### Error: "Invalid login" en los logs
- La contraseña de aplicación está incorrecta
- Asegúrate de copiar los 16 caracteres SIN espacios
- Verifica que la verificación en 2 pasos esté activa

### Los emails no llegan
1. Verifica los logs de Railway para ver si hay errores
2. Revisa la carpeta de SPAM del destinatario
3. Asegúrate de que el email del remitente sea válido
4. Verifica que `FRONTEND_URL` esté configurado correctamente

### Railway no muestra las variables
- Asegúrate de estar viendo el servicio correcto
- Algunas variables pueden estar ocultas por seguridad (es normal)

### ⚠️ Warning en los logs
Si ves:
```
⚠️ Advertencia: No hay credenciales de email configuradas
```
**Significa que las variables NO están configuradas correctamente.**

---

## 📝 Notas Importantes

- ✅ Las variables se aplican automáticamente después de guardar
- ✅ Railway reinicia el servicio automáticamente
- ✅ No necesitas hacer redeploy manual
- ✅ Las variables son privadas y no se muestran en logs públicos
- ⚠️ NUNCA compartas tu contraseña de aplicación

---

## 🎯 Checklist Final

- [ ] Contraseña de aplicación de Gmail generada
- [ ] Variables agregadas en Railway Dashboard
- [ ] Railway reinició el servicio
- [ ] Warning de credenciales ya no aparece en logs
- [ ] Recolección de prueba creada desde móvil
- [ ] Email recibido en bandeja de entrada
- [ ] Botón de tracking funciona en el email

---

**Última actualización:** 2025-01-28
**Servicio:** Railway
**Proyecto:** ProLogix Backend

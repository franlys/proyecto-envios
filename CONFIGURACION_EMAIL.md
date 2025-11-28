# 📧 Configuración de Email para Notificaciones

## ❌ Problema Actual

Los emails no se están enviando porque las credenciales de Gmail están con valores de **placeholder** en el archivo `.env`:

```env
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-contraseña-de-aplicacion-aqui
```

## ✅ Solución: Configurar Gmail con Contraseña de Aplicación

### Paso 1: Crear una Contraseña de Aplicación en Gmail

1. **Ir a tu cuenta de Google:**
   - Visita: https://myaccount.google.com/

2. **Activar verificación en 2 pasos (si no está activada):**
   - Ve a **Seguridad**
   - Busca **Verificación en dos pasos**
   - Actívala si no está habilitada

3. **Generar Contraseña de Aplicación:**
   - Ve a **Seguridad** → **Contraseñas de aplicaciones**
   - O visita directamente: https://myaccount.google.com/apppasswords
   - Selecciona **Aplicación:** "Correo"
   - Selecciona **Dispositivo:** "Otro (nombre personalizado)" → Escribe "ProLogix Backend"
   - Click en **Generar**
   - **Copia la contraseña de 16 caracteres** que aparece

### Paso 2: Actualizar el archivo `.env`

Edita el archivo `backend/.env` y actualiza estas líneas:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=tu-correo-real@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM=ProLogix Envíos <tu-correo-real@gmail.com>
```

**Ejemplo real:**
```env
EMAIL_SERVICE=gmail
EMAIL_USER=prologix.envios@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
EMAIL_FROM=ProLogix Envíos <prologix.envios@gmail.com>
```

### Paso 3: Reiniciar el Backend

Después de actualizar el `.env`, reinicia el servidor backend:

```bash
cd backend
# Detener el servidor actual (Ctrl+C si está corriendo)
npm run dev
```

### Paso 4: Probar el Envío de Emails

Crea una nueva recolección desde el móvil y verifica:

1. **En los logs del backend** debes ver:
   ```
   📧 Correo enviado a remitente@ejemplo.com: <message-id>
   ```

2. **En el email del remitente** debe llegar:
   - Asunto: "Recolección Confirmada - RC-XXXXXXXX-XXXX"
   - Contenido con detalles de la recolección
   - Botón de tracking

## 🔒 Seguridad

**IMPORTANTE:**
- ✅ El archivo `.env` ya está en `.gitignore`, por lo que tus credenciales NO se subirán a GitHub
- ✅ Usa una cuenta de Gmail específica para el proyecto (no tu cuenta personal)
- ✅ Nunca compartas la contraseña de aplicación

## 🧪 Verificar que Funciona

### Logs esperados en el backend:

```
📦 Creando nueva recolección...
✅ Items validados: 2 items
💾 Guardando recolección en Firestore...
✅ Recolección creada: RC-20250128-0001 (ID: xxxxx)
📧 Correo de confirmación enviado a remitente@ejemplo.com
📧 Correo enviado a remitente@ejemplo.com: <message-id>
```

### Si ves este warning:
```
⚠️ Advertencia: No hay credenciales de email configuradas
```
**Significa que las credenciales en `.env` no están bien configuradas.**

## 🌐 Configuración en Producción (Render/Railway)

Si estás usando Render, Railway u otro servicio de hosting:

1. Ve a la configuración de **Environment Variables**
2. Agrega estas variables:
   ```
   EMAIL_SERVICE=gmail
   EMAIL_USER=tu-correo@gmail.com
   EMAIL_PASS=tu-contraseña-de-aplicacion
   EMAIL_FROM=ProLogix Envíos <tu-correo@gmail.com>
   ```

## 📋 Checklist

- [ ] Verificación en 2 pasos de Gmail activada
- [ ] Contraseña de aplicación generada
- [ ] Archivo `.env` actualizado con credenciales reales
- [ ] Backend reiniciado
- [ ] Prueba de creación de recolección realizada
- [ ] Email recibido en bandeja de entrada
- [ ] Variables de entorno configuradas en producción (si aplica)

## 🆘 Solución de Problemas

### Email no llega:
1. Verifica los logs del backend para ver si hay errores
2. Revisa la carpeta de SPAM
3. Verifica que la contraseña de aplicación esté correcta (16 caracteres sin espacios en el código)
4. Asegúrate de que el email del remitente sea válido

### Error "Invalid login":
- La contraseña de aplicación está incorrecta
- Verifica que la verificación en 2 pasos esté activa

### Error "Less secure apps":
- No uses la contraseña normal de Gmail
- **DEBES usar una contraseña de aplicación**

---

**Última actualización:** 2025-01-28

# 🚂 Configuración Rápida de Variables en Railway

## 📋 Variables que Necesitas Configurar

Copia y pega estos comandos en la terminal de Railway o en el Dashboard:

---

## ✅ Método 1: Desde el Dashboard de Railway (Más Fácil)

1. Ve a: https://railway.app/
2. Selecciona tu proyecto del backend
3. Click en **"Variables"** en el menú lateral
4. Click en **"New Variable"** para cada una de estas:

### Variables de Email:

```
EMAIL_SERVICE
gmail

EMAIL_USER
TU_EMAIL_AQUI@gmail.com

EMAIL_PASS
TU_CONTRASEÑA_DE_16_CARACTERES_AQUI

EMAIL_FROM
ProLogix Envíos <TU_EMAIL_AQUI@gmail.com>
```

**⚠️ IMPORTANTE:** Reemplaza `TU_EMAIL_AQUI` y `TU_CONTRASEÑA_DE_16_CARACTERES_AQUI` con tus valores reales.

---

## 🔧 Método 2: Desde Railway CLI

Si prefieres usar la terminal:

```bash
# Asegúrate de estar en el directorio del proyecto
cd proyecto-envios/backend

# Login a Railway (solo la primera vez)
railway login

# Link al proyecto (solo la primera vez)
railway link

# Agregar las variables (REEMPLAZA LOS VALORES)
railway variables set EMAIL_SERVICE=gmail
railway variables set EMAIL_USER=tu-email@gmail.com
railway variables set EMAIL_PASS=tu-contraseña-de-16-caracteres
railway variables set EMAIL_FROM="ProLogix Envíos <tu-email@gmail.com>"
```

---

## 🎯 Valores Reales a Usar

Para completar la configuración, necesitas:

### 1. Email de Gmail
- Usa una cuenta de Gmail existente o crea una nueva
- Ejemplo: `prologix.envios@gmail.com`
- O tu email personal: `tuempresa@gmail.com`

### 2. Contraseña de Aplicación de Gmail

**Generar contraseña:**
1. Ve a: https://myaccount.google.com/apppasswords
2. Selecciona App: **Correo**
3. Selecciona Dispositivo: **Otro (Railway)**
4. Click **Generar**
5. Copia los 16 caracteres que aparecen
   - Ejemplo: `abcd efgh ijkl mnop`
   - En Railway usa SIN espacios: `abcdefghijklmnop`

---

## 📝 Template de Configuración Completa

### Para Dashboard de Railway:

Copia esto y llena los espacios en blanco:

```
Variable: EMAIL_SERVICE
Value: gmail
---
Variable: EMAIL_USER
Value: [TU_EMAIL]@gmail.com
---
Variable: EMAIL_PASS
Value: [CONTRASEÑA_16_CARACTERES]
---
Variable: EMAIL_FROM
Value: ProLogix Envíos <[TU_EMAIL]@gmail.com>
```

### Para Railway CLI:

Copia este bloque completo y reemplaza los valores entre `[  ]`:

```bash
railway variables set EMAIL_SERVICE=gmail
railway variables set EMAIL_USER=[TU_EMAIL]@gmail.com
railway variables set EMAIL_PASS=[CONTRASEÑA_16_CARACTERES]
railway variables set EMAIL_FROM="ProLogix Envíos <[TU_EMAIL]@gmail.com>"
```

---

## ✅ Verificación

Después de agregar las variables:

1. **Railway reiniciará automáticamente** (espera ~30 segundos)

2. **Verifica en los logs:**
   - Ve a la pestaña "Deployments" → Click en el último deploy → "View Logs"
   - **NO deberías ver:** `⚠️ Advertencia: No hay credenciales de email configuradas`
   - **Deberías ver:** El backend iniciando normalmente

3. **Prueba desde el móvil:**
   - Crea una nueva recolección
   - Revisa el email del remitente
   - Debe llegar un correo con el código de tracking

4. **Verifica que el email llegó:**
   - Subject: "Recolección Confirmada - RC-XXXXXXXX-XXXX"
   - Debe tener un botón de tracking funcional

---

## 🔒 Seguridad

- ✅ Las variables de entorno en Railway son **privadas y encriptadas**
- ✅ No se muestran en los logs públicos
- ✅ Solo tú y los colaboradores del proyecto pueden verlas
- ⚠️ **NUNCA** compartas tu contraseña de aplicación públicamente
- ⚠️ **NUNCA** hagas commit del archivo `.env` a git

---

## 🆘 Troubleshooting

### Los emails no llegan después de configurar:
1. Verifica que Railway haya reiniciado
2. Revisa los logs en busca de errores
3. Verifica la carpeta SPAM del destinatario
4. Asegúrate que la contraseña no tenga espacios

### Error "Invalid login":
- La contraseña de aplicación está incorrecta
- Verifica que copiaste los 16 caracteres correctamente
- SIN espacios en la contraseña

### No veo las variables en Railway:
- Asegúrate de estar viendo el servicio correcto (backend)
- Algunas variables pueden estar ocultas por seguridad (es normal)
- Usa `railway variables` en CLI para verlas todas

---

## 📞 Necesitas Ayuda?

Si tienes problemas, comparte:
- Los logs de Railway (Deploy logs)
- El mensaje de error específico
- Confirmación de que generaste la contraseña de aplicación

---

**Última actualización:** 2025-01-28

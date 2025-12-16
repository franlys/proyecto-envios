# 📱 MDM Backend - Android Enterprise Management

Sistema de gestión de dispositivos móviles (MDM) usando Android Management API de Google.

---

## 📋 Requisitos Previos

1. **Cuenta de Gmail o Google Workspace**
   - Que NO esté asociada a otra gestión de dispositivos Android
   - Será el "dueño" de la organización MDM

2. **Google Cloud Project configurado**
   - Android Management API habilitada
   - Service Account con credenciales JSON

3. **Node.js instalado** (v16 o superior)

---

## 🚀 Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Colocar el archivo de credenciales
# Copiar service-account.json en la raíz de mdm_backend/
```

---

## 📝 Flujo de Registro Completo

### PASO 1: Iniciar el servidor

```bash
npm start
```

El servidor estará disponible en `http://localhost:5080`

### PASO 2: Generar URL de registro

En otra terminal, ejecuta:

```bash
node generar-url-registro.js
```

**Salida esperada:**
```
┌────────────────────────────────────────────────────────────────┐
│  ✅ URL DE REGISTRO GENERADA EXITOSAMENTE                      │
└────────────────────────────────────────────────────────────────┘

🔗 PASO 1: Abre esta URL en tu navegador:

   https://play.google.com/work/signup?token=...

📋 INSTRUCCIONES:

   1. Haz clic en el enlace de arriba
   2. Inicia sesión con tu cuenta de Gmail/Workspace
   3. Completa el registro (nombre de empresa, aceptar términos)
   4. Al finalizar, serás redirigido a localhost:5080
   5. El token se procesará automáticamente
```

### PASO 3: Completar el registro en el navegador

1. Abre la URL generada en tu navegador
2. **Inicia sesión** con tu cuenta de Google
3. **Completa el formulario** de registro de empresa:
   - Nombre de la empresa
   - Aceptar términos y condiciones
4. Haz clic en **"Empezar"** o **"Register"**

### PASO 4: Confirmación automática

Serás redirigido a `http://localhost:5080/callback-registro` y verás:

```
✅ Registro Completado

Tu empresa ha sido registrada exitosamente en Android Enterprise.

📋 Información de la Empresa:
ID: enterprises/LC...
Nombre: Mi Empresa
Proyecto: proyecto-envios-441623

📌 Siguiente Paso:
Ahora puedes crear políticas y generar códigos QR para inscribir dispositivos.

La información se guardó en empresa-registrada.json
```

---

## 📄 Archivo Generado: empresa-registrada.json

Después del registro exitoso, se creará un archivo con la información de tu empresa:

```json
{
  "name": "enterprises/LC...",
  "displayName": "Mi Empresa",
  "createdAt": "2025-12-16T...",
  "projectId": "proyecto-envios-441623"
}
```

**⚠️ IMPORTANTE:** Guarda este archivo, contiene el ID de tu empresa necesario para los siguientes pasos.

---

## 🔧 Endpoints Disponibles

### 1. Test de Conexión
```bash
curl http://localhost:5080/test
```

### 2. Crear Empresa Manualmente (si ya tienes el token)
```bash
curl -X POST http://localhost:5080/crear-empresa \
  -H "Content-Type: application/json" \
  -d '{
    "enterpriseToken": "tu-token-aqui"
  }'
```

### 3. Generar Token de Inscripción (QR)
```bash
curl -X POST http://localhost:5080/generar-qr \
  -H "Content-Type: application/json" \
  -d '{
    "enterpriseName": "enterprises/LC...",
    "policyName": "default"
  }'
```

### 4. Mostrar QR en el navegador
```
http://localhost:5080/show-qr?text=TEXTO_DEL_QR
```

---

## ❓ Troubleshooting

### Error: "No se recibió enterpriseToken"

**Causa:** Cancelaste el registro o hubo un problema de conexión.

**Solución:** Ejecuta nuevamente `node generar-url-registro.js` y completa el proceso.

---

### Error: "API de Android Management no habilitada"

**Causa:** La API no está habilitada en tu proyecto de Google Cloud.

**Solución:**
1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Selecciona tu proyecto
3. Busca "Android Management API"
4. Haz clic en "Habilitar"

---

### Error: "Credenciales inválidas"

**Causa:** El archivo `service-account.json` no existe o está corrupto.

**Solución:**
1. Ve a Google Cloud Console → IAM & Admin → Service Accounts
2. Selecciona tu cuenta de servicio
3. Keys → Add Key → Create New Key → JSON
4. Descarga el archivo y renómbralo a `service-account.json`
5. Colócalo en la raíz de `mdm_backend/`

---

### Error: "La cuenta ya está asociada a otro MDM"

**Causa:** La cuenta de Google que usaste ya está registrada en otro sistema MDM.

**Solución:** Usa una cuenta de Gmail diferente que no esté asociada a ningún MDM.

---

## 🎯 Próximos Pasos

Después de registrar tu empresa exitosamente:

1. **Crear una Política de Dispositivos**
   - Define qué aplicaciones instalar
   - Configura restricciones de seguridad
   - Establece configuraciones de red

2. **Generar Token de Inscripción**
   - Usa el endpoint `/generar-qr`
   - Codifica el token en un QR
   - Los dispositivos escanearan el QR para inscribirse

3. **Inscribir Dispositivos**
   - Factory reset al dispositivo Android
   - Durante la configuración inicial, escanear el QR
   - El dispositivo se unirá automáticamente al MDM

---

## 📚 Documentación Oficial

- [Android Management API](https://developers.google.com/android/management)
- [Enrollment Process](https://developers.google.com/android/management/provision-device)
- [Policy Configuration](https://developers.google.com/android/management/create-policy)

---

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs del servidor (`npm start`)
2. Verifica que la API esté habilitada en Google Cloud
3. Confirma que el archivo `service-account.json` sea válido
4. Asegúrate de usar una cuenta Gmail sin MDM previo

---

## 📝 Notas Importantes

- ⏰ El token de registro expira en **30 días** si no se usa
- 🔐 Mantén el archivo `service-account.json` seguro y privado
- 📱 Solo funciona con dispositivos Android 5.0+ (API level 21+)
- 🏢 Una cuenta de Google = Una empresa registrada
- 🔄 No es posible "des-registrar" una empresa, solo archivarla

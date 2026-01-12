# 🎯 Guía del Sistema de Features - Versión REAL

## 📋 Resumen Ejecutivo

Este documento explica **QUÉ FEATURES TIENES REALMENTE IMPLEMENTADAS** vs qué es roadmap (futuro).

El sistema te permite como Super Admin **activar/desactivar features por compañía**, independiente de su plan. Esto te sirve para:

✅ Dar extras a tu primer cliente
✅ Hacer acuerdos especiales
✅ Probar features antes de cobrarlas
✅ Crear paquetes personalizados

---

## ✅ FEATURES REALMENTE IMPLEMENTADAS

### 1. 📊 **Gestión y Reportes**
| Feature | Estado | Archivos |
|---------|--------|----------|
| **importarCSV** | ✅ Funcional | Importación CSV en varios módulos |
| **importarExcel** | ✅ Funcional | Importación Excel (plan automatizado+) |
| **exportarReportes** | ✅ Funcional | Exportación de datos |
| **dashboardBasico** | ✅ Funcional | Dashboard con gráficas |
| **trackingPublico** | ✅ Funcional | `PublicTracking.jsx` - sin login |

### 2. 🔔 **Notificaciones**
| Feature | Estado | Archivos |
|---------|--------|----------|
| **notificacionesWeb** | ✅ Funcional | Notificaciones en dashboard |
| **emailBasico** | ✅ Funcional | `notificationService.js` con Resend |
| **emailAutomatizado** | ✅ Funcional | node-cron + eventos automáticos |
| **whatsappBusiness** | ✅ Funcional | `whatsappService.js` Evolution API |
| **smsCliente** | ❌ No implementado | Roadmap |

**Detalles WhatsApp:**
- Usa **Evolution API** (no WhatsApp oficial)
- Envío de mensajes automáticos por eventos
- Notificaciones a repartidores, secretarias, almacén
- Comandos por rol
- Reporte diario 8 PM
- **NO tiene chatbot con IA** (Gemini/n8n mencionado no está integrado)

### 3. 🖨️ **Hardware y Escaneo**
| Feature | Estado | Archivos |
|---------|--------|----------|
| **escanerCodigoBarras** | ✅ Funcional | `hardwareController.js` gestión |
| **escaneoConCamara** | ✅ Funcional | `BarcodeScanner.jsx` html5-qrcode |
| **impresionEtiquetas** | ✅ Funcional | `LabelPrinter.jsx` plantillas 4x2", 4x6" |
| **impresorasBluetooth** | ✅ Funcional | `bluetoothPrinter.js` Phomemo/Zebra |

**Hardware soportado:**
- **Escáneres:** Cámara web + pistolas Bluetooth/USB
- **Impresoras:** Phomemo M110/M02S/M220, Zebra, ESC-POS genérico
- **Formatos:** CODE128, QR, EAN, UPC

### 4. 📱 **App Móvil**
| Feature | Estado | Archivos |
|---------|--------|----------|
| **appMovilBasica** | ✅ Funcional | Capacitor WebView básico |
| **fotoComprobante** | 🚧 Parcial | Capacitor permite cámara |
| **escaneoConCamara** | ✅ Funcional | html5-qrcode funciona en móvil |
| **modoOffline** | ❌ No implementado | Requiere IndexedDB avanzado |
| **firmaDigital** | ❌ No implementado | Roadmap |

**Nota:** La app móvil es un **WebView Capacitor** que carga tu aplicación web. NO es una app nativa completa.

### 5. 🗺️ **GPS y Tracking**
| Feature | Estado | Archivos |
|---------|--------|----------|
| **trackingBasico** | ✅ Funcional | Timeline de estados, tracking público |
| **gpsEnTiempoReal** | ❌ No implementado | `gpsUtils.js` tiene stubs vacíos |
| **historialRutas** | ❌ No implementado | Roadmap |
| **geofencing** | ❌ No implementado | Roadmap |

**Qué SÍ funciona:**
- ✅ Tracking público por código (sin login)
- ✅ Estados del paquete (pendiente, en ruta, entregado)
- ✅ Cálculo de distancia (Haversine en `gpsUtils.js`)

**Qué NO funciona:**
- ❌ GPS en tiempo real del repartidor
- ❌ Mapa con ubicación actual
- ❌ Historial de rutas tomadas

### 6. 🔌 **API y Webhooks**
| Feature | Estado | Archivos |
|---------|--------|----------|
| **apiPublica** | ✅ Funcional | 169+ endpoints REST |
| **webhooks** | ✅ Funcional | Evolution webhook para WhatsApp |
| **integraciones** | ✅ Posible | Arquitectura permite custom |

**API Endpoints:**
- Recolecciones, rutas, facturas, pagos
- Hardware, usuarios, compañías
- Tracking público
- Webhooks de WhatsApp

### 7. 🔒 **Seguridad**
| Feature | Estado | Archivos |
|---------|--------|----------|
| **logsAuditoria** | 🚧 Básico | Logs en controllers |
| **autenticacion2FA** | ❌ No implementado | Roadmap |

---

## 📦 COMPARACIÓN DE PLANES

### Plan Operativo (50k/mes)
```
👥 Límites:
- 1 admin, 5 repartidores, 2 secretarias
- 2 embarques activos, 5 rutas simultáneas
- 30 días de historial

✅ Incluye:
- Dashboard básico
- Importar CSV
- Exportar reportes
- Tracking público
- App móvil básica (WebView)
- Notificaciones web
- Email básico

❌ NO incluye:
- WhatsApp
- Hardware (escáneres/impresoras)
- Excel
- Email automatizado
```

### Plan Automatizado (150k/mes)
```
👥 Límites:
- 3 admins, 20 repartidores, 5 secretarias
- 10 embarques activos, 20 rutas simultáneas
- 365 días de historial

✅ TODO del Operativo +
- WhatsApp Business (Evolution API)
- Email automatizado
- Excel (importar/exportar)
- Dashboard avanzado con gráficas
- Hardware completo:
  * Escáneres de códigos (cámara + pistolas)
  * Impresoras Bluetooth
  * Impresión de etiquetas
- Foto comprobante
- API pública
- Webhooks
- Logs de auditoría

❌ Todavía NO incluye:
- GPS en tiempo real
- Modo offline avanzado
- Firma digital
```

### Plan Smart (500k/mes)
```
👥 Límites:
- ILIMITADO todo

✅ TODO del Automatizado +
- Soporte dedicado
- Multi-compañía
- Integraciones custom
- Backup diario automático

❌ Roadmap (aún no implementado):
- GPS en tiempo real
- Geofencing
- IA para rutas
- Chatbot con IA
- 2FA
- Modo offline avanzado
```

---

## 🎛️ CÓMO USAR EL SISTEMA

### Para tu Primer Cliente (caso de uso real)

**Escenario:**
Cliente en plan Operativo (50k/mes) → Quieres darle WhatsApp + Escaneo como trato especial

**Pasos:**

1. **Ir al Dashboard Super Admin**
   ```
   /dashboard-super-admin
   ```

2. **Click en "Companies"**

3. **Buscar la compañía del cliente**

4. **Click en botón "🎛️ Features"** junto a sus datos

5. **Activar las features que quieras:**
   ```
   ✅ whatsappBusiness → Activar
   ✅ escaneoConCamara → Activar
   ✅ escanerCodigoBarras → Activar
   ✅ impresorasBluetooth → Activar
   ```

6. **Click "Guardar Cambios"**

**Resultado:**
```
Cliente ahora tiene:
✅ Plan Operativo (50k/mes base)
⚡ WhatsApp Business (extra)
⚡ Escaneo de códigos (extra)
⚡ Impresoras Bluetooth (extra)
```

El símbolo ⚡ indica que es un **override personalizado** (no viene en su plan).

---

## 👀 DÓNDE VE ESTO EL PROPIETARIO/ADMIN

**Ruta:** `/mis-features`

**Qué ve:**
```
╔════════════════════════════════════════╗
║  Mi Plan: Operativo                    ║
║  ✅ 12 Features Activas                ║
║  ⚡ 3 Extras Personalizadas            ║
╠════════════════════════════════════════╣
║  📊 Gestión y Reportes                 ║
║  ✅ Importar CSV                       ║
║  ❌ Importar Excel                     ║
║  ✅ Exportar reportes                  ║
║  ✅ Dashboard básico                   ║
║  ✅ Tracking público                   ║
║                                        ║
║  🔔 Notificaciones                     ║
║  ✅ Notificaciones Web                 ║
║  ✅ Email básico                       ║
║  ❌ Email automatizado                 ║
║  ✅ WhatsApp Business      ⚡ Extra    ║
║  ❌ SMS (roadmap)                      ║
║                                        ║
║  🖨️ Hardware                           ║
║  ✅ Escáner códigos        ⚡ Extra    ║
║  ✅ Escaneo con cámara     ⚡ Extra    ║
║  ❌ Impresión etiquetas                ║
║                                        ║
║        [Contactar para mejorar]        ║
╚════════════════════════════════════════╝
```

**Leyenda:**
- ✅ = Tiene activa
- ❌ = No tiene
- ⚡ = Extra que Super Admin activó
- (roadmap) = No implementado aún

---

## 🚀 ENDPOINTS API

### Ver Features de una Compañía
```bash
GET /api/companies/:companyId/features
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "companyId": "embarques_ivan",
    "companyName": "Embarques Ivan",
    "plan": "operativo",
    "planFeatures": {
      "whatsappBusiness": false,
      "escaneoConCamara": false,
      // ... features del plan base
    },
    "customFeatures": {
      "whatsappBusiness": true,
      "escaneoConCamara": true
    },
    "effectiveFeatures": {
      "whatsappBusiness": true,  // ⚡ Override
      "escaneoConCamara": true,  // ⚡ Override
      // ... resto
    }
  }
}
```

### Activar Feature Individual
```bash
PATCH /api/companies/:companyId/features/toggle
Content-Type: application/json

{
  "featureName": "whatsappBusiness",
  "enabled": true
}
```

### Actualizar Múltiples Features
```bash
PUT /api/companies/:companyId/features
Content-Type: application/json

{
  "features": {
    "whatsappBusiness": true,
    "escaneoConCamara": true,
    "escanerCodigoBarras": true
  }
}
```

### Resetear a Plan Base
```bash
DELETE /api/companies/:companyId/features
```

Elimina todos los overrides personalizados.

---

## 🔍 VALIDACIÓN EN EL CÓDIGO

### Backend - Verificar Features

```javascript
import { hasFeature } from '../models/Company.js';

export const enviarNotificacionWhatsApp = async (req, res) => {
  const { companyId } = req.userData;

  // Obtener compañía
  const companyDoc = await db.collection('companies').doc(companyId).get();
  const company = companyDoc.data();

  // ✅ Validar feature (respeta customFeatures + plan)
  if (!hasFeature(company, 'whatsappBusiness')) {
    return res.status(403).json({
      success: false,
      error: 'WhatsApp Business no está habilitado para tu compañía',
      upgradeUrl: '/planes'
    });
  }

  // Continuar...
  await enviarMensajeWhatsApp(telefono, mensaje);
  res.json({ success: true });
};
```

### Frontend - Mostrar Condicional

```javascript
const [companyFeatures, setCompanyFeatures] = useState(null);

useEffect(() => {
  const fetchFeatures = async () => {
    const response = await api.get(`/companies/${companyId}/features`);
    setCompanyFeatures(response.data.data.effectiveFeatures);
  };
  fetchFeatures();
}, [companyId]);

// Renderizar solo si tiene feature
{companyFeatures?.whatsappBusiness && (
  <button onClick={enviarWhatsApp}>
    📱 Enviar WhatsApp
  </button>
)}

{companyFeatures?.escaneoConCamara && (
  <BarcodeScanner onScan={handleScan} />
)}
```

---

## ❓ PREGUNTAS FRECUENTES

### 1. ¿Qué pasa si cambio el plan de un cliente?

Los **overrides personalizados se mantienen**. Si un cliente tiene WhatsApp activado manualmente y lo cambias de Operativo a Smart, seguirá teniendo WhatsApp.

Para volver al plan puro, usa el botón "Resetear" en el panel de features.

### 2. ¿Puedo desactivar una feature que viene en el plan?

Sí. Si el plan Smart incluye `whatsappBusiness: true`, pero tú como Super Admin lo pones en `false` en customFeatures, se desactiva.

**Prioridad:** customFeatures > plan base

### 3. ¿El sistema cobra por features extras?

**NO.** El sistema de features es solo para **control técnico**. La facturación/cobro la manejas tú manualmente.

Recomendación: Documenta los acuerdos especiales en tu CRM.

### 4. ¿Cómo agrego una nueva feature?

1. Agregar al modelo en `backend/src/models/Company.js`:
   ```javascript
   operativo: {
     // ...
     miNuevaFeature: false
   },
   automatizado: {
     // ...
     miNuevaFeature: true
   }
   ```

2. Agregar validación donde sea necesario:
   ```javascript
   if (!hasFeature(company, 'miNuevaFeature')) {
     return res.status(403).json({ error: '...' });
   }
   ```

3. Agregar a las categorías del frontend (ambos archivos):
   - `GestionFeaturesCompanias.jsx`
   - `MisFeaturesCompania.jsx`

### 5. ¿Dónde está el chatbot con Gemini que mencionaste?

**No está implementado.** Dijiste que tenías uno con n8n y Gemini, pero no encontré código para eso en el proyecto.

Lo que SÍ está:
- WhatsApp automático con Evolution API
- Notificaciones automáticas por eventos
- Comandos por rol

Si quieres integrar Gemini, necesitarías:
1. Agregar API key de Gemini
2. Crear `chatbotService.js`
3. Integrar con el webhook de WhatsApp
4. Activar feature `chatbotIA: true`

---

## 📝 NOTAS IMPORTANTES

### Features Honestidad

El modelo ahora refleja **solo lo que tienes implementado**. Las features marcadas como `(roadmap)` son ideas futuras.

**Antes:**
```javascript
sensoresIoT: true,        // ❌ NO EXISTÍA
camarasIP: true,          // ❌ NO EXISTÍA
reconocimientoFacial: true // ❌ NO EXISTÍA
```

**Ahora:**
```javascript
// Eliminadas del modelo
// O marcadas claramente como roadmap
```

### Sistema de Prioridades

```
1. customFeatures (overrides del Super Admin)
   ⬇️
2. Features del plan base (operativo/automatizado/smart)
```

Si `customFeatures.whatsappBusiness = true`, se usa ese valor **aunque el plan diga false**.

---

## 🎯 RESUMEN PARA TU PRIMER CLIENTE

**Lo que REALMENTE puedes ofrecerle hoy:**

✅ **WhatsApp Business** (Evolution API) - Notificaciones automáticas
✅ **Escaneo de códigos** (cámara + pistolas Bluetooth)
✅ **Impresión de etiquetas** (Bluetooth Phomemo/Zebra)
✅ **Email automático** (Resend + eventos)
✅ **Tracking público** (sin login)
✅ **Dashboard con gráficas**
✅ **App móvil básica** (Capacitor)
✅ **API REST completa**

❌ **NO tienes (todavía):**
- GPS en tiempo real del repartidor
- Chatbot con IA
- Firma digital
- 2FA
- Modo offline avanzado
- Geofencing
- Sensores IoT

---

## 📞 SOPORTE

Si necesitas agregar una feature nueva o tienes dudas:

1. Revisar esta guía primero
2. Verificar el código en los archivos mencionados
3. Usar el sistema de custom features para probar

**Archivos clave:**
- `backend/src/models/Company.js` - Definición de features
- `backend/src/middleware/checkPlanLimits.js` - Validación
- `admin_web/src/pages/SuperAdmin/GestionFeaturesCompanias.jsx` - Panel super admin
- `admin_web/src/pages/MisFeaturesCompania.jsx` - Panel propietario

---

**Última actualización:** 2026-01-12
**Versión:** 2.0 (limpieza realista)
**Autor:** Claude Sonnet 4.5

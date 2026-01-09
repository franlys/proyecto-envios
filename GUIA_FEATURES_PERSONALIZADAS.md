# 🎛️ Guía de Features Personalizadas por Compañía

## 📝 ¿Qué es este sistema?

Este sistema te permite como Super Admin activar o desactivar funcionalidades específicas para cada compañía **independientemente de su plan**, creando paquetes personalizados adaptados a las necesidades de cada cliente.

---

## 🎯 Caso de Uso: Tu Primer Cliente

### Escenario:
Tienes un **primer cliente pequeño** con el plan **Operativo (50k/mes)**. Quieres ofrecerle un **trato especial** agregándole:

✅ **Notificaciones WhatsApp** (normalmente solo en Smart)
✅ **Sistema de escaneo de códigos de barras** con cámara
❌ **SIN bot automático** (personal responde manualmente)

### Cómo hacerlo:

1. **Ir al Dashboard Super Admin** → `/dashboard-super-admin`
2. **Click en "Companies"** en el menú
3. **Buscar la compañía del cliente**
4. **Click en el botón "🎛️ Features"** junto a sus datos
5. **Activar/Desactivar las features que quieras**:
   - ✅ Activar `whatsappBusiness`
   - ✅ Activar `barcodeScanning`
   - ❌ Desactivar `chatbot`
6. **Click en "Guardar Cambios"**

¡Listo! El cliente ahora tiene esas funcionalidades aunque su plan no las incluya.

---

## 🔧 Cómo Funciona el Sistema

### Sistema de Prioridades

```
1. Custom Features (overrides personalizados)
   ⬇️
2. Features del Plan Base (operativo/automatizado/smart)
```

**Ejemplo:**
- Plan **Operativo** → `whatsappBusiness: false`
- Pero tú como Super Admin activas → `customFeatures.whatsappBusiness: true`
- **Resultado final:** ✅ WhatsApp habilitado

---

## 📦 Features Disponibles

### 🔔 Notificaciones WhatsApp
| Feature | Descripción |
|---------|-------------|
| `whatsappBusiness` | WhatsApp Business API - Envío de actualizaciones |
| `chatbot` | Bot de respuesta automática |

### 📸 Escaneo de Códigos
| Feature | Descripción |
|---------|-------------|
| `barcodeScanning` | Escaneo con cámara del celular |
| `bluetoothScanners` | Soporte para pistolas Bluetooth/USB |

### 🖨️ Impresión de Etiquetas
| Feature | Descripción |
|---------|-------------|
| `labelPrinting` | Sistema de impresión de etiquetas |
| `bluetoothPrinting` | Impresión vía Bluetooth |

### 📱 Móvil
| Feature | Descripción |
|---------|-------------|
| `gpsMovil` | GPS en App Móvil |
| `modoOffline` | Modo sin conexión |
| `fotoComprobante` | Subir fotos de entrega |
| `firmaDigital` | Firmas digitales |

### 🗺️ GPS & Tracking
| Feature | Descripción |
|---------|-------------|
| `gpsTracking` | Seguimiento GPS básico |
| `gpsVehicular` | GPS vehicular avanzado |
| `geofencing` | Alertas por zonas |
| `sensoresIoT` | Sensores IoT |

### 📹 Cámaras
| Feature | Descripción |
|---------|-------------|
| `camarasIP` | Cámaras IP en almacenes |
| `streamingLive` | Streaming en tiempo real |
| `grabacionNube` | Grabación en la nube |

### 🤖 IA & Optimización
| Feature | Descripción |
|---------|-------------|
| `optimizacionRutas` | Optimización de rutas |
| `prediccionTiempos` | Predicción de tiempos |
| `asignacionAutomatica` | Asignación automática |

### 🔌 API & Integraciones
| Feature | Descripción |
|---------|-------------|
| `apiAccess` | Acceso a API REST |
| `webhooks` | Webhooks para eventos |
| `integraciones` | Integraciones con terceros |

### 🔒 Seguridad
| Feature | Descripción |
|---------|-------------|
| `autenticacion2FA` | Autenticación de dos factores |
| `logsAuditoria` | Logs de auditoría |

---

## 🚀 Endpoints API (Super Admin)

### 1. Ver Features de una Compañía
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
      "barcodeScanning": false,
      // ... todas las features del plan
    },
    "customFeatures": {
      "whatsappBusiness": true,
      "barcodeScanning": true
    },
    "effectiveFeatures": {
      "whatsappBusiness": true,  // ✅ Override activado
      "barcodeScanning": true,   // ✅ Override activado
      // ... resto de features
    }
  }
}
```

### 2. Activar/Desactivar Feature Individual
```bash
PATCH /api/companies/:companyId/features/toggle
Content-Type: application/json

{
  "featureName": "whatsappBusiness",
  "enabled": true
}
```

### 3. Actualizar Múltiples Features
```bash
PUT /api/companies/:companyId/features
Content-Type: application/json

{
  "features": {
    "whatsappBusiness": true,
    "barcodeScanning": true,
    "chatbot": false
  }
}
```

### 4. Resetear a Plan Base
```bash
DELETE /api/companies/:companyId/features
```

Esto elimina todos los overrides y vuelve a usar solo las features del plan.

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Activar WhatsApp para Cliente Básico

**Cliente:** Plan Operativo (50k/mes)
**Quieres:** Agregar WhatsApp Business sin cambiar plan

```javascript
// Como Super Admin en la UI:
// 1. Ir a Companies → Click "Features" del cliente
// 2. Activar "WhatsApp Business API"
// 3. Guardar

// O vía API:
PATCH /api/companies/embarques_ivan/features/toggle
{
  "featureName": "whatsappBusiness",
  "enabled": true
}
```

### Ejemplo 2: Paquete Personalizado

**Cliente:** Necesita solo escaneo + WhatsApp (sin GPS ni cámaras)

```javascript
PUT /api/companies/cliente_especial/features
{
  "features": {
    "whatsappBusiness": true,
    "barcodeScanning": true,
    "bluetoothScanners": true,
    "gpsTracking": false,
    "camarasIP": false
  }
}
```

### Ejemplo 3: Verificar si Cliente tiene Feature

```javascript
// En el código (backend):
import { hasFeature } from '../models/Company.js';

const company = await db.collection('companies').doc(companyId).get();
const companyData = company.data();

if (hasFeature(companyData, 'whatsappBusiness')) {
  // ✅ Cliente tiene WhatsApp - enviar mensaje
  await enviarMensajeWhatsApp(telefono, mensaje);
} else {
  // ❌ Cliente NO tiene WhatsApp - skip
  console.log('WhatsApp no habilitado para este cliente');
}
```

---

## 📊 Interfaz del Panel

### Vista de Features

```
╔══════════════════════════════════════════════════════════╗
║ Gestión de Features - Embarques Ivan - Plan: operativo  ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║ 📦 Notificaciones WhatsApp                              ║
║ ┌────────────────────────────────────────────────────┐  ║
║ │ ✅ WhatsApp Business API        ⚡ Custom  [Toggle]│  ║
║ │ ❌ Bot de respuesta automática           [Toggle] │  ║
║ └────────────────────────────────────────────────────┘  ║
║                                                          ║
║ 📦 Escaneo de Códigos                                   ║
║ ┌────────────────────────────────────────────────────┐  ║
║ │ ✅ Sistema de escaneo con cámara ⚡ Custom [Toggle]│  ║
║ │ ❌ Soporte pistolas Bluetooth            [Toggle] │  ║
║ └────────────────────────────────────────────────────┘  ║
║                                                          ║
║                        [Guardar Cambios]  [Resetear]    ║
╚══════════════════════════════════════════════════════════╝
```

**Leyenda:**
- ✅ = Feature activada
- ❌ = Feature desactivada
- ⚡ Custom = Override personalizado (diferente del plan base)
- [Toggle] = Botón para activar/desactivar

---

## ⚠️ Consideraciones Importantes

### 1. **Solo Super Admin**
- Únicamente usuarios con rol `super_admin` pueden gestionar features
- Los admins de compañía NO ven ni pueden cambiar estas configuraciones

### 2. **No Afecta Facturación**
- El sistema de features es independiente de la facturación
- Debes manejar la facturación/cobro manualmente
- Recomendación: Documentar acuerdos especiales

### 3. **Overrides Persisten**
- Los overrides se guardan en `customFeatures` de la compañía
- Persisten aunque cambies el plan de la compañía
- Para eliminarlos, usar "Resetear" o cambiar manualmente

### 4. **Validación en el Código**
- Las features se validan en el código usando `hasFeature()`
- Asegúrate de implementar validaciones donde sea necesario

---

## 🔄 Integración en el Código

### Backend - Validar Features

```javascript
// En cualquier controller:
import { hasFeature } from '../models/Company.js';

export const enviarNotificacionWhatsApp = async (req, res) => {
  const { companyId, telefono, mensaje } = req.body;

  // Obtener compañía
  const companyDoc = await db.collection('companies').doc(companyId).get();
  const company = companyDoc.data();

  // ✅ Validar feature
  if (!hasFeature(company, 'whatsappBusiness')) {
    return res.status(403).json({
      error: 'WhatsApp Business no está habilitado para esta compañía'
    });
  }

  // Continuar con el envío...
  await enviarMensajeWhatsApp(telefono, mensaje);
  res.json({ success: true });
};
```

### Frontend - Mostrar Features

```javascript
// En un componente de admin:
const [companyFeatures, setCompanyFeatures] = useState(null);

useEffect(() => {
  const fetchFeatures = async () => {
    const response = await api.get(`/companies/${companyId}/features`);
    setCompanyFeatures(response.data.data.effectiveFeatures);
  };
  fetchFeatures();
}, [companyId]);

// Renderizar condicional:
{companyFeatures?.whatsappBusiness && (
  <button onClick={enviarWhatsApp}>
    Enviar WhatsApp
  </button>
)}
```

---

## 📈 Casos de Uso Avanzados

### 1. Cliente VIP
```javascript
// Plan Operativo + features premium:
{
  "whatsappBusiness": true,
  "smsCliente": true,
  "gpsTracking": true,
  "fotoComprobante": true,
  "firmaDigital": true
}
```

### 2. Cliente de Prueba
```javascript
// Plan Smart pero sin features costosas:
{
  "gpsVehicular": false,
  "camarasIP": false,
  "sensoresIoT": false,
  "grabacionNube": false
}
```

### 3. Cliente Especializado en Escaneo
```javascript
// Solo features de escaneo e impresión:
{
  "barcodeScanning": true,
  "bluetoothScanners": true,
  "labelPrinting": true,
  "bluetoothPrinting": true
}
```

---

## 🆘 Troubleshooting

### Problema: Feature no funciona después de activarla

**Solución:**
1. Verificar que el código valida la feature con `hasFeature()`
2. Limpiar caché del navegador
3. Verificar en la API que el override se guardó:
   ```bash
   GET /api/companies/:id/features
   ```

### Problema: No puedo ver el botón "Features" en Companies

**Solución:**
1. Verificar que eres `super_admin`
2. Verificar que importaste el componente correctamente
3. Verificar la ruta en App.jsx

### Problema: Error al guardar cambios

**Solución:**
1. Verificar token de autenticación
2. Verificar que eres `super_admin`
3. Revisar logs del backend

---

## ✅ Checklist de Implementación

Para agregar validación de features en una nueva funcionalidad:

- [ ] Importar `hasFeature` en el controller
- [ ] Obtener datos de la compañía
- [ ] Validar la feature con `hasFeature(company, 'nombreFeature')`
- [ ] Retornar error 403 si no está habilitada
- [ ] Documentar qué feature se necesita
- [ ] Actualizar esta guía si es necesario

---

## 📞 Ejemplo Práctico: Tu Primer Cliente

### Pasos Completos

1. **Crear la compañía** (si no existe)
   - Dashboard Super Admin → Companies → Crear Nueva
   - Nombre: "Cliente Especial"
   - Plan: "operativo"

2. **Configurar Features Personalizadas**
   - Click en "🎛️ Features" junto al cliente
   - Activar:
     - ✅ WhatsApp Business API
     - ✅ Sistema de escaneo con cámara
     - ✅ Soporte pistolas Bluetooth
   - Desactivar:
     - ❌ Bot de respuesta automática
   - Guardar cambios

3. **El cliente ahora tiene:**
   - Plan Operativo (50k/mes)
   - WhatsApp para notificaciones (sin bot)
   - Escaneo de códigos de barras
   - Personal responde manualmente en WhatsApp

4. **Cobro y Facturación**
   - Documentar el acuerdo especial
   - Agregar línea en factura: "WhatsApp Business + Escaneo"
   - Cobrar 50k/mes (o el precio acordado)

---

## 🎓 Conclusión

Este sistema te da **flexibilidad total** para crear paquetes personalizados sin modificar los planes base. Es perfecto para:

✅ Primeros clientes (pricing especial)
✅ Clientes VIP (features premium sin cambiar plan)
✅ Pruebas y demos (habilitar temporalmente)
✅ Negociaciones customizadas

**Recuerda:** Los overrides son independientes del plan. Si cambias el plan de un cliente, sus overrides se mantienen. Para volver al plan puro, usa el botón "Resetear".

---

**Última actualización:** 2026-01-09
**Autor:** Claude Sonnet 4.5
**Sistema:** Prologix v2.0

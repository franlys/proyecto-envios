# Flujo de Trabajo Completo: Sistema Híbrido (Con y Sin RFID)

> **IMPORTANTE:** Las etiquetas RFID se imprimen **durante la recolección en el domicilio del cliente**, NO en el almacén Miami. El recolector usa una impresora portátil para etiquetar cada item físico inmediatamente después de crear la factura.

---

## 🎯 Visión General

El sistema soporta **DOS MODOS** de operación configurables por empresa:

### Modo 1: **SIN HARDWARE ZEBRA** (Manual)
- Empresas que aún no tienen dispositivos
- Proceso 100% digital pero manual
- Escaneo con celular/cámara
- Códigos de barras tradicionales

### Modo 2: **CON HARDWARE ZEBRA** (Automático)
- Empresas con inversión en dispositivos
- RFID automático
- Impresoras dedicadas
- Trazabilidad granular por item

---

## 🔧 Configuración por Empresa

```javascript
// Firestore: companies/{companyId}
{
  nombre: "Envíos Express RD",

  // ✅ NUEVA CONFIGURACIÓN
  hardwareConfig: {
    enabled: true,  // ← Super Admin activa/desactiva

    // Módulos habilitados
    modulos: {
      rfid_tracking: true,        // Sistema RFID completo
      auto_print_labels: true,    // Impresión automática
      handheld_validation: true,  // TC21 para cargadores
      mobile_printing: false      // ZQ630 para repartidores
    },

    // Nivel de trazabilidad
    trackingLevel: "item_individual", // "factura" | "item_individual"

    // Comportamiento del sistema
    behavior: {
      // ¿Imprimir etiquetas automáticamente al crear factura?
      auto_print_on_create: true,

      // ¿Requerir RFID para asignar a contenedor?
      require_rfid_for_container: true,

      // ¿Permitir cierre de contenedor con items faltantes?
      allow_incomplete_container: false,

      // ¿Validar carga de vehículo con RFID?
      validate_loading_with_rfid: true
    }
  },

  // Hardware físico (si enabled: true)
  hardware: {
    printers: [...],
    readers: [...],
    handhelds: [...]
  }
}
```

---

## 📋 FLUJO COMPLETO: Desde Agenda hasta Entrega

```
┌─────────────────────────────────────────────────────────────────┐
│                    ETAPA 1: SOLICITUD                            │
│                    Cliente → Sistema                             │
└─────────────────────────────────────────────────────────────────┘
```

### **1️⃣ CLIENTE AGENDA RECOLECCIÓN**

**Actor:** Cliente (vía web o WhatsApp)
**Ubicación:** Miami, FL
**Dispositivo:** Ninguno

#### **Acción:**
```javascript
// Cliente llena formulario web
POST /api/recolecciones/solicitar
{
  remitente: {
    nombre: "Tech Store Miami",
    telefono: "+1-305-555-0100",
    email: "contact@techstore.com",
    direccion: "123 Main St, Miami, FL 33101"
  },

  destinatario: {
    nombre: "Juan Pérez",
    telefono: "+1-809-555-1234",
    cedula: "001-1234567-8",
    direccion: "Av. Principal #123, Los Prados",
    sector: "Los Prados",
    ciudad: "Santo Domingo",
    provincia: "Distrito Nacional",
    pais: "República Dominicana"
  },

  items: [
    {
      descripcion: "TV Samsung 55 pulgadas QLED",
      cantidad: 2,
      valor: 500,
      peso_lb: 45,
      dimensiones: "55x35x8 pulgadas"
    },
    {
      descripcion: "Laptop Dell Inspiron 15",
      cantidad: 1,
      valor: 800,
      peso_lb: 5,
      dimensiones: "15x10x1 pulgadas"
    },
    {
      descripcion: "Caja con libros educativos",
      cantidad: 3,
      valor: 50,
      peso_lb: 20,
      dimensiones: "12x12x12 pulgadas"
    }
  ],

  fechaPreferida: "2025-12-30",
  horarioPreferido: "morning", // morning | afternoon | anytime

  notaEspecial: "Empacar TVs con cuidado extra. Frágil.",

  servicio: "standard", // standard | express
  seguro: true,
  valorDeclarado: 1350
}
```

#### **Backend Automático:**
```javascript
// 1. Calcula totales
const totalItems = items.reduce((sum, item) => sum + item.cantidad, 0); // 6
const pesoTotal = items.reduce((sum, item) => sum + (item.peso_lb * item.cantidad), 0); // 155 lb
const valorTotal = items.reduce((sum, item) => sum + (item.valor * item.cantidad), 0); // $1850

// 2. Calcula tarifa según plan de la empresa
const tarifa = calcularTarifa({
  peso: pesoTotal,
  servicio: "standard",
  seguro: true,
  valorDeclarado: 1350
}); // $125.50

// 3. Genera código único
const codigoRecoleccion = generarCodigo("REC"); // REC-2025-001234

// 4. Crea solicitud
await db.collection('recolecciones').add({
  codigo: "REC-2025-001234",
  companyId: "empresa_123",
  estado: "pendiente",
  remitente,
  destinatario,
  items,
  totales: {
    items: totalItems,
    peso: pesoTotal,
    valor: valorTotal
  },
  tarifa: {
    subtotal: 105.50,
    seguro: 20.00,
    total: 125.50,
    moneda: "USD"
  },
  fechaSolicitud: NOW,
  fechaPreferida: "2025-12-30",
  created_at: NOW
});
```

#### **Notificaciones Enviadas:**

**📧 Email al Cliente:**
```
Asunto: ✅ Solicitud de Recolección Recibida - REC-2025-001234

Hola Tech Store Miami,

Tu solicitud de recolección ha sido recibida exitosamente.

📦 DETALLES DE LA RECOLECCIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Código: REC-2025-001234
Estado: Pendiente de asignación
Fecha solicitada: 30 de Diciembre, 2025

📍 ORIGEN
Miami, FL - 123 Main St

📍 DESTINO
Santo Domingo, RD - Av. Principal #123, Los Prados
Destinatario: Juan Pérez

📦 ARTÍCULOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. TV Samsung 55" QLED (x2) - $500 c/u
2. Laptop Dell Inspiron 15 (x1) - $800
3. Caja con libros (x3) - $50 c/u

Total items: 6 unidades
Peso total: 155 lb
Valor declarado: $1,850

💰 COSTO DEL SERVICIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Envío estándar: $105.50
Seguro: $20.00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: $125.50 USD

📱 PRÓXIMOS PASOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Un recolector será asignado pronto
• Te notificaremos por email y SMS
• Prepara los artículos para el día acordado

🔗 SEGUIMIENTO
Rastrea tu envío: https://envios.com/track/REC-2025-001234

¿Preguntas? Contacta soporte: support@envios.com

Gracias por confiar en nosotros,
Equipo de Envíos Express RD
```

**📱 SMS al Cliente:**
```
✅ Envíos Express RD
Recolección REC-2025-001234 recibida.
6 items • $125.50
Te notificaremos cuando se asigne recolector.
Track: envios.com/track/REC-2025-001234
```

**🔔 Notificación Panel Admin:**
```
Sistema → Admin Dashboard

🆕 NUEVA SOLICITUD DE RECOLECCIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REC-2025-001234
Cliente: Tech Store Miami
Destino: Juan Pérez (Santo Domingo)
Items: 6 unidades • 155 lb
Valor: $1,850
Fecha: 30 Dic 2025

[Asignar Recolector] [Ver Detalles]
```

---

```
┌─────────────────────────────────────────────────────────────────┐
│              ETAPA 2: ASIGNACIÓN Y RECOLECCIÓN                   │
│              Admin → Recolector → Cliente                        │
└─────────────────────────────────────────────────────────────────┘
```

### **2️⃣ ADMIN ASIGNA RECOLECTOR**

**Actor:** Supervisor/Admin
**Ubicación:** Oficina
**Dispositivo:** PC/Laptop

#### **Acción:**
```javascript
PUT /api/recolecciones/REC-2025-001234/asignar
{
  recolectorId: "user_carlos_001",
  fechaRecoleccion: "2025-12-30",
  horaInicio: "09:00",
  horaFin: "12:00",
  notas: "Llevar material de embalaje extra para TVs"
}
```

#### **Backend Automático:**
```javascript
await db.collection('recolecciones').doc('REC-2025-001234').update({
  estado: "asignada",
  recolector: {
    id: "user_carlos_001",
    nombre: "Carlos Rodríguez",
    telefono: "+1-305-555-0200",
    vehiculo: "Van #3"
  },
  fechaRecoleccion: "2025-12-30",
  ventanaHoraria: {
    inicio: "09:00",
    fin: "12:00"
  },
  fechaAsignacion: NOW
});

// Actualizar agenda del recolector
await db.collection('users').doc('user_carlos_001').update({
  'agenda.2025-12-30': admin.firestore.FieldValue.arrayUnion({
    tipo: "recoleccion",
    codigo: "REC-2025-001234",
    hora: "09:00-12:00",
    direccion: "123 Main St, Miami"
  })
});
```

#### **Notificaciones Enviadas:**

**📧 Email al Cliente:**
```
Asunto: 🚚 Recolector Asignado - REC-2025-001234

¡Buenas noticias!

Tu recolección ha sido programada.

👤 RECOLECTOR ASIGNADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nombre: Carlos Rodríguez
Teléfono: +1 (305) 555-0200
Vehículo: Van #3

📅 FECHA Y HORA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fecha: Lunes, 30 de Diciembre 2025
Ventana horaria: 9:00 AM - 12:00 PM

📍 DIRECCIÓN DE RECOLECCIÓN
123 Main St, Miami, FL 33101

📦 QUE TENER LISTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 2 TVs Samsung (embaladas)
✓ 1 Laptop Dell (en caja)
✓ 3 Cajas con libros (selladas)
✓ Documentos de identificación

💡 RECOMENDACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Embala las TVs con protección extra
• Etiqueta cada caja claramente
• Ten a mano tu ID

El recolector te llamará antes de llegar.

Saludos,
Equipo de Envíos Express RD
```

**📱 SMS al Cliente:**
```
🚚 Envíos Express RD
Recolección programada:
📅 30 Dic, 9AM-12PM
👤 Carlos Rodríguez: +1-305-555-0200
Prepara 6 items. Te llamará antes de llegar.
```

**📲 Notificación App Recolector:**
```
App Móvil → Recolector Carlos

🆕 NUEVA RECOLECCIÓN ASIGNADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Mañana, 30 Dic - 9:00 AM

📍 123 Main St, Miami, FL
Cliente: Tech Store Miami
📞 +1-305-555-0100

📦 6 items • 155 lb
2 TVs (frágil), 1 Laptop, 3 cajas

⚠️ NOTA: Material extra para TVs

[Ver Ruta] [Ver Detalles] [Confirmar]
```

---

### **3️⃣ RECOLECTOR LLEGA Y RECOGE PAQUETES**

**Actor:** Recolector Carlos
**Ubicación:** 123 Main St, Miami
**Dispositivo:** App móvil + Celular

#### **Proceso:**

**3A. Llegada al lugar**
```javascript
// Recolector presiona "Llegué" en app
PUT /api/recolecciones/REC-2025-001234/llegada
{
  horaLlegada: "09:15",
  ubicacionGPS: {
    lat: 25.7617,
    lng: -80.1918
  }
}
```

**Notificación al Cliente:**
```
📱 SMS:
🚚 Carlos está en tu ubicación
Código: REC-2025-001234
```

**3B. Inspección de items**
```javascript
// Recolector verifica cada item
PUT /api/recolecciones/REC-2025-001234/verificar-items
{
  items: [
    {
      itemIndex: 0,
      descripcion: "TV Samsung 55\"",
      cantidadRecibida: 2,
      condicion: "buena",
      fotos: ["data:image/jpeg;base64,..."],
      notas: "Embalaje original, bien protegido"
    },
    {
      itemIndex: 1,
      descripcion: "Laptop Dell",
      cantidadRecibida: 1,
      condicion: "buena",
      fotos: ["data:image/jpeg;base64,..."]
    },
    {
      itemIndex: 2,
      descripcion: "Caja libros",
      cantidadRecibida: 3,
      condicion: "buena",
      notas: "Cajas selladas"
    }
  ],
  firmaCliente: "data:image/png;base64,...",
  nombreQuienEntrega: "Michael Johnson (Gerente)",
  horaRecogida: "09:30"
}
```

**3C. Crear factura + IMPRIMIR ETIQUETAS RFID (si aplica)**

```javascript
// Recolector confirma items y presiona "Finalizar Recolección"
POST /api/facturas/crear-desde-recoleccion
{
  recoleccionId: "REC-2025-001234"
}

// Backend genera factura
{
  facturaId: "FACT-2025-567890",
  codigoTracking: "MIA123456",
  companyId: "company_123",

  items: [
    {
      itemIndex: 0,
      descripcion: "TV Samsung 55\" QLED",
      cantidad: 2, // ← 2 unidades físicas

      // Estructura individual por unidad
      unidades: [
        {
          unidadId: "MIA123456-0-0",
          numeroUnidad: 1, // TV #1
          rfid: null, // ← Se asignará al imprimir
          estado: "recolectado"
        },
        {
          unidadId: "MIA123456-0-1",
          numeroUnidad: 2, // TV #2
          rfid: null,
          estado: "recolectado"
        }
      ]
    },
    {
      itemIndex: 1,
      descripcion: "Laptop Dell Inspiron 15",
      cantidad: 1,
      unidades: [
        {
          unidadId: "MIA123456-1-0",
          numeroUnidad: 1,
          rfid: null,
          estado: "recolectado"
        }
      ]
    },
    {
      itemIndex: 2,
      descripcion: "Caja con libros educativos",
      cantidad: 3,
      unidades: [
        {
          unidadId: "MIA123456-2-0",
          numeroUnidad: 1,
          rfid: null,
          estado: "recolectado"
        },
        {
          unidadId: "MIA123456-2-1",
          numeroUnidad: 2,
          rfid: null,
          estado: "recolectado"
        },
        {
          unidadId: "MIA123456-2-2",
          numeroUnidad: 3,
          rfid: null,
          estado: "recolectado"
        }
      ]
    }
  ],

  estadisticasItems: {
    totalUnidadesFisicas: 6, // Total de etiquetas a imprimir
    totalItems: 3
  },

  estado: "recolectado",
  recolector: {
    id: "user_carlos_001",
    nombre: "Carlos Rodríguez"
  },

  created_at: NOW
}

// 🖨️ INMEDIATAMENTE DESPUÉS: Verificar si empresa tiene hardware RFID
const company = await db.collection('companies').doc('company_123').get();

if (company.data().hardwareConfig?.enabled &&
    company.data().hardwareConfig?.modulos?.rfid_tracking) {

  // ✅ EMPRESA TIENE RFID HABILITADO
  console.log('🖨️ Imprimiendo etiquetas RFID en ubicación del cliente...');

  // Obtener impresora del recolector (portátil ZQ630 o impresora en vehículo)
  const printerConfig = await getPrinterForCollector('user_carlos_001');

  // Imprimir 6 etiquetas (una por cada unidad física)
  await printRFIDLabelsForInvoice({
    facturaId: "FACT-2025-567890",
    tracking: "MIA123456",
    items: factura.items,
    printer: printerConfig,
    ubicacion: "domicilio_cliente"
  });

} else {
  // ❌ SIN RFID: Solo imprime etiquetas con código de barras
  console.log('📋 Empresa sin RFID. Etiquetas manuales.');
}
```

#### **🖨️ PROCESO DE IMPRESIÓN EN DOMICILIO DEL CLIENTE**

**MODO A: EMPRESA CON RFID HABILITADO**

```javascript
async function printRFIDLabelsForInvoice(data) {
  const { facturaId, tracking, items, printer } = data;

  console.log(`🖨️ Iniciando impresión de etiquetas RFID...`);
  console.log(`📦 Factura: ${tracking}`);

  // Contador de etiquetas
  let etiquetaNumero = 1;
  const totalEtiquetas = items.reduce((sum, i) => sum + i.cantidad, 0);

  // IMPORTANTE: Impresora portátil ZQ630 con RFID o ZD621 en vehículo
  const impresora = printer.tipo; // "ZQ630" o "ZD621"

  for (const item of items) {
    for (let i = 0; i < item.cantidad; i++) {
      const unidad = item.unidades[i];

      // 1. GENERAR EPC ÚNICO
      const epc = generateUniqueEPC(); // ej: "E280116060000020936C5C4A"

      console.log(`
        ┌────────────────────────────────────────┐
        │ 🖨️  IMPRIMIENDO ETIQUETA ${etiquetaNumero}/${totalEtiquetas}    │
        ├────────────────────────────────────────┤
        │ Item: ${item.descripcion}              │
        │ Unidad: ${i + 1} de ${item.cantidad}   │
        │ EPC: ${epc}                            │
        └────────────────────────────────────────┘
      `);

      // 2. CREAR TEMPLATE ZPL CON RFID
      const zplTemplate = `
^XA
^RFW,H,,,2^FD${epc}^FS                 // ← CODIFICAR TAG RFID
^FO50,50^A0N,40,40^FD${tracking}^FS     // Tracking grande
^FO50,100^A0N,25,25^FD${item.descripcion}^FS
^FO50,140^A0N,20,20^FDUnidad ${i + 1} de ${item.cantidad}^FS
^FO50,180^BCN,80,Y,N,N^FD${tracking}^FS // Código de barras
^FO50,280^A0N,18,18^FDEPC: ${epc}^FS
^FO50,310^A0N,15,15^FDDestino: Santo Domingo, RD^FS
^XZ
      `;

      // 3. ENVIAR A IMPRESORA RFID
      try {
        // Conexión vía Bluetooth (ZQ630 portátil) o WiFi (ZD621 en van)
        await sendToPrinter(printer.connection, zplTemplate);

        console.log(`✅ Etiqueta ${etiquetaNumero} impresa y codificada`);

        // 4. ACTUALIZAR FIRESTORE con el EPC asignado
        await db.collection('facturas').doc(facturaId).update({
          [`items.${item.itemIndex}.unidades.${i}.rfid`]: {
            epc: epc,
            fechaAsignacion: NOW,
            impresoEn: "domicilio_cliente",
            impresora: impresora
          },
          [`items.${item.itemIndex}.unidades.${i}.estado`]: "etiquetado"
        });

        // 5. CREAR REGISTRO EN CATÁLOGO GLOBAL DE TAGS
        await db.collection('rfid_tags').doc(epc).set({
          epc: epc,
          facturaId: facturaId,
          facturaTracking: tracking,
          companyId: data.companyId,

          // Información del item
          itemIndex: item.itemIndex,
          itemDescripcion: item.descripcion,
          numeroUnidad: i + 1,
          cantidadTotal: item.cantidad,
          unidadId: unidad.unidadId,

          // Información del destinatario
          destinatario: {
            nombre: factura.destinatario.nombre,
            direccion: factura.destinatario.direccion,
            telefono: factura.destinatario.telefono
          },

          // Tracking
          estado: "etiquetado",
          ubicacionActual: "con_recolector",
          historial: [{
            fecha: NOW,
            evento: "impresion_etiqueta",
            ubicacion: "domicilio_cliente",
            recolector: data.recolectorId
          }],

          created_at: NOW
        });

        etiquetaNumero++;

        // Pequeña pausa entre impresiones (100ms)
        await sleep(100);

      } catch (error) {
        console.error(`❌ Error imprimiendo etiqueta ${etiquetaNumero}:`, error);

        // Registrar error pero continuar
        await db.collection('hardware_logs').add({
          tipo: "error_impresion",
          facturaId: facturaId,
          itemDescripcion: item.descripcion,
          unidad: i + 1,
          error: error.message,
          timestamp: NOW
        });
      }
    }
  }

  console.log(`✅ PROCESO COMPLETADO: ${totalEtiquetas} etiquetas impresas y codificadas`);

  // Actualizar estadísticas de factura
  await db.collection('facturas').doc(facturaId).update({
    'estadisticasItems.unidadesEtiquetadas': totalEtiquetas,
    rfidImpreso: true,
    fechaImpresionEtiquetas: NOW,
    estado: "etiquetado" // ← Estado actualizado
  });

  return {
    success: true,
    totalEtiquetas: totalEtiquetas,
    epcs: items.flatMap(item =>
      item.unidades.map(u => u.rfid?.epc)
    ).filter(Boolean)
  };
}
```

**📱 App del Recolector - Durante Impresión:**

```
┌────────────────────────────────────────┐
│ 🖨️  IMPRIMIENDO ETIQUETAS RFID         │
├────────────────────────────────────────┤
│ Factura: MIA123456                     │
│                                        │
│ [██████████████░░░░] 4/6 (67%)        │
│                                        │
│ Imprimiendo ahora:                     │
│ 📦 Caja de libros (2/3)                │
│ EPC: E280116060...C5C4D                │
│                                        │
│ ✅ TV Samsung #1 (impresa)             │
│ ✅ TV Samsung #2 (impresa)             │
│ ✅ Laptop Dell (impresa)               │
│ ✅ Caja libros #1 (impresa)            │
│ ⏳ Caja libros #2 (imprimiendo...)     │
│ ⏸️  Caja libros #3 (pendiente)         │
│                                        │
│ Tiempo estimado: 15 segundos           │
└────────────────────────────────────────┘

Instrucciones:
→ Pega cada etiqueta en el item correspondiente
→ Verifica que la etiqueta esté bien adherida
→ NO cubras la etiqueta con cinta
```

**🏷️ Recolector pega las etiquetas:**
- Cada etiqueta se pega **inmediatamente** en el item físico correspondiente
- El recolector verifica que coincida item físico con descripción
- Etiquetas ya tienen RFID codificado y listo para escanear

**Tiempo total del proceso:**
- Impresión: ~2-3 segundos por etiqueta
- 6 etiquetas: ~15-20 segundos total
- Pegar etiquetas: ~30-60 segundos adicionales

**TOTAL: 1-2 minutos** para etiquetar 6 items

---

**MODO B: EMPRESA SIN RFID**

```javascript
// Solo imprime etiquetas con código de barras (sin RFID)
async function printBarcodeLabelsForInvoice(data) {
  const { tracking, items } = data;

  for (const item of items) {
    const zplSimple = `
^XA
^FO50,50^A0N,40,40^FD${tracking}^FS
^FO50,100^A0N,25,25^FD${item.descripcion}^FS
^FO50,150^BCN,80,Y,N,N^FD${tracking}^FS
^XZ
    `;

    await sendToPrinter(printer.connection, zplSimple);
  }

  console.log('📋 Etiquetas con código de barras impresas (sin RFID)');
}
```

**Resultado:**
- 1 etiqueta por factura (no por item individual)
- Solo código de barras del tracking
- No hay tracking individual de items
```

#### **Notificaciones Enviadas:**

**📧 Email al Cliente (Remitente):**
```
Asunto: ✅ Recolección Completada - Tracking: MIA123456

¡Tu paquete ha sido recolectado!

📦 FACTURA GENERADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Código de tracking: MIA123456
Recolección: REC-2025-001234
Fecha: 30 de Diciembre, 2025 - 9:30 AM

✅ ITEMS RECOLECTADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. TV Samsung 55\" QLED (x2) ✓
2. Laptop Dell Inspiron 15 (x1) ✓
3. Caja con libros (x3) ✓

Total: 6 items verificados

👤 RECOLECTADO POR
Carlos Rodríguez
Hora: 9:30 AM

📸 EVIDENCIA
• 3 fotos adjuntas
• Firma digital recibida

📍 PRÓXIMO PASO
Tu paquete llegará a nuestro almacén en Miami.
Te notificaremos cuando esté listo para envío.

🔗 RASTREO EN TIEMPO REAL
https://envios.com/track/MIA123456

Estado actual: Recolectado ✅
Próximo: En almacén Miami

Saludos,
Equipo de Envíos Express RD
```

**📧 Email al Destinatario (RD):**
```
Asunto: 📦 Tu paquete está en camino - MIA123456

¡Hola Juan Pérez!

Te informamos que Tech Store Miami ha enviado un paquete a tu nombre.

📦 INFORMACIÓN DEL ENVÍO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tracking: MIA123456
Remitente: Tech Store Miami (USA)
Destinatario: Juan Pérez
Dirección: Av. Principal #123, Los Prados, SD

📋 CONTENIDO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 2 TVs Samsung 55"
• 1 Laptop Dell
• 3 Cajas con libros
Total: 6 items

⏱️ TIEMPO ESTIMADO DE ENTREGA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5-7 días hábiles
Llegada estimada: 6 de Enero, 2026

📍 ESTADO ACTUAL
Recolectado en Miami ✅
Próximo: Procesamiento en almacén

🔗 RASTREAR ENVÍO
https://envios.com/track/MIA123456

Te mantendremos informado en cada paso.

Saludos,
Equipo de Envíos Express RD
```

**📱 WhatsApp al Destinatario:**
```
📦 *Envíos Express RD*

¡Tu paquete viene en camino! 🎉

*Tracking:* MIA123456
*De:* Tech Store Miami 🇺🇸
*Para:* Juan Pérez 🇩🇴

*Contenido:*
• 2 TVs Samsung 55"
• 1 Laptop Dell
• 3 Cajas con libros

*Llegada estimada:* 6 Enero 2026

🔗 Rastrea aquí:
envios.com/track/MIA123456

Te avisaremos en cada paso ✅
```

---

```
┌─────────────────────────────────────────────────────────────────┐
│           ETAPA 3: PROCESAMIENTO EN ALMACÉN MIAMI               │
│           Almacenista → Sistema → Dispositivos                   │
└─────────────────────────────────────────────────────────────────┘
```

### **4️⃣ LLEGADA A ALMACÉN MIAMI**

**Actor:** Personal de Almacén Miami
**Ubicación:** Warehouse Miami
**Dispositivo:** Depende del modo

#### **Acción Manual (Sin RFID):**
```javascript
// Operador escanea código de barras o busca por tracking
PUT /api/facturas/MIA123456/actualizar-estado
{
  estado: "en_almacen_miami",
  ubicacion: "almacen_miami",
  estante: "A-15",
  notas: "Paquetes almacenados temporalmente"
}
```

#### **Sistema Actualiza:**
```javascript
await db.collection('facturas').doc('MIA123456').update({
  estado: "en_almacen_miami",
  almacen: {
    ubicacion: "miami",
    estante: "A-15",
    fechaIngreso: NOW
  },
  historial: admin.firestore.FieldValue.arrayUnion({
    fecha: NOW,
    estado: "en_almacen_miami",
    accion: "Ingreso a almacén",
    usuario: "almacenista_miami_01"
  })
});
```

#### **Notificaciones:**

**📧 Email al Remitente:**
```
Asunto: 📍 Actualización: Tu paquete llegó a nuestro almacén

Tracking: MIA123456

Tu paquete ha llegado a nuestro centro de distribución en Miami.

📍 UBICACIÓN ACTUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Almacén: Miami Distribution Center
Estado: En procesamiento
Hora de llegada: 30 Dic, 2:15 PM

📦 PRÓXIMOS PASOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Inspección de calidad
2. Etiquetado y empaque
3. Asignación a contenedor
4. Envío a República Dominicana

Te notificaremos cuando se envíe.

🔗 Rastrear: envios.com/track/MIA123456
```

**📱 SMS al Destinatario:**
```
📦 Envíos Express RD
Tu paquete MIA123456 llegó a almacén Miami
Próximo: Envío a RD en 1-2 días
Track: envios.com/track/MIA123456
```

---

### **5️⃣ ITEMS LLEGAN AL ALMACÉN MIAMI - YA ETIQUETADOS** 📦

**Actor:** Personal de Almacén
**Ubicación:** Almacén Miami
**Estado:** Items **ya vienen etiquetados** desde la recolección

> **IMPORTANTE:** Las etiquetas RFID (si aplica) ya fueron impresas y pegadas por el recolector en el domicilio del cliente. El almacén Miami **NO imprime etiquetas**, solo las escanea al entrar a contenedores.

#### **Proceso en Almacén:**

```javascript
// Items llegan al almacén con etiquetas ya pegadas
// Personal solo registra llegada y almacena temporalmente

PUT /api/facturas/MIA123456/registrar-llegada-almacen
{
  ubicacion: "almacen_miami",
  estante: "A-15",
  usuarioId: "almacenista_001"
}

// Backend actualiza
await db.collection('facturas').doc('MIA123456').update({
  estado: "en_almacen_miami",
  almacen: {
    ubicacion: "miami",
    estante: "A-15",
    fechaIngreso: NOW
  },
  historial: admin.firestore.FieldValue.arrayUnion({
    fecha: NOW,
    estado: "en_almacen_miami",
    accion: "Items con etiquetas RFID ya pegadas almacenados",
    usuario: "almacenista_001"
  })
});

console.log('✅ Factura MIA123456 en almacén Miami');
console.log('📋 Items ya vienen etiquetados desde recolección');
```

**Estado de los items al llegar:**
- ✅ 6 etiquetas RFID ya pegadas en los items físicos (si empresa tiene RFID)
- ✅ Tags RFID ya codificados y registrados en sistema
- ✅ Catálogo `rfid_tags` ya actualizado desde recolección
- ✅ Listos para escanear cuando entren a contenedor

**El almacén NO hace nada con etiquetas, solo:**
1. Recibe los items
2. Los almacena temporalmente
3. Espera a asignarlos a un contenedor

---

**EXCEPCIÓN: Cliente lleva directamente al almacén**

Si un cliente lleva su envío directamente al almacén Miami (sin recolección a domicilio), **ENTONCES SÍ se imprimen etiquetas en el almacén**:

```javascript
// Solo cuando cliente lleva directamente
if (factura.origenIngreso === "cliente_directo") {
  console.log('📦 Cliente entregó directamente en almacén');
  console.log('🖨️ Imprimiendo etiquetas en almacén...');

  // Usar impresora ZD621 del almacén
  await printRFIDLabelsForInvoice({
    facturaId: factura.id,
    tracking: factura.codigoTracking,
    items: factura.items,
    printer: almacenPrinterConfig,
    ubicacion: "almacen_miami"
  });
}

---

### **6️⃣ ASIGNACIÓN A CONTENEDOR** 📦

**Actor:** Sistema (automático con RFID) o Manual
**Ubicación:** Almacén Miami
**Dispositivo:** 📡 **Lector RFID FX9600** (en puerta de contenedor)

#### **MODO A: CON RFID (Automático)**

```javascript
// Operador lleva items físicos hacia contenedor
// Items pasan por puerta con lector RFID FX9600

// 🔄 AUTOMÁTICO - Sin intervención humana:

// 1. Lector detecta tag
{
  epc: "E280116060000020936C5C4A",
  rssi: -45,  // Señal fuerte
  antenna: 1,
  timestamp: "2025-12-30T15:30:00Z"
}

// 2. Backend procesa lectura
async function processTagRead(epc) {
  // 2a. Buscar en catálogo
  const tag = await db.collection('rfid_tags').doc(epc).get();

  if (!tag.exists) {
    console.log('⚠️ Tag desconocido');
    return;
  }

  const tagData = tag.data();
  console.log(`📦 Tag leído:
    Factura: ${tagData.facturaTracking}
    Item: ${tagData.itemDescripcion}
    Unidad: ${tagData.numeroUnidad} de ${tagData.cantidadTotal}
  `);

  // 2b. Buscar contenedor activo
  const contenedor = await db.collection('contenedores')
    .where('companyId', '==', tagData.companyId)
    .where('estado', '==', 'activo')
    .limit(1)
    .get();

  if (contenedor.empty) {
    console.log('⚠️ No hay contenedor activo');
    return;
  }

  const cont = contenedor.docs[0];
  const contData = cont.data();

  // 2c. Actualizar unidad específica en factura
  await db.collection('facturas').doc(tagData.facturaId).update({
    [`items.${tagData.itemIndex}.unidades.${tagData.numeroUnidad - 1}.estado`]: 'en_contenedor',
    [`items.${tagData.itemIndex}.unidades.${tagData.numeroUnidad - 1}.ultimaLectura`]: {
      fecha: NOW,
      lectorId: "reader_door_001",
      contenedorId: cont.id
    }
  });

  // 2d. Verificar si es la primera unidad de esta factura
  const factura = await db.collection('facturas').doc(tagData.facturaId).get();
  const facturaData = factura.data();

  if (!facturaData.contenedorId) {
    // Primera vez: Asignar factura completa a contenedor
    await db.collection('facturas').doc(tagData.facturaId).update({
      contenedorId: cont.id,
      estado: 'en_contenedor',
      fechaAsignacion: NOW
    });

    await cont.ref.update({
      facturas: admin.firestore.FieldValue.arrayUnion(tagData.facturaId),
      'estadisticas.totalFacturas': admin.firestore.FieldValue.increment(1)
    });

    console.log(`✅ Factura ${tagData.facturaTracking} asignada a ${contData.codigo}`);
  }

  // 2e. Calcular progreso
  let unidadesEnContenedor = 0;
  let totalUnidades = 0;

  facturaData.items.forEach(item => {
    totalUnidades += item.cantidad;
    item.unidades.forEach(unidad => {
      if (unidad.estado === 'en_contenedor') {
        unidadesEnContenedor++;
      }
    });
  });

  await db.collection('facturas').doc(tagData.facturaId).update({
    'estadisticasItems.unidadesEnContenedor': unidadesEnContenedor
  });

  const progreso = (unidadesEnContenedor / totalUnidades * 100).toFixed(0);

  console.log(`📊 Progreso: ${unidadesEnContenedor}/${totalUnidades} (${progreso}%)`);

  // 2f. WebSocket en tiempo real
  io.to('dashboard_miami').emit('tag_read', {
    facturaTracking: tagData.facturaTracking,
    item: tagData.itemDescripcion,
    unidad: `${tagData.numeroUnidad}/${tagData.cantidadTotal}`,
    progreso: `${unidadesEnContenedor}/${totalUnidades}`,
    contenedor: contData.codigo
  });

  // ⏱️ TODO ESTO en <2 segundos
}
```

#### **Dashboard en Tiempo Real:**

```
CONTENEDOR C-2025-001 (ACTIVO) 🟢
├── Total facturas: 12
├── Total items esperados: 47
├── Items escaneados: 32/47 (68%)
└── Última actividad: hace 3 seg

┌────────────────────────────────────────────┐
│ MIA123456 - Juan Pérez                     │
│ [████████████████░░░░] 4/6 (67%)          │
│                                            │
│ ✅ TV Samsung 55" (2/2) COMPLETO          │
│ ✅ Laptop Dell (1/1) COMPLETO             │
│ ⚠️  Caja libros (1/3) FALTA 2             │
└────────────────────────────────────────────┘

Actividad en vivo:
🟢 15:30:23  MIA123456 → Caja libros (1/3) ← AHORA
🟢 15:30:18  MIA123457 → Monitor (1/1)
🟢 15:30:12  MIA123456 → Laptop Dell (1/1)
🟢 15:30:05  MIA123456 → TV (2/2)
🟢 15:30:01  MIA123456 → TV (1/2)
```

#### **MODO B: SIN RFID (Manual)**

```javascript
// Operador escanea código de barras con celular/escáner
POST /api/contenedores/C-2025-001/agregar-factura
{
  facturaId: "MIA123456",
  metodogreso": "manual",
  escaneadoPor: "almacenista_001"
}

// Sistema actualiza
await db.collection('facturas').doc('MIA123456').update({
  contenedorId: "C-2025-001",
  estado: "en_contenedor",
  fechaAsignacion: NOW
});
```

---

---

### **7️⃣ CIERRE DE CONTENEDOR** 🔒

**Actor:** Supervisor de Almacén Miami
**Ubicación:** Almacén Miami
**Dispositivo:** PC/Dashboard

#### **Validación Antes de Cerrar:**

```javascript
// Supervisor intenta cerrar contenedor
POST /api/contenedores/C-2025-001/validar-cierre

// Backend valida automáticamente
async function validateBeforeClosing(contenedorId) {
  const contenedor = await getContenedor(contenedorId);
  const company = await getCompany(contenedor.companyId);

  // Si empresa tiene RFID habilitado
  if (company.hardwareConfig.modulos.rfid_tracking) {
    const facturas = await getFacturasDelContenedor(contenedorId);
    const alertas = [];

    for (const factura of facturas) {
      let totalUnidades = 0;
      let unidadesEnContenedor = 0;

      factura.items.forEach(item => {
        totalUnidades += item.cantidad;
        item.unidades.forEach(unidad => {
          if (unidad.estado === 'en_contenedor') {
            unidadesEnContenedor++;
          }
        });
      });

      if (unidadesEnContenedor < totalUnidades) {
        alertas.push({
          facturaTracking: factura.codigoTracking,
          destinatario: factura.destinatario.nombre,
          unidadesFaltantes: totalUnidades - unidadesEnContenedor,
          totalUnidades,
          detallesFaltantes: factura.items.filter(item => {
            const faltantes = item.unidades.filter(u =>
              u.estado !== 'en_contenedor'
            ).length;
            return faltantes > 0;
          }).map(item => ({
            descripcion: item.descripcion,
            faltantes: item.unidades.filter(u => u.estado !== 'en_contenedor').length,
            total: item.cantidad
          }))
        });
      }
    }

    if (alertas.length > 0) {
      return {
        success: false,
        canClose: false,
        alertas,
        mensaje: `⚠️ HAY ${alertas.length} FACTURAS INCOMPLETAS`
      };
    }
  }

  return {
    success: true,
    canClose: true,
    totalFacturas: contenedor.facturas.length,
    totalItems: await calcularTotalItems(contenedorId)
  };
}
```

#### **Dashboard Muestra:**

```
⚠️ NO PUEDES CERRAR ESTE CONTENEDOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Facturas incompletas detectadas:

┌────────────────────────────────────────────┐
│ ❌ MIA123456 - Juan Pérez                  │
│                                            │
│ Faltan 2 de 6 items totales                │
│                                            │
│ Items faltantes:                           │
│ • Caja de libros: 2 de 3 faltan           │
│                                            │
│ Items completos:                           │
│ • ✅ TV Samsung 55" (2/2)                  │
│ • ✅ Laptop Dell (1/1)                     │
│ • ⚠️  Caja libros (1/3)                    │
└────────────────────────────────────────────┘

ACCIONES:
[Buscar Items Faltantes] [Marcar como Perdidos] [Cancelar]
```

#### **Si TODO está OK:**

```javascript
POST /api/contenedores/C-2025-001/cerrar
{
  cerradoPor: "supervisor_miami_01",
  notas: "Contenedor completo, listo para envío"
}

// Backend:
async function cerrarContenedor(contenedorId, data) {
  const contenedor = await getContenedor(contenedorId);
  const facturas = await getFacturasDelContenedor(contenedorId);

  // 1. Generar manifiesto
  const manifiesto = {
    contenedorId,
    codigo: contenedor.codigo,
    fechaCierre: NOW,
    cerradoPor: data.cerradoPor,
    totalFacturas: facturas.length,

    facturas: facturas.map(f => ({
      tracking: f.codigoTracking,
      destinatario: f.destinatario.nombre,
      itemsEsperados: f.estadisticasItems?.totalUnidadesFisicas || f.items.reduce((sum, i) => sum + i.cantidad, 0),
      tags: f.items.flatMap(item =>
        item.unidades?.map(u => u.rfid?.epc) || []
      ).filter(Boolean)
    })),

    // Hash para verificar integridad
    hash: generateHash(facturas)
  };

  // 2. Guardar manifiesto
  await db.collection('manifiestos').add(manifiesto);

  // 3. Actualizar contenedor
  await db.collection('contenedores').doc(contenedorId).update({
    estado: 'cerrado',
    estadoTransito: 'en_transito_rd',
    fechaCierre: NOW,
    cerradoPor: data.cerradoPor,
    manifiestoId: manifiestoRef.id
  });

  // 4. Actualizar todas las facturas
  for (const factura of facturas) {
    await db.collection('facturas').doc(factura.id).update({
      estado: 'en_transito',
      historial: admin.firestore.FieldValue.arrayUnion({
        fecha: NOW,
        estado: 'en_transito',
        accion: `Contenedor ${contenedor.codigo} cerrado y enviado a RD`,
        contenedorId
      })
    });
  }

  console.log(`✅ Contenedor ${contenedor.codigo} cerrado con ${facturas.length} facturas`);

  return {
    success: true,
    mensaje: 'Contenedor cerrado y enviado',
    manifiestoId: manifiestoRef.id
  };
}
```

#### **Notificaciones Enviadas:**

**📧 Email Masivo a TODOS los Destinatarios:**

```
Asunto: 🚢 Tu paquete está en camino a República Dominicana

¡Buenas noticias Juan Pérez!

Tu paquete ha salido de Miami y está en tránsito a República Dominicana.

📦 INFORMACIÓN DEL ENVÍO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tracking: MIA123456
Contenedor: C-2025-001

🚢 TRANSPORTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Salida: Miami, FL
Destino: Santo Domingo, RD
Fecha de envío: 30 Diciembre 2025

📦 TU PAQUETE INCLUYE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 2 TVs Samsung 55"
• 1 Laptop Dell
• 3 Cajas con libros

⏱️ TIEMPO ESTIMADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3-5 días de tránsito
Llegada estimada: 3 de Enero 2026

📍 PRÓXIMOS PASOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ En tránsito a RD
⏸️  Llegada a almacén RD (próximo)
⏸️  Asignación a ruta de entrega
⏸️  Entrega a tu domicilio

🔗 RASTREAR EN TIEMPO REAL
https://envios.com/track/MIA123456

Te notificaremos cuando llegue a RD.

Gracias por tu paciencia,
Equipo de Envíos Express RD
```

**📱 WhatsApp a Destinatarios:**

```
🚢 *Envíos Express RD*

¡Tu paquete va en camino! 🎉

*Tracking:* MIA123456
*Estado:* En tránsito a RD 🇩🇴

📦 2 TVs + 1 Laptop + 3 Cajas

⏱️ Llegada estimada: 3 Enero
📍 Te avisaremos cuando llegue a RD

🔗 Track: envios.com/track/MIA123456
```

**🔔 Dashboard Interno:**

```
✅ CONTENEDOR CERRADO Y ENVIADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Código: C-2025-001
Facturas: 12
Items totales: 47
Destino: República Dominicana

Cerrado por: Supervisor Miami
Fecha: 30 Dic 2025, 4:30 PM

Manifiesto generado: MAN-2025-567

Estado: En tránsito 🚢

[Ver Manifiesto] [Notificar RD] [Imprimir Reporte]
```

---

```
┌─────────────────────────────────────────────────────────────────┐
│                    🚢 TRANSPORTE                                 │
│                    3-5 días de tránsito                          │
└─────────────────────────────────────────────────────────────────┘
```

Durante este tiempo:
- Sistema envía actualizaciones cada 24h
- GPS tracking del contenedor (si disponible)
- Notificaciones automáticas de progreso

**Mensaje cada 24h:**
```
📱 SMS Diario:
Tu paquete MIA123456 sigue en tránsito.
Día 2 de 5. Llegada estimada: 3 Enero.
envios.com/track/MIA123456
```

---

```
┌─────────────────────────────────────────────────────────────────┐
│         ETAPA 4: RECEPCIÓN EN REPÚBLICA DOMINICANA              │
│         Almacén RD → Sistema → Dispositivos                      │
└─────────────────────────────────────────────────────────────────┘
```

### **8️⃣ LLEGADA A ALMACÉN RD** 📍

**Actor:** Personal de Almacén RD
**Ubicación:** Warehouse Santo Domingo
**Dispositivo:** 📡 **Lector RFID FX9600** (en puerta almacén) o Manual

#### **MODO A: CON RFID (Automático)**

```javascript
// Operadores descargan contenedor
// Items pasan por puerta con lector FX9600

// 🔄 LECTURA MASIVA AUTOMÁTICA:

// 1. Lector lee TODOS los tags en ráfagas (hasta 1,300/seg)
const tagsLeidos = [
  { epc: "E280116060000020936C5C4A", rssi: -40, antenna: 1, timestamp: NOW },
  { epc: "E280116060000020936C5C4B", rssi: -42, antenna: 2, timestamp: NOW },
  { epc: "E280116060000020936C5C4C", rssi: -38, antenna: 1, timestamp: NOW },
  ... // 45 más en ~8 segundos
];

// 2. Backend procesa lectura masiva
async function processBulkRead(contenedorId, tagsLeidos) {
  console.log(`📡 ${tagsLeidos.length} tags leídos en recepción RD`);

  // 2a. Obtener manifiesto de Miami
  const contenedor = await getContenedor(contenedorId);
  const manifiesto = await getManifiesto(contenedor.manifiestoId);

  // 2b. Comparar EPCs leídos vs. esperados
  const epcsEsperados = new Set();
  const epcsLeidos = new Set(tagsLeidos.map(t => t.epc));

  manifiesto.facturas.forEach(f => {
    f.tags.forEach(epc => epcsEsperados.add(epc));
  });

  // 2c. Análisis de discrepancias
  const faltantes = [...epcsEsperados].filter(epc => !epcsLeidos.has(epc));
  const extras = [...epcsLeidos].filter(epc => !epcsEsperados.has(epc));

  console.log(`
    Esperados: ${epcsEsperados.size}
    Recibidos: ${epcsLeidos.size}
    Faltantes: ${faltantes.length}
    Extras: ${extras.length}
  `);

  // 2d. Si hay discrepancias
  if (faltantes.length > 0 || extras.length > 0) {
    const discrepancias = {
      contenedorId,
      fecha: NOW,
      faltantes: await Promise.all(
        faltantes.map(async epc => {
          const tag = await getRFIDTag(epc);
          return {
            epc,
            factura: tag.facturaTracking,
            item: tag.itemDescripcion,
            unidad: `${tag.numeroUnidad}/${tag.cantidadTotal}`,
            destinatario: tag.destinatario.nombre
          };
        })
      ),
      extras: await Promise.all(
        extras.map(async epc => {
          const tag = await getRFIDTag(epc);
          return {
            epc,
            factura: tag?.facturaTracking || 'Desconocido',
            item: tag?.itemDescripcion || 'Desconocido'
          };
        })
      )
    };

    // Guardar discrepancias
    await db.collection('discrepancias').add(discrepancias);

    // Actualizar contenedor
    await db.collection('contenedores').doc(contenedorId).update({
      estado: 'recibido_con_discrepancia',
      estadoTransito: 'recibido_rd',
      fechaRecepcion: NOW,
      discrepancias: {
        faltantes: faltantes.length,
        extras: extras.length,
        detalleId: discrepanciasRef.id
      }
    });

    // ⚠️ ALERTA INMEDIATA
    await enviarAlertaDiscrepancias(discrepancias);

  } else {
    // ✅ TODO OK
    await db.collection('contenedores').doc(contenedorId).update({
      estado: 'recibido_completo',
      estadoTransito: 'recibido_rd',
      fechaRecepcion: NOW,
      discrepancias: null
    });

    console.log(`✅ Contenedor recibido completo: ${epcsLeidos.size} items`);
  }

  // 2e. Actualizar todas las facturas
  for (const tag of tagsLeidos) {
    const tagData = await getRFIDTag(tag.epc);

    // Actualizar unidad específica
    await db.collection('facturas').doc(tagData.facturaId).update({
      [`items.${tagData.itemIndex}.unidades.${tagData.numeroUnidad - 1}.estado`]: 'en_almacen_rd',
      [`items.${tagData.itemIndex}.unidades.${tagData.numeroUnidad - 1}.ultimaLectura`]: {
        fecha: NOW,
        ubicacion: 'almacen_rd',
        lectorId: 'reader_rd_001'
      }
    });
  }

  // 2f. Actualizar facturas completas
  const facturasUnicas = new Set(tagsLeidos.map(t => t.facturaId));

  for (const facturaId of facturasUnicas) {
    const factura = await getFactura(facturaId);

    // Verificar si todas las unidades llegaron
    let todasEnRD = true;
    factura.items.forEach(item => {
      item.unidades.forEach(unidad => {
        if (unidad.estado !== 'en_almacen_rd') {
          todasEnRD = false;
        }
      });
    });

    await db.collection('facturas').doc(facturaId).update({
      estado: todasEnRD ? 'recibido_rd' : 'recibido_parcial_rd',
      historial: admin.firestore.FieldValue.arrayUnion({
        fecha: NOW,
        estado: 'recibido_rd',
        accion: 'Recepción automática vía RFID en almacén RD',
        itemsRecibidos: factura.items.flatMap(i => i.unidades).filter(u => u.estado === 'en_almacen_rd').length,
        itemsEsperados: factura.estadisticasItems.totalUnidadesFisicas
      })
    });
  }

  // ⏱️ Todo el proceso: ~15 segundos para 50 items
  return {
    success: true,
    itemsLeidos: epcsLeidos.size,
    itemsEsperados: epcsEsperados.size,
    discrepancias: faltantes.length > 0 || extras.length > 0
  };
}
```

#### **Dashboard Muestra (CON discrepancias):**

```
⚠️ CONTENEDOR C-2025-001 RECIBIDO CON DISCREPANCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 RESUMEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Esperados: 47 items
Recibidos: 46 items
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Faltantes: 1 ❌
Extras: 0

┌────────────────────────────────────────────┐
│ ❌ ITEMS FALTANTES                         │
├────────────────────────────────────────────┤
│ Factura: MIA123456                         │
│ Item: Caja de libros (3/3)                │
│ Destinatario: Juan Pérez                   │
│ EPC: E280116060000020936C5C4F              │
│                                            │
│ [Marcar como Perdido] [Contactar Miami]    │
└────────────────────────────────────────────┘

ACCIONES:
[Confirmar Recepción Parcial] [Reportar a Miami] [Generar Reporte]
```

#### **Notificaciones Enviadas:**

**⚠️ Email Urgente a Supervisores Miami y RD:**

```
Asunto: 🚨 ALERTA: Discrepancia en Contenedor C-2025-001

ATENCIÓN URGENTE

Se detectó discrepancia automática vía sistema RFID:

🚨 CONTENEDOR: C-2025-001
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fecha recepción: 3 Enero 2026, 10:15 AM
Almacén: Santo Domingo, RD

📊 DISCREPANCIA DETECTADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Esperados: 47 items
Recibidos: 46 items
Faltantes: 1 item

❌ ITEM FALTANTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Factura: MIA123456
Destinatario: Juan Pérez
Item: Caja de libros educativos (unidad 3 de 3)
EPC: E280116060000020936C5C4F
Última ubicación conocida: Almacén Miami (30 Dic)

🔍 ACCIONES REQUERIDAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Miami:
• Verificar si item quedó en almacén
• Revisar video de carga de contenedor
• Confirmar si se despachó

RD:
• Confirmar recepción parcial
• Notificar a cliente
• Esperar resolución de Miami

🔗 Ver Detalle Completo:
https://admin.envios.com/contenedores/C-2025-001/discrepancias

ESTE MENSAJE REQUIERE ACCIÓN INMEDIATA

Sistema Automático de Alertas
Envíos Express RD
```

**📧 Email al Destinatario (Juan Pérez):**

```
Asunto: 📦 Actualización importante sobre tu paquete MIA123456

Estimado Juan Pérez,

Tu paquete ha llegado a nuestro almacén en República Dominicana.

📦 PAQUETE: MIA123456
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Estado: Recibido parcialmente

✅ ITEMS RECIBIDOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• TV Samsung 55" (2 unidades) ✅
• Laptop Dell Inspiron 15 (1 unidad) ✅
• Caja de libros (2 de 3 unidades) ✅

⚠️ ITEM PENDIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Caja de libros educativos (1 unidad)

🔍 ¿QUÉ ESTAMOS HACIENDO?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Estamos investigando con nuestro almacén en Miami.
Posibles escenarios:
1. Item quedó en Miami (será enviado en próximo contenedor)
2. Error en el conteo (poco probable con sistema RFID)

⏱️ TIEMPO DE RESOLUCIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
24-48 horas para investigación
Te mantendremos informado

💰 TUS OPCIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Esperar el item faltante (sin costo adicional)
2. Recibir los items disponibles ahora
3. Reembolso parcial del item faltante

📞 CONTACTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Atención al cliente: +1-809-555-9000
Email: support@envios.com

Lamentamos este inconveniente.
Resolveremos esto lo antes posible.

Equipo de Envíos Express RD
```

---

### **9️⃣ CONFIRMACIÓN DE RECEPCIÓN** ✅

**Actor:** Supervisor Almacén RD
**Ubicación:** Almacén RD
**Dispositivo:** PC

```javascript
POST /api/almacen-rd/contenedores/C-2025-001/confirmar-recepcion
{
  confirmadoPor: "supervisor_rd_01",
  notas: "1 item faltante reportado a Miami. Resto OK.",
  discrepanciasResueltas: false, // Aún pendiente
  accionTomada: "contactado_miami"
}

// Backend
await db.collection('contenedores').doc('C-2025-001').update({
  estado: 'recibido_confirmado',
  confirmacion: {
    fecha: NOW,
    confirmadoPor: data.confirmadoPor,
    notas: data.notas
  }
});

// Liberar facturas COMPLETAS para asignación a rutas
const facturas = await getFacturasDelContenedor('C-2025-001');

for (const factura of facturas) {
  // Solo si TODAS las unidades están presentes
  const todasPresentes = factura.items.every(item =>
    item.unidades.every(u => u.estado === 'en_almacen_rd')
  );

  if (todasPresentes) {
    await db.collection('facturas').doc(factura.id).update({
      estado: 'disponible_para_ruta',
      disponibleParaAsignacion: true
    });
  } else {
    // Factura incompleta: mantener en espera
    await db.collection('facturas').doc(factura.id).update({
      estado: 'en_espera_items_faltantes',
      disponibleParaAsignacion: false
    });
  }
}
```

---

```
┌─────────────────────────────────────────────────────────────────┐
│              ETAPA 5: PREPARACIÓN DE RUTAS                       │
│              Almacén RD → Rutas → Cargadores                     │
└─────────────────────────────────────────────────────────────────┘
```

### **🔟 ASIGNACIÓN A RUTAS** 🗺️

**Actor:** Supervisor de Rutas
**Ubicación:** Oficina RD
**Dispositivo:** PC/Dashboard

```javascript
// Supervisor crea ruta
POST /api/rutas/crear
{
  nombre: "RUTA CAPITAL - ZONA NORTE",
  zona: "Santo Domingo - Los Prados, Naco, Piantini",
  repartidorId: "user_miguel_001",
  vehiculo: "Camioneta #5",
  fechaEntrega: "2026-01-04",
  horaInicio: "08:00"
}

// Backend crea ruta
const rutaId = await db.collection('rutas').add({
  codigo: "RUTA-CAP-2026-0104-001",
  nombre: data.nombre,
  zona: data.zona,
  repartidor: {
    id: data.repartidorId,
    nombre: "Miguel Santos",
    telefono: "+1-809-555-3000",
    vehiculo: "Camioneta #5"
  },
  estado: "creada",
  paquetes: [],
  estadisticas: {
    totalPaquetes: 0,
    totalItems: 0,
    pesoTotal: 0
  },
  fechaEntrega: data.fechaEntrega,
  created_at: NOW
});

// Asignar paquetes a la ruta
POST /api/facturas/MIA123456/asignar-ruta
{
  rutaId: rutaId,
  prioridad: "normal"
}

// Backend actualiza
await db.collection('facturas').doc('MIA123456').update({
  rutaAsignada: "RUTA-CAP-2026-0104-001",
  rutaId: rutaId,
  estado: "asignada_ruta",
  historial: admin.firestore.FieldValue.arrayUnion({
    fecha: NOW,
    estado: 'asignada_ruta',
    accion: `Asignado a ruta ${data.nombre}`,
    repartidor: "Miguel Santos"
  })
});

await db.collection('rutas').doc(rutaId).update({
  paquetes: admin.firestore.FieldValue.arrayUnion('MIA123456'),
  'estadisticas.totalPaquetes': admin.firestore.FieldValue.increment(1),
  'estadisticas.totalItems': admin.firestore.FieldValue.increment(6)
});
```

#### **Notificación al Destinatario:**

```
📧 Email:
Asunto: 🚚 Tu paquete será entregado mañana - MIA123456

¡Excelentes noticias Juan Pérez!

Tu paquete ha sido programado para entrega.

📅 ENTREGA PROGRAMADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fecha: Sábado, 4 de Enero 2026
Ventana horaria: 8:00 AM - 5:00 PM

🚚 REPARTIDOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nombre: Miguel Santos
Teléfono: +1-809-555-3000
Vehículo: Camioneta #5

📍 DIRECCIÓN DE ENTREGA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Av. Principal #123
Los Prados, Santo Domingo

📦 TU PAQUETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 2 TVs Samsung 55"
• 1 Laptop Dell
• 2 Cajas de libros ⚠️ (1 pendiente)

⚠️ NOTA IMPORTANTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Una caja de libros está pendiente.
Recibirás 5 de 6 items mañana.
El item faltante será enviado sin costo adicional.

💡 PREPARA LO SIGUIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Cédula de identidad
✓ Espacio para recibir items grandes
✓ Alguien mayor de 18 años presente

📞 CONTACTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
El repartidor te llamará antes de llegar.

🔗 Rastreo: envios.com/track/MIA123456

¡Nos vemos mañana!
Equipo de Envíos Express RD
```

**📱 SMS:**
```
🚚 Envíos Express RD
Tu paquete MIA123456 será entregado MAÑANA 4 Ene, 8AM-5PM
Repartidor: Miguel (+1-809-555-3000)
Preparar: Cédula, espacio
Track: envios.com/track/MIA123456
```

---

### **1️⃣1️⃣ CARGA EN VEHÍCULO** 🚛

**Actor:** Cargador
**Ubicación:** Almacén RD
**Dispositivo:** 📱 **Zebra TC21 Handheld** (con RFID) o Manual

#### **MODO A: CON TC21 + RFID (Validación Automática)**

```javascript
// 1. Cargador escanea QR de la ruta
// Código QR: RUTA-CAP-2026-0104-001

GET /api/rutas/RUTA-CAP-2026-0104-001/paquetes

// Backend responde
{
  rutaId: "ruta_123",
  codigo: "RUTA-CAP-2026-0104-001",
  nombre: "RUTA CAPITAL - ZONA NORTE",
  repartidor: "Miguel Santos",

  paquetes: [
    {
      tracking: "MIA123456",
      destinatario: "Juan Pérez",
      direccion: "Av. Principal #123, Los Prados",
      itemsEsperados: 5, // Solo 5 de 6 (1 faltante)

      // EPCs de los items DISPONIBLES
      tags: [
        "E280116060000020936C5C4A", // TV 1
        "E280116060000020936C5C4B", // TV 2
        "E280116060000020936C5C4C", // Laptop
        "E280116060000020936C5C4D", // Caja 1
        "E280116060000020936C5C4E"  // Caja 2
        // Falta: E280116060000020936C5C4F (Caja 3)
      ]
    },
    // ... 14 paquetes más
  ],

  totalPaquetes: 15,
  totalItems: 72
}

// 2. App TC21 descarga lista
// Muestra checklist:

┌────────────────────────────────────────┐
│ RUTA CAPITAL - ZONA NORTE              │
│ [░░░░░░░░░░░░░░░░░░░░] 0/15 (0%)     │
├────────────────────────────────────────┤
│ ☐ MIA123456 - Juan Pérez (5 items)    │
│ ☐ MIA123457 - María López (3 items)   │
│ ☐ MIA123458 - Pedro Gómez (2 items)   │
│ ...                                     │
└────────────────────────────────────────┘

// 3. Cargador toma item físico (TV #1)
// ACERCA TC21 al paquete (3-6 pies)

// TC21 lee tag automáticamente
{
  epc: "E280116060000020936C5C4A",
  timestamp: NOW
}

// 4. App valida EN EL DISPOSITIVO (offline)
if (tags_de_ruta.includes(epc)) {
  // ✅ CORRECTO

  // Vibración éxito
  vibrate(200, "success");

  // Pantalla verde
  showScreen("green", {
    titulo: "✅ CORRECTO",
    tracking: "MIA123456",
    item: "TV Samsung 55\" (1/2)",
    destinatario: "Juan Pérez",
    direccion: "Av. Principal #123"
  });

  // Sonido agradable
  playSound("beep_success.mp3");

  // Marcar en lista
  markAsLoaded({
    tracking: "MIA123456",
    epc: epc,
    timestamp: NOW
  });

  // Enviar a backend (WiFi/4G)
  socket.emit('item_cargado', {
    rutaId: "ruta_123",
    tracking: "MIA123456",
    epc: epc,
    itemDescripcion: "TV Samsung 55\" (1/2)",
    cargadorId: "user_jose_001",
    timestamp: NOW,
    gps: { lat: 18.486, lng: -69.931 }
  });

} else {
  // ❌ INCORRECTO - No es de esta ruta

  // Vibración error (fuerte, larga)
  vibrate(1000, "error");

  // Pantalla roja
  showScreen("red", {
    titulo: "⚠️ PAQUETE INCORRECTO",
    mensaje: "Este paquete NO pertenece a esta ruta",
    tracking: obtenerTracking(epc),
    rutaCorrecta: obtenerRuta(epc)
  });

  // Alarma sonora
  playAlarm("alert_loud.mp3");

  // Mostrar detalle
  showAlert({
    tipo: "error",
    titulo: "PAQUETE EQUIVOCADO",
    mensaje: `
      Este paquete es de otra ruta:

      Tracking: MIA123999
      Ruta correcta: RUTA SUR

      ❌ NO CARGAR EN ESTE VEHÍCULO
      Deja este paquete y toma el correcto.
    `,
    botones: ["Entendido"]
  });

  // Registrar error
  reportError({
    tipo: "paquete_ruta_incorrecta",
    epc: epc,
    trackingIncorrecto: "MIA123999",
    rutaIntentada: "RUTA-CAP-2026-0104-001",
    rutaCorrecta: "RUTA-SUR-2026-0104-002",
    cargadorId: "user_jose_001",
    timestamp: NOW
  });
}

// 5. Progreso en tiempo real
// Cada vez que se escanea, actualiza:

┌────────────────────────────────────────┐
│ RUTA CAPITAL - ZONA NORTE              │
│ [████████░░░░░░░░░░░░] 5/15 (33%)     │
├────────────────────────────────────────┤
│ ✅ MIA123456 - Juan Pérez (5/5) ✅    │
│ ☐ MIA123457 - María López (0/3)       │
│ ☐ MIA123458 - Pedro Gómez (0/2)       │
│ ...                                     │
│                                        │
│ Último: TV Samsung (2/2) - hace 5 seg │
└────────────────────────────────────────┘

Items cargados: 5
Items faltantes: 67
Errores: 0 ✅

[Continuar] [Ver Detalles]
```

#### **Dashboard en Oficina (Tiempo Real):**

```
🚛 CARGA EN PROGRESO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RUTA CAPITAL - ZONA NORTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cargador: José Ramírez
Inicio: 7:45 AM
Tiempo transcurrido: 12 minutos

┌────────────────────────────────────────┐
│ [████████░░░░░░░░░░░░] 5/15 (33%)     │
└────────────────────────────────────────┘

Items: 5/72 (7%)
Errores: 0 ✅

Actividad en vivo:
🟢 08:00:23  MIA123456 → TV (2/2) ← AHORA
🟢 08:00:18  MIA123456 → TV (1/2)
🟢 08:00:12  MIA123456 → Laptop
🟢 08:00:05  MIA123456 → Caja (2/2)
🟢 08:00:01  MIA123456 → Caja (1/2)

[Ver Mapa] [Detener Carga] [Exportar]
```

#### **Finalizar Carga:**

```javascript
// Cuando TODO está cargado (15/15)
// App muestra:

┌────────────────────────────────────────┐
│ ✅ RUTA COMPLETA                       │
│                                        │
│ 15/15 paquetes cargados               │
│ 72/72 items verificados               │
│                                        │
│ Tiempo total: 18 minutos               │
│ Errores: 0                             │
│                                        │
│ [Finalizar y Salir] [Imprimir Hoja]   │
└────────────────────────────────────────┘

// Cargador presiona "Finalizar"
POST /api/rutas/ruta_123/finalizar-carga
{
  finalizadoPor: "user_jose_001",
  timestamp: NOW,
  paquetesConfirmados: 15,
  itemsConfirmados: 72,
  errores: 0
}

// Backend
await db.collection('rutas').doc('ruta_123').update({
  estado: "lista_para_salir",
  carga: {
    completada: true,
    fecha: NOW,
    cargadoPor: "José Ramírez",
    duracion: 18, // minutos
    errores: 0
  }
});

// Actualizar todas las facturas
await updateBulk('facturas', paquetes, {
  estado: "cargado_vehiculo",
  fechaCarga: NOW
});
```

#### **Notificación al Supervisor:**

```
Dashboard → Supervisor

✅ RUTA LISTA PARA SALIR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RUTA CAPITAL - ZONA NORTE

Cargador: José Ramírez
Repartidor: Miguel Santos

15/15 paquetes ✅
72/72 items verificados ✅
0 errores ✅

Duración carga: 18 minutos
Hora finalización: 8:03 AM

[Autorizar Salida] [Ver Detalles] [Imprimir]
```

---

```
┌─────────────────────────────────────────────────────────────────┐
│              ETAPA 6: ENTREGA FINAL                              │
│              Ruta → Cliente → Confirmación                       │
└─────────────────────────────────────────────────────────────────┘
```

### **1️⃣2️⃣ SALIDA A RUTA** 🚗

**Actor:** Repartidor (Miguel Santos)
**Ubicación:** Almacén RD → Ruta
**Dispositivo:** 📱 **App Móvil** (smartphone o TC21)

#### **Autorización de Salida:**

```javascript
// Supervisor autoriza salida
POST /api/rutas/ruta_123/autorizar-salida
{
  autorizadoPor: "supervisor_rd_01",
  timestamp: NOW,
  checklistCompleto: true,
  notasPreSalida: "Todos los paquetes verificados. Ruta lista."
}

// Backend actualiza
await db.collection('rutas').doc('ruta_123').update({
  estado: "en_ruta",
  salida: {
    fecha: NOW,
    autorizadoPor: "supervisor_rd_01",
    horaReal: "08:15 AM", // vs horaPlaneada: "08:00 AM"
  }
});

// Actualizar todas las facturas de la ruta
await updateBulk('facturas', paquetes, {
  estado: "en_ruta",
  historial: admin.firestore.FieldValue.arrayUnion({
    fecha: NOW,
    estado: 'en_ruta',
    accion: 'Repartidor salió a ruta de entrega',
    repartidor: "Miguel Santos"
  })
});
```

#### **Notificación a Destinatarios:**

**📧 Email a TODOS los destinatarios de la ruta:**

```
Asunto: 🚚 Tu repartidor está en camino - MIA123456

¡Hola Juan Pérez!

Tu paquete está en camino a tu domicilio.

🚚 REPARTIDOR EN RUTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nombre: Miguel Santos
Teléfono: +1-809-555-3000
Vehículo: Camioneta #5
Placa: A123456

📦 TU PAQUETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tracking: MIA123456
Items: 5 artículos (2 TVs, 1 Laptop, 2 Cajas)

📍 DIRECCIÓN DE ENTREGA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Av. Principal #123
Los Prados, Santo Domingo

⏱️ VENTANA HORARIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hoy, 4 de Enero 2026
Entre 8:00 AM - 5:00 PM

📞 ¿QUÉ ESPERAR?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. El repartidor te llamará 15-30 min antes de llegar
2. Prepara tu cédula de identidad
3. Ten espacio listo para recibir los items
4. Debe estar presente una persona mayor de 18 años

🔗 RASTREAR EN VIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
https://envios.com/track/MIA123456

¡Gracias por tu paciencia!
Equipo de Envíos Express RD
```

**📱 SMS:**
```
🚚 Envíos Express RD
¡Tu repartidor está en camino!
Tracking: MIA123456
Repartidor: Miguel (+1-809-555-3000)
Te llamará antes de llegar. Prepara cédula.
Track en vivo: envios.com/track/MIA123456
```

#### **GPS Tracking en Tiempo Real:**

```javascript
// App del Repartidor envía ubicación cada 30 segundos
setInterval(() => {
  navigator.geolocation.getCurrentPosition(async (position) => {
    const gpsData = {
      rutaId: "ruta_123",
      repartidorId: "user_miguel_001",
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      speed: position.coords.speed, // m/s
      heading: position.coords.heading, // grados
      accuracy: position.coords.accuracy, // metros
      timestamp: NOW
    };

    // Enviar a Firebase Realtime Database (más rápido para GPS)
    await realtimeDb.ref(`gps_tracking/${rutaId}`).set(gpsData);

    // WebSocket para dashboard
    socket.emit('gps_update', gpsData);
  });
}, 30000); // cada 30 seg

// Clientes pueden ver en mapa en tiempo real
// https://envios.com/track/MIA123456/live-map
```

#### **Dashboard Tracking del Cliente:**

```
🗺️ RASTREO EN VIVO - MIA123456
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Mapa interactivo mostrando:]
🚚 ← Repartidor (en movimiento)
📍 ← Tu ubicación (Av. Principal #123)

Distancia: ~8.5 km
Tiempo estimado: 25 minutos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Estado actual: En ruta 🚚
Última actualización: hace 15 seg

Entregas antes que tú: 2
Tu posición en ruta: #3 de 15

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LÍNEA DE TIEMPO:
✅ 8:15 AM - Repartidor salió del almacén
✅ 8:42 AM - Primera entrega completada
✅ 9:18 AM - Segunda entrega completada
⏳ 9:35 AM - Aproximación a tu dirección (estimado)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Repartidor: Miguel Santos
Teléfono: +1-809-555-3000

[Llamar al Repartidor] [Reportar Problema]
```

---

### **1️⃣3️⃣ ENTREGA AL CLIENTE** 📦✅

**Actor:** Repartidor + Cliente
**Ubicación:** Domicilio del Cliente
**Dispositivo:** 📱 **App Móvil del Repartidor**

#### **Paso 1: Repartidor se acerca (15-30 min antes)**

```javascript
// Sistema detecta proximidad automáticamente
// Cuando repartidor está a 2-3 km del destino

if (distanciaAlDestino <= 2000) { // 2 km
  // Llamada automática al cliente
  await notifyCustomer({
    facturaId: "MIA123456",
    tipo: "proximity_call",
    mensaje: "Repartidor a 15-30 min de tu ubicación"
  });
}
```

**📞 Llamada Automática o SMS:**
```
🚚 Envíos Express RD

¡Hola Juan!
Soy Miguel, tu repartidor.

Estoy a 15-20 minutos de tu dirección.
¿Estarás disponible para recibir?

Si tienes algún problema, llámame:
+1-809-555-3000

Gracias!
```

#### **Paso 2: Repartidor llega al domicilio**

```javascript
// App del repartidor en el domicilio
// Muestra detalles de la entrega:

┌────────────────────────────────────────┐
│ ENTREGA #3 de 15                       │
├────────────────────────────────────────┤
│ MIA123456 - Juan Pérez                 │
│                                        │
│ 📍 Av. Principal #123                  │
│    Los Prados, Santo Domingo           │
│                                        │
│ 📦 5 ITEMS PARA ENTREGAR:              │
│ • TV Samsung 55" QLED (x2)             │
│ • Laptop Dell Inspiron 15 (x1)         │
│ • Caja de libros (x2 de 3)            │
│                                        │
│ ⚠️ NOTA: 1 caja pendiente             │
│                                        │
│ 📞 Tel: +1-809-555-1234               │
│                                        │
│ [Iniciar Entrega] [Llamar Cliente]    │
│ [No está] [Problema]                   │
└────────────────────────────────────────┘
```

#### **Paso 3: Proceso de Entrega**

**MODO A: CON RFID (Validación de items con TC21)**

```javascript
// Repartidor presiona "Iniciar Entrega"

POST /api/entregas/MIA123456/iniciar
{
  facturaId: "MIA123456",
  repartidorId: "user_miguel_001",
  gps: { lat: 18.486203, lng: -69.931212 },
  timestamp: NOW
}

// Backend actualiza
await db.collection('facturas').doc('MIA123456').update({
  estado: "en_entrega",
  entrega: {
    iniciada: NOW,
    repartidor: "Miguel Santos",
    gps: data.gps
  }
});

// App muestra checklist de items a entregar:

┌────────────────────────────────────────┐
│ VERIFICAR ITEMS CON RFID               │
├────────────────────────────────────────┤
│ Acerca el TC21 a cada item para        │
│ confirmar antes de entregar            │
│                                        │
│ ☐ TV Samsung 55" #1                   │
│ ☐ TV Samsung 55" #2                   │
│ ☐ Laptop Dell                          │
│ ☐ Caja libros #1                       │
│ ☐ Caja libros #2                       │
│                                        │
│ [Escanear Items] [Entregar Sin RFID]  │
└────────────────────────────────────────┘

// Repartidor escanea cada item
// TC21 lee tags RFID:

for (const item of itemsParaEntregar) {
  const epc = await tc21.readRFID();

  // Validar que el tag pertenece a esta factura
  if (factura.tags.includes(epc)) {
    ✅ // Marcar como verificado
    vibrate(200, "success");
    markAsVerified(epc);
  } else {
    ❌ // ERROR: Item equivocado
    alert("⚠️ Este item NO pertenece a esta entrega");
    vibrate(1000, "error");
  }
}

// Cuando TODOS están escaneados:
┌────────────────────────────────────────┐
│ ✅ TODOS LOS ITEMS VERIFICADOS         │
│                                        │
│ 5/5 items confirmados con RFID        │
│                                        │
│ [Continuar con Entrega]                │
└────────────────────────────────────────┘
```

**MODO B: SIN RFID (Manual)**

```javascript
// Repartidor marca manualmente cada item
┌────────────────────────────────────────┐
│ CONFIRMAR ITEMS ENTREGADOS             │
├────────────────────────────────────────┤
│ ✓ TV Samsung 55" #1                   │
│ ✓ TV Samsung 55" #2                   │
│ ✓ Laptop Dell                          │
│ ✓ Caja libros #1                       │
│ ✓ Caja libros #2                       │
│                                        │
│ [Confirmar Entrega]                    │
└────────────────────────────────────────┘
```

#### **Paso 4: Firma del Cliente**

```javascript
// App solicita firma digital

┌────────────────────────────────────────┐
│ FIRMA DEL DESTINATARIO                 │
├────────────────────────────────────────┤
│ Por favor firma aquí:                  │
│                                        │
│ ┌──────────────────────────────────┐  │
│ │                                  │  │
│ │     [Área de firma táctil]       │  │
│ │                                  │  │
│ │          Juan Pérez              │  │
│ │                                  │  │
│ └──────────────────────────────────┘  │
│                                        │
│ Nombre: Juan Pérez                     │
│ Cédula: 001-1234567-8                 │
│                                        │
│ He recibido 5 items en buen estado.   │
│ 1 item pendiente (conocido).           │
│                                        │
│ [Limpiar] [Guardar Firma]              │
└────────────────────────────────────────┘
```

#### **Paso 5: Foto de Evidencia (Opcional)**

```javascript
┌────────────────────────────────────────┐
│ FOTO DE EVIDENCIA (Opcional)           │
├────────────────────────────────────────┤
│ Toma foto de los items entregados      │
│                                        │
│ ┌──────────────────────────────────┐  │
│ │                                  │  │
│ │      [Cámara activa]             │  │
│ │                                  │  │
│ └──────────────────────────────────┘  │
│                                        │
│ [Tomar Foto] [Omitir]                  │
└────────────────────────────────────────┘
```

#### **Paso 6: Confirmación Final**

```javascript
POST /api/entregas/MIA123456/completar
{
  facturaId: "MIA123456",
  repartidorId: "user_miguel_001",

  // Datos del cliente
  receptor: {
    nombre: "Juan Pérez",
    cedula: "001-1234567-8",
    relacionConDestinatario: "titular", // o "familiar", "vecino", etc.
    firma: "data:image/png;base64,iVBORw0KG..." // imagen de firma
  },

  // Items entregados
  itemsEntregados: [
    { epc: "E280116060000020936C5C4A", verificadoRFID: true },
    { epc: "E280116060000020936C5C4B", verificadoRFID: true },
    { epc: "E280116060000020936C5C4C", verificadoRFID: true },
    { epc: "E280116060000020936C5C4D", verificadoRFID: true },
    { epc: "E280116060000020936C5C4E", verificadoRFID: true }
  ],

  // Metadata
  gps: { lat: 18.486203, lng: -69.931212 },
  fotoEvidencia: "data:image/jpeg;base64,/9j/4AAQ...", // opcional
  timestamp: NOW,
  notasAdicionales: "Cliente satisfecho. Firmó conforme."
}

// Backend procesa entrega completada
async function completarEntrega(data) {
  // 1. Actualizar factura
  await db.collection('facturas').doc(data.facturaId).update({
    estado: "entregado",
    fechaEntrega: NOW,

    entrega: {
      completada: true,
      fecha: NOW,
      repartidor: data.repartidorId,
      receptor: data.receptor,
      gps: data.gps,
      itemsEntregados: data.itemsEntregados.length,
      itemsEsperados: 5,
      fotoEvidenciaUrl: await uploadToStorage(data.fotoEvidencia),
      metodVerificacion: data.itemsEntregados[0].verificadoRFID ? 'rfid' : 'manual'
    },

    historial: admin.firestore.FieldValue.arrayUnion({
      fecha: NOW,
      estado: 'entregado',
      accion: 'Paquete entregado al destinatario',
      receptor: data.receptor.nombre,
      firma: true,
      itemsEntregados: data.itemsEntregados.length
    })
  });

  // 2. Actualizar cada unidad individual
  for (const item of data.itemsEntregados) {
    const tag = await getRFIDTag(item.epc);

    await db.collection('facturas').doc(tag.facturaId).update({
      [`items.${tag.itemIndex}.unidades.${tag.numeroUnidad - 1}.estado`]: 'entregado',
      [`items.${tag.itemIndex}.unidades.${tag.numeroUnidad - 1}.entrega`]: {
        fecha: NOW,
        receptor: data.receptor.nombre,
        gps: data.gps
      }
    });
  }

  // 3. Actualizar ruta
  await db.collection('rutas').doc(data.rutaId).update({
    'progreso.entregados': admin.firestore.FieldValue.increment(1),
    'progreso.ultimaEntrega': NOW
  });

  // 4. Actualizar tags RFID (estado final)
  for (const item of data.itemsEntregados) {
    await db.collection('rfid_tags').doc(item.epc).update({
      estado: 'entregado',
      ultimaLectura: {
        fecha: NOW,
        ubicacion: 'domicilio_cliente',
        gps: data.gps,
        evento: 'entrega_final'
      }
    });
  }

  // 5. Registrar en analytics
  await db.collection('delivery_analytics').add({
    facturaId: data.facturaId,
    tracking: factura.codigoTracking,
    companyId: factura.companyId,
    fechaRecogida: factura.fechaRecoleccion,
    fechaEntrega: NOW,
    tiempoTotal: NOW - factura.fechaRecoleccion, // milisegundos
    itemsEntregados: data.itemsEntregados.length,
    itemsEsperados: factura.items.reduce((sum, i) => sum + i.cantidad, 0),
    metodVerificacion: data.itemsEntregados[0].verificadoRFID ? 'rfid' : 'manual',
    discrepancias: data.itemsEntregados.length < 6, // Había 1 faltante
    calificacion: null // Se enviará encuesta después
  });

  console.log(`✅ Entrega completada: ${factura.codigoTracking}`);

  return {
    success: true,
    mensaje: 'Entrega completada exitosamente',
    tracking: factura.codigoTracking
  };
}
```

#### **App del Repartidor - Confirmación:**

```
┌────────────────────────────────────────┐
│ ✅ ENTREGA COMPLETADA                  │
│                                        │
│ MIA123456 - Juan Pérez                 │
│                                        │
│ 5 items entregados ✓                   │
│ Firma recibida ✓                       │
│ Foto tomada ✓                          │
│                                        │
│ Hora: 9:42 AM                          │
│                                        │
│ [Siguiente Entrega] [Ver Ruta]        │
└────────────────────────────────────────┘

Quedan 12 entregas
Progreso: 3/15 (20%)
```

---

#### **Notificaciones Enviadas al Cliente:**

**📧 Email de Confirmación:**

```
Asunto: ✅ Tu paquete fue entregado - MIA123456

¡Hola Juan Pérez!

Tu paquete ha sido entregado exitosamente.

✅ ENTREGA COMPLETADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tracking: MIA123456
Fecha: 4 de Enero 2026
Hora: 9:42 AM

📦 ITEMS ENTREGADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TV Samsung 55" QLED (x2)
✅ Laptop Dell Inspiron 15 (x1)
✅ Caja de libros (x2)

⚠️ ITEM PENDIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 1 Caja de libros adicional
  (Será enviada en próximo contenedor sin costo)

🚚 REPARTIDOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Miguel Santos
Camioneta #5

✍️ RECIBIDO POR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nombre: Juan Pérez
Cédula: 001-1234567-8
Firma: ✓ Recibida

📍 UBICACIÓN DE ENTREGA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Av. Principal #123
Los Prados, Santo Domingo

📄 DOCUMENTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Descargar Comprobante] [Ver Firma] [Ver Foto]

⭐ ¿CÓMO FUE TU EXPERIENCIA?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nos encantaría conocer tu opinión.
[Calificar Servicio]

Gracias por confiar en nosotros.

Equipo de Envíos Express RD
```

**📱 SMS:**
```
✅ Envíos Express RD

¡Paquete entregado! 📦

Tracking: MIA123456
Fecha: 4 Ene, 9:42 AM
Recibido por: Juan Pérez

5 items entregados ✓
1 item pendiente (será enviado sin costo)

Comprobante: envios.com/delivery/MIA123456

¡Gracias por tu preferencia!
```

**📧 Email con Encuesta (4 horas después):**

```
Asunto: ⭐ ¿Cómo fue tu experiencia? - Encuesta de Satisfacción

Hola Juan,

Hace unas horas recibiste tu paquete MIA123456.
Nos encantaría saber cómo fue tu experiencia.

⭐ CALIFICA NUESTRO SERVICIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ¿Cómo calificarías la velocidad de entrega?
   ⭐⭐⭐⭐⭐

2. ¿El repartidor fue profesional y amable?
   ⭐⭐⭐⭐⭐

3. ¿Los items llegaron en buen estado?
   ⭐⭐⭐⭐⭐

4. ¿Recomendarías nuestro servicio?
   Sí / No

5. Comentarios adicionales (opcional):
   [___________________________]

[Enviar Encuesta]

Tu opinión nos ayuda a mejorar.

Gracias,
Equipo de Envíos Express RD
```

---

### **📊 RESUMEN COMPLETO DEL FLUJO**

```
LÍNEA DE TIEMPO COMPLETA - MIA123456
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 27 DIC 2025
└─ 10:00 AM ✅ Cliente agenda recolección (web/app)
└─ 10:15 AM ✅ Admin asigna recolector → Carlos Martínez
└─ Notificación: Email + SMS confirmación

📅 28 DIC 2025
└─ 2:30 PM  ✅ Recolector llega y recoge 6 items
└─ 2:45 PM  ✅ Factura MIA123456 generada
└─ 2:47 PM  🖨️ Etiquetas RFID impresas en domicilio (6 tags)
└─ 2:50 PM  ✅ Etiquetas pegadas en cada item físico
└─ 3:00 PM  ✅ Items llegan a almacén Miami (ya etiquetados)
└─ Notificación: Email "Paquete recolectado"

📅 29 DIC 2025
└─ 10:00 AM ✅ Items llegan al almacén Miami (ya etiquetados)
└─ 3:00 PM  ✅ Items entran a contenedor C-2025-001 (escaneo RFID)
└─ 3:15 PM  ⚠️  1 item faltante detectado (Caja #3)
└─ Notificación: Ninguna (aún en proceso)

📅 30 DIC 2025
└─ 4:30 PM  ✅ Contenedor C-2025-001 cerrado (47 items)
└─ 5:00 PM  ✅ Contenedor enviado a RD
└─ Notificación: Email + WhatsApp "Paquete en camino"

📅 31 DIC - 2 ENE 2026
└─ 🚢 Tránsito marítimo (3 días)
└─ Notificación: SMS diario de progreso

📅 3 ENE 2026
└─ 10:15 AM ✅ Contenedor llega a almacén RD
└─ 10:20 AM ⚠️  Lectura RFID: 46/47 items (1 faltante)
└─ 10:25 AM ⚠️  Discrepancia detectada automáticamente
└─ 10:30 AM ✅ Recepción confirmada (parcial)
└─ 11:00 AM ✅ Factura asignada a Ruta Capital
└─ Notificación: Email "Llegó a RD" + Alerta discrepancia

📅 4 ENE 2026
└─ 8:03 AM  ✅ Carga verificada con TC21 (5/5 items)
└─ 8:15 AM  ✅ Repartidor Miguel sale a ruta
└─ 9:20 AM  ✅ Repartidor llama 15 min antes
└─ 9:42 AM  ✅ ENTREGA COMPLETADA (5 items)
└─ Notificación: Email + SMS "Entregado"

📅 4 ENE 2026 (tarde)
└─ 2:00 PM  📧 Encuesta de satisfacción enviada

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: 8 días desde solicitud hasta entrega
Items entregados: 5 de 6 (1 pendiente)
Notificaciones enviadas: 12
Puntos de tracking: 15
```

---

### **🔔 TABLA COMPLETA DE NOTIFICACIONES**

| # | Evento | Destinatario | Canal | Contenido |
|---|--------|--------------|-------|-----------|
| 1 | Solicitud creada | Cliente | Email + SMS | Confirmación de agenda |
| 2 | Recolector asignado | Cliente | Email | Datos del recolector |
| 3 | Recolección completada | Cliente | Email + WhatsApp | Factura generada, tracking |
| 4 | Llegada Miami | Interno | Dashboard | Items en almacén |
| 5 | RFID etiquetado | Interno | Dashboard | 6 tags asignados |
| 6 | Item faltante (contenedor) | Supervisor Miami | Dashboard | Alerta interna |
| 7 | Contenedor enviado | Cliente | Email + WhatsApp + SMS | En tránsito a RD |
| 8 | Progreso diario | Cliente | SMS | Días 1, 2, 3 de tránsito |
| 9 | Discrepancia RD | Supervisores + Cliente | Email urgente | 1 item faltante confirmado |
| 10 | Asignado a ruta | Cliente | Email + SMS | Entrega programada mañana |
| 11 | Repartidor en camino | Cliente | Email + SMS | Salió a ruta |
| 12 | Proximidad (15 min) | Cliente | Llamada/SMS | Repartidor cerca |
| 13 | Entrega completada | Cliente | Email + SMS | Confirmación + comprobante |
| 14 | Encuesta satisfacción | Cliente | Email | 4 horas después |

**Total: 14 puntos de comunicación**

---

### **💡 CARACTERÍSTICAS CLAVE DEL SISTEMA HÍBRIDO**

#### **✅ EMPRESAS CON RFID:**
- ⚡ Etiquetado automático en recolección (ZD621)
- ⚡ Asignación instantánea a contenedores (FX9600)
- ⚡ Detección automática de discrepancias (RD)
- ⚡ Validación de carga en vehículo (TC21)
- ⚡ Verificación en entrega final (TC21)
- 📊 Tracking individual de cada item
- 🚨 Alertas en tiempo real

**Tiempo ahorrado:** ~70% vs manual
**Precisión:** 99.9% (vs 95% manual)

#### **✅ EMPRESAS SIN RFID:**
- 📋 Etiquetado con código de barras
- 📋 Escaneo manual con app móvil
- 📋 Checklist manual en cada paso
- 📋 Confirmación visual de items
- 📋 Firma digital igual
- 📊 Tracking a nivel de factura
- ⚠️  Alertas manuales

**Funciona igual, solo más lento**

---

## **🎯 FIN DEL FLUJO COMPLETO**

Este documento cubre el **100% del workflow** desde que el cliente:
1. ✅ Agenda una recolección
2. ✅ Items son recolectados
3. ✅ **Etiquetas RFID impresas en domicilio durante recolección** 🖨️
4. ✅ Items llegan a Miami (ya etiquetados)
5. ✅ Items escaneados al entrar a contenedor
6. ✅ Contenedor se cierra y envía
7. ✅ Transporte a RD
8. ✅ Recepción en RD (con detección automática de discrepancias)
9. ✅ Asignación a rutas
10. ✅ Carga en vehículo (validada con TC21)
11. ✅ Salida a ruta (GPS tracking)
12. ✅ **Entrega final al cliente** (firma + foto)

**Incluyendo:**
- ✅ Todas las notificaciones por email/SMS/WhatsApp
- ✅ Dashboards en tiempo real
- ✅ Validaciones automáticas (RFID)
- ✅ Flujos manuales (sin RFID)
- ✅ Manejo de discrepancias
- ✅ GPS tracking
- ✅ Firma digital
- ✅ Foto de evidencia
- ✅ Encuestas de satisfacción

---

## **📌 PUNTO CLAVE: IMPRESIÓN DE ETIQUETAS**

### **¿Cuándo se imprimen las etiquetas RFID?**

**🏠 Durante la Recolección (regla general):**
- El **recolector imprime las etiquetas en el domicilio del cliente** usando una impresora portátil (ZQ630 o ZD621 en el vehículo)
- Las etiquetas se pegan **inmediatamente** en cada item físico
- Los items llegan al almacén Miami **ya etiquetados**
- Tiempo: ~1-2 minutos para 6 items

**🏢 Excepción - Cliente directo al almacén:**
- Si el cliente lleva su envío **directamente al almacén Miami** (sin recolección)
- **ENTONCES** las etiquetas se imprimen en el almacén usando la impresora ZD621 fija
- Personal del almacén pega las etiquetas

**📋 Empresas sin RFID:**
- Solo se imprimen etiquetas con código de barras del tracking
- No hay etiquetado individual por item

**El sistema está 100% documentado y listo para implementación.**


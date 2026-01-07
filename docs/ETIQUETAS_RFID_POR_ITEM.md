# Sistema de Etiquetas RFID por Item Individual

## 🎯 Concepto Correcto

**IMPORTANTE:** Cada **item físico** dentro de una factura recibe su propia etiqueta RFID, no la factura completa.

### Ejemplo Real:

```
Factura: MIA123456
├── Item 1: TV Samsung 55" (Cantidad: 2)
│   ├── Etiqueta RFID #1: E280116060000020936C5C4A
│   └── Etiqueta RFID #2: E280116060000020936C5C4B
├── Item 2: Laptop Dell (Cantidad: 1)
│   └── Etiqueta RFID #3: E280116060000020936C5C4C
└── Item 3: Caja de libros (Cantidad: 3)
    ├── Etiqueta RFID #4: E280116060000020936C5C4D
    ├── Etiqueta RFID #5: E280116060000020936C5C4E
    └── Etiqueta RFID #6: E280116060000020936C5C4F

TOTAL ITEMS FÍSICOS: 6
TOTAL ETIQUETAS RFID: 6
```

Cuando se escanea **cualquiera** de estos 6 tags, el sistema sabe:
- ✅ Factura: MIA123456
- ✅ Item específico: "TV Samsung 55" (unidad 1 de 2)
- ✅ Contenedor asignado
- ✅ Destinatario final

---

## 📊 Modelo de Datos Actualizado

### 1. Estructura de Factura con Items Individuales

```javascript
// Colección: facturas/{facturaId}
{
  id: "MIA123456",
  codigoTracking: "MIA123456",
  companyId: "empresa_123",

  remitente: {
    nombre: "Tech Store Miami",
    telefono: "305-555-0100",
    direccion: "123 Main St, Miami, FL"
  },

  destinatario: {
    nombre: "Juan Pérez",
    telefono: "809-555-1234",
    direccion: "Av. Principal #123, Santo Domingo",
    zona: "Capital"
  },

  // ✅ ITEMS CON DETALLE DE UNIDADES FÍSICAS
  items: [
    {
      itemIndex: 0, // Índice del item en la factura
      descripcion: "TV Samsung 55 pulgadas",
      cantidad: 2, // Cantidad total de este item
      precio: 500,

      // ✅ NUEVO: Unidades físicas individuales
      unidades: [
        {
          unidadId: "MIA123456-0-0", // facturaId-itemIndex-unidadIndex
          numeroUnidad: 1, // Unidad 1 de 2
          rfid: {
            epc: "E280116060000020936C5C4A",
            fechaAsociacion: "2025-12-30T10:00:00Z",
            estadoFisico: "normal" // normal | danado | faltante
          },
          estado: "en_contenedor", // registrado | en_contenedor | en_almacen_rd | en_ruta | entregado
          ultimaLectura: {
            fecha: "2025-12-30T11:00:00Z",
            ubicacion: "lector_miami_001",
            lectorId: "reader_door_001"
          }
        },
        {
          unidadId: "MIA123456-0-1",
          numeroUnidad: 2, // Unidad 2 de 2
          rfid: {
            epc: "E280116060000020936C5C4B",
            fechaAsociacion: "2025-12-30T10:00:15Z",
            estadoFisico: "normal"
          },
          estado: "en_contenedor",
          ultimaLectura: {
            fecha: "2025-12-30T11:00:05Z",
            ubicacion: "lector_miami_001",
            lectorId: "reader_door_001"
          }
        }
      ]
    },
    {
      itemIndex: 1,
      descripcion: "Laptop Dell Inspiron",
      cantidad: 1,
      precio: 800,

      unidades: [
        {
          unidadId: "MIA123456-1-0",
          numeroUnidad: 1, // Unidad 1 de 1
          rfid: {
            epc: "E280116060000020936C5C4C",
            fechaAsociacion: "2025-12-30T10:00:30Z",
            estadoFisico: "normal"
          },
          estado: "en_contenedor",
          ultimaLectura: {
            fecha: "2025-12-30T11:00:10Z",
            ubicacion: "lector_miami_001",
            lectorId: "reader_door_001"
          }
        }
      ]
    },
    {
      itemIndex: 2,
      descripcion: "Caja de libros (20 unidades)",
      cantidad: 3, // 3 cajas
      precio: 50,

      unidades: [
        {
          unidadId: "MIA123456-2-0",
          numeroUnidad: 1,
          rfid: { epc: "E280116060000020936C5C4D", ... }
        },
        {
          unidadId: "MIA123456-2-1",
          numeroUnidad: 2,
          rfid: { epc: "E280116060000020936C5C4E", ... }
        },
        {
          unidadId: "MIA123456-2-2",
          numeroUnidad: 3,
          rfid: { epc: "E280116060000020936C5C4F", ... }
        }
      ]
    }
  ],

  // ✅ ESTADÍSTICAS DE ITEMS
  estadisticasItems: {
    totalUnidadesFisicas: 6, // 2 + 1 + 3
    unidadesEtiquetadas: 6,
    unidadesEnContenedor: 6,
    unidadesDanadas: 0,
    unidadesFaltantes: 0
  },

  contenedorId: "C-2025-001",
  estado: "en_contenedor",

  created_at: "2025-12-30T09:00:00Z",
  updated_at: "2025-12-30T11:00:15Z"
}
```

---

### 2. Catálogo Global de Tags RFID

```javascript
// Colección: rfid_tags/{epc}
{
  epc: "E280116060000020936C5C4A",

  // Relación con factura e item
  facturaId: "MIA123456",
  facturaTracking: "MIA123456",
  itemIndex: 0,
  unidadId: "MIA123456-0-0",

  // Descripción del item físico
  itemDescripcion: "TV Samsung 55 pulgadas",
  numeroUnidad: 1, // Unidad 1 de 2
  cantidadTotal: 2,

  // Información de envío
  companyId: "empresa_123",
  destinatario: {
    nombre: "Juan Pérez",
    telefono: "809-555-1234"
  },

  // Estado actual
  estado: "en_contenedor", // registrado | en_contenedor | en_almacen_rd | en_ruta | entregado | danado
  contenedorId: "C-2025-001",
  rutaId: null,

  // Auditoría
  historial: [
    {
      fecha: "2025-12-30T10:00:00Z",
      evento: "tag_asociado",
      ubicacion: "almacen_miami",
      usuarioId: "recolector_001"
    },
    {
      fecha: "2025-12-30T11:00:00Z",
      evento: "tag_leido_entrada_contenedor",
      lectorId: "reader_door_001",
      rssi: -45
    }
  ],

  created_at: "2025-12-30T10:00:00Z",
  updated_at: "2025-12-30T11:00:00Z"
}
```

---

## 🖨️ Proceso de Impresión de Etiquetas

### Flujo Completo en Recolección

```javascript
// PASO 1: Recolector crea factura con items
POST /api/facturas/crear
{
  remitente: {...},
  destinatario: {...},
  items: [
    { descripcion: "TV Samsung 55\"", cantidad: 2, precio: 500 },
    { descripcion: "Laptop Dell", cantidad: 1, precio: 800 },
    { descripcion: "Caja libros", cantidad: 3, precio: 50 }
  ]
}

// BACKEND AUTOMÁTICO:
// 1. Crea factura con ID: MIA123456
// 2. Calcula total de unidades físicas: 2 + 1 + 3 = 6
// 3. Genera estructura de items con unidades vacías (sin RFID aún)

// Response:
{
  success: true,
  data: {
    facturaId: "MIA123456",
    codigoTracking: "MIA123456",
    totalUnidadesFisicas: 6,
    items: [
      {
        itemIndex: 0,
        descripcion: "TV Samsung 55\"",
        cantidad: 2,
        unidades: [
          { unidadId: "MIA123456-0-0", numeroUnidad: 1, rfid: null },
          { unidadId: "MIA123456-0-1", numeroUnidad: 2, rfid: null }
        ]
      },
      {
        itemIndex: 1,
        descripcion: "Laptop Dell",
        cantidad: 1,
        unidades: [
          { unidadId: "MIA123456-1-0", numeroUnidad: 1, rfid: null }
        ]
      },
      {
        itemIndex: 2,
        descripcion: "Caja libros",
        cantidad: 3,
        unidades: [
          { unidadId: "MIA123456-2-0", numeroUnidad: 1, rfid: null },
          { unidadId: "MIA123456-2-1", numeroUnidad: 2, rfid: null },
          { unidadId: "MIA123456-2-2", numeroUnidad: 3, rfid: null }
        ]
      }
    ]
  }
}
```

---

### PASO 2: Imprimir Etiquetas RFID Individuales

```javascript
// Frontend: Botón "Imprimir Etiquetas RFID"
POST /api/hardware/print-rfid-labels
{
  facturaId: "MIA123456"
}

// BACKEND: PrintRouterService.printRFIDLabels()
async printRFIDLabels(facturaId) {
  // 1. Obtener factura completa
  const factura = await Factura.findById(facturaId);

  // 2. Contar total de unidades físicas
  let totalUnidades = 0;
  factura.items.forEach(item => {
    totalUnidades += item.cantidad;
  });

  console.log(`📋 Imprimiendo ${totalUnidades} etiquetas RFID...`);

  // 3. Generar EPCs únicos
  const epcs = await this.generateUniqueEPCs(totalUnidades);

  // 4. Por cada item y cada unidad física
  let epcIndex = 0;

  for (const item of factura.items) {
    for (let unidadNum = 0; unidadNum < item.cantidad; unidadNum++) {
      const epc = epcs[epcIndex];
      const unidadId = `${facturaId}-${item.itemIndex}-${unidadNum}`;

      // 5. Generar ZPL para esta etiqueta
      const zplCode = this.generateRFIDLabelZPL({
        facturaTracking: factura.codigoTracking,
        itemDescripcion: item.descripcion,
        numeroUnidad: unidadNum + 1,
        cantidadTotal: item.cantidad,
        destinatario: factura.destinatario.nombre,
        epc: epc,
        unidadId: unidadId
      });

      // 6. IMPORTANTE: Codificar tag RFID + Imprimir
      // Esto requiere impresora con codificador RFID (ZD621R)
      await this.encodeAndPrintRFIDTag(
        factura.companyId,
        epc,
        zplCode
      );

      // 7. Actualizar factura con EPC asignado
      await this.updateFacturaWithRFID(
        facturaId,
        item.itemIndex,
        unidadNum,
        epc,
        unidadId
      );

      // 8. Crear entrada en catálogo global
      await this.createRFIDTagEntry({
        epc,
        facturaId,
        facturaTracking: factura.codigoTracking,
        itemIndex: item.itemIndex,
        unidadId,
        itemDescripcion: item.descripcion,
        numeroUnidad: unidadNum + 1,
        cantidadTotal: item.cantidad,
        companyId: factura.companyId,
        destinatario: factura.destinatario
      });

      epcIndex++;

      console.log(`  ✅ Etiqueta ${epcIndex}/${totalUnidades}: ${item.descripcion} (${unidadNum + 1}/${item.cantidad})`);
    }
  }

  console.log(`✅ ${totalUnidades} etiquetas impresas y codificadas`);

  return {
    success: true,
    totalEtiquetas: totalUnidades,
    mensaje: `${totalUnidades} etiquetas RFID impresas correctamente`
  };
}
```

---

### Plantilla ZPL para Etiqueta RFID Individual

```javascript
generateRFIDLabelZPL(data) {
  const {
    facturaTracking,    // MIA123456
    itemDescripcion,    // "TV Samsung 55\""
    numeroUnidad,       // 1
    cantidadTotal,      // 2
    destinatario,       // "Juan Pérez"
    epc,                // "E280116060000020936C5C4A"
    unidadId            // "MIA123456-0-0"
  } = data;

  // ⚠️ IMPORTANTE: Comando RFID para codificar tag
  // ^RF = Write RFID tag
  // ^RFW,H = Write EPC to tag memory

  const zpl = `
^XA
~TA000
~JSN
^LT0
^MNW
^MTT
^PON
^PMN
^LH0,0
^JMA
^PR6,6
~SD15
^JUS
^LRN
^CI0
^XZ

^XA
^MMT
^PW812
^LL0406
^LS0

^FT0,0^A0N,20,20^FH\\^FDRFID TAG - DO NOT REMOVE^FS

^FT50,50^A0N,40,40^FH\\^FD${facturaTracking}^FS
^FT50,100^BY2^BCN,80,Y,N,N^FD${facturaTracking}^FS

^FT50,200^A0N,30,30^FH\\^FDItem:^FS
^FT50,240^A0N,25,25^FH\\^FD${itemDescripcion}^FS
^FT50,280^A0N,25,25^FH\\^FDUnidad: ${numeroUnidad} de ${cantidadTotal}^FS

^FT50,330^A0N,20,20^FH\\^FDDestinatario:^FS
^FT50,360^A0N,20,20^FH\\^FD${destinatario}^FS

^FT50,400^A0N,15,15^FH\\^FDID: ${unidadId}^FS
^FT50,425^A0N,12,12^FH\\^FDEPC: ${epc}^FS

^RFW,H^FD${epc}^FS

^PQ1,0,1,Y
^XZ
  `.trim();

  return zpl;
}
```

---

### Codificar y Escribir Tag RFID

```javascript
// Requiere impresora Zebra con codificador RFID (ZD621R o similar)
async encodeAndPrintRFIDTag(companyId, epc, zplCode) {
  const hardware = await HardwareDevice.getCompanyDevices(companyId);

  // Buscar impresora con capacidad RFID
  const printer = hardware.printers.find(p =>
    p.type.includes('RFID') && p.status.online
  );

  if (!printer) {
    throw new Error('No hay impresora RFID disponible');
  }

  // Enviar ZPL que incluye comando ^RF para codificar tag
  await this.sendToPrinter(
    printer.connection.ip_address,
    printer.connection.port,
    zplCode
  );

  // La impresora Zebra:
  // 1. Codifica el tag RFID con el EPC especificado
  // 2. Imprime la etiqueta visual encima
  // 3. Verifica que el tag se codificó correctamente
  // 4. Reporta éxito o error
}
```

---

## 📡 Lectura RFID Actualizada

### Cuando Tag Entra al Contenedor

```javascript
// Evento del lector FX9600
{
  epc: "E280116060000020936C5C4A",
  rssi: -45,
  antenna: 1,
  timestamp: "2025-12-30T11:00:00Z"
}

// Backend: RFIDRouterService.processTagRead()
async processTagRead(companyId, readerId, tagData) {
  const { epc } = tagData;

  // 1. Buscar en catálogo global
  const tag = await db.collection('rfid_tags').doc(epc).get();

  if (!tag.exists) {
    console.log(`⚠️ Tag desconocido: ${epc}`);
    return { success: false, reason: 'tag_unknown' };
  }

  const tagData = tag.data();

  console.log(`📦 Tag leído:
    Factura: ${tagData.facturaTracking}
    Item: ${tagData.itemDescripcion}
    Unidad: ${tagData.numeroUnidad} de ${tagData.cantidadTotal}
    Destinatario: ${tagData.destinatario.nombre}
  `);

  // 2. Buscar contenedor activo
  const contenedorActivo = await this.findActiveContainer(companyId);

  if (!contenedorActivo) {
    console.log('⚠️ No hay contenedor activo');
    return { success: false, reason: 'no_active_container' };
  }

  // 3. Actualizar unidad específica en factura
  await db.collection('facturas').doc(tagData.facturaId).update({
    [`items.${tagData.itemIndex}.unidades.${tagData.numeroUnidad - 1}.estado`]: 'en_contenedor',
    [`items.${tagData.itemIndex}.unidades.${tagData.numeroUnidad - 1}.ultimaLectura`]: {
      fecha: new Date(),
      ubicacion: 'lector_miami_001',
      lectorId: readerId
    }
  });

  // 4. Si es la PRIMERA unidad de esta factura en el contenedor
  const factura = await db.collection('facturas').doc(tagData.facturaId).get();
  const facturaData = factura.data();

  // Verificar si ya está asignada al contenedor
  if (!facturaData.contenedorId) {
    // Primera vez, asignar factura completa al contenedor
    await db.collection('facturas').doc(tagData.facturaId).update({
      contenedorId: contenedorActivo.id,
      estado: 'en_contenedor'
    });

    await db.collection('contenedores').doc(contenedorActivo.id).update({
      facturas: admin.firestore.FieldValue.arrayUnion(tagData.facturaId)
    });

    console.log(`✅ Factura ${tagData.facturaTracking} asignada a contenedor ${contenedorActivo.codigo}`);
  }

  // 5. Calcular progreso de la factura
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

  const progreso = (unidadesEnContenedor / totalUnidades * 100).toFixed(0);

  console.log(`📊 Progreso factura ${tagData.facturaTracking}: ${unidadesEnContenedor}/${totalUnidades} (${progreso}%)`);

  // 6. Actualizar estadísticas de factura
  await db.collection('facturas').doc(tagData.facturaId).update({
    'estadisticasItems.unidadesEnContenedor': unidadesEnContenedor
  });

  // 7. WebSocket en tiempo real
  this.emit('tag_read', {
    facturaTracking: tagData.facturaTracking,
    itemDescripcion: tagData.itemDescripcion,
    numeroUnidad: tagData.numeroUnidad,
    cantidadTotal: tagData.cantidadTotal,
    progreso: `${unidadesEnContenedor}/${totalUnidades}`,
    contenedorId: contenedorActivo.id
  });

  return {
    success: true,
    factura: tagData.facturaTracking,
    item: tagData.itemDescripcion,
    unidad: `${tagData.numeroUnidad}/${tagData.cantidadTotal}`,
    progreso
  };
}
```

---

## 🖥️ Dashboard en Tiempo Real

```javascript
// WebSocket actualiza dashboard cada vez que se lee un tag

CONTENEDOR C-2025-001 (ACTIVO)
├── Total facturas: 12
├── Total items físicos: 47
├── Items escaneados: 32/47 (68%)
└── Última lectura: hace 2 segundos

Facturas en progreso:
┌────────────────────────────────────────────────┐
│ MIA123456 - Juan Pérez                         │
│ [████████████████░░░░] 4/6 items (67%)        │
│ ├── ✅ TV Samsung 55" (2/2)                    │
│ ├── ✅ Laptop Dell (1/1)                       │
│ └── ⚠️  Caja libros (1/3) - FALTA 2           │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ MIA123457 - María López                        │
│ [████████████████████] 3/3 items (100%) ✅    │
│ ├── ✅ Impresora HP (1/1)                      │
│ ├── ✅ Monitor Dell (1/1)                      │
│ └── ✅ Teclado inalámbrico (1/1)               │
└────────────────────────────────────────────────┘

Actividad en tiempo real:
🟢 11:05:23  MIA123456 → Caja libros (1/3) ← AHORA
🟢 11:05:18  MIA123457 → Monitor Dell (1/1)
🟢 11:05:12  MIA123456 → Laptop Dell (1/1)
```

---

## ⚠️ Alertas y Validaciones

### Detectar Items Faltantes

```javascript
// Cuando supervisor cierra contenedor
POST /contenedores/C-2025-001/cerrar

// Backend valida ANTES de cerrar:
async validateBeforeClosing(contenedorId) {
  const contenedor = await Contenedor.findById(contenedorId);
  const facturas = await Factura.find({
    _id: { $in: contenedor.facturas }
  });

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
        facturaId: factura.id,
        tracking: factura.codigoTracking,
        destinatario: factura.destinatario.nombre,
        unidadesFaltantes: totalUnidades - unidadesEnContenedor,
        totalUnidades,
        items: factura.items.map(item => {
          const faltantes = item.unidades.filter(u =>
            u.estado !== 'en_contenedor'
          ).length;

          if (faltantes > 0) {
            return {
              descripcion: item.descripcion,
              faltantes,
              total: item.cantidad
            };
          }
        }).filter(Boolean)
      });
    }
  }

  if (alertas.length > 0) {
    return {
      success: false,
      canClose: false,
      alertas,
      mensaje: `⚠️ HAY ${alertas.length} FACTURAS INCOMPLETAS.
                Revisa las alertas antes de cerrar el contenedor.`
    };
  }

  return {
    success: true,
    canClose: true,
    mensaje: 'Todas las facturas están completas'
  };
}
```

---

## 💡 Beneficios del Sistema por Items

### ✅ Trazabilidad Granular
- Sabes exactamente qué unidad física de qué item está dónde
- Ejemplo: "La TV #1 de 2 está en contenedor, la TV #2 aún no"

### ✅ Detección Precisa de Faltantes
- No solo sabes que falta algo de una factura
- Sabes **exactamente qué item** y **cuál unidad**
- Ejemplo: "Falta caja de libros #3 de 3"

### ✅ Control de Calidad
- Puedes marcar una unidad específica como dañada
- Las otras unidades del mismo item siguen OK
- Ejemplo: "TV #2 dañada, TV #1 OK"

### ✅ Auditoría Completa
- Historial de cada unidad física individual
- Cuándo y dónde se leyó cada tag
- Quién manejó cada item

---

## 🚀 Implementación en Frontend

```jsx
// Componente: ImprimirEtiquetasRFID.jsx

const ImprimirEtiquetasRFID = ({ facturaId }) => {
  const [imprimiendo, setImprimiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);

  const handleImprimir = async () => {
    try {
      setImprimiendo(true);

      // Obtener detalle de factura
      const response = await api.get(`/facturas/${facturaId}`);
      const factura = response.data.data;

      // Calcular total de etiquetas
      const totalEtiquetas = factura.items.reduce(
        (sum, item) => sum + item.cantidad,
        0
      );

      toast.info(`Imprimiendo ${totalEtiquetas} etiquetas RFID...`);

      // Llamar a endpoint de impresión
      const printResponse = await api.post('/hardware/print-rfid-labels', {
        facturaId
      });

      if (printResponse.data.success) {
        toast.success(`✅ ${totalEtiquetas} etiquetas impresas`);

        // Refrescar datos
        window.location.reload();
      }

    } catch (error) {
      toast.error('Error al imprimir etiquetas');
      console.error(error);
    } finally {
      setImprimiendo(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">
        Etiquetas RFID
      </h3>

      {factura.items.map((item, idx) => (
        <div key={idx} className="mb-3 p-3 bg-gray-50 rounded">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">{item.descripcion}</p>
              <p className="text-sm text-gray-600">
                Cantidad: {item.cantidad} unidades
              </p>
            </div>

            <div className="text-sm">
              {item.unidades.filter(u => u.rfid).length}/{item.cantidad} etiquetadas
            </div>
          </div>

          {/* Mostrar EPCs asignados */}
          {item.unidades.map((unidad, uIdx) => (
            <div key={uIdx} className="mt-2 text-xs text-gray-500 flex items-center gap-2">
              {unidad.rfid ? (
                <>
                  <CheckCircle size={14} className="text-green-600" />
                  <span>Unidad {unidad.numeroUnidad}: {unidad.rfid.epc}</span>
                </>
              ) : (
                <>
                  <XCircle size={14} className="text-red-600" />
                  <span>Unidad {unidad.numeroUnidad}: Sin etiqueta</span>
                </>
              )}
            </div>
          ))}
        </div>
      ))}

      <button
        onClick={handleImprimir}
        disabled={imprimiendo}
        className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
      >
        {imprimiendo ? (
          <>
            <Loader className="animate-spin" size={20} />
            Imprimiendo...
          </>
        ) : (
          <>
            <Printer size={20} />
            Imprimir Etiquetas RFID
          </>
        )}
      </button>
    </div>
  );
};
```

---

## 📋 Resumen

### Cambio Clave:
❌ **Antes:** 1 tag RFID por factura
✅ **Ahora:** 1 tag RFID por cada unidad física de cada item

### Ejemplo Práctico:
```
Factura con:
- 2 TVs
- 1 Laptop
- 3 Cajas

= 6 tags RFID (uno por cada item físico)
= 6 etiquetas impresas
= Trazabilidad individual de cada pieza
```

¿Te quedó claro? ¿Necesitas que profundice en alguna parte específica como la impresión múltiple o la validación de items completos?
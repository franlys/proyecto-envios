# Integración con Dispositivos Zebra

## Dispositivos Recomendados

### 1. Impresoras de Etiquetas

#### Zebra ZD621 (Principal - Almacén)
- **Tipo**: Impresora térmica de escritorio
- **Resolución**: 203 o 300 dpi
- **Ancho**: 4 pulgadas
- **Conectividad**: USB, Ethernet, Wi-Fi, Bluetooth
- **Precio**: $500-700 USD
- **Uso**: Impresión de etiquetas de tracking en almacén RD y Miami

#### Zebra ZQ630 (Móvil - Repartidores)
- **Tipo**: Impresora móvil resistente
- **Conectividad**: Bluetooth, Wi-Fi
- **Batería**: 8+ horas
- **Precio**: $1,200-1,500 USD
- **Uso**: Impresión de comprobantes de entrega en campo

### 2. Lectores RFID y Escáneres

#### Zebra FX9600 (Lector RFID Fijo)
- **Tipo**: Lector RFID fijo de largo alcance
- **Puertos de antena**: 4-8
- **Rango**: Hasta 30 pies (9 metros)
- **Precio**: $1,500-2,000 USD
- **Uso**: Detección automática de entrada/salida de contenedores

#### Zebra TC21/TC26 (Terminal Móvil)
- **Tipo**: Handheld Android con escáner integrado
- **Tecnologías**: 1D/2D Barcode, NFC, RFID (opcional)
- **Precio**: $800-1,200 USD
- **Uso**: Verificación manual de items, picking, inventario

---

## Arquitectura de Integración

### Flujo de Datos

```
┌─────────────────────┐
│  Dispositivos Zebra │
│  (Impresoras/RFID)  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   Zebra Link-OS SDK │
│   (Node.js/Web)     │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Backend API        │
│  /api/zebra/*       │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Firebase/Database  │
└─────────────────────┘
```

---

## Implementación por Componente

### A. Impresión de Etiquetas

#### 1. Backend - Generación de ZPL
```javascript
// backend/src/services/zebraService.js
class ZebraService {
  /**
   * Genera código ZPL para etiqueta de tracking
   * ZPL = Zebra Programming Language
   */
  generarEtiquetaTracking(factura) {
    const zpl = `
^XA
^FO50,50^A0N,50,50^FD${factura.codigoTracking}^FS
^FO50,120^BY3^BCN,100,Y,N,N^FD${factura.codigoTracking}^FS
^FO50,240^A0N,30,30^FDDestinatario:^FS
^FO50,280^A0N,30,30^FD${factura.destinatario.nombre}^FS
^FO50,320^A0N,25,25^FD${factura.destinatario.direccion}^FS
^FO50,360^A0N,25,25^FD${factura.destinatario.telefono}^FS
^FO50,420^A0N,20,20^FDRuta: ${factura.rutaAsignada || 'Sin asignar'}^FS
^FO50,460^GB700,3,3^FS
^FO50,480^A0N,25,25^FDContenedor: ${factura.contenedorId}^FS
^XZ
    `;
    return zpl;
  }

  /**
   * Genera etiqueta para contenedor completo
   */
  generarEtiquetaContenedor(contenedor) {
    const zpl = `
^XA
^FO100,50^A0N,80,80^FDContenedor^FS
^FO100,150^A0N,100,100^FD${contenedor.numeroContenedor}^FS
^FO100,280^BY5^BCN,150,Y,N,N^FD${contenedor.numeroContenedor}^FS
^FO100,460^A0N,40,40^FDFacturas: ${contenedor.facturas.length}^FS
^FO100,520^A0N,30,30^FDFecha: ${new Date().toLocaleDateString()}^FS
^XZ
    `;
    return zpl;
  }

  /**
   * Genera comprobante de entrega
   */
  generarComprobanteEntrega(entrega) {
    const zpl = `
^XA
^FO50,50^A0N,40,40^FDCOMPROBANTE DE ENTREGA^FS
^FO50,100^GB700,3,3^FS
^FO50,120^A0N,30,30^FDTracking: ${entrega.codigoTracking}^FS
^FO50,160^A0N,25,25^FDFecha: ${entrega.fechaEntrega}^FS
^FO50,200^A0N,25,25^FDRecibido por: ${entrega.recibidoPor}^FS
^FO50,240^A0N,25,25^FDRepartidor: ${entrega.repartidorNombre}^FS
^FO50,300^GB700,200,3^FS
^FO70,320^A0N,20,20^FDFirma:^FS
^XZ
    `;
    return zpl;
  }
}

module.exports = new ZebraService();
```

#### 2. Backend - Endpoints de Impresión
```javascript
// backend/src/routes/zebraRoutes.js
const express = require('express');
const router = express.Router();
const zebraService = require('../services/zebraService');
const { verificarAuth } = require('../middleware/auth');

// Obtener ZPL para imprimir etiqueta de factura
router.get('/etiqueta/factura/:facturaId', verificarAuth, async (req, res) => {
  try {
    const factura = await Factura.findById(req.params.facturaId);
    const zpl = zebraService.generarEtiquetaTracking(factura);

    res.json({
      success: true,
      data: {
        zpl,
        formato: 'ZPL',
        tamaño: '4x6 inches'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Obtener ZPL para imprimir etiqueta de contenedor
router.get('/etiqueta/contenedor/:contenedorId', verificarAuth, async (req, res) => {
  try {
    const contenedor = await Contenedor.findById(req.params.contenedorId)
      .populate('facturas');
    const zpl = zebraService.generarEtiquetaContenedor(contenedor);

    res.json({
      success: true,
      data: { zpl }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Obtener ZPL para comprobante de entrega
router.post('/comprobante/entrega', verificarAuth, async (req, res) => {
  try {
    const zpl = zebraService.generarComprobanteEntrega(req.body);

    res.json({
      success: true,
      data: { zpl }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
```

#### 3. Frontend - Cliente de Impresión Web
```javascript
// admin_web/src/services/zebraPrintService.js
class ZebraPrintService {
  constructor() {
    this.impresoras = [];
    this.impresoraActiva = null;
  }

  /**
   * Busca impresoras Zebra en la red local
   * Requiere Zebra Browser Print instalado
   */
  async buscarImpresoras() {
    try {
      // Zebra Browser Print debe estar instalado
      const impresoras = await BrowserPrint.getLocalDevices(
        (devices) => devices,
        (error) => {
          console.error('Error buscando impresoras:', error);
          throw new Error('Zebra Browser Print no está instalado');
        }
      );

      this.impresoras = impresoras;
      if (impresoras.length > 0) {
        this.impresoraActiva = impresoras[0];
      }

      return impresoras;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  /**
   * Imprime código ZPL en la impresora seleccionada
   */
  async imprimirZPL(zpl) {
    if (!this.impresoraActiva) {
      throw new Error('No hay impresora seleccionada');
    }

    return new Promise((resolve, reject) => {
      this.impresoraActiva.send(
        zpl,
        () => resolve({ success: true }),
        (error) => reject(error)
      );
    });
  }

  /**
   * Imprime etiqueta de factura
   */
  async imprimirEtiquetaFactura(facturaId) {
    try {
      const response = await api.get(`/zebra/etiqueta/factura/${facturaId}`);
      const { zpl } = response.data.data;
      await this.imprimirZPL(zpl);
      return { success: true };
    } catch (error) {
      console.error('Error imprimiendo etiqueta:', error);
      throw error;
    }
  }

  /**
   * Imprime etiqueta de contenedor
   */
  async imprimirEtiquetaContenedor(contenedorId) {
    try {
      const response = await api.get(`/zebra/etiqueta/contenedor/${contenedorId}`);
      const { zpl } = response.data.data;
      await this.imprimirZPL(zpl);
      return { success: true };
    } catch (error) {
      console.error('Error imprimiendo etiqueta:', error);
      throw error;
    }
  }

  /**
   * Imprime comprobante de entrega
   */
  async imprimirComprobanteEntrega(datosEntrega) {
    try {
      const response = await api.post('/zebra/comprobante/entrega', datosEntrega);
      const { zpl } = response.data.data;
      await this.imprimirZPL(zpl);
      return { success: true };
    } catch (error) {
      console.error('Error imprimiendo comprobante:', error);
      throw error;
    }
  }

  /**
   * Verifica estado de la impresora
   */
  async verificarEstado() {
    if (!this.impresoraActiva) {
      return { conectada: false };
    }

    return new Promise((resolve) => {
      this.impresoraActiva.sendThenRead(
        '~HQES',
        (response) => {
          resolve({
            conectada: true,
            estado: response,
            nombre: this.impresoraActiva.name
          });
        },
        () => resolve({ conectada: false })
      );
    });
  }
}

export default new ZebraPrintService();
```

#### 4. Frontend - Hook React para Impresión
```javascript
// admin_web/src/hooks/useZebraPrint.js
import { useState, useEffect } from 'react';
import zebraPrintService from '../services/zebraPrintService';
import { toast } from 'sonner';

export const useZebraPrint = () => {
  const [impresoras, setImpresoras] = useState([]);
  const [impresoraActiva, setImpresoraActiva] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    buscarImpresoras();
  }, []);

  const buscarImpresoras = async () => {
    try {
      setCargando(true);
      const dispositivos = await zebraPrintService.buscarImpresoras();
      setImpresoras(dispositivos);
      if (dispositivos.length > 0) {
        setImpresoraActiva(dispositivos[0]);
        toast.success(`Impresora encontrada: ${dispositivos[0].name}`);
      } else {
        toast.warning('No se encontraron impresoras Zebra');
      }
    } catch (error) {
      toast.error('Error buscando impresoras. Instala Zebra Browser Print');
    } finally {
      setCargando(false);
    }
  };

  const imprimirEtiquetaFactura = async (facturaId) => {
    try {
      setCargando(true);
      await zebraPrintService.imprimirEtiquetaFactura(facturaId);
      toast.success('Etiqueta impresa correctamente');
    } catch (error) {
      toast.error('Error al imprimir etiqueta');
      throw error;
    } finally {
      setCargando(false);
    }
  };

  const imprimirEtiquetaContenedor = async (contenedorId) => {
    try {
      setCargando(true);
      await zebraPrintService.imprimirEtiquetaContenedor(contenedorId);
      toast.success('Etiqueta de contenedor impresa');
    } catch (error) {
      toast.error('Error al imprimir etiqueta');
      throw error;
    } finally {
      setCargando(false);
    }
  };

  const verificarEstado = async () => {
    try {
      const estado = await zebraPrintService.verificarEstado();
      setEstado(estado);
      return estado;
    } catch (error) {
      console.error('Error verificando estado:', error);
      return { conectada: false };
    }
  };

  return {
    impresoras,
    impresoraActiva,
    cargando,
    estado,
    buscarImpresoras,
    imprimirEtiquetaFactura,
    imprimirEtiquetaContenedor,
    verificarEstado
  };
};
```

---

### B. Sistema de Detección RFID

#### 1. Backend - Servicio de RFID
```javascript
// backend/src/services/rfidService.js
const EventEmitter = require('events');
const mqtt = require('mqtt'); // Para comunicación con lectores RFID

class RFIDService extends EventEmitter {
  constructor() {
    super();
    this.lectoresActivos = new Map();
    this.tagsDetectados = new Map();
  }

  /**
   * Conecta con un lector RFID Zebra FX9600
   */
  async conectarLector(config) {
    const { id, host, port, ubicacion } = config;

    // Conectar vía MQTT (protocolo común para RFID)
    const client = mqtt.connect(`mqtt://${host}:${port}`);

    client.on('connect', () => {
      console.log(`✅ Lector RFID ${id} conectado en ${ubicacion}`);
      this.lectoresActivos.set(id, { client, config });

      // Suscribirse a eventos del lector
      client.subscribe(`rfid/${id}/tags`);
      client.subscribe(`rfid/${id}/status`);
    });

    client.on('message', (topic, message) => {
      this.procesarMensajeRFID(id, topic, message);
    });

    return client;
  }

  /**
   * Procesa mensajes del lector RFID
   */
  procesarMensajeRFID(lectorId, topic, message) {
    const data = JSON.parse(message.toString());

    if (topic.includes('/tags')) {
      // Tag RFID detectado
      const { epc, rssi, timestamp } = data;

      this.registrarDeteccion({
        lectorId,
        epc, // Electronic Product Code (ID único del tag)
        rssi, // Signal strength
        timestamp
      });
    }
  }

  /**
   * Registra detección de tag RFID
   */
  async registrarDeteccion(deteccion) {
    const { lectorId, epc, rssi, timestamp } = deteccion;

    // Buscar factura/contenedor asociado al tag
    const item = await this.buscarItemPorEPC(epc);

    if (item) {
      const evento = {
        tipo: item.tipo, // 'factura' o 'contenedor'
        itemId: item.id,
        lectorId,
        ubicacion: this.lectoresActivos.get(lectorId).config.ubicacion,
        timestamp,
        rssi
      };

      // Guardar en base de datos
      await this.guardarEventoRFID(evento);

      // Emitir evento para procesamiento en tiempo real
      this.emit('deteccion', evento);

      // Actualizar estado automáticamente
      await this.actualizarEstadoAutomatico(evento);
    }
  }

  /**
   * Busca item (factura/contenedor) por código EPC del tag RFID
   */
  async buscarItemPorEPC(epc) {
    // Primero buscar en facturas
    let factura = await Factura.findOne({ 'rfid.epc': epc });
    if (factura) {
      return { tipo: 'factura', id: factura._id, data: factura };
    }

    // Buscar en contenedores
    let contenedor = await Contenedor.findOne({ 'rfid.epc': epc });
    if (contenedor) {
      return { tipo: 'contenedor', id: contenedor._id, data: contenedor };
    }

    return null;
  }

  /**
   * Actualiza estado automáticamente según ubicación del lector
   */
  async actualizarEstadoAutomatico(evento) {
    const { tipo, itemId, ubicacion } = evento;

    // Reglas de negocio para actualización automática
    const reglasUbicacion = {
      'entrada_almacen_miami': {
        contenedor: 'en_almacen_miami',
        factura: 'en_almacen'
      },
      'salida_almacen_miami': {
        contenedor: 'en_transito_rd',
        factura: 'en_transito'
      },
      'entrada_almacen_rd': {
        contenedor: 'recibido_rd',
        factura: 'en_almacen_rd'
      },
      'zona_carga_ruta': {
        factura: 'en_ruta'
      }
    };

    const nuevoEstado = reglasUbicacion[ubicacion]?.[tipo];

    if (nuevoEstado) {
      if (tipo === 'contenedor') {
        await Contenedor.findByIdAndUpdate(itemId, {
          estado: nuevoEstado,
          $push: {
            historial: {
              estado: nuevoEstado,
              fecha: new Date(),
              metodo: 'RFID_automatico',
              ubicacion
            }
          }
        });
      } else if (tipo === 'factura') {
        await Factura.findByIdAndUpdate(itemId, {
          estado: nuevoEstado,
          $push: {
            historial: {
              estado: nuevoEstado,
              fecha: new Date(),
              metodo: 'RFID_automatico',
              ubicacion
            }
          }
        });
      }

      console.log(`✅ Estado actualizado automáticamente: ${tipo} ${itemId} -> ${nuevoEstado}`);
    }
  }

  /**
   * Guarda evento RFID en base de datos
   */
  async guardarEventoRFID(evento) {
    const EventoRFID = require('../models/EventoRFID');
    return await EventoRFID.create(evento);
  }

  /**
   * Obtiene historial de detecciones de un item
   */
  async obtenerHistorialRFID(itemId, tipo) {
    const EventoRFID = require('../models/EventoRFID');
    return await EventoRFID.find({ itemId, tipo })
      .sort({ timestamp: -1 })
      .limit(50);
  }
}

module.exports = new RFIDService();
```

#### 2. Backend - Endpoints RFID
```javascript
// backend/src/routes/rfidRoutes.js
const express = require('express');
const router = express.Router();
const rfidService = require('../services/rfidService');

// Obtener historial de detecciones RFID
router.get('/historial/:tipo/:itemId', async (req, res) => {
  try {
    const { tipo, itemId } = req.params;
    const historial = await rfidService.obtenerHistorialRFID(itemId, tipo);

    res.json({
      success: true,
      data: historial
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Asociar tag RFID a factura/contenedor
router.post('/asociar-tag', async (req, res) => {
  try {
    const { epc, tipo, itemId } = req.body;

    if (tipo === 'contenedor') {
      await Contenedor.findByIdAndUpdate(itemId, {
        'rfid.epc': epc,
        'rfid.fechaAsociacion': new Date()
      });
    } else {
      await Factura.findByIdAndUpdate(itemId, {
        'rfid.epc': epc,
        'rfid.fechaAsociacion': new Date()
      });
    }

    res.json({
      success: true,
      message: 'Tag RFID asociado correctamente'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Webhook para eventos del lector RFID
router.post('/webhook/deteccion', async (req, res) => {
  try {
    const { lectorId, tags } = req.body;

    // Procesar detecciones múltiples
    for (const tag of tags) {
      await rfidService.registrarDeteccion({
        lectorId,
        epc: tag.epc,
        rssi: tag.rssi,
        timestamp: new Date()
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
```

#### 3. Frontend - Dashboard en Tiempo Real
```javascript
// admin_web/src/pages/MonitorRFID.jsx
import { useState, useEffect } from 'react';
import { Radio, TrendingUp, Package, Box } from 'lucide-react';
import api from '../services/api';
import { io } from 'socket.io-client';

const MonitorRFID = () => {
  const [detecciones, setDetecciones] = useState([]);
  const [lectores, setLectores] = useState([]);

  useEffect(() => {
    // Conectar a WebSocket para actualizaciones en tiempo real
    const socket = io(process.env.REACT_APP_API_URL);

    socket.on('rfid:deteccion', (evento) => {
      setDetecciones(prev => [evento, ...prev].slice(0, 50));

      // Notificación
      toast.info(\`Detectado: \${evento.tipo} en \${evento.ubicacion}\`);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Monitor RFID en Tiempo Real</h1>

      {/* Estado de Lectores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {lectores.map(lector => (
          <div key={lector.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <Radio className={lector.activo ? 'text-green-600' : 'text-gray-400'} />
              <div>
                <h3 className="font-semibold">{lector.ubicacion}</h3>
                <p className="text-sm text-gray-600">
                  {lector.activo ? 'Activo' : 'Desconectado'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detecciones Recientes */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Detecciones Recientes</h2>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {detecciones.map((det, idx) => (
            <div key={idx} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {det.tipo === 'contenedor' ? (
                    <Box className="text-indigo-600" />
                  ) : (
                    <Package className="text-purple-600" />
                  )}
                  <div>
                    <p className="font-semibold">{det.tipo.toUpperCase()}</p>
                    <p className="text-sm text-gray-600">{det.itemId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{det.ubicacion}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(det.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MonitorRFID;
```

---

## Configuración e Instalación

### 1. Software Necesario

#### Para Impresoras
- **Zebra Browser Print**: [Descargar aquí](https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html)
  - Instalar en cada estación que necesite imprimir
  - Compatible con Windows, Mac, Linux

#### Para Lectores RFID
- **Zebra FX SDK**: [Descargar aquí](https://www.zebra.com/us/en/support-downloads/rfid.html)
  - Para configuración de lectores FX9600
  - Incluye utilidades de diagnóstico

### 2. Configuración de Red

```yaml
# config/zebra.yml
impresoras:
  almacen_miami:
    modelo: ZD621
    ip: 192.168.1.100
    puerto: 9100
    ubicacion: "Almacén Miami"

  almacen_rd:
    modelo: ZD621
    ip: 192.168.2.100
    puerto: 9100
    ubicacion: "Almacén RD"

lectores_rfid:
  entrada_miami:
    modelo: FX9600
    ip: 192.168.1.150
    puerto: 1883  # MQTT
    antenas: 4
    ubicacion: "entrada_almacen_miami"

  salida_miami:
    modelo: FX9600
    ip: 192.168.1.151
    puerto: 1883
    antenas: 4
    ubicacion: "salida_almacen_miami"

  entrada_rd:
    modelo: FX9600
    ip: 192.168.2.150
    puerto: 1883
    antenas: 4
    ubicacion: "entrada_almacen_rd"
```

### 3. Dependencias NPM

```bash
# Backend
npm install mqtt         # Para comunicación RFID
npm install socket.io    # Para tiempo real

# Frontend
npm install socket.io-client
```

---

## Costos Estimados

### Equipo para 1 Almacén (Miami o RD)

| Dispositivo | Cantidad | Precio Unit. | Total |
|------------|----------|--------------|-------|
| Zebra ZD621 (Impresora) | 2 | $600 | $1,200 |
| Zebra FX9600 (RFID Fijo) | 2 | $1,800 | $3,600 |
| Antenas RFID | 8 | $150 | $1,200 |
| Tags RFID Pasivos | 5000 | $0.15 | $750 |
| Zebra TC21 (Handheld) | 3 | $1,000 | $3,000 |
| Zebra ZQ630 (Móvil) | 5 | $1,300 | $6,500 |
| **TOTAL** | | | **$16,250** |

### Setup Completo (2 Almacenes)
- **Total**: ~$32,500 USD
- **Alternativa económica**: Empezar solo con impresoras (~$2,400)

---

## Beneficios

### Con Impresoras
✅ Etiquetas profesionales con códigos de barras
✅ Reducción de errores de escritura manual
✅ Proceso más rápido de etiquetado
✅ Comprobantes de entrega impresos en campo

### Con RFID
✅ Tracking automático sin escaneo manual
✅ Detección de entrada/salida de contenedores
✅ Inventario en tiempo real
✅ Reducción de pérdidas
✅ Auditoría automática

---

## Próximos Pasos

1. **Fase 1 (Inmediato)**: Implementar impresión de etiquetas con ZD621
2. **Fase 2 (3-6 meses)**: Agregar lectores RFID en puntos críticos
3. **Fase 3 (6-12 meses)**: Terminales móviles para repartidores

# Hardware as a Service - Sistema Multi-Company

## 🎯 Visión General

Sistema centralizado donde el **Super Admin** configura dispositivos Zebra (impresoras y lectores RFID) para cada empresa de forma independiente, sin tocar código. Cada empresa tiene sus propios dispositivos virtualizados con configuración personalizada.

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPER ADMIN PANEL                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Empresa A          [Detalles] [Usuarios] [HARDWARE] │  │
│  │  ├── Impresoras                                       │  │
│  │  │   └── Zebra ZD621 (192.168.1.50) ✅ Online       │  │
│  │  └── Lectores RFID                                    │  │
│  │      └── FX9600 Puerta (192.168.1.60) ✅ Online      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Empresa B          [Detalles] [Usuarios] [HARDWARE] │  │
│  │  ├── Impresoras                                       │  │
│  │  │   └── Zebra ZD621 (192.168.2.80) ✅ Online       │  │
│  │  └── Lectores RFID                                    │  │
│  │      └── FX9600 Almacén (192.168.2.90) ✅ Online     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │   DEVICE ROUTER SERVICE (Backend)   │
        │                                      │
        │  📨 Request: Imprimir etiqueta       │
        │  └─→ companyId: "empresa_a"         │
        │      orderId: 123                    │
        │                                      │
        │  🔍 Busca config empresa_a           │
        │  🖨️  IP: 192.168.1.50               │
        │  📄 Template: ZPL personalizado      │
        │  ✅ Envía a impresora                │
        └─────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │     DISPOSITIVOS FÍSICOS             │
        │                                      │
        │  Empresa A                           │
        │  └─ 🖨️ 192.168.1.50 (Zebra ZD621)  │
        │  └─ 📡 192.168.1.60 (FX9600)        │
        │                                      │
        │  Empresa B                           │
        │  └─ 🖨️ 192.168.2.80 (Zebra ZD621)  │
        │  └─ 📡 192.168.2.90 (FX9600)        │
        └─────────────────────────────────────┘
```

---

## 📊 Modelo de Datos

### 1. Estructura en Firestore

```javascript
// Colección: companies/{companyId}
{
  // Datos existentes de la empresa
  nombre: "Envíos Rápidos RD",
  nit: "123456789",
  plan: "premium",

  // NUEVA SECCIÓN: Dispositivos
  hardware: {
    // Configuración habilitada o no
    enabled: true,

    // Impresoras
    printers: [
      {
        id: "printer_main_001",
        name: "Impresora Almacén Principal",
        type: "ZEBRA_ZD621",
        model: "ZD621-T",

        // Conexión
        connection: {
          type: "network", // network | usb | cloud
          ip_address: "192.168.1.50",
          port: 9100,
          protocol: "RAW" // RAW | LPR | HTTP
        },

        // Configuración de impresión
        print_config: {
          dpi: 300,
          width_mm: 104,
          speed: 6, // pulgadas/segundo
          darkness: 15 // 0-30
        },

        // Plantilla ZPL personalizada
        templates: {
          shipping_label: {
            name: "Etiqueta de Envío",
            zpl_code: "^XA^FO50,50^A0N,50,50^FD{{tracking}}^FS...",
            description: "Etiqueta estándar 4x6 con logo empresa",
            variables: ["tracking", "destinatario", "direccion"]
          },
          receipt: {
            name: "Comprobante de Entrega",
            zpl_code: "^XA^FO50,50^A0N,40,40^FDCOMPROBANTE^FS...",
            variables: ["tracking", "fecha", "firma"]
          }
        },

        // Estado
        status: {
          online: true,
          last_check: "2025-12-30T10:30:00Z",
          last_print: "2025-12-30T09:45:00Z",
          error_message: null
        },

        // Ubicación física
        location: {
          site: "almacen_miami",
          area: "zona_empaque",
          description: "Mesa del supervisor"
        },

        // Estadísticas
        stats: {
          total_prints: 1523,
          prints_today: 47,
          errors_count: 2,
          avg_response_time_ms: 350
        },

        // Auditoría
        created_at: "2025-12-01T00:00:00Z",
        created_by: "super_admin_001",
        updated_at: "2025-12-29T15:30:00Z"
      }
    ],

    // Lectores RFID
    readers: [
      {
        id: "reader_door_001",
        name: "Lector Puerta Salida Contenedor",
        type: "ZEBRA_FX9600",
        model: "FX9600-8",

        // Conexión
        connection: {
          type: "network",
          ip_address: "192.168.1.60",
          port: 14150, // Puerto LLRP estándar
          protocol: "LLRP" // LLRP | MQTT | HTTP
        },

        // Configuración RFID
        rfid_config: {
          power_dbm: 30, // Potencia de transmisión (0-32.5)
          session: 1, // Session 0-3
          mode: "MaxThroughput", // MaxThroughput | DenseReader | Hybrid
          filter: {
            enabled: true,
            epc_prefix: "E280" // Solo leer tags que empiecen con esto
          },
          antennas: [
            {
              port: 1,
              enabled: true,
              power_dbm: 30,
              name: "Antena Superior Izquierda"
            },
            {
              port: 2,
              enabled: true,
              power_dbm: 30,
              name: "Antena Superior Derecha"
            },
            {
              port: 3,
              enabled: true,
              power_dbm: 28,
              name: "Antena Lateral Izquierda"
            },
            {
              port: 4,
              enabled: true,
              power_dbm: 28,
              name: "Antena Lateral Derecha"
            }
          ]
        },

        // Eventos y Webhooks
        events: {
          webhook_url: "https://api.tudominio.com/webhooks/rfid/door_001",
          webhook_secret: "wh_secret_abc123",
          events_enabled: ["tag_read", "reader_error", "antenna_disconnect"],

          // Procesamiento local
          auto_process: true,
          rules: [
            {
              condition: "tag_read",
              action: "assign_to_container",
              target_container: "active" // Asignar al contenedor activo
            }
          ]
        },

        // Ubicación
        location: {
          site: "almacen_miami",
          area: "puerta_contenedor_1",
          zone: "salida",
          description: "Portal de salida a contenedor"
        },

        // Estado
        status: {
          online: true,
          reading: false,
          last_check: "2025-12-30T10:30:00Z",
          last_read: "2025-12-30T10:28:00Z",
          error_message: null,
          temperature_c: 42
        },

        // Estadísticas
        stats: {
          total_reads: 8754,
          reads_today: 234,
          unique_tags_today: 187,
          read_rate_per_second: 0,
          errors_count: 1
        },

        created_at: "2025-12-01T00:00:00Z",
        updated_at: "2025-12-29T15:30:00Z"
      }
    ],

    // Lectores portátiles (TC21)
    handhelds: [
      {
        id: "handheld_001",
        name: "TC21 Cargador Juan",
        type: "ZEBRA_TC21",
        serial_number: "ABC123456",

        // Usuario asignado
        assigned_to: {
          user_id: "user_juan_001",
          name: "Juan Pérez",
          role: "cargador",
          assigned_date: "2025-12-15T00:00:00Z"
        },

        // Configuración
        config: {
          rfid_power_dbm: 27,
          beep_on_read: true,
          vibrate_on_read: true,
          auto_sync: true,
          offline_mode_enabled: true
        },

        // Estado
        status: {
          online: true,
          battery_percent: 78,
          last_sync: "2025-12-30T10:25:00Z",
          location_gps: {
            lat: 18.4861,
            lng: -69.9312,
            accuracy: 10
          }
        },

        // Estadísticas
        stats: {
          scans_today: 156,
          errors_today: 2
        }
      }
    ]
  }
}
```

---

## 💻 Implementación Backend

### 1. Modelo de Datos (Firestore Schema)

```javascript
// backend/src/models/HardwareDevice.js

const admin = require('firebase-admin');
const db = admin.firestore();

class HardwareDevice {
  /**
   * Obtiene todos los dispositivos de una empresa
   */
  static async getCompanyDevices(companyId) {
    const companyDoc = await db.collection('companies').doc(companyId).get();

    if (!companyDoc.exists) {
      throw new Error('Empresa no encontrada');
    }

    const hardware = companyDoc.data().hardware || {
      enabled: false,
      printers: [],
      readers: [],
      handhelds: []
    };

    return hardware;
  }

  /**
   * Agrega una impresora a la empresa
   */
  static async addPrinter(companyId, printerData, userId) {
    const printer = {
      id: `printer_${Date.now()}`,
      name: printerData.name,
      type: printerData.type || 'ZEBRA_ZD621',
      model: printerData.model,
      connection: {
        type: printerData.connection_type || 'network',
        ip_address: printerData.ip_address,
        port: printerData.port || 9100,
        protocol: printerData.protocol || 'RAW'
      },
      print_config: {
        dpi: printerData.dpi || 300,
        width_mm: printerData.width_mm || 104,
        speed: printerData.speed || 6,
        darkness: printerData.darkness || 15
      },
      templates: printerData.templates || {},
      status: {
        online: false,
        last_check: null,
        last_print: null,
        error_message: null
      },
      location: printerData.location || {},
      stats: {
        total_prints: 0,
        prints_today: 0,
        errors_count: 0,
        avg_response_time_ms: 0
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: userId,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('companies').doc(companyId).update({
      'hardware.printers': admin.firestore.FieldValue.arrayUnion(printer),
      'hardware.enabled': true
    });

    return printer;
  }

  /**
   * Agrega un lector RFID a la empresa
   */
  static async addReader(companyId, readerData, userId) {
    const reader = {
      id: `reader_${Date.now()}`,
      name: readerData.name,
      type: readerData.type || 'ZEBRA_FX9600',
      model: readerData.model,
      connection: {
        type: 'network',
        ip_address: readerData.ip_address,
        port: readerData.port || 14150,
        protocol: readerData.protocol || 'LLRP'
      },
      rfid_config: {
        power_dbm: readerData.power_dbm || 30,
        session: readerData.session || 1,
        mode: readerData.mode || 'MaxThroughput',
        filter: readerData.filter || { enabled: false },
        antennas: readerData.antennas || []
      },
      events: {
        webhook_url: readerData.webhook_url || null,
        webhook_secret: readerData.webhook_secret || null,
        events_enabled: readerData.events_enabled || ['tag_read'],
        auto_process: readerData.auto_process || false,
        rules: readerData.rules || []
      },
      location: readerData.location || {},
      status: {
        online: false,
        reading: false,
        last_check: null,
        last_read: null,
        error_message: null,
        temperature_c: null
      },
      stats: {
        total_reads: 0,
        reads_today: 0,
        unique_tags_today: 0,
        read_rate_per_second: 0,
        errors_count: 0
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: userId,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('companies').doc(companyId).update({
      'hardware.readers': admin.firestore.FieldValue.arrayUnion(reader),
      'hardware.enabled': true
    });

    return reader;
  }

  /**
   * Actualiza configuración de impresora
   */
  static async updatePrinter(companyId, printerId, updates) {
    const hardware = await this.getCompanyDevices(companyId);
    const printerIndex = hardware.printers.findIndex(p => p.id === printerId);

    if (printerIndex === -1) {
      throw new Error('Impresora no encontrada');
    }

    hardware.printers[printerIndex] = {
      ...hardware.printers[printerIndex],
      ...updates,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('companies').doc(companyId).update({
      'hardware.printers': hardware.printers
    });

    return hardware.printers[printerIndex];
  }

  /**
   * Elimina dispositivo
   */
  static async deleteDevice(companyId, deviceId, deviceType) {
    const hardware = await this.getCompanyDevices(companyId);
    const arrayName = `hardware.${deviceType}`;

    const devices = hardware[deviceType].filter(d => d.id !== deviceId);

    await db.collection('companies').doc(companyId).update({
      [arrayName]: devices
    });

    return { success: true, message: 'Dispositivo eliminado' };
  }

  /**
   * Verifica estado de dispositivo (ping/health check)
   */
  static async checkDeviceStatus(companyId, deviceId, deviceType) {
    const hardware = await this.getCompanyDevices(companyId);
    const device = hardware[deviceType].find(d => d.id === deviceId);

    if (!device) {
      throw new Error('Dispositivo no encontrado');
    }

    let isOnline = false;
    let errorMessage = null;

    try {
      // Aquí implementarías el ping real según el tipo de dispositivo
      // Por ahora simulado
      if (deviceType === 'printers') {
        isOnline = await this.pingPrinter(device.connection.ip_address, device.connection.port);
      } else if (deviceType === 'readers') {
        isOnline = await this.pingReader(device.connection.ip_address, device.connection.port);
      }
    } catch (error) {
      errorMessage = error.message;
    }

    // Actualizar estado
    await this.updateDeviceStatus(companyId, deviceId, deviceType, {
      online: isOnline,
      last_check: new Date().toISOString(),
      error_message: errorMessage
    });

    return { online: isOnline, error: errorMessage };
  }

  /**
   * Ping a impresora (socket TCP)
   */
  static async pingPrinter(ip, port) {
    const net = require('net');

    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(3000);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.connect(port, ip);
    });
  }

  /**
   * Ping a lector RFID
   */
  static async pingReader(ip, port) {
    // Similar al pingPrinter pero adaptado para LLRP
    return this.pingPrinter(ip, port);
  }

  /**
   * Actualiza estado interno del dispositivo
   */
  static async updateDeviceStatus(companyId, deviceId, deviceType, statusUpdates) {
    const hardware = await this.getCompanyDevices(companyId);
    const deviceIndex = hardware[deviceType].findIndex(d => d.id === deviceId);

    if (deviceIndex === -1) {
      throw new Error('Dispositivo no encontrado');
    }

    hardware[deviceType][deviceIndex].status = {
      ...hardware[deviceType][deviceIndex].status,
      ...statusUpdates
    };

    await db.collection('companies').doc(companyId).update({
      [`hardware.${deviceType}`]: hardware[deviceType]
    });
  }
}

module.exports = HardwareDevice;
```

---

### 2. Servicio de Enrutamiento de Impresión

```javascript
// backend/src/services/PrintRouterService.js

const HardwareDevice = require('../models/HardwareDevice');
const net = require('net');

class PrintRouterService {
  /**
   * Imprime etiqueta usando la impresora configurada de la empresa
   */
  static async printLabel(companyId, templateName, data) {
    try {
      // 1. Obtener dispositivos de la empresa
      const hardware = await HardwareDevice.getCompanyDevices(companyId);

      if (!hardware.enabled || hardware.printers.length === 0) {
        throw new Error('Esta empresa no tiene impresoras configuradas');
      }

      // 2. Encontrar impresora activa
      const printer = hardware.printers.find(p => p.status.online);

      if (!printer) {
        // Intentar encontrar cualquier impresora y verificar su estado
        const firstPrinter = hardware.printers[0];
        const status = await HardwareDevice.checkDeviceStatus(
          companyId,
          firstPrinter.id,
          'printers'
        );

        if (!status.online) {
          throw new Error('Ninguna impresora está en línea');
        }
      }

      // 3. Obtener plantilla ZPL
      const template = printer.templates[templateName];

      if (!template) {
        throw new Error(`Plantilla "${templateName}" no encontrada`);
      }

      // 4. Generar ZPL con datos
      const zplCode = this.renderZPLTemplate(template.zpl_code, data);

      // 5. Enviar a impresora
      const result = await this.sendToPrinter(
        printer.connection.ip_address,
        printer.connection.port,
        zplCode
      );

      // 6. Actualizar estadísticas
      await this.updatePrintStats(companyId, printer.id);

      return {
        success: true,
        printer: printer.name,
        message: 'Etiqueta impresa correctamente'
      };

    } catch (error) {
      console.error('Error en PrintRouterService:', error);
      throw error;
    }
  }

  /**
   * Renderiza plantilla ZPL con datos
   */
  static renderZPLTemplate(zplTemplate, data) {
    let zpl = zplTemplate;

    // Reemplazar variables {{variable}} con valores reales
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      zpl = zpl.replace(regex, value || '');
    }

    return zpl;
  }

  /**
   * Envía código ZPL a impresora vía socket TCP
   */
  static async sendToPrinter(ip, port, zplCode) {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.setTimeout(5000);

      client.connect(port, ip, () => {
        client.write(zplCode);
        client.end();
      });

      client.on('end', () => {
        resolve({ success: true });
      });

      client.on('timeout', () => {
        client.destroy();
        reject(new Error('Timeout al conectar con impresora'));
      });

      client.on('error', (err) => {
        reject(new Error(`Error de impresora: ${err.message}`));
      });
    });
  }

  /**
   * Actualiza estadísticas de impresión
   */
  static async updatePrintStats(companyId, printerId) {
    const hardware = await HardwareDevice.getCompanyDevices(companyId);
    const printer = hardware.printers.find(p => p.id === printerId);

    if (printer) {
      printer.stats.total_prints++;
      printer.stats.prints_today++;
      printer.status.last_print = new Date().toISOString();

      await HardwareDevice.updatePrinter(companyId, printerId, {
        stats: printer.stats,
        status: printer.status
      });
    }
  }

  /**
   * Imprime etiqueta de prueba
   */
  static async testPrint(companyId, printerId) {
    const testZPL = `
^XA
^FO50,50^A0N,50,50^FDTEST PRINT^FS
^FO50,120^A0N,30,30^FDPrinter ID: ${printerId}^FS
^FO50,160^A0N,30,30^FDCompany: ${companyId}^FS
^FO50,200^A0N,30,30^FDTime: ${new Date().toISOString()}^FS
^FO50,250^BY3^BCN,100,Y,N,N^FDTEST123456^FS
^XZ
    `;

    const hardware = await HardwareDevice.getCompanyDevices(companyId);
    const printer = hardware.printers.find(p => p.id === printerId);

    if (!printer) {
      throw new Error('Impresora no encontrada');
    }

    await this.sendToPrinter(
      printer.connection.ip_address,
      printer.connection.port,
      testZPL
    );

    return { success: true, message: 'Impresión de prueba enviada' };
  }
}

module.exports = PrintRouterService;
```

---

### 3. Servicio de Lectores RFID

```javascript
// backend/src/services/RFIDRouterService.js

const HardwareDevice = require('../models/HardwareDevice');
const { EventEmitter } = require('events');

class RFIDRouterService extends EventEmitter {
  constructor() {
    super();
    this.activeReaders = new Map(); // companyId -> [readers]
  }

  /**
   * Inicia lector RFID para una empresa
   */
  async startReader(companyId, readerId) {
    const hardware = await HardwareDevice.getCompanyDevices(companyId);
    const reader = hardware.readers.find(r => r.id === readerId);

    if (!reader) {
      throw new Error('Lector no encontrado');
    }

    // Verificar conexión
    const status = await HardwareDevice.checkDeviceStatus(companyId, readerId, 'readers');

    if (!status.online) {
      throw new Error(`No se puede conectar al lector en ${reader.connection.ip_address}`);
    }

    // Aquí conectarías al lector real usando LLRP
    // Por ahora simulado
    console.log(`📡 Lector ${reader.name} iniciado para empresa ${companyId}`);

    // Actualizar estado
    await HardwareDevice.updateDeviceStatus(companyId, readerId, 'readers', {
      reading: true,
      last_check: new Date().toISOString()
    });

    // Guardar en memoria
    if (!this.activeReaders.has(companyId)) {
      this.activeReaders.set(companyId, []);
    }
    this.activeReaders.get(companyId).push(reader);

    return { success: true, message: 'Lector iniciado' };
  }

  /**
   * Procesa tag RFID leído
   */
  async processTagRead(companyId, readerId, tagData) {
    const { epc, rssi, antenna, timestamp } = tagData;

    // Buscar item asociado al EPC
    const item = await this.findItemByEPC(companyId, epc);

    if (!item) {
      console.log(`⚠️ Tag desconocido: ${epc}`);
      return { success: false, reason: 'tag_unknown' };
    }

    // Aplicar reglas automáticas
    const hardware = await HardwareDevice.getCompanyDevices(companyId);
    const reader = hardware.readers.find(r => r.id === readerId);

    if (reader.events.auto_process && reader.events.rules.length > 0) {
      for (const rule of reader.events.rules) {
        await this.applyRule(companyId, rule, item, reader);
      }
    }

    // Emitir evento para procesamiento en tiempo real
    this.emit('tag_read', {
      companyId,
      readerId,
      item,
      tagData
    });

    // Actualizar estadísticas
    await this.updateReaderStats(companyId, readerId);

    return { success: true, item };
  }

  /**
   * Aplica regla automática
   */
  async applyRule(companyId, rule, item, reader) {
    if (rule.condition === 'tag_read' && rule.action === 'assign_to_container') {
      // Buscar contenedor activo de la empresa
      const activeContainer = await this.findActiveContainer(companyId);

      if (activeContainer) {
        await this.assignItemToContainer(item.id, activeContainer.id);
        console.log(`✅ ${item.tracking} asignado a contenedor ${activeContainer.codigo}`);
      }
    }
  }

  /**
   * Busca item por EPC
   */
  async findItemByEPC(companyId, epc) {
    const admin = require('firebase-admin');
    const db = admin.firestore();

    const snapshot = await db.collection('facturas')
      .where('companyId', '==', companyId)
      .where('rfid.epc', '==', epc)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Busca contenedor activo
   */
  async findActiveContainer(companyId) {
    const admin = require('firebase-admin');
    const db = admin.firestore();

    const snapshot = await db.collection('contenedores')
      .where('companyId', '==', companyId)
      .where('estado', '==', 'activo')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Asigna item a contenedor
   */
  async assignItemToContainer(itemId, containerId) {
    const admin = require('firebase-admin');
    const db = admin.firestore();

    await db.collection('facturas').doc(itemId).update({
      contenedorId: containerId,
      estado: 'en_contenedor',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  /**
   * Actualiza estadísticas del lector
   */
  async updateReaderStats(companyId, readerId) {
    const hardware = await HardwareDevice.getCompanyDevices(companyId);
    const reader = hardware.readers.find(r => r.id === readerId);

    if (reader) {
      reader.stats.total_reads++;
      reader.stats.reads_today++;
      reader.status.last_read = new Date().toISOString();

      await HardwareDevice.updatePrinter(companyId, readerId, {
        stats: reader.stats,
        status: reader.status
      });
    }
  }
}

module.exports = new RFIDRouterService();
```

---

### 4. Rutas API

```javascript
// backend/src/routes/hardwareRoutes.js

const express = require('express');
const router = express.Router();
const HardwareDevice = require('../models/HardwareDevice');
const PrintRouterService = require('../services/PrintRouterService');
const { verificarAuth, verificarSuperAdmin } = require('../middleware/auth');

// ==========================================
// RUTAS SUPER ADMIN (Configuración)
// ==========================================

// Obtener dispositivos de una empresa
router.get('/companies/:companyId/devices', verificarSuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;
    const devices = await HardwareDevice.getCompanyDevices(companyId);

    res.json({
      success: true,
      data: devices
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Agregar impresora
router.post('/companies/:companyId/devices/printers', verificarSuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;
    const printer = await HardwareDevice.addPrinter(
      companyId,
      req.body,
      req.user.uid
    );

    res.json({
      success: true,
      data: printer,
      message: 'Impresora agregada correctamente'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Agregar lector RFID
router.post('/companies/:companyId/devices/readers', verificarSuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;
    const reader = await HardwareDevice.addReader(
      companyId,
      req.body,
      req.user.uid
    );

    res.json({
      success: true,
      data: reader,
      message: 'Lector RFID agregado correctamente'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Actualizar dispositivo
router.put('/companies/:companyId/devices/:deviceType/:deviceId', verificarSuperAdmin, async (req, res) => {
  try {
    const { companyId, deviceType, deviceId } = req.params;

    let updated;
    if (deviceType === 'printers') {
      updated = await HardwareDevice.updatePrinter(companyId, deviceId, req.body);
    } else if (deviceType === 'readers') {
      updated = await HardwareDevice.updateReader(companyId, deviceId, req.body);
    } else {
      throw new Error('Tipo de dispositivo inválido');
    }

    res.json({
      success: true,
      data: updated,
      message: 'Dispositivo actualizado'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Eliminar dispositivo
router.delete('/companies/:companyId/devices/:deviceType/:deviceId', verificarSuperAdmin, async (req, res) => {
  try {
    const { companyId, deviceType, deviceId } = req.params;

    await HardwareDevice.deleteDevice(companyId, deviceId, deviceType);

    res.json({
      success: true,
      message: 'Dispositivo eliminado'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verificar estado (health check)
router.post('/companies/:companyId/devices/:deviceType/:deviceId/check', verificarSuperAdmin, async (req, res) => {
  try {
    const { companyId, deviceType, deviceId } = req.params;

    const status = await HardwareDevice.checkDeviceStatus(companyId, deviceId, deviceType);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Impresión de prueba
router.post('/companies/:companyId/devices/printers/:printerId/test', verificarSuperAdmin, async (req, res) => {
  try {
    const { companyId, printerId } = req.params;

    await PrintRouterService.testPrint(companyId, printerId);

    res.json({
      success: true,
      message: 'Impresión de prueba enviada. Verifica la impresora.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// RUTAS USUARIOS (Uso de dispositivos)
// ==========================================

// Imprimir etiqueta
router.post('/print', verificarAuth, async (req, res) => {
  try {
    const { templateName, data } = req.body;
    const companyId = req.user.companyId;

    const result = await PrintRouterService.printLabel(companyId, templateName, data);

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
```

---

## 📱 Frontend - Panel Super Admin

```jsx
// admin_web/src/pages/SuperAdmin/HardwareConfig.jsx

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Printer, Radio, Smartphone, Plus, Edit, Trash2, Power,
  CheckCircle, XCircle, Activity, Settings
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

const HardwareConfig = () => {
  const { companyId } = useParams();
  const [hardware, setHardware] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalPrinter, setModalPrinter] = useState(false);
  const [modalReader, setModalReader] = useState(false);

  useEffect(() => {
    loadHardware();
  }, [companyId]);

  const loadHardware = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/hardware/companies/${companyId}/devices`);
      setHardware(response.data.data);
    } catch (error) {
      toast.error('Error al cargar dispositivos');
    } finally {
      setLoading(false);
    }
  };

  const handleTestPrint = async (printerId) => {
    try {
      await api.post(`/hardware/companies/${companyId}/devices/printers/${printerId}/test`);
      toast.success('Impresión de prueba enviada');
    } catch (error) {
      toast.error('Error al enviar impresión de prueba');
    }
  };

  const handleCheckStatus = async (deviceType, deviceId) => {
    try {
      const response = await api.post(
        `/hardware/companies/${companyId}/devices/${deviceType}/${deviceId}/check`
      );

      if (response.data.data.online) {
        toast.success('Dispositivo en línea');
      } else {
        toast.error('Dispositivo fuera de línea');
      }

      await loadHardware();
    } catch (error) {
      toast.error('Error al verificar estado');
    }
  };

  const handleDeleteDevice = async (deviceType, deviceId) => {
    if (!confirm('¿Eliminar este dispositivo?')) return;

    try {
      await api.delete(`/hardware/companies/${companyId}/devices/${deviceType}/${deviceId}`);
      toast.success('Dispositivo eliminado');
      await loadHardware();
    } catch (error) {
      toast.error('Error al eliminar dispositivo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Configuración de Hardware
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Gestiona impresoras, lectores RFID y dispositivos portátiles
        </p>
      </div>

      {/* Impresoras */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow mb-6">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Printer className="text-indigo-600" size={24} />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Impresoras ({hardware?.printers?.length || 0})
            </h2>
          </div>
          <button
            onClick={() => setModalPrinter(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus size={20} />
            Agregar Impresora
          </button>
        </div>

        <div className="p-4">
          {hardware?.printers?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No hay impresoras configuradas
            </div>
          ) : (
            <div className="space-y-3">
              {hardware?.printers?.map((printer) => (
                <div
                  key={printer.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {printer.name}
                        </h3>
                        {printer.status.online ? (
                          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            <CheckCircle size={14} />
                            Online
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                            <XCircle size={14} />
                            Offline
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div>
                          <p><strong>Modelo:</strong> {printer.type}</p>
                          <p><strong>IP:</strong> {printer.connection.ip_address}:{printer.connection.port}</p>
                        </div>
                        <div>
                          <p><strong>Ubicación:</strong> {printer.location.description || 'No especificada'}</p>
                          <p><strong>Impresiones hoy:</strong> {printer.stats.prints_today}</p>
                        </div>
                      </div>
                      {printer.status.error_message && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-sm">
                          ⚠️ {printer.status.error_message}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleTestPrint(printer.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        title="Impresión de prueba"
                      >
                        <Printer size={16} />
                      </button>
                      <button
                        onClick={() => handleCheckStatus('printers', printer.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        title="Verificar estado"
                      >
                        <Activity size={16} />
                      </button>
                      <button
                        onClick={() => {/* TODO: Modal editar */}}
                        className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteDevice('printers', printer.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lectores RFID */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow mb-6">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Radio className="text-purple-600" size={24} />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Lectores RFID ({hardware?.readers?.length || 0})
            </h2>
          </div>
          <button
            onClick={() => setModalReader(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus size={20} />
            Agregar Lector
          </button>
        </div>

        <div className="p-4">
          {hardware?.readers?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No hay lectores RFID configurados
            </div>
          ) : (
            <div className="space-y-3">
              {hardware?.readers?.map((reader) => (
                <div
                  key={reader.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {reader.name}
                        </h3>
                        {reader.status.online ? (
                          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            <CheckCircle size={14} />
                            Online
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                            <XCircle size={14} />
                            Offline
                          </span>
                        )}
                        {reader.status.reading && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            <Activity size={14} className="animate-pulse" />
                            Leyendo
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div>
                          <p><strong>Modelo:</strong> {reader.type}</p>
                          <p><strong>IP:</strong> {reader.connection.ip_address}:{reader.connection.port}</p>
                        </div>
                        <div>
                          <p><strong>Ubicación:</strong> {reader.location.description || 'No especificada'}</p>
                          <p><strong>Lecturas hoy:</strong> {reader.stats.reads_today}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleCheckStatus('readers', reader.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        <Activity size={16} />
                      </button>
                      <button
                        onClick={() => {/* TODO: Modal editar */}}
                        className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteDevice('readers', reader.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modales TODO: Implementar modales de agregar/editar */}
    </div>
  );
};

export default HardwareConfig;
```

Continúo en el siguiente mensaje con los modales y la configuración de plantillas ZPL...

/**
 * Script de Inicialización de Estructura de Hardware en Firestore
 *
 * Este script crea la estructura base de hardware para empresas existentes
 * o puede usarse como plantilla para nuevas empresas
 *
 * Uso:
 * node src/scripts/initializeHardwareStructure.js [companyId]
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin (asegúrate de tener las credenciales configuradas)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

/**
 * Tipos de sistemas de hardware disponibles
 */
const HARDWARE_SYSTEMS = {
  RFID_ZEBRA: 'rfid_zebra_automatic',      // Sistema automático RFID con Zebra (Premium)
  BARCODE_MANUAL: 'barcode_manual_scanner' // Sistema manual con códigos de barras (Económico)
};

/**
 * Marcas de scanners soportadas
 */
const SCANNER_BRANDS = {
  MUNBYN: 'munbyn',
  NETUM: 'netum',
  HONEYWELL: 'honeywell',
  ZEBRA: 'zebra_scanner',
  OTRO: 'otro'
};

/**
 * Marcas de impresoras soportadas
 */
const PRINTER_BRANDS = {
  MUNBYN: 'munbyn',
  NETUM: 'netum',
  ZEBRA: 'zebra',
  DYMO: 'dymo',
  BROTHER: 'brother',
  OTRO: 'otro'
};

/**
 * Estructura base de hardware para una empresa
 */
const defaultHardwareStructure = {
  enabled: false, // Deshabilitado por defecto hasta que Super Admin configure

  // ==========================================
  // CONFIGURACIÓN DEL SISTEMA ACTIVO
  // ==========================================
  sistemaActivo: HARDWARE_SYSTEMS.BARCODE_MANUAL, // Sistema en uso actual

  // Historial de cambios de sistema
  historialSistema: [
    {
      fecha: admin.firestore.FieldValue.serverTimestamp(),
      sistemaAnterior: null,
      sistemaNuevo: HARDWARE_SYSTEMS.BARCODE_MANUAL,
      realizadoPor: 'system',
      motivo: 'Configuración inicial - Sistema económico'
    }
  ],

  // ==========================================
  // SISTEMA MANUAL CON CÓDIGOS DE BARRAS (ECONÓMICO)
  // ==========================================
  barcodeManual: {
    habilitado: false,

    // Scanners de códigos de barras
    scanners: [],
    /*
    Ejemplo de scanner manual:
    {
      id: "scanner_001",
      marca: SCANNER_BRANDS.MUNBYN,
      modelo: "2D Wireless Scanner",
      nombre: "Scanner Almacén USA",
      ubicacion: "almacen_usa",
      conexion: "wireless", // wireless, usb, bluetooth
      caracteristicas: {
        lee1D: true,
        lee2D: true,
        leeQR: true,
        alcanceMetros: 100,
        duracionBateria: "15 horas"
      },
      precio: 60, // USD
      activo: true,
      asignadoA: {
        userId: null,
        nombre: null,
        fechaAsignacion: null
      },
      estadoConexion: {
        online: false,
        ultimaConexion: null,
        bateria: null
      },
      estadisticas: {
        escaneosHoy: 0,
        escaneosTotal: 0,
        erroresHoy: 0
      },
      fechaInstalacion: admin.firestore.FieldValue.serverTimestamp(),
      creadoPor: "superadmin"
    }
    */

    // Impresoras de etiquetas térmicas
    impresoras: [],
    /*
    Ejemplo de impresora térmica:
    {
      id: "printer_001",
      marca: PRINTER_BRANDS.NETUM,
      modelo: "NT-P31",
      nombre: "Impresora Etiquetas USA",
      ubicacion: "almacen_usa",
      conexion: "usb", // usb, bluetooth, wifi
      caracteristicas: {
        tipoImpresion: "termica_directa",
        anchoPulgadas: 3,
        velocidadMmS: 100,
        lenguaje: "esc-pos", // esc-pos, zpl, tspl
        resolucionDPI: 203
      },
      precio: 90, // USD
      activo: true,
      estadoConexion: {
        online: false,
        ultimaImpresion: null,
        errorActual: null
      },
      estadisticas: {
        impresionesHoy: 0,
        impresionesTotal: 0,
        erroresHoy: 0
      },
      fechaInstalacion: admin.firestore.FieldValue.serverTimestamp(),
      creadoPor: "superadmin"
    }
    */

    // Configuración de códigos de barras
    configuracion: {
      formatoCodigo: "CODE128", // CODE128, QR, EAN13, PDF417
      prefijo: "ENV", // Prefijo para códigos generados
      incluirCompanyId: true,
      incluirFecha: true,
      longitud: 12,
      incluirChecksum: true,

      // Configuración de etiquetas
      etiquetas: {
        tamano: "4x2", // pulgadas (ancho x alto)
        incluirLogo: true,
        incluirQR: true,
        incluirTextoLegible: true,
        incluirFechaImpresion: true,
        plantilla: "estandar" // estandar, compacta, detallada
      },

      // Autoimpresión
      autoImprimir: false, // Imprimir automáticamente al crear factura
      cantidadCopias: 1
    },

    // Estadísticas generales del sistema manual
    estadisticasGenerales: {
      escaneosTotal: 0,
      impresionesTotal: 0,
      erroresTotal: 0,
      costoTotalInversion: 0 // USD
    }
  },

  // ==========================================
  // SISTEMA AUTOMÁTICO RFID ZEBRA (PREMIUM)
  // ==========================================
  rfidZebra: {
    habilitado: false,

    // Impresoras Zebra para etiquetas RFID
    printers: [],
    /*
    Ejemplo de impresora Zebra RFID:
    {
      id: "printer_001",
      name: "Impresora Principal Zebra",
      type: "ZEBRA_ZD621",
    model: "ZD621-T",
    connection: {
      type: "network",
      ip_address: "192.168.1.50",
      port: 9100,
      protocol: "RAW"
    },
    print_config: {
      dpi: 300,
      width_mm: 104,
      speed: 6,
      darkness: 15
    },
    templates: {
      shipping_label: {
        name: "Etiqueta de Envío",
        zpl_code: "^XA^FO50,50^A0N,50,50^FD{{tracking}}^FS^FO50,120^BY3^BCN,100,Y,N,N^FD{{tracking}}^FS^FO50,240^A0N,30,30^FDDestinatario:^FS^FO50,280^A0N,30,30^FD{{destinatario}}^FS^FO50,320^A0N,25,25^FD{{direccion}}^FS^FO50,360^A0N,25,25^FD{{telefono}}^FS^XZ",
        variables: ["tracking", "destinatario", "direccion", "telefono"]
      }
    },
    location: {
      site: "",
      area: "",
      description: ""
    },
    status: {
      online: false,
      last_check: null,
      last_print: null,
      error_message: null
    },
    stats: {
      total_prints: 0,
      prints_today: 0,
      errors_count: 0,
      avg_response_time_ms: 0
    },
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    created_by: "system",
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  }
  */

  readers: [],
  /*
  Ejemplo de lector RFID:
  {
    id: "reader_001",
    name: "Lector Puerta Contenedor",
    type: "ZEBRA_FX9600",
    model: "FX9600-8",
    connection: {
      type: "network",
      ip_address: "192.168.1.60",
      port: 14150,
      protocol: "LLRP"
    },
    rfid_config: {
      power_dbm: 30,
      session: 1,
      mode: "MaxThroughput",
      filter: {
        enabled: false,
        epc_prefix: ""
      },
      antennas: [
        { port: 1, enabled: true, power_dbm: 30, name: "Antena Superior Izquierda" },
        { port: 2, enabled: true, power_dbm: 30, name: "Antena Superior Derecha" },
        { port: 3, enabled: true, power_dbm: 28, name: "Antena Lateral Izquierda" },
        { port: 4, enabled: true, power_dbm: 28, name: "Antena Lateral Derecha" }
      ]
    },
    events: {
      webhook_url: null,
      webhook_secret: null,
      events_enabled: ["tag_read"],
      auto_process: true,
      rules: [
        {
          condition: "tag_read",
          action: "assign_to_container",
          target_container: "active"
        }
      ]
    },
    location: {
      site: "",
      area: "",
      zone: "",
      description: ""
    },
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
    created_by: "system",
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  }
  */

  handhelds: [],
  /*
  Ejemplo de handheld:
  {
    id: "handheld_001",
    name: "TC21 Cargador",
    type: "ZEBRA_TC21",
    serial_number: "",
    assigned_to: {
      user_id: null,
      name: null,
      role: null,
      assigned_date: null
    },
    config: {
      rfid_power_dbm: 27,
      beep_on_read: true,
      vibrate_on_read: true,
      auto_sync: true,
      offline_mode_enabled: true
    },
    status: {
      online: false,
      battery_percent: null,
      last_sync: null,
      location_gps: {
        lat: null,
        lng: null,
        accuracy: null
      }
    },
    stats: {
      scans_today: 0,
      errors_today: 0
    },
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  }
  */

  // Configuración general
  settings: {
    auto_print_enabled: true, // Imprimir automáticamente al crear factura
    auto_print_template: "shipping_label",
    rfid_auto_assign: true, // Asignar automáticamente items al contenedor activo
    notifications: {
      device_offline: true, // Notificar si dispositivo cae
      print_error: true,
      rfid_error: true
    }
  },

  created_at: admin.firestore.FieldValue.serverTimestamp(),
  updated_at: admin.firestore.FieldValue.serverTimestamp()
};

/**
 * Inicializa la estructura de hardware para una empresa
 */
async function initializeHardwareForCompany(companyId) {
  try {
    console.log(`\n🔧 Inicializando estructura de hardware para empresa: ${companyId}`);

    const companyRef = db.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      console.error(`❌ Error: La empresa ${companyId} no existe`);
      return false;
    }

    const companyData = companyDoc.data();
    console.log(`✅ Empresa encontrada: ${companyData.nombre || companyId}`);

    // Verificar si ya tiene hardware configurado
    if (companyData.hardware) {
      console.log(`⚠️  La empresa ya tiene hardware configurado`);
      console.log(`   - Impresoras: ${companyData.hardware.printers?.length || 0}`);
      console.log(`   - Lectores: ${companyData.hardware.readers?.length || 0}`);
      console.log(`   - Handhelds: ${companyData.hardware.handhelds?.length || 0}`);

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      return new Promise((resolve) => {
        readline.question('¿Deseas reinicializar? (S/n): ', (answer) => {
          readline.close();
          if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'si') {
            updateHardwareStructure(companyRef).then(resolve);
          } else {
            console.log('❌ Operación cancelada');
            resolve(false);
          }
        });
      });
    }

    // Crear estructura de hardware
    await updateHardwareStructure(companyRef);
    return true;

  } catch (error) {
    console.error('❌ Error al inicializar hardware:', error);
    return false;
  }
}

/**
 * Actualiza la estructura de hardware
 */
async function updateHardwareStructure(companyRef) {
  await companyRef.update({
    hardware: defaultHardwareStructure
  });

  console.log('✅ Estructura de hardware inicializada correctamente');
  console.log('\n📋 Próximos pasos:');
  console.log('   1. Acceder al Panel Super Admin');
  console.log('   2. Ir a Empresas → Editar → Pestaña "Hardware"');
  console.log('   3. Agregar dispositivos (impresoras, lectores, etc.)');
  console.log('   4. Configurar IPs y plantillas ZPL');
  console.log('   5. Realizar pruebas de impresión y lectura');

  return true;
}

/**
 * Inicializa hardware para todas las empresas existentes
 */
async function initializeAllCompanies() {
  try {
    console.log('\n🚀 Inicializando hardware para TODAS las empresas...\n');

    const companiesSnapshot = await db.collection('companies').get();
    console.log(`📊 Total de empresas encontradas: ${companiesSnapshot.size}\n`);

    let initialized = 0;
    let skipped = 0;
    let errors = 0;

    for (const doc of companiesSnapshot.docs) {
      const companyData = doc.data();
      console.log(`\n>>> Procesando: ${companyData.nombre || doc.id}`);

      if (companyData.hardware) {
        console.log(`⏭️  Ya tiene hardware configurado, saltando...`);
        skipped++;
        continue;
      }

      try {
        await doc.ref.update({
          hardware: defaultHardwareStructure
        });
        console.log(`✅ Inicializado correctamente`);
        initialized++;
      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN:');
    console.log('='.repeat(50));
    console.log(`✅ Inicializadas: ${initialized}`);
    console.log(`⏭️  Saltadas: ${skipped}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📊 Total: ${companiesSnapshot.size}`);
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error fatal:', error);
  }
}

/**
 * Crea una empresa de ejemplo con hardware completo
 */
async function createExampleCompanyWithHardware() {
  try {
    console.log('\n🎨 Creando empresa de ejemplo con hardware completo...\n');

    const exampleCompany = {
      nombre: "Envíos Demo - Prueba Hardware",
      nit: "999-999999-9",
      email: "demo@hardware-test.com",
      telefono: "809-555-0100",
      direccion: "Calle Demo #123, Santo Domingo",
      pais: "República Dominicana",
      plan: "premium",
      estado: "activo",

      hardware: {
        enabled: true,

        printers: [
          {
            id: "printer_demo_001",
            name: "Zebra ZD621 - Almacén Demo",
            type: "ZEBRA_ZD621",
            model: "ZD621-T",
            connection: {
              type: "network",
              ip_address: "192.168.1.100", // ⚠️ CAMBIAR por IP real
              port: 9100,
              protocol: "RAW"
            },
            print_config: {
              dpi: 300,
              width_mm: 104,
              speed: 6,
              darkness: 15
            },
            templates: {
              shipping_label: {
                name: "Etiqueta de Envío Demo",
                zpl_code: `^XA
^FO50,50^A0N,50,50^FD{{tracking}}^FS
^FO50,120^BY3^BCN,100,Y,N,N^FD{{tracking}}^FS
^FO50,240^A0N,30,30^FDDestinatario:^FS
^FO50,280^A0N,30,30^FD{{destinatario}}^FS
^FO50,320^A0N,25,25^FD{{direccion}}^FS
^FO50,360^A0N,25,25^FD{{telefono}}^FS
^FO50,400^A0N,20,20^FDEmpresa Demo^FS
^XZ`,
                variables: ["tracking", "destinatario", "direccion", "telefono"],
                description: "Etiqueta 4x6 con logo empresa demo"
              },
              receipt: {
                name: "Comprobante Demo",
                zpl_code: `^XA
^FO50,50^A0N,40,40^FDCOMPROBANTE DE ENTREGA^FS
^FO50,100^GB700,3,3^FS
^FO50,120^A0N,30,30^FDTracking: {{tracking}}^FS
^FO50,160^A0N,25,25^FDFecha: {{fecha}}^FS
^FO50,200^A0N,25,25^FDRecibido por: {{recibido_por}}^FS
^FO50,300^GB700,200,3^FS
^FO70,320^A0N,20,20^FDFirma:^FS
^XZ`,
                variables: ["tracking", "fecha", "recibido_por"]
              }
            },
            location: {
              site: "almacen_demo",
              area: "zona_empaque",
              description: "Mesa del supervisor - Demo"
            },
            status: {
              online: false,
              last_check: null,
              last_print: null,
              error_message: null
            },
            stats: {
              total_prints: 0,
              prints_today: 0,
              errors_count: 0,
              avg_response_time_ms: 0
            },
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            created_by: "system_demo",
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          }
        ],

        readers: [
          {
            id: "reader_demo_001",
            name: "FX9600 - Puerta Demo",
            type: "ZEBRA_FX9600",
            model: "FX9600-8",
            connection: {
              type: "network",
              ip_address: "192.168.1.110", // ⚠️ CAMBIAR por IP real
              port: 14150,
              protocol: "LLRP"
            },
            rfid_config: {
              power_dbm: 30,
              session: 1,
              mode: "MaxThroughput",
              filter: {
                enabled: true,
                epc_prefix: "E280"
              },
              antennas: [
                { port: 1, enabled: true, power_dbm: 30, name: "Antena Superior Izquierda" },
                { port: 2, enabled: true, power_dbm: 30, name: "Antena Superior Derecha" },
                { port: 3, enabled: true, power_dbm: 28, name: "Antena Lateral Izquierda" },
                { port: 4, enabled: true, power_dbm: 28, name: "Antena Lateral Derecha" }
              ]
            },
            events: {
              webhook_url: "https://api.tudominio.com/webhooks/rfid/demo",
              webhook_secret: "demo_secret_123",
              events_enabled: ["tag_read", "reader_error"],
              auto_process: true,
              rules: [
                {
                  condition: "tag_read",
                  action: "assign_to_container",
                  target_container: "active"
                }
              ]
            },
            location: {
              site: "almacen_demo",
              area: "puerta_contenedor",
              zone: "salida",
              description: "Portal de salida demo"
            },
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
            created_by: "system_demo",
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          }
        ],

        handhelds: [
          {
            id: "handheld_demo_001",
            name: "TC21 - Cargador Demo",
            type: "ZEBRA_TC21",
            serial_number: "DEMO123456",
            assigned_to: {
              user_id: null,
              name: "Sin asignar",
              role: null,
              assigned_date: null
            },
            config: {
              rfid_power_dbm: 27,
              beep_on_read: true,
              vibrate_on_read: true,
              auto_sync: true,
              offline_mode_enabled: true
            },
            status: {
              online: false,
              battery_percent: null,
              last_sync: null,
              location_gps: {
                lat: null,
                lng: null,
                accuracy: null
              }
            },
            stats: {
              scans_today: 0,
              errors_today: 0
            },
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          }
        ],

        settings: {
          auto_print_enabled: true,
          auto_print_template: "shipping_label",
          rfid_auto_assign: true,
          notifications: {
            device_offline: true,
            print_error: true,
            rfid_error: true
          }
        },

        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      },

      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('companies').add(exampleCompany);
    console.log(`✅ Empresa demo creada con ID: ${docRef.id}`);
    console.log(`\n📋 Accede al panel con este ID para ver la configuración de hardware\n`);

    return docRef.id;

  } catch (error) {
    console.error('❌ Error al crear empresa demo:', error);
    return null;
  }
}

// ==========================================
// EJECUCIÓN DEL SCRIPT
// ==========================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const companyId = args[1];

  console.log('\n' + '='.repeat(60));
  console.log('🔧  INICIALIZACIÓN DE ESTRUCTURA DE HARDWARE - FIRESTORE');
  console.log('='.repeat(60));

  if (!command) {
    console.log('\nUso:');
    console.log('  node initializeHardwareStructure.js <comando> [companyId]');
    console.log('\nComandos disponibles:');
    console.log('  init <companyId>   - Inicializar hardware para una empresa');
    console.log('  all                - Inicializar hardware para todas las empresas');
    console.log('  demo               - Crear empresa demo con hardware completo');
    console.log('\nEjemplos:');
    console.log('  node initializeHardwareStructure.js init ABC123');
    console.log('  node initializeHardwareStructure.js all');
    console.log('  node initializeHardwareStructure.js demo\n');
    process.exit(0);
  }

  try {
    switch (command) {
      case 'init':
        if (!companyId) {
          console.error('\n❌ Error: Debes especificar el ID de la empresa');
          console.log('Uso: node initializeHardwareStructure.js init <companyId>\n');
          process.exit(1);
        }
        await initializeHardwareForCompany(companyId);
        break;

      case 'all':
        await initializeAllCompanies();
        break;

      case 'demo':
        await createExampleCompanyWithHardware();
        break;

      default:
        console.error(`\n❌ Comando desconocido: ${command}`);
        console.log('Comandos válidos: init, all, demo\n');
        process.exit(1);
    }

    console.log('\n✅ Proceso completado\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  main();
}

module.exports = {
  initializeHardwareForCompany,
  initializeAllCompanies,
  createExampleCompanyWithHardware,
  defaultHardwareStructure,
  HARDWARE_SYSTEMS,
  SCANNER_BRANDS,
  PRINTER_BRANDS
};

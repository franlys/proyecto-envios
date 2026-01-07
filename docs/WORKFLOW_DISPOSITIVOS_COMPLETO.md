# Flujo de Trabajo Completo con Dispositivos Zebra

## 🎯 Visión General del Flujo

Este documento explica **CUÁNDO** y **CÓMO** entra cada dispositivo en tu flujo de trabajo existente, desde que un recolector recoge un paquete en Miami hasta que un repartidor lo entrega en RD.

---

## 📦 FLUJO COMPLETO: De Miami a República Dominicana

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIAMI (USA) - ORIGEN                          │
└─────────────────────────────────────────────────────────────────┘

1️⃣ RECOLECCIÓN
   Usuario: Recolector (Miami)
   Dispositivo: Ninguno (manual o futuro)
   ┌─────────────────────────────────────┐
   │ • Recolector visita cliente         │
   │ • Recibe paquete físico              │
   │ • Sistema: Crea factura en sistema   │
   │   POST /api/facturas/crear           │
   │   {                                  │
   │     remitente: {...},                │
   │     destinatario: {...},             │
   │     items: [...],                    │
   │     companyId: "empresa_123"         │
   │   }                                  │
   └─────────────────────────────────────┘
                ↓
   ✅ Sistema responde con:
   {
     facturaId: "fact_001",
     codigoTracking: "MIA123456",
     rfid: {
       epc: null  // ⚠️ AÚN SIN TAG RFID
     }
   }

───────────────────────────────────────────────────────────────────

2️⃣ LLEGADA A ALMACÉN MIAMI
   Usuario: Personal de Almacén Miami
   Dispositivo: NINGUNO (aún)
   ┌─────────────────────────────────────┐
   │ • Paquete llega a almacén Miami     │
   │ • Sistema actualiza estado manual:  │
   │   PUT /api/facturas/MIA123456       │
   │   { estado: "en_almacen_miami" }    │
   └─────────────────────────────────────┘

───────────────────────────────────────────────────────────────────

3️⃣ ASOCIACIÓN DE TAG RFID + IMPRESIÓN DE ETIQUETA
   Usuario: Personal de Almacén Miami
   🖨️ DISPOSITIVO #1: IMPRESORA ZEBRA ZD621
   📡 DISPOSITIVO #2: TAG RFID (pegado manual)

   ┌─────────────────────────────────────────────────────────────┐
   │ PASO 3A: PEGAR TAG RFID                                     │
   │ ──────────────────────────────────────────────────────────  │
   │ • Personal toma tag RFID del rollo                          │
   │ • Lee el código EPC con escáner (opcional)                  │
   │ • Sistema asocia tag a factura:                             │
   │   POST /api/facturas/MIA123456/asociar-rfid                 │
   │   {                                                          │
   │     epc: "E280116060000020936C5C4A"                         │
   │   }                                                          │
   │                                                              │
   │ • ✅ Sistema actualiza:                                     │
   │   facturas/MIA123456 {                                      │
   │     rfid: {                                                  │
   │       epc: "E280116060000020936C5C4A",                      │
   │       fechaAsociacion: "2025-12-30T10:00:00Z"              │
   │     }                                                        │
   │   }                                                          │
   │                                                              │
   │ • También actualiza catálogo global:                        │
   │   rfid_tags/E280116060000020936C5C4A {                      │
   │     facturaId: "MIA123456",                                 │
   │     companyId: "empresa_123",                               │
   │     tipo: "paquete",                                         │
   │     estado: "activo"                                         │
   │   }                                                          │
   └─────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────────┐
   │ PASO 3B: IMPRIMIR ETIQUETA                                  │
   │ ──────────────────────────────────────────────────────────  │
   │ • Sistema automático o botón "Imprimir"                     │
   │   POST /api/hardware/print                                  │
   │   {                                                          │
   │     templateName: "shipping_label",                         │
   │     data: {                                                  │
   │       tracking: "MIA123456",                                │
   │       destinatario: "Juan Pérez",                           │
   │       direccion: "Av. Principal #123, SD",                  │
   │       telefono: "809-555-1234"                              │
   │     }                                                        │
   │   }                                                          │
   │                                                              │
   │ ⚙️ BACKEND AUTOMÁTICO:                                      │
   │ 1. Obtiene companyId del usuario autenticado                │
   │ 2. Busca en companies/empresa_123/hardware/printers         │
   │ 3. Encuentra impresora activa (online: true)                │
   │ 4. Obtiene plantilla ZPL "shipping_label"                   │
   │ 5. Reemplaza {{tracking}}, {{destinatario}}, etc.           │
   │ 6. Genera ZPL final:                                        │
   │    ^XA                                                       │
   │    ^FO50,50^A0N,50,50^FDMIA123456^FS                        │
   │    ^FO50,120^BY3^BCN,100^FDMIA123456^FS                     │
   │    ^FO50,240^FDDestinatario:^FS                             │
   │    ^FO50,280^FDJuan Pérez^FS                                │
   │    ...                                                       │
   │    ^XZ                                                       │
   │ 7. Envía vía TCP a 192.168.1.50:9100                        │
   │ 8. ✅ Impresora imprime                                     │
   │ 9. Actualiza estadísticas:                                  │
   │    hardware.printers[0].stats.total_prints++                │
   │    hardware.printers[0].status.last_print = NOW             │
   │                                                              │
   │ • Personal pega etiqueta impresa en paquete                 │
   │ • Pega tag RFID en lugar visible (no sobre metal)           │
   └─────────────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────────────────

4️⃣ ENTRADA A CONTENEDOR (LECTURA RFID AUTOMÁTICA)
   Usuario: Personal de Almacén
   📡 DISPOSITIVO #3: LECTOR RFID FX9600 (Puerta Contenedor)

   ┌─────────────────────────────────────────────────────────────┐
   │ • Operador lleva paquete hacia contenedor                   │
   │ • Paquete PASA por puerta con lector RFID                   │
   │                                                              │
   │ 🔄 AUTOMÁTICO (Sin intervención humana):                    │
   │                                                              │
   │ 1. Lector FX9600 detecta tag RFID                           │
   │    Evento: {                                                 │
   │      epc: "E280116060000020936C5C4A",                       │
   │      rssi: -45,  // Señal fuerte                            │
   │      antenna: 1, // Antena superior izq                     │
   │      timestamp: "2025-12-30T11:00:00Z"                      │
   │    }                                                         │
   │                                                              │
   │ 2. Backend RFIDRouterService.processTagRead()               │
   │    • Busca en rfid_tags por EPC                             │
   │    • Encuentra: facturaId = "MIA123456"                     │
   │    • Obtiene factura completa                               │
   │                                                              │
   │ 3. Aplica reglas automáticas:                               │
   │    reader.events.rules[0] = {                               │
   │      condition: "tag_read",                                 │
   │      action: "assign_to_container",                         │
   │      target_container: "active"                             │
   │    }                                                         │
   │                                                              │
   │ 4. Busca contenedor activo:                                 │
   │    contenedores.where(estado == "activo")                   │
   │    → Encuentra: C-2025-001                                  │
   │                                                              │
   │ 5. Asigna factura a contenedor:                             │
   │    PUT /facturas/MIA123456                                  │
   │    {                                                         │
   │      contenedorId: "C-2025-001",                            │
   │      estado: "en_contenedor",                               │
   │      historial: [+] {                                        │
   │        fecha: NOW,                                           │
   │        estado: "en_contenedor",                             │
   │        metodo: "RFID_automatico",                           │
   │        lectorId: "reader_door_001"                          │
   │      }                                                       │
   │    }                                                         │
   │                                                              │
   │ 6. Actualiza contenedor:                                    │
   │    contenedores/C-2025-001 {                                │
   │      facturas: [+] "MIA123456",                             │
   │      estadisticas.totalFacturas++                           │
   │    }                                                         │
   │                                                              │
   │ 7. ✅ WebSocket notifica en tiempo real:                   │
   │    socket.emit('paquete_agregado', {                        │
   │      contenedorId: "C-2025-001",                            │
   │      tracking: "MIA123456",                                 │
   │      destinatario: "Juan Pérez"                             │
   │    })                                                        │
   │                                                              │
   │ 8. Dashboard se actualiza solo:                             │
   │    Contenedor C-2025-001                                    │
   │    ├── Paquetes: 47 → 48 ✨                                 │
   │    └── Último: MIA123456 (hace 1 seg)                       │
   │                                                              │
   │ ⏱️ TODO ESTO en <2 segundos                                │
   └─────────────────────────────────────────────────────────────┘

   💡 BENEFICIO:
   - No hay que escanear código de barras manualmente
   - No hay que escribir tracking en sistema
   - Solo pasar el paquete por la puerta
   - Sistema registra automáticamente

───────────────────────────────────────────────────────────────────

5️⃣ CIERRE DE CONTENEDOR
   Usuario: Supervisor de Almacén Miami
   Dispositivo: NINGUNO (acción manual en sistema)

   ┌─────────────────────────────────────┐
   │ • Supervisor ve que contenedor está │
   │   completo (48/50 paquetes)          │
   │ • Cierra contenedor en sistema:      │
   │   POST /contenedores/C-2025-001/     │
   │        cerrar                         │
   │   {                                  │
   │     cerradoPor: "supervisor_miami",  │
   │     notas: "Listo para envío"        │
   │   }                                  │
   │                                      │
   │ ⚙️ BACKEND AUTOMÁTICO:               │
   │ • Cambia estado: "cerrado"           │
   │ • Congela lista de facturas          │
   │ • Genera manifiesto automático:      │
   │   {                                  │
   │     contenedorId: "C-2025-001",      │
   │     totalPaquetes: 48,               │
   │     paquetes: [                      │
   │       { tracking: "MIA123456",       │
   │         epc: "E280116..." },         │
   │       ...                             │
   │     ],                               │
   │     hash: "sha256:abc123..."         │
   │   }                                  │
   │ • Notifica a RD: "Contenedor en      │
   │   camino"                             │
   └─────────────────────────────────────┘

───────────────────────────────────────────────────────────────────
                         🚢 TRANSPORTE
                    (3-5 días de tránsito)
───────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────┐
│              REPÚBLICA DOMINICANA - DESTINO                      │
└─────────────────────────────────────────────────────────────────┘

6️⃣ RECEPCIÓN EN ALMACÉN RD (VERIFICACIÓN RFID AUTOMÁTICA)
   Usuario: Personal de Almacén RD
   📡 DISPOSITIVO #4: LECTOR RFID FX9600 (Puerta Almacén RD)

   ┌─────────────────────────────────────────────────────────────┐
   │ • Contenedor llega a almacén RD                             │
   │ • Operadores empiezan a descargar paquetes                  │
   │ • Paquetes PASAN por puerta con lector RFID                 │
   │                                                              │
   │ 🔄 AUTOMÁTICO (Lectura masiva):                             │
   │                                                              │
   │ 1. Lector FX9600 lee TODOS los tags en ráfagas             │
   │    (hasta 1,300 tags/segundo)                               │
   │    Eventos: [                                                │
   │      { epc: "E280116...", rssi: -40, antenna: 1 },          │
   │      { epc: "E280117...", rssi: -42, antenna: 2 },          │
   │      { epc: "E280118...", rssi: -38, antenna: 1 },          │
   │      ... (48 paquetes en ~8 segundos)                       │
   │    ]                                                         │
   │                                                              │
   │ 2. Backend RFIDRouterService.processBulkRead()              │
   │    • Identifica contenedor esperado: C-2025-001             │
   │    • Obtiene manifiesto de Miami                            │
   │    • Compara EPCs leídos vs. esperados                      │
   │                                                              │
   │ 3. Análisis automático:                                     │
   │    Esperados (Miami): 48 paquetes                           │
   │    Recibidos (RD):    47 paquetes                           │
   │                                                              │
   │    ❌ FALTA 1 PAQUETE:                                      │
   │    - Tracking: MIA123470                                    │
   │    - EPC: E280130...                                        │
   │    - Destinatario: Pedro Martínez                           │
   │                                                              │
   │ 4. ⚠️ ALERTA AUTOMÁTICA:                                    │
   │    • Email a supervisores Miami y RD                        │
   │    • Notificación push en dashboard                         │
   │    • WhatsApp (si configurado)                              │
   │                                                              │
   │ 5. Dashboard muestra:                                       │
   │    ┌──────────────────────────────────┐                    │
   │    │ ⚠️ CONTENEDOR C-2025-001         │                    │
   │    │ ├── ✅ Recibidos: 47/48          │                    │
   │    │ ├── ❌ Faltante: MIA123470       │                    │
   │    │ │   Destinatario: Pedro Martínez │                    │
   │    │ └── 🔍 Requiere investigación    │                    │
   │    └──────────────────────────────────┘                    │
   │                                                              │
   │ 6. Estado automático:                                       │
   │    contenedores/C-2025-001 {                                │
   │      estado: "recibido_con_discrepancia",                   │
   │      discrepancias: {                                        │
   │        faltantes: ["MIA123470"],                            │
   │        extras: [],                                           │
   │        danados: []                                           │
   │      }                                                       │
   │    }                                                         │
   │                                                              │
   │ ⏱️ TODO en ~15 segundos (lectura + análisis)               │
   └─────────────────────────────────────────────────────────────┘

   💡 BENEFICIO:
   - No hay que contar paquetes manualmente
   - No hay que escanear uno por uno
   - Detecta faltantes inmediatamente
   - Evidencia digital para reclamos

───────────────────────────────────────────────────────────────────

7️⃣ CONFIRMACIÓN MANUAL DE RECEPCIÓN
   Usuario: Supervisor Almacén RD
   Dispositivo: NINGUNO (decisión humana)

   ┌─────────────────────────────────────┐
   │ • Supervisor revisa alerta           │
   │ • Verifica físicamente si falta      │
   │   paquete                             │
   │ • Contacta a Miami para aclarar      │
   │ • Una vez resuelto, confirma:        │
   │   POST /almacen-rd/contenedores/     │
   │        C-2025-001/confirmar          │
   │   {                                  │
   │     confirmadoPor: "sup_rd_001",     │
   │     notas: "Faltante confirmado,     │
   │            reportado a Miami",        │
   │     discrepanciasResueltas: false    │
   │   }                                  │
   │                                      │
   │ ⚙️ BACKEND:                          │
   │ • Estado: "recibido_rd"              │
   │ • Libera paquetes para rutas         │
   │ • Actualiza inventario               │
   └─────────────────────────────────────┘

───────────────────────────────────────────────────────────────────

8️⃣ ASIGNACIÓN A RUTAS
   Usuario: Supervisor Almacén RD
   Dispositivo: NINGUNO (proceso en sistema)

   ┌─────────────────────────────────────┐
   │ • Supervisor crea rutas en sistema:  │
   │   POST /rutas/crear                  │
   │   {                                  │
   │     nombre: "RUTA CAPITAL",          │
   │     zona: "Santo Domingo",           │
   │     repartidorId: "rep_juan_001"     │
   │   }                                  │
   │                                      │
   │ • Asigna paquetes a ruta:            │
   │   POST /facturas/MIA123456/          │
   │        asignar-ruta                   │
   │   {                                  │
   │     rutaId: "ruta_capital_001"       │
   │   }                                  │
   │                                      │
   │ • Sistema actualiza:                 │
   │   facturas/MIA123456 {               │
   │     rutaAsignada: "RUTA CAPITAL",    │
   │     estado: "asignada_ruta"          │
   │   }                                  │
   └─────────────────────────────────────┘

───────────────────────────────────────────────────────────────────

9️⃣ CARGA EN VEHÍCULO (VALIDACIÓN RFID CON HANDHELD)
   Usuario: Cargador
   📱 DISPOSITIVO #5: ZEBRA TC21 (Handheld con RFID)

   ┌─────────────────────────────────────────────────────────────┐
   │ PASO 9A: INICIAR PROCESO DE CARGA                           │
   │ ──────────────────────────────────────────────────────────  │
   │ • Cargador inicia turno                                     │
   │ • Abre app móvil en TC21                                    │
   │ • Escanea código QR o barras de RUTA                        │
   │   📷 Escanea: RUTA-CAPITAL-2025-12-30                       │
   │                                                              │
   │ • App hace request:                                         │
   │   GET /rutas/RUTA-CAPITAL-2025-12-30/paquetes              │
   │                                                              │
   │ • Backend responde:                                         │
   │   {                                                          │
   │     rutaId: "ruta_capital_001",                             │
   │     nombre: "RUTA CAPITAL",                                 │
   │     paquetes: [                                             │
   │       {                                                      │
   │         tracking: "MIA123456",                              │
   │         epc: "E280116...",                                  │
   │         destinatario: "Juan Pérez",                         │
   │         direccion: "Av. Principal #123"                     │
   │       },                                                     │
   │       ... (15 paquetes total)                               │
   │     ]                                                        │
   │   }                                                          │
   │                                                              │
   │ • App muestra checklist:                                    │
   │   ┌────────────────────────────────┐                       │
   │   │ RUTA CAPITAL (0/15)            │                       │
   │   ├────────────────────────────────┤                       │
   │   │ ☐ MIA123456 - Juan Pérez       │                       │
   │   │ ☐ MIA123460 - María López      │                       │
   │   │ ☐ MIA123465 - Pedro Martínez   │                       │
   │   │ ...                             │                       │
   │   └────────────────────────────────┘                       │
   └─────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────────┐
   │ PASO 9B: CARGAR PAQUETES CON VALIDACIÓN                     │
   │ ──────────────────────────────────────────────────────────  │
   │ • Cargador toma paquete físico                              │
   │ • ACERCA el TC21 al paquete (3-6 pies de distancia)         │
   │                                                              │
   │ 🔄 AUTOMÁTICO:                                              │
   │                                                              │
   │ 1. TC21 lee tag RFID:                                       │
   │    EPC leído: "E280116060000020936C5C4A"                    │
   │                                                              │
   │ 2. App valida localmente:                                   │
   │    ¿Este EPC está en mi lista de paquetes?                  │
   │                                                              │
   │ 3a. ✅ SÍ - PAQUETE CORRECTO:                               │
   │     • TC21 vibra: bzzzz (200ms, patrón success)             │
   │     • Pantalla: VERDE                                       │
   │     • Sonido: "beep" agradable                              │
   │     • Mensaje:                                              │
   │       ┌──────────────────────────┐                         │
   │       │ ✅ CORRECTO               │                         │
   │       │ MIA123456                 │                         │
   │       │ Juan Pérez                │                         │
   │       │ Av. Principal #123        │                         │
   │       └──────────────────────────┘                         │
   │                                                              │
   │     • Marca en checklist:                                   │
   │       ✅ MIA123456 - Juan Pérez  (11:23 AM)                 │
   │                                                              │
   │     • Envía a backend (WebSocket):                          │
   │       socket.emit('paquete_cargado', {                      │
   │         rutaId: "ruta_capital_001",                         │
   │         tracking: "MIA123456",                              │
   │         timestamp: NOW,                                      │
   │         cargadorId: "user_juan_001",                        │
   │         gps: { lat: 18.486, lng: -69.931 }                  │
   │       })                                                     │
   │                                                              │
   │     • Backend actualiza:                                    │
   │       facturas/MIA123456 {                                  │
   │         estado: "cargado_vehiculo",                         │
   │         fechaCarga: NOW,                                    │
   │         cargadoPor: "Juan"                                  │
   │       }                                                      │
   │                                                              │
   │ 3b. ❌ NO - PAQUETE INCORRECTO:                             │
   │     • TC21 vibra: bzzzzzz (1 segundo, patrón error)         │
   │     • Pantalla: ROJA                                        │
   │     • Sonido: ALARMA fuerte                                 │
   │     • Mensaje:                                              │
   │       ┌──────────────────────────┐                         │
   │       │ ⚠️ PAQUETE INCORRECTO    │                         │
   │       │                           │                         │
   │       │ Este paquete NO es de     │                         │
   │       │ esta ruta                 │                         │
   │       │                           │                         │
   │       │ Tracking: MIA123999       │                         │
   │       │ Pertenece a: RUTA SUR     │                         │
   │       │                           │                         │
   │       │ ❌ NO CARGAR              │                         │
   │       │ Deja este paquete aquí    │                         │
   │       └──────────────────────────┘                         │
   │                                                              │
   │     • Registra error:                                       │
   │       POST /api/eventos/error-carga                         │
   │       {                                                      │
   │         tipo: "paquete_ruta_incorrecta",                    │
   │         epc: "E280199...",                                  │
   │         tracking: "MIA123999",                              │
   │         rutaIntentada: "RUTA CAPITAL",                      │
   │         rutaCorrecta: "RUTA SUR",                           │
   │         cargadorId: "user_juan_001"                         │
   │       }                                                      │
   │                                                              │
   │     • Alerta a supervisor (dashboard)                       │
   │                                                              │
   │ 4. Cargador repite proceso con cada paquete                 │
   │                                                              │
   │ 5. App actualiza progreso en tiempo real:                   │
   │    RUTA CAPITAL (12/15) - 80%                               │
   │    [████████████████░░░░]                                   │
   │                                                              │
   │    ✅ Cargados: 12                                          │
   │    ⏸️  Faltantes: 3                                         │
   │    ❌ Errores: 0                                            │
   └─────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────────┐
   │ PASO 9C: FINALIZAR CARGA                                    │
   │ ──────────────────────────────────────────────────────────  │
   │ • Una vez todos marcados (15/15):                           │
   │   App muestra:                                              │
   │   ┌──────────────────────────┐                             │
   │   │ ✅ RUTA COMPLETA          │                             │
   │   │                           │                             │
   │   │ 15/15 paquetes cargados   │                             │
   │   │                           │                             │
   │   │ [Finalizar Carga]         │                             │
   │   └──────────────────────────┘                             │
   │                                                              │
   │ • Cargador presiona botón                                   │
   │ • Sistema marca ruta lista:                                 │
   │   PUT /rutas/ruta_capital_001/finalizar-carga              │
   │   {                                                          │
   │     finalizadaPor: "user_juan_001",                         │
   │     timestamp: NOW,                                          │
   │     paquetesConfirmados: 15                                 │
   │   }                                                          │
   │                                                              │
   │ • Backend:                                                  │
   │   rutas/ruta_capital_001 {                                  │
   │     estado: "lista_para_salir",                             │
   │     fechaCarga: NOW,                                        │
   │     paquetesCargados: 15                                    │
   │   }                                                          │
   │                                                              │
   │ • Dashboard supervisor:                                     │
   │   ┌────────────────────────────┐                           │
   │   │ ✅ RUTA CAPITAL            │                           │
   │   │ Lista para salir           │                           │
   │   │ Cargador: Juan             │                           │
   │   │ Paquetes: 15/15            │                           │
   │   │ Errores: 0                 │                           │
   │   │                             │                           │
   │   │ [Autorizar Salida] 🚚      │                           │
   │   └────────────────────────────┘                           │
   └─────────────────────────────────────────────────────────────┘

   💡 BENEFICIOS:
   - IMPOSIBLE cargar paquete incorrecto
   - Alerta inmediata si hay error
   - Progreso en tiempo real
   - Auditoría completa (quién, cuándo, dónde)
   - Reducción de devoluciones a 0%

───────────────────────────────────────────────────────────────────

🔟 SALIDA A RUTA
   Usuario: Repartidor
   Dispositivo: TC21 (app móvil)

   ┌─────────────────────────────────────┐
   │ • Repartidor sale del almacén        │
   │ • App móvil en modo "En Ruta"        │
   │ • GPS tracking automático            │
   │ • Sistema actualiza:                 │
   │   rutas/ruta_capital_001 {           │
   │     estado: "en_ruta",               │
   │     horaSalida: NOW,                 │
   │     ubicacionActual: GPS             │
   │   }                                  │
   └─────────────────────────────────────┘

───────────────────────────────────────────────────────────────────

1️⃣1️⃣ ENTREGA AL CLIENTE
   Usuario: Repartidor
   🖨️ DISPOSITIVO #6: IMPRESORA MÓVIL ZEBRA ZQ630 (Opcional)

   ┌─────────────────────────────────────┐
   │ • Repartidor llega a dirección       │
   │ • Entrega paquete                    │
   │ • Cliente firma en TC21 (pantalla    │
   │   táctil)                             │
   │ • Opcional: Toma foto                │
   │ • Marca como entregado:              │
   │   POST /facturas/MIA123456/entregar  │
   │   {                                  │
   │     recibidoPor: "Juan Pérez",       │
   │     firma_base64: "data:image...",   │
   │     foto_base64: "data:image...",    │
   │     gps: { lat: ..., lng: ... }      │
   │   }                                  │
   │                                      │
   │ • Si cliente quiere comprobante:     │
   │   - Conecta ZQ630 vía Bluetooth      │
   │   - Sistema imprime comprobante      │
   │     (plantilla "receipt")             │
   │   - Cliente recibe papel             │
   └─────────────────────────────────────┘

───────────────────────────────────────────────────────────────────

## 📊 RESUMEN DE DISPOSITIVOS POR ETAPA

| Etapa | Dispositivo | Función | Automático | Manual |
|-------|-------------|---------|------------|--------|
| 1️⃣ Recolección | Ninguno | Crear factura | ❌ | ✅ |
| 2️⃣ Llegada Miami | Ninguno | Actualizar estado | ❌ | ✅ |
| 3️⃣ Tag + Etiqueta | Impresora ZD621 | Imprimir etiqueta | ✅ | Trigger |
| 3️⃣ Tag + Etiqueta | Tag RFID | Asociar EPC | ❌ | ✅ |
| 4️⃣ Entrada contenedor | Lector FX9600 (Miami) | Asignar a contenedor | ✅ | ❌ |
| 5️⃣ Cierre contenedor | Ninguno | Generar manifiesto | ✅ | Trigger |
| 6️⃣ Recepción RD | Lector FX9600 (RD) | Verificar inventario | ✅ | ❌ |
| 7️⃣ Confirmar recepción | Ninguno | Liberar a rutas | ❌ | ✅ |
| 8️⃣ Asignar rutas | Ninguno | Crear rutas | ❌ | ✅ |
| 9️⃣ Carga vehículo | TC21 Handheld | Validar paquetes | ✅ | Operador |
| 🔟 Salida ruta | TC21 (GPS) | Tracking en vivo | ✅ | ❌ |
| 1️⃣1️⃣ Entrega | TC21 + ZQ630 | Firma + Comprobante | ❌ | ✅ |

---

## 🎯 PUNTOS CLAVE

### ✅ Automatizaciones que ELIMINAN trabajo manual:
1. **Entrada a contenedor** - Ya no escanear cada paquete
2. **Recepción en RD** - Ya no contar/verificar uno por uno
3. **Carga de vehículo** - Imposible error de ruta
4. **Dashboard en tiempo real** - Sin actualizar página

### ⚡ Velocidad del proceso:
- **Antes (manual):**
  - Escanear 50 paquetes: ~15 minutos
  - Verificar recepción: ~20 minutos
  - Cargar con validación: ~30 minutos
  - **Total: ~65 minutos**

- **Después (RFID):**
  - Pasar por puerta: ~2 minutos
  - Verificar recepción: ~15 segundos
  - Cargar con TC21: ~10 minutos
  - **Total: ~12 minutos**

### 🛡️ Errores que se ELIMINAN:
- ❌ Paquete en contenedor incorrecto
- ❌ Paquete perdido sin evidencia
- ❌ Discrepancias sin detectar
- ❌ Carga en ruta incorrecta
- ❌ Falta de trazabilidad

---

## 🔧 Para Inicializar en Firestore

```bash
# Backend
cd backend
node src/scripts/initializeHardwareStructure.js all
```

Esto crea la estructura `hardware` en todas las empresas existentes.

---

¿Necesitas que detalle alguna parte específica del flujo o tienes dudas sobre cómo se integra con tu código actual?

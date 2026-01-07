# Plan de Prueba Piloto - Sistema Zebra RFID

## 🎯 Objetivo de la Prueba
Validar el flujo completo de tracking automático usando RFID desde el recolector en Miami hasta el almacén en RD, con lectura automática para cargadores.

---

## 📋 Flujo Operativo

```
┌─────────────────────────────────────────────────────────────────┐
│                         MIAMI (USA)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1️⃣ RECOLECTOR                                                  │
│     ┌────────────────────────────────────────┐                 │
│     │ • Recibe paquetes de clientes         │                 │
│     │ • Coloca tag RFID en cada paquete     │                 │
│     │ • Sistema registra: tracking + EPC    │                 │
│     │ • Imprime etiqueta con código barras  │                 │
│     └────────────────────────────────────────┘                 │
│                          ↓                                       │
│  2️⃣ ENTRADA A CONTENEDOR                                        │
│     ┌────────────────────────────────────────┐                 │
│     │  [Lector RFID FX9600 - Puerta 1]     │                 │
│     │  • Lee automáticamente cada paquete    │                 │
│     │  • Registra: EPC + timestamp + RSSI    │                 │
│     │  • Asigna a contenedor abierto         │                 │
│     │  • Dashboard muestra items en tiempo   │                 │
│     │    real                                 │                 │
│     └────────────────────────────────────────┘                 │
│                          ↓                                       │
│  3️⃣ CIERRE DE CONTENEDOR                                        │
│     ┌────────────────────────────────────────┐                 │
│     │ • Encargado cierra manualmente en      │                 │
│     │   sistema                               │                 │
│     │ • Se genera manifiesto automático      │                 │
│     │ • Lista completa de paquetes           │                 │
│     │ • Estado: "en_transito_rd"             │                 │
│     └────────────────────────────────────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                          ↓
                  [TRANSPORTE]
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                   REPÚBLICA DOMINICANA                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  4️⃣ RECEPCIÓN EN ALMACÉN RD                                     │
│     ┌────────────────────────────────────────┐                 │
│     │  [Lector RFID FX9600 - Puerta 2]     │                 │
│     │  • Lee automáticamente todo el         │                 │
│     │    contenedor al descargar             │                 │
│     │  • Compara con manifiesto de Miami     │                 │
│     │  • Detecta discrepancias automáticas   │                 │
│     │  • Alerta si falta algo                │                 │
│     │  • Dashboard muestra: recibido vs      │                 │
│     │    esperado                             │                 │
│     └────────────────────────────────────────┘                 │
│                          ↓                                       │
│  5️⃣ CONFIRMACIÓN DE RECEPCIÓN                                   │
│     ┌────────────────────────────────────────┐                 │
│     │ • Encargado confirma en sistema        │                 │
│     │ • Se actualiza inventario              │                 │
│     │ • Estado: "recibido_rd"                │                 │
│     │ • Paquetes disponibles para asignar    │                 │
│     │   a rutas                               │                 │
│     └────────────────────────────────────────┘                 │
│                          ↓                                       │
│  6️⃣ ZONA DE PREPARACIÓN DE RUTAS                                │
│     ┌────────────────────────────────────────┐                 │
│     │ • Paquetes se asignan a rutas en       │                 │
│     │   sistema                               │                 │
│     │ • Cargadores toman paquetes            │                 │
│     └────────────────────────────────────────┘                 │
│                          ↓                                       │
│  7️⃣ CARGA AUTOMÁTICA EN VEHÍCULOS                               │
│     ┌────────────────────────────────────────┐                 │
│     │  [Lector RFID Portátil - Cargador]   │                 │
│     │  • Cargador lleva lector TC21          │                 │
│     │  • Lee automáticamente paquetes al     │                 │
│     │    cargar en vehículo                   │                 │
│     │  • Sistema valida: ¿paquete correcto   │                 │
│     │    para esta ruta?                      │                 │
│     │  • ✅ Correcto = bip verde + continúa  │                 │
│     │  • ❌ Incorrecto = alarma + alerta     │                 │
│     │  • Dashboard muestra progreso de carga │                 │
│     │  • Al terminar: ruta lista para salir  │                 │
│     └────────────────────────────────────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛒 Lista de Equipos y Costos

### MIAMI (Recolector + Entrada de Contenedor)

| # | Equipo | Modelo | Cantidad | Precio Unit. | Subtotal | Uso |
|---|--------|--------|----------|--------------|----------|-----|
| 1 | **Impresora de Etiquetas** | Zebra ZD621 (203dpi, 4") | 1 | $550 | **$550** | Imprimir etiquetas con código de barras |
| 2 | **Lector RFID Fijo** | Zebra FX9600 | 1 | $1,800 | **$1,800** | Puerta de entrada a contenedor |
| 3 | **Antenas RFID** | AN480 (4 antenas) | 4 | $150 | **$600** | Cobertura completa de puerta |
| 4 | **Tags RFID Pasivos** | UHF Gen2 (paquete 1000) | 1000 | $0.15 | **$150** | Etiquetas para paquetes |
| 5 | **Cable Ethernet** | Cat6, 50ft | 2 | $15 | **$30** | Conexión de dispositivos |
| 6 | **PoE Switch** | 8 puertos | 1 | $80 | **$80** | Alimentar antenas |
| 7 | **Mounting Kit** | Soporte para antenas | 1 | $120 | **$120** | Instalación en puerta |

**Subtotal Miami: $3,330**

---

### REPÚBLICA DOMINICANA (Almacén + Cargadores)

| # | Equipo | Modelo | Cantidad | Precio Unit. | Subtotal | Uso |
|---|--------|--------|----------|--------------|----------|-----|
| 8 | **Impresora de Etiquetas** | Zebra ZD621 (203dpi, 4") | 1 | $550 | **$550** | Reimprimir etiquetas si necesario |
| 9 | **Lector RFID Fijo** | Zebra FX9600 | 1 | $1,800 | **$1,800** | Puerta de entrada almacén RD |
| 10 | **Antenas RFID** | AN480 (4 antenas) | 4 | $150 | **$600** | Cobertura de descarga |
| 11 | **Lector Portátil** | Zebra TC21 (Android + RFID) | 2 | $1,000 | **$2,000** | Para cargadores (lectura al cargar vehículos) |
| 12 | **Fundas Protectoras** | Para TC21 | 2 | $50 | **$100** | Protección dispositivos |
| 13 | **Cable Ethernet** | Cat6, 50ft | 2 | $15 | **$30** | Conexión |
| 14 | **PoE Switch** | 8 puertos | 1 | $80 | **$80** | Alimentar antenas |
| 15 | **Mounting Kit** | Soporte para antenas | 1 | $120 | **$120** | Instalación en puerta |

**Subtotal RD: $5,280**

---

### SOFTWARE Y SERVICIOS

| # | Item | Descripción | Costo |
|---|------|-------------|-------|
| 16 | **Zebra Browser Print** | Gratis (descarga) | **$0** |
| 17 | **Link-OS SDK** | Gratis (descarga) | **$0** |
| 18 | **Instalación y Configuración** | Técnico certificado Zebra (2 días) | **$800** |
| 19 | **Capacitación** | Para 5 personas (1 día) | **$400** |
| 20 | **Desarrollo de Software** | Integración con tu sistema (ya incluido en tu equipo de desarrollo) | **$0** |

**Subtotal Software/Servicios: $1,200**

---

## 💰 RESUMEN DE COSTOS

| Categoría | Subtotal |
|-----------|----------|
| **Equipos Miami** | $3,330 |
| **Equipos RD** | $5,280 |
| **Software y Servicios** | $1,200 |
| **Subtotal** | $9,810 |
| **Contingencia (10%)** | $981 |
| **IVA/Impuestos estimados** | $1,079 |
| **TOTAL INVERSIÓN PRUEBA PILOTO** | **~$11,870 USD** |

---

## 📱 Detalles de Dispositivos

### 1. Zebra ZD621 (Impresoras)
**Por qué este modelo:**
- Térmica directa (no necesita ribbon para etiquetas de corto plazo)
- 203 dpi suficiente para códigos de barras legibles
- Conectividad Ethernet/WiFi
- Link-OS compatible
- Compacta para escritorio

**Alternativa más económica:**
- Zebra ZD420 (~$400) - Funcionalidad similar, menos robusta

---

### 2. Zebra FX9600 (Lectores RFID Fijos)
**Por qué este modelo:**
- Rango de lectura: hasta 30 pies
- 4 puertos de antena (expandible a 8)
- Lee hasta 1,300 tags/segundo
- Filtrado avanzado (evita lecturas duplicadas)
- API REST + MQTT
- Perfecto para portales de entrada

**Configuración:**
```
Puerta de contenedor (Miami):
├── 2 antenas arriba (detectan al entrar)
└── 2 antenas a los lados (cobertura lateral)

Puerta almacén (RD):
├── 2 antenas arriba (detectan al entrar)
└── 2 antenas a los lados (cobertura lateral)
```

---

### 3. Zebra TC21 (Lectores Portátiles para Cargadores)
**Por qué este modelo:**
- Android 10/11 (puede correr app personalizada)
- Pantalla táctil 5"
- Escáner 2D + RFID UHF integrado
- Batería 8+ horas
- WiFi + 4G LTE
- Resistente (caídas de 4 pies)
- Rango RFID: hasta 15 pies

**Funcionalidad para cargadores:**
```javascript
// App móvil para cargador
1. Cargador escanea código de barras de ruta
2. App carga lista de paquetes de esa ruta
3. Al acercar TC21 a paquete:
   - Lee tag RFID automáticamente
   - Valida si pertenece a la ruta
   - ✅ Correcto: BIP verde + marca en lista
   - ❌ Incorrecto: ALARMA + "Este paquete es de otra ruta"
4. Dashboard en tiempo real muestra:
   - Paquetes cargados: 25/30
   - Faltantes: 5
   - Incorrectos: 0
```

---

## 🔧 Especificaciones Técnicas de Instalación

### PUERTA DE CONTENEDOR (MIAMI)

```
                    [Antena 1]     [Antena 2]
                         ▼             ▼
        ╔═══════════════════════════════════╗
        ║                                   ║
[Ant 3] ║     ENTRADA A CONTENEDOR         ║ [Ant 4]
◄──────║         ↓ ↓ ↓                    ║──────►
        ║    Paquetes pasan aquí            ║
        ║                                   ║
        ╚═══════════════════════════════════╝
                         ▲
                   [FX9600 Reader]
                   Montado en pared
                   Conectado vía PoE
```

**Requisitos:**
- Ancho de puerta: 6-8 pies
- Altura de montaje: 8 pies
- Alimentación: PoE (802.3af)
- Red: Ethernet Gigabit
- Zona de lectura: 3 metros de profundidad

---

### PUERTA DE ALMACÉN (RD)

```
                    [Antena 1]     [Antena 2]
                         ▼             ▼
        ╔═══════════════════════════════════╗
        ║                                   ║
[Ant 3] ║     ENTRADA ALMACÉN RD           ║ [Ant 4]
◄──────║         ↓ ↓ ↓                    ║──────►
        ║    Paquetes llegan aquí           ║
        ║                                   ║
        ╚═══════════════════════════════════╝
                         ▲
                   [FX9600 Reader]
                   Montado en estructura
                   Conectado vía PoE
```

**Requisitos:**
- Similar a Miami
- Posición estratégica donde se descarga contenedor

---

## 🔄 Flujo de Datos Técnico

### 1. REGISTRO DE PAQUETE (Miami - Recolector)

```javascript
// POST /api/paquetes/registrar
{
  codigoTracking: "MIA123456",
  contenedorId: null, // Todavía sin asignar
  rfid: {
    epc: "E280116060000020936C5C4A", // ID único del tag
    fechaAsociacion: "2025-12-29T10:30:00Z"
  },
  remitente: {...},
  destinatario: {...},
  items: [...],
  estado: "registrado"
}

// Sistema imprime etiqueta con:
// - Código de barras (tracking)
// - QR code (tracking + URL)
// - Texto: destinatario, dirección
```

---

### 2. ENTRADA A CONTENEDOR (Miami - Lector RFID)

```javascript
// Evento automático del FX9600
{
  event: "rfid_detection",
  reader_id: "FX9600_MIAMI_CONTENEDOR",
  epc: "E280116060000020936C5C4A",
  rssi: -45, // Señal fuerte
  timestamp: "2025-12-29T11:15:23Z",
  antenna: 1
}

// Backend automático:
// 1. Busca paquete por EPC
// 2. Asigna a contenedor activo
// 3. Actualiza estado: "en_contenedor"
// 4. WebSocket notifica dashboard en tiempo real

// Dashboard muestra:
Contenedor C-2025-001 (ACTIVO)
├── 📦 Paquetes cargados: 47
├── ⏱️ Último paquete: hace 2 min
└── 🚦 Estado: Recibiendo
```

---

### 3. CIERRE DE CONTENEDOR (Miami - Manual)

```javascript
// PUT /api/contenedores/C-2025-001/cerrar
{
  cerradoPor: "usuario_miami_01",
  notasCierre: "Contenedor completo, listo para envío",
  timestamp: "2025-12-29T16:00:00Z"
}

// Backend:
// 1. Cambia estado: "cerrado" → "en_transito_rd"
// 2. Genera manifiesto automático
// 3. Congela lista de paquetes
// 4. Envía notificación a RD

// Manifiesto generado:
{
  contenedorId: "C-2025-001",
  fechaCierre: "2025-12-29T16:00:00Z",
  totalPaquetes: 47,
  paquetes: [
    { tracking: "MIA123456", epc: "E280116..." },
    { tracking: "MIA123457", epc: "E280117..." },
    ...
  ],
  hash: "sha256:abc123..." // Para verificar integridad
}
```

---

### 4. RECEPCIÓN EN RD (Almacén - Lector RFID)

```javascript
// Evento automático al descargar
// FX9600 lee TODOS los paquetes en ráfagas

{
  event: "bulk_read",
  reader_id: "FX9600_RD_ENTRADA",
  contenedor_esperado: "C-2025-001",
  tags_leidos: [
    { epc: "E280116...", rssi: -40, timestamp: "..." },
    { epc: "E280117...", rssi: -42, timestamp: "..." },
    ... (47 paquetes)
  ],
  duracion_lectura: "8 segundos"
}

// Backend automático:
// 1. Compara con manifiesto de Miami
// 2. Verifica integridad (hash)
// 3. Detecta diferencias

// Análisis:
{
  contenedor: "C-2025-001",
  esperados: 47,
  recibidos: 46,
  faltantes: [
    { tracking: "MIA123470", epc: "E280130..." }
  ],
  extras: [], // Paquetes no esperados
  estado: "recibido_con_discrepancia"
}

// Dashboard muestra ALERTA:
⚠️ CONTENEDOR C-2025-001
├── ✅ Recibidos: 46/47
├── ❌ Faltante: MIA123470
└── 🔍 Requiere investigación
```

---

### 5. CONFIRMACIÓN DE RECEPCIÓN (RD - Manual)

```javascript
// PUT /api/almacen-rd/contenedores/C-2025-001/confirmar-recepcion
{
  confirmadoPor: "usuario_rd_01",
  notas: "Un paquete faltante, reportado a Miami",
  discrepanciasResueltas: true,
  timestamp: "2025-12-30T09:00:00Z"
}

// Backend:
// 1. Actualiza estado: "recibido_rd"
// 2. Libera paquetes para asignación a rutas
// 3. Actualiza inventario
```

---

### 6. CARGA EN VEHÍCULO (RD - Cargador con TC21)

```javascript
// App móvil del cargador

// Paso 1: Seleccionar ruta
// Cargador escanea código de barras "RUTA-CAPITAL-2025-12-30"

// Backend envía al TC21:
{
  rutaId: "RUTA-CAPITAL-2025-12-30",
  paquetes: [
    { tracking: "MIA123456", epc: "E280116...", destinatario: "..." },
    { tracking: "MIA123460", epc: "E280120...", destinatario: "..." },
    ... (15 paquetes para esta ruta)
  ]
}

// Paso 2: Carga validada
// Cargador acerca TC21 al paquete → Lee EPC automáticamente

// Validación en tiempo real:
if (epc_leido in paquetes_de_ruta) {
  // ✅ CORRECTO
  vibrar(200ms, "success");
  mostrar_pantalla_verde();
  reproducir_sonido("beep_success.mp3");
  marcar_como_cargado(epc_leido);

  // WebSocket actualiza dashboard
  socket.emit('paquete_cargado', {
    rutaId: "RUTA-CAPITAL-2025-12-30",
    tracking: "MIA123456",
    timestamp: now()
  });

} else {
  // ❌ INCORRECTO - No pertenece a esta ruta
  vibrar(1000ms, "error");
  mostrar_pantalla_roja();
  reproducir_alarma("alert.mp3");

  mostrar_alerta({
    titulo: "⚠️ PAQUETE INCORRECTO",
    mensaje: "Este paquete es de otra ruta",
    tracking: obtener_tracking(epc_leido),
    ruta_correcta: obtener_ruta(epc_leido),
    accion: "Dejar este paquete y tomar el correcto"
  });
}

// Dashboard en oficina muestra en tiempo real:
RUTA CAPITAL - Carga en progreso
├── 👤 Cargador: Juan Pérez
├── 📦 Cargados: 12/15 (80%)
├── ⏱️ Tiempo: 8 min
├── ✅ Correctos: 12
└── ❌ Errores: 0

Paquetes faltantes:
├── MIA123470 - Juan González - Los Prados
├── MIA123475 - María Rodríguez - Gazcue
└── MIA123480 - Pedro Martínez - Naco
```

---

## 📊 Dashboard en Tiempo Real

### Vista: Flujo de Contenedores

```
┌────────────────────────────────────────────────────────┐
│  CONTENEDORES EN TRÁNSITO                              │
├────────────────────────────────────────────────────────┤
│                                                         │
│  C-2025-001  [●●●●●●●●●●] 100%  En RD                 │
│  47 paquetes │ Cerrado hace 18h │ Recibido hace 2h    │
│                                                         │
│  C-2025-002  [●●●●●●○○○○]  65%  En preparación        │
│  32 paquetes │ Activo │ Último paquete: hace 5 min    │
│                                                         │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  ACTIVIDAD EN TIEMPO REAL                              │
├────────────────────────────────────────────────────────┤
│                                                         │
│  🟢 10:45:23  MIA123456 → Contenedor C-2025-002       │
│  🟢 10:45:18  MIA123455 → Contenedor C-2025-002       │
│  🔵 10:44:50  Contenedor C-2025-001 recibido en RD    │
│  🟠 10:44:45  Discrepancia: 1 paquete faltante        │
│  🟢 10:44:20  MIA123454 → Contenedor C-2025-002       │
│                                                         │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  RUTAS - PROCESO DE CARGA                              │
├────────────────────────────────────────────────────────┤
│                                                         │
│  RUTA CAPITAL    [●●●●●●●●●●] 12/15  🔴 EN CARGA      │
│  Cargador: Juan Pérez  │  Tiempo: 8 min               │
│                                                         │
│  RUTA SUR        [●●●●●●●●●●] 10/10  ✅ COMPLETA      │
│  Cargador: María López │  Lista para salir            │
│                                                         │
│  RUTA CIBAO      [○○○○○○○○○○]  0/20  ⏸️ PENDIENTE     │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

## 🎓 Plan de Capacitación

### Día 1: Personal Miami (Recolector)
**Duración: 4 horas**

1. **Introducción RFID** (30 min)
   - Qué es RFID y cómo funciona
   - Ventajas vs código de barras

2. **Uso de impresora Zebra** (1 hora)
   - Colocar etiquetas
   - Imprimir desde sistema
   - Resolver problemas comunes

3. **Colocación de tags RFID** (1 hora)
   - Dónde colocar el tag en el paquete
   - Orientación correcta
   - Qué evitar (metal, líquidos)

4. **Sistema de contenedores** (1.5 horas)
   - Registrar paquete en sistema
   - Verificar lectura automática
   - Cerrar contenedor
   - Generar manifiesto

### Día 2: Personal RD (Almacén + Cargadores)
**Duración: 4 horas**

1. **Recepción automática** (1 hora)
   - Cómo funciona el lector en puerta
   - Verificar lectura automática
   - Qué hacer con discrepancias

2. **Uso del sistema** (1 hora)
   - Confirmar recepción
   - Reportar faltantes
   - Asignar a rutas

3. **Uso del TC21 para cargadores** (2 horas)
   - Encender/apagar dispositivo
   - Seleccionar ruta
   - Cargar paquetes con validación
   - Interpretar alertas
   - Qué hacer ante error
   - Completar carga

---

## ⚙️ Cronograma de Implementación

### Semana 1-2: Preparación
- ✅ Compra de equipos
- ✅ Desarrollo de software (backend + frontend + app móvil)
- ✅ Preparación de infraestructura de red

### Semana 3: Instalación Miami
- 🔧 Instalación de lector FX9600 en puerta
- 🔧 Montaje de 4 antenas
- 🔧 Instalación de impresora
- 🔧 Configuración de red
- 🧪 Pruebas de conectividad

### Semana 4: Instalación RD
- 🔧 Instalación de lector FX9600 en almacén
- 🔧 Montaje de 4 antenas
- 🔧 Instalación de impresora
- 🔧 Configuración de dispositivos TC21
- 🧪 Pruebas de conectividad

### Semana 5: Capacitación
- 👨‍🏫 Día 1: Personal Miami
- 👨‍🏫 Día 2: Personal RD

### Semana 6-8: Prueba Piloto
- 🚀 Operación en modo piloto
- 📊 Recolección de métricas
- 🐛 Ajustes y correcciones
- 📈 Análisis de resultados

---

## 📈 Métricas de Éxito

### KPIs a Medir durante la Prueba

1. **Precisión de Lectura RFID**
   - Meta: >99.5%
   - Paquetes leídos correctamente / Total paquetes

2. **Discrepancias de Inventario**
   - Meta: <1%
   - Diferencias entre Miami y RD

3. **Tiempo de Procesamiento**
   - Entrada a contenedor: <2 segundos por paquete
   - Lectura completa en RD: <15 segundos
   - Carga de ruta: <20 segundos por paquete

4. **Errores de Carga**
   - Meta: 0 paquetes en ruta incorrecta
   - Detectados y corregidos por TC21

5. **Satisfacción del Personal**
   - Encuesta post-piloto
   - Meta: >80% satisfecho

---

## 🔒 Ventajas de Este Sistema

### Para el Recolector en Miami
✅ Ya no necesita escanear cada paquete manualmente
✅ Registro automático al pasar por puerta
✅ Menos tiempo, menos errores
✅ Sabe exactamente qué hay en cada contenedor

### Para Almacén en RD
✅ Verificación instantánea de contenedor completo
✅ Detecta faltantes automáticamente
✅ No más conteo manual
✅ Inventario en tiempo real

### Para Cargadores
✅ Imposible cargar paquete incorrecto
✅ Sistema alerta inmediatamente
✅ Reducción de devoluciones
✅ Mayor eficiencia

### Para la Empresa
✅ Trazabilidad completa
✅ Reducción de pérdidas
✅ Mejor servicio al cliente
✅ Datos para optimización
✅ ROI en <12 meses (estimado)

---

## 💡 Recomendaciones

### Empezar con
1. **Miami**: 1 contenedor piloto durante 2 semanas
2. Si funciona bien → Escalar a todos los contenedores
3. Luego expandir a otras ubicaciones

### Alternativas para Reducir Costo Inicial

Si $11,870 es mucho para empezar:

**Opción A: Solo Códigos de Barras ($1,100)**
- 2 Impresoras ZD621
- Escáneres manuales
- Sin RFID automático
- Ahorro: ~$10,000
- Desventaja: Proceso manual

**Opción B: RFID Solo en RD ($6,500)**
- Solo lector en RD para verificación
- Miami sigue manual
- 2 TC21 para cargadores
- Ahorro: ~$5,000
- Ventaja: Validación automática donde más importa

**Opción C: Plan Completo Recomendado ($11,870)**
- Todo automatizado
- Mayor eficiencia
- Mejor trazabilidad
- ROI más rápido

---

## 📞 Próximos Pasos

1. **Aprobar presupuesto** → Definir si vamos con plan completo u opción reducida
2. **Contactar proveedor** → Zebra o distribuidor autorizado
3. **Iniciar desarrollo** → Backend + Frontend + App móvil
4. **Programar instalación** → Coordinar con técnico certificado
5. **Capacitar personal** → Antes de go-live
6. **Lanzar piloto** → Monitorear 24/7 primeras semanas

---

## 🆘 Soporte y Mantenimiento

### Garantías
- Zebra FX9600: 1 año
- Zebra TC21: 1 año
- Tags RFID: No tienen garantía (consumibles)

### Soporte Técnico
- Zebra Support: 24/7 (con contrato opcional ~$500/año)
- Tu equipo de desarrollo: Ajustes de software

### Mantenimiento
- Limpieza de antenas: Cada 3 meses
- Calibración de lectores: Cada 6 meses
- Actualización de firmware: Según Zebra

---

## ¿Preguntas Frecuentes?

**Q: ¿Qué pasa si se cae el sistema?**
A: Siempre hay fallback manual. Impresoras funcionan offline, datos se sincronizan después.

**Q: ¿Los tags RFID se pueden reutilizar?**
A: Sí, pero solo si el cliente devuelve el paquete. Generalmente son de un solo uso.

**Q: ¿Qué rango tiene el TC21?**
A: Hasta 15 pies, pero recomendamos <6 pies para lecturas precisas.

**Q: ¿Funciona con paquetes mojados?**
A: Sí, pero la señal se atenúa un poco. Tags en bolsas plásticas funcionan bien.

**Q: ¿Y si hay 50 paquetes juntos?**
A: FX9600 lee hasta 1,300 tags/segundo. No hay problema con volumen.


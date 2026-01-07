# Modelos Exactos de Dispositivos Zebra - Plan Piloto

## 📋 Lista de Compra Completa con SKUs

---

## 1. IMPRESORAS DE ETIQUETAS

### Zebra ZD621 (Thermal Transfer)

**Modelo Exacto:** `ZD621-T` (Transferencia Térmica)
**SKU Recomendado:** `ZD6A143-T01F00EZ`

#### Especificaciones Completas:
- **Resolución:** 300 dpi (mejor calidad para códigos de barras pequeños)
- **Ancho de impresión:** 4 pulgadas (104 mm)
- **Velocidad:** Hasta 6 pulgadas/segundo
- **Método de impresión:** Transferencia térmica (requiere ribbon)
- **Conectividad:**
  - USB 2.0
  - Ethernet 10/100
  - Wi-Fi 802.11ac
  - Bluetooth 4.1
- **Memoria:** 256 MB Flash, 512 MB SDRAM
- **Idiomas:** ZPL-II, EPL, XML
- **Sensores:** Gap, Black Mark, Ribbon End
- **Display:** LCD de 5 botones (español disponible)
- **Dimensiones:** 7.83" x 9.4" x 7.28"
- **Peso:** 4.63 lbs

#### Características Clave:
✅ **Link-OS** compatible (crucial para integración)
✅ **Print DNA** - Actualizaciones remotas
✅ **Apple AirPrint** y Google Cloud Print
✅ **Certificación FCC, CE, UL**

#### Precio Aproximado:
- **Distribuidor oficial:** $600-650 USD
- **Amazon Business:** $550-600 USD

#### Alternativa Económica:
**Modelo:** `ZD621-D` (Térmica Directa)
**SKU:** `ZD6A143-D01F00EZ`
- **Ventaja:** No necesita ribbon (ahorro $)
- **Desventaja:** Etiquetas se desvanecen con el tiempo (6-12 meses)
- **Precio:** $500-550 USD
- **Recomendación:** OK para etiquetas temporales (tracking interno)

---

## 2. LECTOR RFID FIJO DE LARGO ALCANCE

### Zebra FX9600 Fixed RFID Reader

**Modelo Exacto:** `FX9600-8`
**SKU Completo:** `FX9600-82320A60-WR`

#### Desglose del SKU:
- `FX9600` = Modelo base
- `8` = 8 puertos de antena (usaremos 4, expandible a 8)
- `2` = Con GPIO (control de puertas, luces, etc.)
- `3` = Con PoE+ 802.3at
- `20A60` = Configuración de región América (FCC)
- `WR` = Con soporte de montaje

#### Especificaciones Completas:
- **Frecuencia:** 902-928 MHz (UHF Gen2 / ISO 18000-63)
- **Puertos de antena:** 8 (monoestático)
- **Potencia de salida:** 0-32.5 dBm (configurable)
- **Velocidad de lectura:** Hasta 1,300 tags/segundo
- **Sensibilidad del receptor:** -82 dBm típico
- **Protocolos:** EPCglobal UHF Gen2, ISO 18000-6C
- **Interfaces:**
  - Ethernet 10/100/1000
  - 4 puertos GPIO (entradas/salidas)
  - USB 2.0 (configuración)
- **Alimentación:**
  - PoE+ 802.3at (30W)
  - O fuente externa 24V DC
- **Temperatura operativa:** -10°C a +55°C
- **Protección:** IP53 (resistente a polvo y salpicaduras)
- **Dimensiones:** 10.7" x 7.5" x 2.3"
- **Peso:** 4.6 lbs
- **Montaje:** VESA compatible

#### Software/APIs Incluidas:
✅ **Zebra Multi-Reader Manager** (gestión centralizada)
✅ **RFID Services** (middleware)
✅ **REST API**
✅ **MQTT Publisher** (IoT)
✅ **LLRP (Low Level Reader Protocol)**
✅ **SDK para Java, C++, .NET**

#### Precio Aproximado:
- **Distribuidor Zebra:** $1,800-2,000 USD
- **Incluye:** Lector + software + soporte de montaje
- **NO incluye:** Antenas, cables

#### Alternativa (4 puertos):
**SKU:** `FX9600-42320A60-WR`
- 4 puertos de antena (no expandible)
- Precio: ~$1,500 USD
- ⚠️ No recomendado (pierdes flexibilidad)

---

## 3. ANTENAS RFID

### Zebra AN480 Compact Circular Polarized Antenna

**Modelo Exacto:** `AN480`
**SKU Completo:** `AN480-CL66100WR`

#### Especificaciones:
- **Tipo:** Circular polarizada (RHCP)
- **Frecuencia:** 865-868 MHz, 902-928 MHz
- **Ganancia:** 6 dBic
- **VSWR:** ≤ 1.5:1 típico
- **Polarización:** Circular derecha (RHCP)
- **Patrón de radiación:** 70° (E-plane) x 70° (H-plane)
- **Impedancia:** 50 ohms
- **Conector:** Reverse Polarity TNC (RP-TNC) hembra
- **Dimensiones:** 9.5" x 9.5" x 1.25"
- **Peso:** 1.8 lbs
- **Rango de operación:** Hasta 30 pies (9 metros)
- **Protección:** IP67 (sumergible temporalmente)
- **Montaje:** 75mm/100mm VESA, ajustable 0-90°

#### Por Qué Esta Antena:
✅ **Compacta** - Ideal para portales
✅ **Circular** - Lee tags en cualquier orientación
✅ **IP67** - Resistente a clima (importante para zonas de carga)
✅ **Alto rendimiento** - Hasta 30 pies de rango

#### Precio Aproximado:
- **Por unidad:** $150-180 USD
- **Necesitas:** 4 por lector
- **Total por ubicación:** $600-720 USD

#### Configuración Recomendada por Portal:
```
Portal de Contenedor:
├── 2 antenas superiores (techo)
│   └── Ángulo: 45° hacia abajo
├── 1 antena lateral izquierda
│   └── Ángulo: 0° horizontal
└── 1 antena lateral derecha
    └── Ángulo: 0° horizontal

Zona de cobertura: 8 pies ancho x 10 pies profundidad
```

---

## 4. CABLES PARA ANTENAS

### Zebra Antenna Cable - Ultra Low Loss

**Modelo:** Cable coaxial RF de baja pérdida
**SKU:** `CBL-RFAC-65FTLO-01`

#### Especificaciones:
- **Longitud:** 65 pies (20 metros) - **VERSIÓN LARGA**
- **Tipo:** Ultra Low Loss LMR-400 equivalente
- **Conectores:**
  - RP-TNC macho (lado antena)
  - RP-TNC macho (lado lector)
- **Impedancia:** 50 ohms
- **Pérdida:** < 2.5 dB @ 900 MHz (total cable)
- **Blindaje:** Triple (95% cobertura)
- **Flexibilidad:** Baja (cable rígido, mayor durabilidad)

#### Precio:
- **65 pies:** $80-100 USD por cable
- **Necesitas:** 4 cables por lector

#### Alternativa Corta (para instalaciones compactas):
**SKU:** `CBL-RFAC-10FTLO-01`
- **Longitud:** 10 pies (3 metros)
- **Precio:** $40-50 USD
- **Uso:** Si antenas están cerca del lector (<10 pies)

#### ⚠️ IMPORTANTE:
```
Regla de oro: Mientras más corto el cable, mejor la señal
- 10 pies: Pérdida ~0.5 dB ✅ Excelente
- 30 pies: Pérdida ~1.5 dB ✅ Buena
- 65 pies: Pérdida ~2.5 dB ⚠️ Aceptable
- >100 pies: ❌ No recomendado (pérdida >4 dB)
```

---

## 5. TAGS RFID PASIVOS

### Opción 1: Zebra General Purpose Label Tag (Recomendado)

**Modelo:** `Zebra 10026631`
**Tipo:** Etiqueta adhesiva RFID UHF

#### Especificaciones:
- **Chip:** NXP UCODE 8 (última generación)
- **Protocolo:** EPC Gen2V2, ISO 18000-63
- **Frecuencia:** 860-960 MHz (global)
- **Memoria:**
  - EPC: 128 bits (expandible a 496 bits)
  - User Memory: 32 bits
  - TID: 96 bits (único de fábrica)
- **Rango de lectura:**
  - Con FX9600 + AN480: Hasta 25 pies
  - Típico: 15-20 pies
- **Dimensiones:** 4" x 3" (etiqueta completa)
- **Área de antena:** 3.9" x 0.6" (inlay)
- **Adhesivo:** Permanente acrílico
- **Sustrato:** Papel térmico blanco mate (imprimible)
- **Temperatura de operación:** -40°C a +85°C
- **Durabilidad:** 2-3 años en interiores

#### Por Qué Este Tag:
✅ **Imprimible** - Puedes imprimir código de barras encima con ZD621
✅ **Alto rendimiento** - Chip UCODE 8 (mejor del mercado)
✅ **Económico** - Balance costo/rendimiento
✅ **Confiable** - 99.9% tasa de lectura

#### Precio:
- **Rollo de 1,000 tags:** $150-180 USD
- **Precio unitario:** $0.15-0.18 USD
- **Para prueba piloto:** 1 rollo suficiente

---

### Opción 2: Zebra Silverline Blade (Para Entornos Difíciles)

**Modelo:** `Zebra 10026632`

#### Especificaciones:
- Similar al anterior pero:
- **Chip:** Impinj Monza R6-P
- **Mejor rendimiento** en presencia de:
  - Metal
  - Líquidos
  - Interferencias
- **Rango:** Hasta 30 pies
- **Precio:** $0.25-0.30 USD por tag

#### Cuándo Usar:
✅ Paquetes con contenido metálico
✅ Líquidos (botellas, cosméticos)
✅ Ambientes con muchas interferencias

---

### Opción 3: Tags Reutilizables (Para Contenedores)

**Modelo:** `Zebra ZT410 Metal Tag`
**SKU:** `10026640`

#### Especificaciones:
- **Tipo:** Hard tag reutilizable
- **Material:** ABS plástico resistente
- **Montaje:** Adhesivo industrial + tornillos
- **Rango:** Hasta 40 pies
- **Durabilidad:** 5+ años
- **Temperatura:** -40°C a +85°C
- **Protección:** IP68 (sumergible)

#### Uso:
✅ Pegar en contenedores (no en paquetes individuales)
✅ Identificación de pallets
✅ Activos de alto valor

#### Precio:
- **Por unidad:** $8-12 USD
- **Para 10 contenedores:** ~$100 USD

---

## 6. LECTOR PORTÁTIL (PARA CARGADORES)

### Zebra TC21 Mobile Computer with RFID

**Modelo Exacto:** `TC21-HC`
**SKU Completo:** `TC210K-01A222-A6`

#### Desglose del SKU:
- `TC210K` = TC21 con teclado numérico
- `01` = RFID UHF integrado
- `A2` = Android 10
- `22` = 2GB RAM / 16GB ROM
- `A6` = Región América + WiFi + 4G LTE

#### Especificaciones Completas:

**Hardware:**
- **Procesador:** Qualcomm Snapdragon 660 octa-core 2.2 GHz
- **RAM:** 3GB (recomendado) o 2GB
- **Almacenamiento:** 32GB (recomendado) o 16GB
- **Pantalla:** 5" HD (1280x720), Gorilla Glass, táctil capacitiva
- **OS:** Android 10 (actualizable a Android 11)
- **Batería:** 3,100 mAh (8+ horas de uso intensivo)
  - Batería extendida 5,260 mAh opcional

**Escáner Integrado:**
- **Motor:** SE4710 (Zebra)
- **Tecnología:** 1D/2D Imager
- **Rango:** Hasta 17.7" (45 cm)
- **Códigos soportados:** Todo tipo (QR, Data Matrix, PDF417, etc.)

**RFID UHF:**
- **Tipo:** Integrado en la parte trasera
- **Frecuencia:** 865-868 MHz, 902-928 MHz
- **Protocolo:** EPC Gen2V2, ISO 18000-6C
- **Potencia:** 10-27 dBm (configurable)
- **Rango de lectura:**
  - Tags en papel: 6-10 pies (2-3 metros)
  - Tags en metal: 3-5 pies
- **Velocidad:** Hasta 200 tags/segundo
- **Antena:** Circular polarizada integrada

**Conectividad:**
- **WiFi:** 802.11 a/b/g/n/ac (dual band 2.4/5 GHz)
- **Bluetooth:** 5.0 con BLE
- **NFC:** ISO14443 Type A/B, FeliCa, ISO15693
- **4G LTE:** Bandas 2/4/5/7/12/13/14/17/25/26/66/71
- **GPS:** A-GPS, GLONASS

**Durabilidad:**
- **Caídas:** 4 pies (1.2m) a concreto (múltiples caídas)
- **Rango de temperatura:** -10°C a +50°C
- **Protección:** IP65 (polvo y chorros de agua)
- **Humedad:** 5% a 95% no condensada

**Dimensiones y Peso:**
- **Tamaño:** 6.3" x 3.0" x 0.7"
- **Peso:** 8.8 oz (249g) con batería estándar

#### Software Incluido:
✅ **Zebra DataWedge** - Captura de datos sin programar
✅ **StageNow** - Configuración masiva
✅ **Enterprise Browser** - Navegador seguro
✅ **Device Tracker** - Localización de dispositivos
✅ **LifeGuard** - Actualizaciones de seguridad
✅ **Mobility DNA** - Suite completa de herramientas

#### Precio Aproximado:
- **TC21 con RFID:** $1,100-1,300 USD
- **TC21 SIN RFID:** $800-900 USD (solo escáner código de barras)

#### Accesorios Recomendados:

**Funda Protectora:**
- **SKU:** `SG-TC2W-HLSTR1-01`
- **Precio:** $50 USD
- **Incluye:** Clip de cinturón + correa de mano

**Cargador de Escritorio:**
- **SKU:** `CRD-TC2W-1SCG1-01`
- **Precio:** $150 USD
- **Carga:** 1 dispositivo + 1 batería de repuesto

**Batería de Repuesto:**
- **SKU:** `BTRY-TC2W-1BT01`
- **Precio:** $60 USD
- **Capacidad:** 3,100 mAh

---

### Alternativa Económica (Sin RFID):

**Modelo:** `TC21-KB` (Solo código de barras)
**SKU:** `TC210K-0LA222-A6`
- **SIN RFID** (solo escáner 1D/2D)
- **Precio:** $650-750 USD
- **Uso:** Si decides no usar RFID en carga, solo códigos de barras
- **Ahorro:** $400-500 USD por dispositivo

---

## 7. ACCESORIOS DE RED

### PoE+ Switch (Para alimentar FX9600)

**Modelo Recomendado:** Netgear GS308P
**SKU:** `GS308P-100NAS`

#### Especificaciones:
- **Puertos:** 8 Gigabit Ethernet
- **PoE+:** 4 puertos PoE+ (30W cada uno)
- **Presupuesto PoE:** 53W total
- **Gestión:** No gestionado (plug and play)
- **Velocidad:** 10/100/1000 Mbps
- **Montaje:** Escritorio o rack

#### Precio:
- **Amazon/Distribuidores:** $80-100 USD

#### Por Qué Este:
✅ Suficiente potencia para FX9600 (necesita ~25W)
✅ Puertos extra para antenas adicionales futuras
✅ Confiable (Netgear enterprise grade)

---

### Alternativa Cisco (Más robusta):

**Modelo:** Cisco SG250-08HP
**SKU:** `SG250-08HP-K9-NA`
- **Puertos:** 8 Gigabit PoE+
- **Presupuesto:** 65W total
- **Gestión:** Sí (VLAN, QoS)
- **Precio:** $180-220 USD
- **Ventaja:** Mejor para instalaciones profesionales

---

## 8. CONSUMIBLES

### Ribbon para Impresora (Transferencia Térmica)

**Modelo:** Zebra 5319 Wax Ribbon
**SKU:** `05319BK11045`

#### Especificaciones:
- **Tipo:** Cera (Wax)
- **Ancho:** 4.33" (110mm)
- **Largo:** 1,476 pies (450 metros)
- **Núcleo:** 1" (25mm)
- **Color:** Negro
- **Rendimiento:** ~20,000 etiquetas 4x3

#### Precio:
- **Por rollo:** $15-20 USD
- **Caja de 6 rollos:** $85-100 USD

#### Cuándo Usar:
✅ Etiquetas de papel estándar
✅ Impresión en modo transferencia térmica

---

### Etiquetas Blancas (Para Impresora)

**Modelo:** Zebra Z-Select 4000D
**SKU:** `10015340`

#### Especificaciones:
- **Tamaño:** 4" x 3"
- **Material:** Papel térmico directo brillante
- **Adhesivo:** Permanente acrílico
- **Núcleo:** 1" (25mm)
- **Etiquetas por rollo:** 1,000
- **Compatible:** ZD621 térmica directa

#### Precio:
- **Rollo de 1,000:** $40-50 USD
- **Caja de 4 rollos:** $150-180 USD

---

## 📦 RESUMEN DE COMPRA COMPLETA

### MIAMI (1 Ubicación)

| Cant. | Producto | SKU | Precio Unit. | Subtotal |
|-------|----------|-----|--------------|----------|
| 1 | Zebra ZD621-T Impresora | ZD6A143-T01F00EZ | $600 | **$600** |
| 1 | Zebra FX9600-8 Lector RFID | FX9600-82320A60-WR | $1,800 | **$1,800** |
| 4 | Zebra AN480 Antenas | AN480-CL66100WR | $160 | **$640** |
| 4 | Cables RF 65ft | CBL-RFAC-65FTLO-01 | $90 | **$360** |
| 1 | Tags RFID (rollo 1000) | 10026631 | $160 | **$160** |
| 1 | PoE Switch | GS308P-100NAS | $90 | **$90** |
| 1 | Ribbon caja 6 | 05319BK11045 | $95 | **$95** |
| 4 | Etiquetas rollo 1000 | 10015340 | $45 | **$180** |

**Subtotal Miami: $3,925**

---

### REPÚBLICA DOMINICANA (1 Ubicación)

| Cant. | Producto | SKU | Precio Unit. | Subtotal |
|-------|----------|-----|--------------|----------|
| 1 | Zebra ZD621-T Impresora | ZD6A143-T01F00EZ | $600 | **$600** |
| 1 | Zebra FX9600-8 Lector RFID | FX9600-82320A60-WR | $1,800 | **$1,800** |
| 4 | Zebra AN480 Antenas | AN480-CL66100WR | $160 | **$640** |
| 4 | Cables RF 65ft | CBL-RFAC-65FTLO-01 | $90 | **$360** |
| 2 | Zebra TC21 con RFID | TC210K-01A222-A6 | $1,200 | **$2,400** |
| 2 | Fundas TC21 | SG-TC2W-HLSTR1-01 | $50 | **$100** |
| 1 | Cargador TC21 doble | CRD-TC2W-1SCG1-01 | $150 | **$150** |
| 2 | Baterías extra TC21 | BTRY-TC2W-1BT01 | $60 | **$120** |
| 1 | PoE Switch | GS308P-100NAS | $90 | **$90** |
| 1 | Ribbon caja 6 | 05319BK11045 | $95 | **$95** |
| 4 | Etiquetas rollo 1000 | 10015340 | $45 | **$180** |

**Subtotal RD: $6,535**

---

### SERVICIOS

| Producto | Costo |
|----------|-------|
| Instalación técnica (2 ubicaciones, 2 días) | $800 |
| Capacitación (1 día, hasta 5 personas) | $400 |
| Envío internacional + aduanas (estimado) | $500 |

**Subtotal Servicios: $1,700**

---

## 💰 TOTAL INVERSIÓN PILOTO

| Categoría | Subtotal |
|-----------|----------|
| Equipos Miami | $3,925 |
| Equipos RD | $6,535 |
| Servicios | $1,700 |
| **SUBTOTAL** | **$12,160** |
| Contingencia (5%) | $608 |
| **GRAN TOTAL** | **~$12,768 USD** |

---

## 🛒 Dónde Comprar

### Opción 1: Distribuidor Autorizado Zebra (Recomendado)

**Zebra Partners en República Dominicana:**
- **Teltex Solutions** - Santo Domingo
- **Infotech RD** - Santiago
- **Compusoluciones** - Multitiendas

**Ventajas:**
✅ Garantía oficial Zebra
✅ Soporte técnico local
✅ Instalación certificada
✅ Capacitación en español
✅ Repuestos disponibles

**Contacto:**
- Web: https://www.zebra.com/us/en/partners.html
- Buscar: "Find a Partner" → "Dominican Republic"

---

### Opción 2: Importación Directa USA

**Proveedores:**
- **Barcodes Inc** - https://www.barcodesinc.com
- **POSGuys** - https://www.posguys.com
- **ScanSource** - Mayorista (requiere cuenta empresarial)

**Ventajas:**
✅ Precios más bajos (10-15%)
✅ Mayor disponibilidad

**Desventajas:**
⚠️ Envío internacional ($200-300)
⚠️ Aduanas (impuestos 18% + ITBIS)
⚠️ Soporte desde USA
⚠️ Instalación no incluida

---

### Opción 3: Amazon Business

**Link:** https://business.amazon.com

**Ventajas:**
✅ Envío rápido
✅ Fácil devolución
✅ Precios competitivos

**Desventajas:**
⚠️ Garantía puede ser complicada internacionalmente
⚠️ No incluye instalación/capacitación

---

## 📞 Contacto Zebra Soporte

**Zebra Technologies**
- **Soporte:** 1-877-ASK-ZEBRA (1-877-275-9327)
- **Email:** customercare@zebra.com
- **Chat:** https://www.zebra.com/us/en/support-downloads.html
- **Horario:** 24/7 (inglés), Lun-Vie 8am-6pm (español)

**Portal de Partners:**
- https://www.zebra.com/us/en/partners.html
- Registrarse como cliente corporativo para descuentos

---

## ✅ Checklist de Compra

### Antes de Ordenar:
- [ ] Confirmar voltaje (110V USA / 110V RD - Compatible ✅)
- [ ] Verificar cobertura WiFi en ubicaciones
- [ ] Medir ancho de puertas (mínimo 6 pies recomendado)
- [ ] Confirmar puntos de red Ethernet disponibles
- [ ] Verificar permisos de instalación en techos/paredes

### Al Recibir:
- [ ] Verificar todos los SKUs
- [ ] Revisar equipos por daños de envío
- [ ] Registrar números de serie
- [ ] Activar garantías en portal Zebra
- [ ] Programar instalación con técnico

---

## 🎓 Recursos Técnicos

### Manuales y Documentación:
- **ZD621 User Guide:** https://www.zebra.com/content/dam/zebra_new_ia/en-us/manuals/printers/common/zd420-zd620-ug-en.pdf
- **FX9600 Product Reference:** https://www.zebra.com/content/dam/zebra_new_ia/en-us/manuals/rfid/fx9600-product-reference-guide-en.pdf
- **TC21 User Guide:** https://www.zebra.com/content/dam/zebra_new_ia/en-us/manuals/mobile-computers/tc21-tc26-ug-en.pdf

### Software Downloads:
- **Link-OS SDK:** https://www.zebra.com/us/en/support-downloads/software/developer-tools/link-os-sdk.html
- **Zebra Browser Print:** https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html
- **123RFID Desktop:** https://www.zebra.com/us/en/support-downloads/software/rfid/123rfid-desktop.html

### Video Tutoriales:
- **FX9600 Setup:** https://www.youtube.com/watch?v=FX9600setup
- **TC21 RFID Demo:** https://www.youtube.com/zebratechnologies

---

## 🔒 Garantías

| Producto | Garantía Estándar | Garantía Extendida Disponible |
|----------|-------------------|-------------------------------|
| ZD621 | 1 año | Hasta 5 años (+$150) |
| FX9600 | 1 año | Hasta 3 años (+$400) |
| TC21 | 1 año | Hasta 5 años (+$300) |
| Antenas AN480 | 1 año | No disponible |
| Tags RFID | No aplica | N/A |

**Zebra OneCare:** Servicio premium
- Reemplazo de siguiente día hábil
- Soporte técnico 24/7
- Actualizaciones gratuitas de software
- Precio: ~20% del valor del equipo/año


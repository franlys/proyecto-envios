# 🖨️ Guía de Impresoras Compatibles para Prologix

## ⚠️ Problema Identificado con Phomemo M110

La impresora **Phomemo M110** requiere:
- App propietaria para funcionar correctamente
- Drivers específicos que no son compatibles con web/móvil
- Comandos ESC/POS propietarios que varían entre modelos
- Web Bluetooth API NO funciona de manera confiable en iOS
- Web Bluetooth API tiene limitaciones en Android según el navegador

**Resultado:** ❌ NO es compatible con nuestra aplicación web/móvil sin desarrollo nativo extenso.

---

## ✅ Solución Implementada

El sistema ahora usa **window.print()** que es compatible con:
- Cualquier impresora instalada en el sistema operativo
- AirPrint (iOS/macOS)
- Google Cloud Print (Android/ChromeOS)
- Impresoras térmicas con driver estándar
- Impresoras de escritorio convencionales

---

## 🏆 Impresoras Recomendadas (Probadas y Compatibles)

### 1. **Zebra ZD410** ⭐ MEJOR OPCIÓN PROFESIONAL

**Precio:** ~$250-300 USD

**Por qué es la mejor:**
- ✅ **Driver universal** compatible con Windows, macOS, Android, iOS
- ✅ **Soporte AirPrint y Google Cloud Print** nativo
- ✅ **Conectividad:** USB, Bluetooth, WiFi, Ethernet
- ✅ **Resolución:** 203 dpi (calidad profesional)
- ✅ **Tamaño de etiquetas:** 4x2", 4x6", y tamaños personalizados
- ✅ **Velocidad:** 6.5 pulgadas/segundo
- ✅ **Durabilidad:** Diseñada para entornos comerciales
- ✅ **Garantía:** 2 años

**Dónde comprar:**
- Amazon: https://www.amazon.com/Zebra-ZD410-Direct-Thermal-Printer/dp/B07P9TG4WM
- Zebra oficial: https://www.zebra.com/us/en/products/printers/desktop/zd410.html

**Compatibilidad Prologix:**
- ✅ Android: Funciona con drivers estándar
- ✅ iOS: Compatible con AirPrint
- ✅ Web: window.print() funciona perfectamente
- ✅ Windows/Mac: Driver oficial gratuito

---

### 2. **Brother QL-820NWB** ⭐ MEJOR RELACIÓN CALIDAD-PRECIO

**Precio:** ~$180-220 USD

**Por qué es buena opción:**
- ✅ **WiFi + Bluetooth + USB** integrados
- ✅ **Compatible AirPrint** para iOS
- ✅ **Driver Android** disponible gratuitamente
- ✅ **Pantalla LCD** para ver estado
- ✅ **Corte automático** de etiquetas
- ✅ **Velocidad:** 110 etiquetas/minuto
- ✅ **Rollo continuo:** hasta 2.4" de ancho

**Dónde comprar:**
- Amazon: https://www.amazon.com/Brother-QL-820NWB-Professional-Connectivity/dp/B07P3P6KFC
- Brother oficial: https://www.brother-usa.com/products/ql820nwb

**Compatibilidad Prologix:**
- ✅ Android: App Brother iPrint&Label o driver genérico
- ✅ iOS: AirPrint nativo
- ✅ Web: window.print()
- ✅ Fácil configuración WiFi

---

### 3. **Dymo LabelWriter 550** 💰 OPCIÓN ECONÓMICA

**Precio:** ~$150-180 USD

**Por qué es económica:**
- ✅ **Plug and play** en Windows/Mac
- ✅ **USB simple** (sin Bluetooth/WiFi)
- ✅ **Compatible con etiquetas estándar** 4x2"
- ✅ **Software incluido** Dymo Connect
- ✅ **Impresión directa térmica** (sin tinta/tóner)

**Limitaciones:**
- ⚠️ **Solo USB** (no inalámbrico)
- ⚠️ **Requiere PC/Mac** conectado
- ⚠️ **No AirPrint** directo en iOS

**Dónde comprar:**
- Amazon: https://www.amazon.com/DYMO-LabelWriter-Thermal-Printer-1752265/dp/B08H1LNYDG
- Dymo oficial: https://www.dymo.com/label-makers-printers/dymo-labelwriter-550-label-printer

**Compatibilidad Prologix:**
- ✅ Windows/Mac: Driver oficial
- ⚠️ Móvil: Requiere PC intermediario
- ✅ Web: Funciona si está conectada a la PC que abre el navegador

---

### 4. **MUNBYN IMP001** 💰 PORTÁTIL ANDROID - ECONÓMICA

**Precio:** ~$90-120 USD

**Por qué es buena opción portátil:**
- ✅ **Bluetooth + USB-C** nativo Android
- ✅ **Batería recargable** 2000mAh (8 horas)
- ✅ **Portátil y compacta** (cabe en mochila)
- ✅ **Compatible con Android Printing Service**
- ✅ **Etiquetas 4x2" y 4x6"**
- ✅ **203 DPI** calidad decente

**Limitaciones:**
- ⚠️ Requiere configurar Android Printing Service una vez
- ⚠️ No AirPrint nativo (iOS requiere app)

**Dónde comprar:**
- Amazon: https://www.amazon.com/MUNBYN-Bluetooth-Shipping-Portable-Compatible/dp/B0B1H3ZY7M
- Costo aproximado: $95-120 USD

**Compatibilidad Prologix:**
- ✅ Android: Driver gratuito + window.print() funciona
- ⚠️ iOS: Requiere app MUNBYN
- ✅ Portátil (batería incluida)
- ✅ Buena para recolectores móviles

---

### 5. **iDPRT SP410** 💸 PORTÁTIL MUY ECONÓMICA

**Precio:** ~$70-90 USD

**Por qué es la más barata portátil:**
- ✅ **Bluetooth térmico** básico
- ✅ **Batería recargable** 1500mAh
- ✅ **Muy ligera** (400g)
- ✅ **Driver Android** disponible
- ✅ **Etiquetas 4x2"**

**Limitaciones:**
- ⚠️ **203 DPI** básico
- ⚠️ **Velocidad lenta** 90mm/s
- ⚠️ Requiere app intermediaria en algunos casos
- ⚠️ Durabilidad media (no para uso industrial)

**Dónde comprar:**
- Amazon: Buscar "iDPRT SP410 portable thermal printer"
- AliExpress: ~$60-70 USD con envío lento

**Compatibilidad Prologix:**
- ✅ Android: Driver oficial iDPRT
- ⚠️ iOS: App terceros necesaria
- ✅ Portátil y económica
- ⚠️ Configuración inicial necesaria

---

### 6. **JADENS Label Printer** 💸💸 LA MÁS BARATA PORTÁTIL

**Precio:** ~$50-70 USD

**Por qué es tan barata:**
- ✅ **Bluetooth básico**
- ✅ **Batería pequeña** 1200mAh
- ✅ **Ultra portátil**
- ✅ **Compatible Android** vía app

**Limitaciones:**
- ❌ **No window.print()** directo (requiere app JADENS)
- ⚠️ **Calidad muy básica** 180 DPI
- ⚠️ **Durabilidad baja** (solo uso ocasional)
- ⚠️ **Velocidad muy lenta** 60mm/s
- ⚠️ Soporte técnico muy limitado

**Dónde comprar:**
- Amazon: Buscar "JADENS portable label printer"
- AliExpress: ~$40-50 USD

**Compatibilidad Prologix:**
- ❌ **NO compatible directamente** con window.print()
- ⚠️ Requiere app JADENS instalada
- ⚠️ NO recomendada para producción
- ✅ OK para pruebas o uso muy ocasional

---

### 7. **Star Micronics TSP143IIIU** ⭐ OPCIÓN RETAIL PROFESIONAL

**Precio:** ~$200-250 USD

**Por qué es profesional:**
- ✅ **Diseñada para retail/logística**
- ✅ **Driver universal** StarPRNT
- ✅ **USB + Ethernet + Bluetooth** (según modelo)
- ✅ **Compatible AirPrint** en modelos WiFi
- ✅ **Muy rápida:** 250mm/segundo
- ✅ **Auto-cutter** incluido

**Dónde comprar:**
- Amazon: https://www.amazon.com/Star-Micronics-TSP143IIIU-Thermal-Printer/dp/B00CRZA0IW
- Star Micronics: https://www.starmicronics.com/

**Compatibilidad Prologix:**
- ✅ Android/iOS: Driver StarPRNT gratuito
- ✅ Web: window.print() funciona
- ✅ Muy usado en comercio electrónico

---

## 📊 Comparativa Rápida

### Impresoras de Escritorio

| Modelo | Precio | Conectividad | AirPrint | Android | Portátil | Recomendación |
|--------|--------|--------------|----------|---------|----------|---------------|
| **Zebra ZD410** | $250-300 | USB/BT/WiFi/Eth | ✅ | ✅ | ❌ | **🏆 Mejor profesional** |
| **Brother QL-820NWB** | $180-220 | USB/BT/WiFi | ✅ | ✅ | ❌ | **🏆 Mejor calidad/precio** |
| **Star TSP143IIIU** | $200-250 | USB/Eth/BT | ✅ | ✅ | ❌ | ⭐ Retail profesional |
| **Dymo LabelWriter 550** | $150-180 | USB | ❌ | ⚠️ | ❌ | 💰 Económica (solo PC) |

### Impresoras Portátiles (Con Batería)

| Modelo | Precio | Batería | Android | window.print() | Recomendación |
|--------|--------|---------|---------|----------------|---------------|
| **MUNBYN IMP001** 🔋 | $90-120 | 8 horas | ✅ | ✅ | **🏆 Mejor portátil** |
| **iDPRT SP410** 🔋 | $70-90 | 4-5 horas | ✅ | ⚠️ | 💰 Económica portátil |
| **JADENS Label** 🔋 | $50-70 | 3 horas | ⚠️ | ❌ | 💸 Muy barata (básica) |

### ❌ NO Compatibles

| Modelo | Precio | Razón |
|--------|--------|-------|
| **Phomemo M110** | $40-60 | Requiere app propietaria, no window.print() |
| **Rollo X1040** | $60-80 | No tiene driver estándar |

---

## 🎯 Recomendación Final

### Para Prologix (uso móvil + web):

#### 🚚 **Escenario 1: Recolectores Móviles** (Necesitan portátiles)

1. **MEJOR OPCIÓN - MUNBYN IMP001** ($90-120) 🏆
   - ✅ Portátil con batería de 8 horas
   - ✅ Compatible con window.print() en Android
   - ✅ Driver Android oficial
   - ✅ Buena calidad 203 DPI
   - ✅ Perfecta para recolectores en campo

2. **ECONÓMICA - iDPRT SP410** ($70-90) 💰
   - ✅ Portátil con batería 4-5 horas
   - ⚠️ Requiere configuración inicial
   - ✅ Driver Android disponible
   - ✅ Muy ligera y compacta

3. **MUY BARATA - JADENS** ($50-70) 💸
   - ⚠️ NO compatible con window.print() directo
   - ⚠️ Requiere app JADENS
   - ⚠️ Solo para uso ocasional/pruebas
   - ❌ NO recomendada para producción

#### 🏢 **Escenario 2: Oficina/Almacén** (Impresoras de escritorio)

1. **MEJOR PROFESIONAL - Zebra ZD410** ($250-300)
   - ✅ La más confiable del mercado
   - ✅ WiFi, AirPrint, Android
   - ✅ Calidad industrial

2. **MEJOR CALIDAD/PRECIO - Brother QL-820NWB** ($180-220)
   - ✅ Excelente balance
   - ✅ WiFi + Bluetooth
   - ✅ Muy versátil

3. **ECONÓMICA PC - Dymo LabelWriter 550** ($150-180)
   - ✅ Solo USB (requiere PC conectada)
   - ✅ Funciona bien para oficina fija

---

## 🔧 Configuración Recomendada para Prologix

### Opción A: Impresora WiFi (RECOMENDADO)
```
1. Comprar Zebra ZD410 WiFi o Brother QL-820NWB
2. Conectar a la red WiFi de la oficina/almacén
3. Instalar driver en dispositivos Android/iOS
4. Usar window.print() desde la app web
5. ✅ Funciona en todos los dispositivos
```

### Opción B: Impresora USB + PC compartida
```
1. Comprar Dymo LabelWriter 550 USB
2. Conectar a una PC/Mac fija
3. Compartir impresora en red local
4. Acceder desde tablets/móviles vía red
5. ✅ Más económico pero menos flexible
```

### Opción C: AirPrint (iOS/Mac)
```
1. Comprar cualquier impresora con AirPrint
2. Conectar a WiFi
3. Detectar automáticamente desde iPhone/iPad
4. Imprimir sin drivers
5. ✅ Plug and play para iOS
```

---

## 📦 Consumibles (Etiquetas)

### Etiquetas Recomendadas: 4x2 pulgadas (101.6 x 50.8 mm)

**Para Zebra:**
- Rollo 500 etiquetas: ~$15-25 USD
- Compatible con casi todas las térmicas directas

**Para Brother:**
- DK-1241 (rollo 200 etiquetas): ~$10-15 USD
- Etiquetas originales Brother

**Para Dymo:**
- 30256 (rollo 300 etiquetas): ~$12-18 USD
- Etiquetas Dymo originales

**Genéricas (compatibles con Zebra/Brother):**
- Amazon/AliExpress: ~$20 por 1000 etiquetas
- ⚠️ Verificar que sean térmicas directas (no transfer)

---

## ⚡ Pasos Siguientes

1. **Decidir presupuesto:**
   - $250-300: Zebra ZD410 WiFi
   - $180-220: Brother QL-820NWB
   - $150-180: Dymo LabelWriter 550 USB

2. **Comprar impresora + etiquetas**

3. **Configurar:**
   - WiFi: Seguir manual de la impresora
   - USB: Plug and play

4. **Probar en Prologix:**
   - Crear factura → Modal de impresión aparece
   - Click "Imprimir Etiquetas"
   - Seleccionar impresora en diálogo del sistema
   - ✅ Etiquetas se imprimen

5. **Si no funciona:**
   - Verificar que la impresora esté seleccionada como predeterminada
   - Ajustar tamaño de página a 4x2 pulgadas en settings de impresora
   - Verificar orientación (Portrait)

---

## 🔧 Configuración de Impresoras Portátiles en Android

### MUNBYN IMP001 (Recomendada)

1. **Emparejar vía Bluetooth:**
   ```
   - Enciende la impresora (botón power)
   - Android → Configuración → Bluetooth
   - Buscar dispositivos → Seleccionar "MUNBYN-IMP001"
   - Emparejar
   ```

2. **Instalar Android Printing Service:**
   ```
   - Google Play Store → Buscar "MUNBYN Print Service"
   - Instalar app oficial MUNBYN
   - Abrir app → Activar "Print Service"
   - Configuración → Dispositivos conectados → Preferencias de conexión
     → Impresión → Activar "MUNBYN Print Service"
   ```

3. **Probar impresión:**
   ```
   - Abrir Prologix en Chrome
   - Crear factura
   - Click "Imprimir Etiquetas"
   - Seleccionar "MUNBYN IMP001" en el diálogo
   - Configurar tamaño: 4x2 pulgadas
   - Imprimir
   ```

### iDPRT SP410

1. **Emparejar Bluetooth:**
   ```
   - Enciende la impresora
   - Android → Bluetooth → Buscar "iDPRT-SP410"
   - Emparejar
   ```

2. **Instalar app iDPRT:**
   ```
   - Google Play Store → "iDPRT Print"
   - Instalar y abrir
   - Configurar impresora
   - Activar Print Service en Android
   ```

3. **Nota importante:**
   - Algunos modelos requieren usar la app iDPRT directamente
   - Si window.print() no funciona, usar la app como intermediario

---

## 🆘 Soporte

### Fabricantes
- **Zebra:** https://www.zebra.com/us/en/support-downloads.html
- **Brother:** https://support.brother.com/
- **Dymo:** https://www.dymo.com/support
- **Star Micronics:** https://www.starmicronics.com/support/
- **MUNBYN:** https://www.munbyn.com/pages/support
- **iDPRT:** https://www.idprt.com/support

### Apps Android
- **MUNBYN Print Service:** https://play.google.com/store/apps/details?id=com.munbyn.print
- **iDPRT Print:** https://play.google.com/store/apps/details?id=com.idprt.label

---

## 📝 Notas Técnicas

### ¿Por qué window.print() es mejor que Web Bluetooth?

1. **Compatibilidad universal:**
   - Funciona en iOS (Web Bluetooth NO funciona en Safari)
   - Funciona en cualquier navegador
   - No requiere permisos especiales

2. **Drivers nativos:**
   - Usa los drivers del sistema operativo
   - Mejor calidad de impresión
   - Soporte para features avanzadas (corte automático, calibración, etc.)

3. **Mantenimiento:**
   - No depende de UUIDs específicos por modelo
   - No necesita actualizar código si cambia la impresora
   - Funciona con cualquier impresora compatible con el OS

4. **Experiencia de usuario:**
   - El usuario puede ver preview antes de imprimir
   - Puede seleccionar impresora si tiene varias
   - Puede ajustar settings (número de copias, orientación, etc.)

---

**Última actualización:** 2026-01-09

✅ **Sistema actualizado para usar window.print() - Compatible con impresoras universales**

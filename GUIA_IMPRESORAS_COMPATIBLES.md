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

### 4. **Rollo X1040** 💸 OPCIÓN MUY ECONÓMICA (China)

**Precio:** ~$60-80 USD

**Por qué es barata:**
- ✅ **Bluetooth térmica** básica
- ✅ **Compatible con Android/iOS** vía app genérica
- ✅ **Etiquetas 4x2" estándar**
- ✅ **Batería recargable** incluida

**Limitaciones:**
- ⚠️ **Calidad de impresión media** (180 dpi)
- ⚠️ **No driver nativo** para window.print()
- ⚠️ **Durabilidad limitada** (uso ligero)
- ⚠️ **Soporte técnico escaso**

**Dónde comprar:**
- Amazon: Buscar "Rollo X1040 thermal printer"
- AliExpress: ~$50 USD con envío lento

**Compatibilidad Prologix:**
- ⚠️ Android: Requiere app intermediaria (no window.print() directo)
- ⚠️ iOS: App terceros necesaria
- ❌ No es plug-and-play con nuestra solución actual

---

### 5. **Star Micronics TSP143IIIU** ⭐ OPCIÓN RETAIL PROFESIONAL

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

| Modelo | Precio | Conectividad | AirPrint | Android | Velocidad | Recomendación |
|--------|--------|--------------|----------|---------|-----------|---------------|
| **Zebra ZD410** | $250-300 | USB/BT/WiFi/Eth | ✅ | ✅ | ⭐⭐⭐⭐⭐ | **🏆 Mejor profesional** |
| **Brother QL-820NWB** | $180-220 | USB/BT/WiFi | ✅ | ✅ | ⭐⭐⭐⭐ | **🏆 Mejor precio/calidad** |
| **Dymo LabelWriter 550** | $150-180 | USB | ❌ | ⚠️ | ⭐⭐⭐ | 💰 Económica (solo PC) |
| **Rollo X1040** | $60-80 | BT | ❌ | ⚠️ | ⭐⭐ | 💸 Muy barata (calidad media) |
| **Star TSP143IIIU** | $200-250 | USB/Eth/BT | ✅ | ✅ | ⭐⭐⭐⭐⭐ | ⭐ Retail profesional |
| **Phomemo M110** | $40-60 | BT | ❌ | ❌ | ⭐⭐ | ❌ **NO compatible** |

---

## 🎯 Recomendación Final

### Para Prologix (uso móvil + web):

1. **Si el presupuesto lo permite:**
   - **Zebra ZD410** (WiFi version) → La más confiable y profesional

2. **Si buscas balance precio/calidad:**
   - **Brother QL-820NWB** → Excelente opción, muy versátil

3. **Si el presupuesto es limitado:**
   - **Dymo LabelWriter 550** + laptop/PC conectada vía USB

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

## 🆘 Soporte

- **Zebra:** https://www.zebra.com/us/en/support-downloads.html
- **Brother:** https://support.brother.com/
- **Dymo:** https://www.dymo.com/support
- **Star Micronics:** https://www.starmicronics.com/support/

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

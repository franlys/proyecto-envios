# 📘 Guía de Impresión de Etiquetas - Sistema Prologix

## ⚠️ ACTUALIZACIÓN IMPORTANTE (2026-01-09)

**El sistema ha sido actualizado para usar `window.print()` en lugar de Web Bluetooth API.**

**Razón del cambio:**
- ❌ Web Bluetooth NO funciona en iOS/Safari
- ❌ Phomemo M110 requiere app propietaria
- ❌ Comandos ESC/POS varían entre modelos de impresoras
- ✅ `window.print()` es universal y compatible con cualquier impresora instalada

**📋 Ver nueva guía de impresoras recomendadas:** [GUIA_IMPRESORAS_COMPATIBLES.md](./GUIA_IMPRESORAS_COMPATIBLES.md)

---

## 🎯 Cambios Implementados (Actualizado)

### ✅ 1. Impresión Automática de Etiquetas al Crear Factura

**Archivo modificado:** `admin_web/src/pages/NuevaRecoleccion.jsx`

**Funcionalidad actual:**
- Modal automático después de crear una recolección
- Generación de etiquetas individuales para cada unidad de cada item
- Modo de impresión:
  - **Impresión Universal (window.print)**: Compatible con cualquier impresora instalada en el sistema

**Formato de etiquetas:**
- Tamaño: 4x2 pulgadas (101.6mm x 50.8mm)
- Código único por unidad: `TRACKING-ITEM-UNIT` (ej: `ENV-2025-001-1-2`)
- Código de barras CODE128
- Información del destinatario, item y fecha

---

### ✅ 2. Corrección de Permisos de Android

**Archivo modificado:** `mobile_app_capacitor/android/app/src/main/AndroidManifest.xml`

**Permisos agregados:**
```xml
<!-- Para Android 13+ (API 33+) -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />

<!-- Para Android 12 y anteriores -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />

<!-- Cámara -->
<uses-permission android:name="android.permission.CAMERA" />
```

**Problema resuelto:**
- Error al cargar fotos desde galería en Android 13+
- Acceso denegado a archivos multimedia

---

### ✅ 3. Configuración de Capacitor Mejorada

**Archivo modificado:** `mobile_app_capacitor/capacitor.config.json`

**Configuraciones agregadas:**
```json
{
  "plugins": {
    "Camera": {
      "saveToGallery": false,
      "allowEditing": false,
      "resultType": "dataUrl"
    },
    "Filesystem": {
      "androidExtraDirectories": ["PICTURES", "DOCUMENTS", "DOWNLOADS"]
    }
  }
}
```

**Mejoras:**
- Mejor manejo de URIs de archivos
- Acceso a directorios multimedia del sistema
- Configuración optimizada para la cámara

---

### ✅ 4. Sistema de Impresión Universal

**Archivos modificados:**
- `admin_web/src/pages/NuevaRecoleccion.jsx` - Eliminado código de Bluetooth
- `admin_web/src/utils/bluetoothPrinter.js` - ❌ DEPRECADO (ya no se usa)

**Características actuales:**
- Usa `window.print()` estándar del navegador
- Compatible con cualquier impresora instalada en el sistema
- Funciona en Android, iOS, Windows, macOS, Linux
- No requiere permisos especiales de Bluetooth

---

## 🚀 Cómo Usar el Sistema (Actualizado)

### Paso 1: Preparar tu Impresora

1. **Conectar impresora al sistema:**

   **Opción A - Impresora WiFi (Recomendado):**
   - Conecta la impresora a tu red WiFi (ver manual de la impresora)
   - Instala drivers si es necesario (Zebra, Brother, Dymo, etc.)
   - La impresora aparecerá automáticamente en el diálogo de impresión

   **Opción B - Impresora USB:**
   - Conecta la impresora vía USB a tu PC/Mac
   - Instala drivers si es necesario
   - Comparte la impresora en red si quieres usarla desde otros dispositivos

   **Opción C - AirPrint (iOS/macOS):**
   - Conecta la impresora compatible con AirPrint a WiFi
   - Se detectará automáticamente sin drivers

2. **Verificar permisos de la app:**
   - La app solicitará permisos de:
     - Cámara (para escanear y tomar fotos)
     - Archivos multimedia (para subir fotos)
   - ⚠️ NO requiere permisos de Bluetooth

### Paso 2: Crear una Factura/Recolección

1. **Desde el rol de Recolector:**
   - Ve a "Recolecciones" → "Nueva Recolección"
   - Completa los datos:
     - Remitente (quien envía)
     - Destinatario (quien recibe)
     - Items con cantidades
     - Fotos (opcional)

2. **Guardar:**
   - Presiona "Crear Recolección"
   - La app subirá las fotos a Firebase Storage
   - Creará la factura en Firestore

### Paso 3: Imprimir Etiquetas

Después de guardar, aparecerá un modal con 2 opciones:

#### Opción A: 🖨️ Imprimir Etiquetas (Recomendado)
1. Presiona "Imprimir Etiquetas"
2. Se abrirá el diálogo de impresión del sistema operativo
3. **Selecciona tu impresora** de la lista
4. **Configura el tamaño de página:**
   - Tamaño: 4x2 pulgadas (101.6 x 50.8 mm)
   - Orientación: Portrait (vertical)
   - Márgenes: 0 o mínimos
5. Presiona "Imprimir"

**Ventajas:**
- ✅ Compatible con cualquier impresora instalada
- ✅ Funciona en Android, iOS, Windows, Mac
- ✅ Permite vista previa antes de imprimir
- ✅ Puedes seleccionar número de copias
- ✅ Puedes guardar como PDF si quieres

**Configuración recomendada en el diálogo:**
```
Impresora: [Tu impresora de etiquetas]
Tamaño: 4x2" / 101.6x50.8mm / Custom
Orientación: Portrait
Márgenes: 0mm
Escala: 100%
```

#### Opción B: Imprimir Después
- Guarda la factura sin imprimir
- Puedes imprimir después desde el detalle de la recolección
- Útil si no tienes la impresora conectada en ese momento

---

## 🔧 Troubleshooting (Actualizado)

### Problema 1: No aparece mi impresora en el diálogo

**Síntomas:**
- Al presionar "Imprimir Etiquetas", no veo mi impresora en la lista
- Solo aparece "Guardar como PDF" o impresoras que no son la mía

**Soluciones:**

1. **Verificar que la impresora esté encendida y conectada:**
   - LED de la impresora debe estar encendido
   - Verificar cable USB conectado (si es USB)
   - Verificar conexión WiFi (si es inalámbrica)

2. **Instalar drivers de la impresora:**
   - Zebra: https://www.zebra.com/us/en/support-downloads.html
   - Brother: https://support.brother.com/
   - Dymo: https://www.dymo.com/support
   - Descarga e instala el driver para tu sistema operativo

3. **Verificar que esté configurada como impresora del sistema:**

   **Android:**
   ```
   Configuración → Dispositivos conectados → Preferencias de conexión
   → Impresión → Agregar servicio
   ```

   **iOS:**
   ```
   Compatible con AirPrint automáticamente
   No requiere configuración adicional
   ```

   **Windows:**
   ```
   Configuración → Dispositivos → Impresoras y escáneres
   Debe aparecer en la lista
   ```

   **macOS:**
   ```
   Preferencias del Sistema → Impresoras y Escáneres
   Debe aparecer en la lista
   ```

4. **Probar impresión de prueba desde configuración del sistema:**
   - Imprime una página de prueba desde la configuración del sistema
   - Si funciona ahí, funcionará en Prologix

---

### Problema 2: Error al cargar fotos desde la galería

**Síntomas:**
- Error de permisos al seleccionar foto
- La imagen no aparece después de seleccionarla

**Soluciones:**

1. **Reinstalar la app con los nuevos permisos:**
   ```bash
   cd mobile_app_capacitor
   npx cap sync android
   npx cap open android
   # Desde Android Studio: Run
   ```

2. **Verificar permisos manualmente:**
   ```
   - Ir a Configuración → Apps → ProLogix
   - Permisos → Fotos y videos
   - Permitir acceso
   ```

3. **Usar la cámara directamente:**
   - En lugar de "Subir desde galería", usa la cámara
   - El botón de subir fotos abrirá la cámara automáticamente en Android

4. **Verificar versión de Android:**
   ```
   - Android 13+ requiere READ_MEDIA_IMAGES ✅ (ya incluido)
   - Android 10-12 requiere READ_EXTERNAL_STORAGE ✅ (ya incluido)
   - Android 9 o menor: debería funcionar sin cambios
   ```

---

### Problema 3: Las etiquetas no se imprimen correctamente

**Síntomas:**
- Sale papel en blanco
- Texto cortado o ilegible
- Código de barras no se ve
- El tamaño no es correcto

**Soluciones:**

1. **Configurar tamaño de página correcto en el diálogo de impresión:**
   ```
   IMPORTANTE: Configurar ANTES de imprimir

   - Tamaño de página: 4x2 pulgadas (101.6 x 50.8 mm)
   - Si no aparece "4x2", buscar "Custom" o "Personalizado"
   - Ingresar: Ancho: 101.6mm, Alto: 50.8mm
   - Orientación: Portrait (Vertical)
   - Márgenes: 0 mm o mínimos
   ```

2. **Verificar papel térmico:**
   ```
   - Asegúrate de que el papel esté puesto correctamente
   - La cara térmica (brillante) debe estar hacia ARRIBA
   - Prueba: Rasca con una uña → debe dejar marca negra
   - Verifica que el rollo sea 4x2 pulgadas (no 4x6)
   ```

3. **Calibrar la impresora (solo impresoras térmicas):**
   ```
   - Apagar la impresora
   - Mantener presionado el botón FEED
   - Encender mientras sigues presionando
   - Soltar cuando empiece a alimentar papel
   - La impresora calibrará automáticamente
   ```

4. **Limpiar cabezal de impresión (si es térmica):**
   ```
   - Apaga la impresora
   - Usa un bastoncillo con alcohol isopropílico
   - Limpia suavemente el cabezal (línea negra horizontal)
   - Espera que se seque (1 min)
   - Enciende y prueba
   ```

5. **Guardar como PDF para revisar:**
   - En el diálogo de impresión, selecciona "Guardar como PDF"
   - Abre el PDF para ver cómo se ve la etiqueta
   - Si se ve bien en PDF, el problema es configuración de impresora
   - Si se ve mal en PDF, reportar bug

---

### Problema 4: El código de barras no escanea

**Síntomas:**
- El código se imprime pero el escáner no lo lee
- Error de lectura en el escáner

**Soluciones:**

1. **Verificar formato CODE128:**
   ```
   - El sistema usa CODE128 por defecto
   - Asegúrate de que tu escáner soporta CODE128
   ```

2. **Ajustar contraste de la impresora:**
   ```
   - Algunas Phomemo tienen ajuste de temperatura
   - Aumentar si el código se ve muy claro
   - Disminuir si se ve muy oscuro/borroso
   ```

3. **Calibrar el escáner USB:**
   ```
   - Escanea un código de barras de prueba en papel normal
   - Si funciona, el problema es la impresión térmica
   - Si no funciona, reconfigura el escáner
   ```

4. **Probar con QR alternativo:**
   ```javascript
   // Cambiar en LabelTemplate.jsx:
   format="QR" // en lugar de "CODE128"
   ```

---

## 🧪 Pruebas Recomendadas

### Test 1: Flujo Completo (Happy Path)

```
1. Crear factura con 2 items (1 unidad cada uno)
2. Agregar 2 fotos desde la cámara
3. Guardar
4. Usar "Bluetooth Directo"
5. Verificar que se impriman 2 etiquetas
6. Escanear ambos códigos con la pistola USB
```

**Resultado esperado:**
- ✅ Modal de impresión aparece
- ✅ Conexión Bluetooth exitosa
- ✅ 2 etiquetas impresas
- ✅ Códigos escaneables

---

### Test 2: Múltiples Unidades

```
1. Crear factura con 1 item de 5 unidades
2. Guardar
3. Imprimir vía Bluetooth
```

**Resultado esperado:**
- ✅ Se generan 5 etiquetas
- ✅ Códigos únicos: ENV-XXX-1-1, ENV-XXX-1-2, ..., ENV-XXX-1-5
- ✅ Todas imprimibles y escaneables

---

### Test 3: Carga de Fotos en Android 13+

```
1. Dispositivo: Samsung A02s con Android 13
2. Crear factura
3. Click en "Subir fotos"
4. Seleccionar desde galería
```

**Resultado esperado:**
- ✅ Solicita permisos si es primera vez
- ✅ Muestra galería del sistema
- ✅ Foto aparece en preview
- ✅ Se sube correctamente a Firebase

---

## 📊 Compatibilidad

### Navegadores
- ✅ **Chrome Android 90+** (Web Bluetooth soportado)
- ✅ **Edge Android 90+** (Web Bluetooth soportado)
- ⚠️ **Firefox Android** (NO soporta Web Bluetooth) → usar modo Normal
- ⚠️ **Samsung Internet** (Soporte limitado) → usar modo Normal

### Dispositivos Android
- ✅ Android 8.0+ (API 26+)
- ✅ BLE 4.0+
- ✅ Probado en: Samsung A02s, A03, Galaxy Tab A7

### Impresoras
- ✅ Phomemo M110
- ✅ Phomemo M02S
- ✅ Phomemo M220
- ⚠️ Otras marcas: usar modo Normal (window.print)

---

## 🛠️ Comandos de Deployment

### Reconstruir la App Android

```bash
# 1. Sincronizar cambios de Capacitor
cd mobile_app_capacitor
npx cap sync android

# 2. Abrir en Android Studio
npx cap open android

# 3. Build > Clean Project
# 4. Build > Rebuild Project
# 5. Run 'app'
```

### Subir a Producción

```bash
# Frontend (Vercel)
cd admin_web
npm run build
# (Vercel despliega automáticamente desde GitHub)

# Backend (Heroku/VPS)
cd backend
git push heroku main
```

---

## 📞 Soporte

Si los problemas persisten:

1. **Revisar logs del navegador:**
   ```
   - Chrome DevTools → Console
   - Buscar errores en rojo
   - Compartir screenshot
   ```

2. **Verificar versión de firmware de Phomemo:**
   ```
   - Descargar app oficial "Phomemo Print"
   - Conectar y verificar versión
   - Actualizar si hay nueva versión
   ```

3. **Crear issue en GitHub:**
   ```
   https://github.com/tu-repo/proyecto-envios/issues
   ```

---

## 🎓 Notas Técnicas

### Web Bluetooth API Limitations

- **Solo funciona en contextos seguros (HTTPS)**
- **Requiere interacción del usuario** (no se puede conectar automáticamente)
- **Distancia máxima: ~10 metros** (depende del dispositivo)
- **No funciona en background** (si la app pierde foco, se desconecta)

### Alternativa para iOS

iOS **NO soporta Web Bluetooth API** en Safari. Para soporte iOS:

1. **Opción A:** Usar impresión estándar (AirPrint si la impresora lo soporta)
2. **Opción B:** Integrar plugin nativo:
   ```bash
   npm install @capacitor-community/bluetooth-le
   ```

### Optimizaciones Futuras

- [ ] Auto-reconexión si se pierde conexión Bluetooth
- [ ] Caché de dispositivo Bluetooth emparejado
- [ ] Vista previa de etiqueta antes de imprimir
- [ ] Impresión por lotes con progress bar
- [ ] Soporte para tamaño 4x6 pulgadas
- [ ] Integración con escáneres Bluetooth

---

✅ **Sistema listo para pruebas en producción**

Última actualización: 2026-01-09

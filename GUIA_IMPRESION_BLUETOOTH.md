# 📘 Guía de Impresión Bluetooth con Phomemo M110

## 🎯 Cambios Implementados

### ✅ 1. Impresión Automática de Etiquetas al Crear Factura

**Archivo modificado:** `admin_web/src/pages/NuevaRecoleccion.jsx`

**Funcionalidad agregada:**
- Modal automático después de crear una recolección
- Generación de etiquetas individuales para cada unidad de cada item
- Dos modos de impresión:
  - **Bluetooth Directo**: Conexión directa a Phomemo via Web Bluetooth API
  - **Impresión Normal**: Usa el diálogo del sistema (window.print)

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

### ✅ 4. Sistema de Impresión Bluetooth

**Archivo creado:** `admin_web/src/utils/bluetoothPrinter.js`

**Características:**
- Clase `BluetoothPrinter` para manejar conexión BLE
- Compatible con Web Bluetooth API (Chrome/Edge Android)
- Soporte para comandos ESC/POS
- Filtros automáticos para detectar Phomemo (M110, M02S, M220)

**UUIDs de servicio:**
- Servicio principal: `000018f0-0000-1000-8000-00805f9b34fb`
- Característica de escritura: `00002af1-0000-1000-8000-00805f9b34fb`

---

## 🚀 Cómo Usar el Sistema

### Paso 1: Preparar el Dispositivo Android

1. **Emparejar la impresora Phomemo M110:**
   - Enciende la impresora
   - Ve al Kiosk Launcher → Toca 5 veces el título → PIN: 1234
   - Selecciona "🔵 Configurar Bluetooth"
   - Busca y empareja "Phomemo M110" o "M02S"

2. **Verificar permisos:**
   - La app solicitará permisos de:
     - Bluetooth
     - Cámara (para escanear y tomar fotos)
     - Archivos multimedia (para subir fotos)

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

Después de guardar, aparecerá un modal con 3 opciones:

#### Opción A: 🔵 Bluetooth Directo (Phomemo) ⭐ RECOMENDADO
1. Presiona "🔵 Bluetooth Directo (Phomemo)"
2. El navegador mostrará una lista de dispositivos Bluetooth
3. Selecciona tu impresora Phomemo
4. Las etiquetas se imprimirán automáticamente

**Ventajas:**
- No necesita drivers
- Imprime directamente vía BLE
- Más rápido y confiable
- Formato optimizado para térmicas

#### Opción B: 🖨️ Imprimir Normal (Menú Sistema)
1. Presiona "🖨️ Imprimir Normal"
2. Se abrirá el diálogo de impresión del sistema
3. Selecciona tu impresora Phomemo desde la lista
4. Ajusta configuraciones si es necesario
5. Presiona "Imprimir"

**Ventajas:**
- Compatible con cualquier impresora
- Permite vista previa
- Funciona en cualquier dispositivo

#### Opción C: Omitir (Imprimir después)
- Guarda la factura sin imprimir
- Puedes imprimir después desde el detalle de la recolección

---

## 🔧 Troubleshooting

### Problema 1: No se puede conectar a la impresora Bluetooth

**Síntomas:**
- Error: "No se encontró ninguna impresora"
- El modal de selección no muestra dispositivos

**Soluciones:**

1. **Verificar que la impresora esté encendida:**
   ```
   - LED de la impresora debe estar encendido
   - Botón de encendido presionado
   ```

2. **Verificar emparejamiento previo:**
   ```
   - Ir a Configuración → Bluetooth
   - Debe aparecer "Phomemo M110" o similar
   - Estado: "Conectado" o "Emparejado"
   ```

3. **Re-emparejar si es necesario:**
   ```
   - Olvidar dispositivo en Configuración
   - Apagar y encender la impresora
   - Volver a emparejar desde el Kiosk Launcher
   ```

4. **Verificar que el navegador soporte Bluetooth:**
   ```javascript
   // En la consola del navegador:
   console.log('Bluetooth soportado:', 'bluetooth' in navigator);
   // Debe retornar: true
   ```

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

**Soluciones:**

1. **Calibrar la impresora:**
   ```
   - Apagar la impresora
   - Mantener presionado el botón FEED
   - Encender mientras sigues presionando
   - Soltar cuando empiece a alimentar papel
   - La impresora calibrará automáticamente
   ```

2. **Verificar papel térmico:**
   ```
   - Asegúrate de que el papel esté puesto correctamente
   - La cara térmica (brillante) debe estar hacia ARRIBA
   - Prueba: Rasca con una uña → debe dejar marca negra
   ```

3. **Limpiar cabezal de impresión:**
   ```
   - Apaga la impresora
   - Usa un bastoncillo con alcohol isopropílico
   - Limpia suavemente el cabezal (línea negra horizontal)
   - Espera que se seque (1 min)
   - Enciende y prueba
   ```

4. **Probar con modo de impresión Normal:**
   - Si Bluetooth falla, usa "Imprimir Normal"
   - Verifica que el tamaño de página sea 4x2 pulgadas
   - Ajusta márgenes a 0

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

# 📤 AUDITORÍA DE FILE UPLOADS - Gemini Pro

**Fecha:** 2025-12-24
**Proyecto:** Sistema de Envíos Multi-tenant
**Objetivo:** Detectar vulnerabilidades en carga de archivos

---

## 📋 INSTRUCCIONES PARA GEMINI

Eres un experto en seguridad de file uploads. Analiza todos los endpoints que permiten subir archivos y encuentra vulnerabilidades que permitan:
- Path traversal
- Remote code execution (RCE)
- Denial of Service (DoS)
- Malware upload
- MIME type spoofing

### ARCHIVOS A ANALIZAR:

1. `backend/src/routes/contenedores.js` - Upload de Excel/archivos
2. `backend/src/routes/recolecciones.js` - Upload de fotos de paquetes
3. `backend/src/routes/repartidores.js` - Upload de evidencias de entrega
4. `backend/src/config/firebase.js` - Configuración de Firebase Storage
5. Cualquier otro endpoint que use `multer` o Firebase Storage

### VULNERABILIDADES A BUSCAR:

#### 1. **MIME Type Validation Bypass**
```javascript
// ❌ VULNERABLE - Solo verifica extensión
const upload = multer({
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.jpg')) {
      cb(null, true);
    } else {
      cb(new Error('Solo JPG'));
    }
  }
});

// Atacante puede subir: malware.php.jpg

// ✅ SEGURO - Verifica MIME type real
import fileType from 'file-type';

const upload = multer({
  fileFilter: async (req, file, cb) => {
    const buffer = await file.buffer.slice(0, 4100);
    const type = await fileType.fromBuffer(buffer);

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!type || !allowedMimes.includes(type.mime)) {
      return cb(new Error('Tipo de archivo no permitido'));
    }

    cb(null, true);
  }
});
```

#### 2. **Path Traversal**
```javascript
// ❌ VULNERABLE
app.post('/upload', upload.single('file'), async (req, res) => {
  const filename = req.file.originalname; // evil: ../../etc/passwd
  const filePath = `uploads/${filename}`;
  await bucket.upload(req.file.path, { destination: filePath });
});

// ✅ SEGURO
import path from 'path';
import { randomUUID } from 'crypto';

app.post('/upload', upload.single('file'), async (req, res) => {
  const ext = path.extname(req.file.originalname).toLowerCase();
  const safeFilename = `${randomUUID()}${ext}`;
  const filePath = `uploads/${req.user.companyId}/${safeFilename}`;
  await bucket.upload(req.file.path, { destination: filePath });
});
```

#### 3. **File Size DoS**
```javascript
// ❌ VULNERABLE - Sin límite de tamaño
const upload = multer({ dest: 'uploads/' });

// Atacante sube archivo de 10GB → crash

// ✅ SEGURO
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
});
```

#### 4. **Missing File Cleanup**
```javascript
// ❌ VULNERABLE - Archivos temporales no se limpian
app.post('/upload', upload.single('file'), async (req, res) => {
  await bucket.upload(req.file.path);
  res.json({ success: true });
  // req.file.path sigue en disco → DoS por espacio
});

// ✅ SEGURO
import fs from 'fs/promises';

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    await bucket.upload(req.file.path);
    res.json({ success: true });
  } finally {
    await fs.unlink(req.file.path).catch(() => {});
  }
});
```

#### 5. **Metadata Injection**
```javascript
// ❌ VULNERABLE - Metadata sin sanitizar
app.post('/upload', upload.single('file'), async (req, res) => {
  await bucket.upload(req.file.path, {
    metadata: {
      uploadedBy: req.body.username // XSS en metadata
    }
  });
});

// ✅ SEGURO
import { sanitizeHTML } from '../utils/sanitizers.js';

app.post('/upload', upload.single('file'), async (req, res) => {
  await bucket.upload(req.file.path, {
    metadata: {
      uploadedBy: req.user.uid, // UID del token, no input del usuario
      uploadDate: new Date().toISOString()
    }
  });
});
```

#### 6. **Public File Access**
```javascript
// ❌ VULNERABLE - Archivos públicamente accesibles
await bucket.upload(req.file.path, {
  destination: filePath,
  public: true // ⚠️ Cualquiera puede ver
});

// ✅ SEGURO - Generar signed URLs
await bucket.upload(req.file.path, {
  destination: filePath
});

// Cuando el usuario quiere ver:
const [url] = await bucket.file(filePath).getSignedUrl({
  action: 'read',
  expires: Date.now() + 60 * 60 * 1000 // 1 hora
});

res.json({ url });
```

#### 7. **Missing Content-Disposition**
```javascript
// ❌ VULNERABLE - Navegador ejecuta archivo en lugar de descargar
res.send(fileBuffer);

// ✅ SEGURO
res.setHeader('Content-Disposition', 'attachment; filename="safe-name.pdf"');
res.setHeader('Content-Type', 'application/pdf');
res.send(fileBuffer);
```

#### 8. **Image Processing Vulnerabilities**
```javascript
// ❌ VULNERABLE - Imagen maliciosa puede explotar librería
import sharp from 'sharp';

await sharp(req.file.path).resize(500).toFile('output.jpg');

// ✅ SEGURO - Con timeout y límites
import sharp from 'sharp';

try {
  await Promise.race([
    sharp(req.file.path, {
      limitInputPixels: 10000 * 10000,
      sequentialRead: true
    }).resize(500).toFile('output.jpg'),

    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 5000)
    )
  ]);
} catch (error) {
  console.error('Error procesando imagen:', error);
  throw new Error('Imagen inválida');
}
```

### TAREAS:

1. **Listar TODOS los endpoints** que aceptan file uploads
2. **Verificar validación de MIME type** (magic numbers, no extensión)
3. **Verificar límites de tamaño** (fileSize, files, fields)
4. **Buscar path traversal** en nombres de archivo
5. **Revisar limpieza de archivos temporales**
6. **Verificar permisos de archivos** en Storage
7. **Analizar procesamiento de archivos** (sharp, imagemagick, etc.)
8. **Revisar generación de URLs** (signed vs public)

### ENDPOINTS CONOCIDOS CON FILE UPLOAD:

1. `POST /api/contenedores/upload-from-drive` - Upload de Excel
2. `POST /api/recolecciones` - Upload de fotos (campo `foto`)
3. `POST /api/repartidores/facturas/:id/entregar` - Upload de evidencia
4. Bot WhatsApp - Upload de fotos en agendamiento

### FORMATO DE REPORTE:

```markdown
# REPORTE DE AUDITORÍA - FILE UPLOADS

## 🚨 VULNERABILIDADES CRÍTICAS

### 1. RCE via Malicious Excel - POST /api/contenedores/upload-from-drive

**Archivo:** `backend/src/routes/contenedores.js:120`

**Descripción:**
El endpoint acepta archivos Excel sin validar el contenido. Un atacante puede subir un archivo Excel con macros maliciosas o formulas que ejecutan comandos del sistema.

**Código vulnerable:**
```javascript
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Solo XLSX'));
    }
  }
});

app.post('/api/contenedores/upload-from-drive', upload.single('file'), async (req, res) => {
  const workbook = XLSX.readFile(req.file.path);
  // Procesa sin validar contenido
});
```

**Riesgo:**
- 🔴 Remote Code Execution (RCE)
- 🔴 Server compromise
- 🔴 Data exfiltration

**Payloads de prueba:**
```
1. Excel con formula: =cmd|'/c calc'!A1
2. Excel con macro VBA maliciosa
3. XXE injection en XML del Excel
```

**Fix recomendado:**
```javascript
import fileType from 'file-type';
import XLSX from 'xlsx';

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máx
    files: 1
  },
  fileFilter: async (req, file, cb) => {
    // Validar MIME type real
    const buffer = await fs.promises.readFile(file.path);
    const type = await fileType.fromBuffer(buffer);

    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!type || !allowedMimes.includes(type.mime)) {
      return cb(new Error('Tipo de archivo no permitido'));
    }

    cb(null, true);
  }
});

app.post('/api/contenedores/upload-from-drive', upload.single('file'), async (req, res) => {
  try {
    // Leer con opciones de seguridad
    const workbook = XLSX.readFile(req.file.path, {
      cellFormula: false, // NO ejecutar fórmulas
      cellHTML: false,    // NO permitir HTML
      cellDates: false,
      WTF: false
    });

    // Validar estructura esperada
    const expectedSheets = ['Hoja1', 'Datos'];
    const sheets = workbook.SheetNames;

    if (!expectedSheets.some(s => sheets.includes(s))) {
      throw new Error('Estructura de Excel inválida');
    }

    // Procesar datos
    const data = XLSX.utils.sheet_to_json(workbook.Sheets['Hoja1']);

    // Validar cada fila
    for (const row of data) {
      if (!validateRow(row)) {
        throw new Error('Datos inválidos en Excel');
      }
    }

    res.json({ success: true, rows: data.length });

  } finally {
    // CRITICAL: Limpiar archivo temporal
    await fs.promises.unlink(req.file.path).catch(() => {});
  }
});

function validateRow(row) {
  const requiredFields = ['tracking', 'descripcion', 'destinatario'];
  return requiredFields.every(field => row[field]);
}
```

**Prioridad:** 🔴 CRÍTICA - Fix inmediato

---

### 2. Path Traversal - Upload de evidencias

**Archivo:** `backend/src/routes/repartidores.js:89`

**Código vulnerable:**
```javascript
const filename = req.file.originalname; // ../../etc/passwd
const bucket = admin.storage().bucket();
await bucket.upload(req.file.path, {
  destination: `evidencias/${filename}`
});
```

**Payload de prueba:**
```bash
curl -F "file=@test.jpg" \
  -F "originalname=../../../../../../etc/passwd" \
  https://backend.com/api/repartidores/facturas/123/entregar
```

**Fix:**
```javascript
import { randomUUID } from 'crypto';
import path from 'path';

const ext = path.extname(req.file.originalname).toLowerCase();
const safeFilename = `${randomUUID()}${ext}`;
const filePath = `evidencias/${req.user.companyId}/${facturaId}/${safeFilename}`;

await bucket.upload(req.file.path, { destination: filePath });
```

**Prioridad:** 🔴 CRÍTICA

---

## ⚠️ VULNERABILIDADES ALTAS

### 3. MIME Type Spoofing - Fotos de recolecciones

**Descripción:**
El endpoint acepta cualquier archivo que termine en .jpg, permitiendo subir PHP, exe, etc.

**Fix:**
Usar `file-type` para detectar MIME real basado en magic numbers.

---

### 4. DoS via Large Files

**Descripción:**
No hay límite de tamaño en uploads, permitiendo DoS.

**Fix:**
```javascript
limits: {
  fileSize: 5 * 1024 * 1024, // 5MB
  files: 1
}
```

---

## 📊 VULNERABILIDADES MEDIAS

### 5. Archivos temporales no se limpian
### 6. Metadata sin sanitizar
### 7. URLs públicas en lugar de signed URLs

---

## 📈 MATRIZ DE ENDPOINTS DE UPLOAD

| Endpoint | Validación MIME | Límite Tamaño | Path Safety | Cleanup | Status |
|----------|----------------|---------------|-------------|---------|--------|
| POST /api/contenedores/upload | ❌ | ❌ | ❌ | ❌ | 🔴 |
| POST /api/recolecciones | ⚠️ Extensión | ✅ 5MB | ⚠️ | ❌ | 🟡 |
| POST /api/repartidores/.../entregar | ❌ | ❌ | ❌ | ✅ | 🔴 |

## 🔧 FIXES RECOMENDADOS

### Fix 1: Middleware de validación de archivos
```javascript
// backend/src/middleware/validateFileUpload.js
import fileType from 'file-type';
import path from 'path';
import { randomUUID } from 'crypto';

export async function validateImageUpload(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: 'No se proporcionó archivo' });
  }

  // Validar tamaño
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (req.file.size > maxSize) {
    await cleanupFile(req.file.path);
    return res.status(400).json({ error: 'Archivo demasiado grande (máx 5MB)' });
  }

  // Validar MIME type real
  const buffer = await fs.promises.readFile(req.file.path);
  const type = await fileType.fromBuffer(buffer);

  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!type || !allowedMimes.includes(type.mime)) {
    await cleanupFile(req.file.path);
    return res.status(400).json({ error: 'Tipo de archivo no permitido' });
  }

  // Generar nombre seguro
  const ext = type.ext;
  req.safeFilename = `${randomUUID()}.${ext}`;

  next();
}

async function cleanupFile(filePath) {
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    console.error('Error limpiando archivo:', err);
  }
}
```

### Fix 2: Upload seguro a Firebase Storage
```javascript
// backend/src/utils/secureUpload.js
import admin from 'firebase-admin';
import fs from 'fs/promises';

export async function uploadToStorage(filePath, safeFilename, companyId, folder) {
  const bucket = admin.storage().bucket();
  const destination = `${folder}/${companyId}/${safeFilename}`;

  try {
    await bucket.upload(filePath, {
      destination,
      metadata: {
        contentType: 'auto-detect',
        metadata: {
          companyId,
          uploadDate: new Date().toISOString()
        }
      },
      public: false // NO hacer público
    });

    // Generar signed URL (válida 7 días)
    const [url] = await bucket.file(destination).getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    return { destination, url };

  } finally {
    // CRITICAL: Limpiar archivo temporal
    await fs.unlink(filePath).catch(() => {});
  }
}

// Uso:
app.post('/api/recolecciones',
  authMiddleware,
  upload.single('foto'),
  validateImageUpload,
  async (req, res) => {
    const { destination, url } = await uploadToStorage(
      req.file.path,
      req.safeFilename,
      req.user.companyId,
      'recolecciones'
    );

    await db.collection('recolecciones').add({
      ...req.body,
      fotoUrl: url,
      fotoPath: destination,
      companyId: req.user.companyId
    });

    res.json({ success: true, fotoUrl: url });
  }
);
```

### Fix 3: Rate limiting para uploads
```javascript
// backend/src/config/rateLimiters.js
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // 20 uploads por hora
  message: 'Demasiados uploads. Intenta en 1 hora.',
  standardHeaders: true,
  legacyHeaders: false
});

// Aplicar:
app.post('/api/recolecciones',
  uploadLimiter,
  authMiddleware,
  upload.single('foto'),
  ...
);
```

## 📚 DEPENDENCIAS RECOMENDADAS

```bash
npm install --save file-type@19.0.0
npm install --save @google-cloud/storage
```

## 🧪 TESTS RECOMENDADOS

```javascript
// backend/tests/file-upload.test.js
describe('File Upload Security', () => {
  it('Rechaza archivos que no son imágenes', async () => {
    const response = await request(app)
      .post('/api/recolecciones')
      .attach('foto', 'test/malicious.php.jpg')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Tipo de archivo no permitido');
  });

  it('Rechaza archivos mayores a 5MB', async () => {
    const response = await request(app)
      .post('/api/recolecciones')
      .attach('foto', 'test/large-10mb.jpg')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
  });

  it('Previene path traversal', async () => {
    // Verificar que filename no contiene ../
  });
});
```

## 📊 SCORE FINAL

- Vulnerabilidades Críticas: X
- Vulnerabilidades Altas: X
- Vulnerabilidades Medias: X
- **Score Total:** X/100
```

---

## 🚀 CÓMO USAR ESTE PROMPT

1. Ir a https://aistudio.google.com/
2. Crear nuevo chat
3. Copiar este prompt completo
4. Adjuntar archivos:
   - `backend/src/routes/contenedores.js`
   - `backend/src/routes/recolecciones.js`
   - `backend/src/routes/repartidores.js`
   - `backend/src/config/firebase.js`
   - Cualquier otro archivo con multer o uploads
5. Enviar

---

**Análisis completado por:** Gemini Pro
**Fecha de análisis:** [YYYY-MM-DD]

# 🛡️ AUDITORÍA DE VALIDACIÓN DE INPUTS - Gemini Pro

**Fecha:** 2025-12-24
**Proyecto:** Sistema de Envíos Multi-tenant
**Objetivo:** Detectar fallas en validación de entradas de usuario

---

## 📋 INSTRUCCIONES PARA GEMINI

Eres un experto en seguridad OWASP Top 10. Analiza todos los endpoints del backend y verifica que validen correctamente los inputs del usuario.

### ARCHIVOS A ANALIZAR:

1. `backend/src/routes/*.js` - Todos los archivos de rutas
2. `backend/src/controllers/*.js` - Todos los controladores
3. `backend/src/utils/validators.js` - Validadores existentes
4. `backend/src/utils/sanitizers.js` - Sanitizadores existentes

### VULNERABILIDADES A BUSCAR:

#### 1. **NoSQL Injection**
```javascript
// ❌ VULNERABLE
db.collection('usuarios').where('email', '==', req.body.email).get()

// ✅ SEGURO
const email = sanitizeEmail(req.body.email);
if (!isValidEmail(email)) return res.status(400).json({ error: 'Email inválido' });
db.collection('usuarios').where('email', '==', email).get()
```

#### 2. **XSS (Cross-Site Scripting)**
```javascript
// ❌ VULNERABLE
const nombre = req.body.nombre;
db.collection('usuarios').add({ nombre })

// ✅ SEGURO
const nombre = sanitizeHTML(req.body.nombre);
db.collection('usuarios').add({ nombre })
```

#### 3. **Path Traversal**
```javascript
// ❌ VULNERABLE
const filename = req.body.filename;
fs.readFile(`./uploads/${filename}`)

// ✅ SEGURO
const filename = path.basename(req.body.filename);
if (!isValidFilename(filename)) return res.status(400).json({ error: 'Nombre inválido' });
```

#### 4. **Command Injection**
```javascript
// ❌ VULNERABLE
exec(`convert ${req.body.file} output.pdf`)

// ✅ SEGURO
const file = sanitizeFilePath(req.body.file);
execFile('convert', [file, 'output.pdf'])
```

#### 5. **Mass Assignment**
```javascript
// ❌ VULNERABLE
await db.collection('usuarios').doc(userId).update(req.body)

// ✅ SEGURO
const allowedFields = ['nombre', 'telefono', 'direccion'];
const updateData = pick(req.body, allowedFields);
await db.collection('usuarios').doc(userId).update(updateData)
```

### TAREAS:

1. **Revisar TODOS los endpoints** que aceptan input del usuario
2. **Identificar campos sin validación**
3. **Detectar sanitización faltante**
4. **Encontrar validaciones débiles** (ejemplo: solo verificar `if (email)` sin regex)
5. **Revisar file uploads** (tipo MIME, tamaño, extensión)
6. **Verificar validación de tipos** (números, fechas, booleanos)

### ENDPOINTS CRÍTICOS A REVISAR:

**Autenticación:**
- `POST /api/auth/login`
- `POST /api/auth/register`

**Recolecciones:**
- `POST /api/recolecciones`
- `PATCH /api/recolecciones/:id`

**Contenedores:**
- `POST /api/contenedores/upload-from-drive`
- `POST /api/almacen-usa/contenedores`

**Rutas:**
- `POST /api/almacen-rd/facturas/:facturaId/asignar-ruta`
- `POST /api/cargadores/rutas/:rutaId/iniciar-carga`

**Usuarios:**
- `POST /api/empleados`
- `PATCH /api/empleados/:id/change-password`

### FORMATO DE REPORTE:

```markdown
# REPORTE DE AUDITORÍA - VALIDACIÓN DE INPUTS

## 🚨 VULNERABILIDADES CRÍTICAS

### 1. NoSQL Injection en /api/auth/login
**Archivo:** `backend/src/routes/auth.js:45`
**Código vulnerable:**
```javascript
db.collection('usuarios').where('email', '==', req.body.email).get()
```
**Riesgo:** Un atacante puede inyectar objetos como `{"$ne": null}` para bypassear autenticación
**Payload de prueba:**
```json
{"email": {"$ne": null}, "password": {"$ne": null}}
```
**Fix recomendado:**
```javascript
const email = String(req.body.email || '').trim().toLowerCase();
if (!isValidEmail(email)) return res.status(400).json({ error: 'Email inválido' });
db.collection('usuarios').where('email', '==', email).get()
```
**Prioridad:** 🔴 CRÍTICA

---

### 2. XSS en campo "nombre" de /api/recolecciones
[misma estructura]

## ⚠️ VULNERABILIDADES ALTAS
[misma estructura]

## 📊 VULNERABILIDADES MEDIAS
[misma estructura]

## ✅ CÓDIGO SEGURO ENCONTRADO

- ✅ `backend/src/utils/validators.js` - Validación de emails correcta
- ✅ `backend/src/controllers/rutaController.js:120` - Sanitización de zona

## 📈 ESTADÍSTICAS

| Categoría | Cantidad |
|-----------|----------|
| Endpoints analizados | X |
| Vulnerabilidades Críticas | X |
| Vulnerabilidades Altas | X |
| Vulnerabilidades Medias | X |
| Endpoints seguros | X |
| **Score Total** | **X/100** |

## 🔧 FIXES PRIORITARIOS

### Fix 1: Crear validador centralizado
```javascript
// backend/src/middleware/validateRequest.js
import { validationResult, body } from 'express-validator';

export const validateRecoleccion = [
  body('codigoTracking').isString().trim().notEmpty().isLength({ max: 50 }),
  body('descripcion').isString().trim().escape().isLength({ max: 500 }),
  body('precio').isFloat({ min: 0, max: 999999 }),
  body('estado').isIn(['pendiente', 'en_transito', 'entregado']),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Uso:
app.post('/api/recolecciones', validateRecoleccion, recoleccionesController.create);
```

### Fix 2: Sanitizar todos los inputs HTML
```javascript
// backend/src/utils/sanitizers.js
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHTML(input) {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

export function sanitizeObject(obj, allowedFields) {
  const sanitized = {};
  for (const field of allowedFields) {
    if (obj[field] !== undefined) {
      sanitized[field] = typeof obj[field] === 'string'
        ? sanitizeHTML(obj[field])
        : obj[field];
    }
  }
  return sanitized;
}
```

### Fix 3: Validar file uploads
```javascript
// backend/src/middleware/validateFileUpload.js
export function validateFileUpload(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: 'No se proporcionó archivo' });
  }

  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedMimes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Tipo de archivo no permitido' });
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (req.file.size > maxSize) {
    return res.status(400).json({ error: 'Archivo demasiado grande (máx 5MB)' });
  }

  next();
}
```

## 📚 RECOMENDACIONES GENERALES

1. **Instalar express-validator:**
   ```bash
   npm install express-validator
   ```

2. **Crear middleware de validación** para cada endpoint

3. **Usar whitelist approach** (definir campos permitidos, rechazar el resto)

4. **Sanitizar SIEMPRE** antes de guardar en base de datos

5. **Validar tipos de datos** (no confiar en TypeScript/JSDoc)

6. **Limitar longitud de strings** para prevenir DoS

7. **Validar enums** con arrays predefinidos

8. **Escapar caracteres especiales** en búsquedas

## 🎯 PLAN DE REMEDIACIÓN

**Semana 1:**
- Implementar validadores para endpoints de autenticación
- Sanitizar inputs de recolecciones
- Validar file uploads

**Semana 2:**
- Implementar validadores para contenedores y rutas
- Refactorizar validación de usuarios
- Testing de todos los fixes

**Semana 3:**
- Auditoría de regresión
- Documentar validadores
- Configurar alertas para inputs maliciosos
```

---

## 🚀 CÓMO USAR ESTE PROMPT

1. Ir a https://aistudio.google.com/
2. Crear nuevo chat
3. Copiar este prompt completo
4. Adjuntar archivos:
   - Todos los archivos en `backend/src/routes/`
   - Todos los archivos en `backend/src/controllers/`
   - `backend/src/utils/validators.js`
   - `backend/src/utils/sanitizers.js`
5. Enviar

---

## 📌 CONTEXTO ADICIONAL

**Endpoints existentes en el sistema:**
- Autenticación y autorización
- Gestión de recolecciones (facturas)
- Contenedores y embarques
- Rutas y entregas
- Usuarios y empleados
- Reportes financieros
- WhatsApp bot (agendamiento público)

**Ya implementado:**
- Rate limiting
- CORS configurado
- Firestore Rules con custom claims
- Sanitizadores básicos en `backend/src/utils/sanitizers.js`
- Validadores básicos en `backend/src/utils/validators.js`

---

**Análisis completado por:** Gemini Pro
**Fecha de análisis:** [YYYY-MM-DD]

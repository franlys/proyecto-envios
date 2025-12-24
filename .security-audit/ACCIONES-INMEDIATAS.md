# ✅ ACCIONES INMEDIATAS - Implementar Recomendaciones de Gemini

**Basado en**: Auditoría completa de Gemini Pro (2025-12-24)
**Reporte completo**: [gemini-auditoria-completa-2025-12-24.md](reportes/gemini-auditoria-completa-2025-12-24.md)

---

## 🎯 HACER HOY (2-4 horas)

### ✅ TAREA 1: Firestore Security Rules (1-2 horas)

#### Paso 1: Copiar Reglas Actuales
```
1. Ir a: https://console.firebase.google.com
2. Seleccionar tu proyecto
3. Firestore Database → Rules
4. Copiar TODAS las reglas (Ctrl+A, Ctrl+C)
5. Guardar en archivo temporal para backup
```

#### Paso 2: Generar Reglas Seguras con Gemini
```
1. Abrir Gemini Pro (AnythingLLM o AI Studio)
2. Ejecutar: cat .security-audit/prompt-firestore-rules-audit.md
3. Copiar TODO y pegar en Gemini
4. Esperar confirmación
5. Pegar las reglas actuales en Gemini
6. Gemini generará reglas seguras completas
```

#### Paso 3: Implementar Reglas Seguras
```
1. Copiar las reglas que Gemini generó
2. Ir a Firebase Console → Firestore Database → Rules
3. Reemplazar TODO el contenido con las nuevas reglas
4. NO PUBLICAR TODAVÍA
```

#### Paso 4: Probar en Rules Playground
```
1. Click en "Rules Playground" (abajo del editor)
2. Probar estos escenarios:

Test 1: Usuario sin auth intenta leer facturas
  Operation: get
  Location: /facturas/FACTURA_123
  Auth: Not signed in
  Expected: ❌ DENIED ✅

Test 2: Usuario de compañía A intenta leer factura de compañía B
  Operation: get
  Location: /facturas/FACTURA_456
  Auth: Authenticated
    Custom claims: { "companyId": "COMPANY_A" }
  Resource data: { "companyId": "COMPANY_B" }
  Expected: ❌ DENIED ✅

Test 3: Admin lee factura de su compañía
  Operation: get
  Location: /facturas/FACTURA_789
  Auth: Authenticated
    Custom claims: {
      "companyId": "COMPANY_A",
      "rol": "admin_general"
    }
  Resource data: { "companyId": "COMPANY_A" }
  Expected: ✅ ALLOWED ✅
```

#### Paso 5: Publicar
```
1. Si TODOS los tests pasaron → Click en "Publish"
2. Esperar 1-2 minutos para que se despliegue
3. Validar en tu app que usuarios autenticados pueden acceder
```

⚠️ **IMPORTANTE**: Si algo falla, volver a poner las reglas anteriores

---

### ✅ TAREA 2: Rate Limiting (1-2 horas)

#### Paso 1: Instalar Dependencia
```bash
npm install express-rate-limit
```

#### Paso 2: Crear Archivo de Configuración

**Crear**: `backend/src/config/rateLimiters.js`

```javascript
import rateLimit from 'express-rate-limit';

// Rate limiter general para toda la API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 300,  // 300 requests
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Has excedido el límite de solicitudes. Intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter estricto para endpoints pesados
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hora
  max: 20,  // 20 requests
  message: {
    error: 'Demasiados uploads',
    message: 'Has excedido el límite de uploads por hora.'
  }
});

// Rate limiter para login (prevenir brute force)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 5,  // Solo 5 intentos
  skipSuccessfulRequests: true,  // No cuenta logins exitosos
  message: {
    error: 'Demasiados intentos de login',
    message: 'Has excedido el límite de intentos. Intenta en 15 minutos.'
  }
});
```

#### Paso 3: Aplicar en tu App

**Modificar**: `backend/src/app.js` o `backend/src/server.js`

```javascript
import { apiLimiter, strictLimiter, loginLimiter } from './config/rateLimiters.js';

// ... tu código existente ...

// Aplicar rate limiter ANTES de las rutas
app.use('/api/', apiLimiter);  // General para toda la API

// ... importar rutas ...

// Aplicar limiters específicos en rutas individuales
// (si tienes rutas separadas por archivo)
```

**Modificar**: `backend/src/routes/contenedores.js`

```javascript
import { strictLimiter } from '../config/rateLimiters.js';

// Aplicar a endpoint de upload
router.post('/upload-from-drive',
  strictLimiter,  // ✅ Agregar ANTES del middleware de auth
  verifyToken,
  checkRole('admin_general', 'almacen_usa', 'super_admin'),
  async (req, res) => {
    // ... código existente ...
  }
);
```

**Modificar**: Ruta de login (si existe `backend/src/routes/auth.js` o `usuarios.js`)

```javascript
import { loginLimiter } from '../config/rateLimiters.js';

router.post('/login',
  loginLimiter,  // ✅ Agregar rate limiter
  async (req, res) => {
    // ... código existente ...
  }
);
```

#### Paso 4: Testing

```bash
# 1. Iniciar el servidor
npm start

# 2. En otra terminal, intentar exceder el límite de login
# (ejecutar 6 veces rápidamente)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'

# Después del 5to intento, debe responder:
# {
#   "error": "Demasiados intentos de login",
#   "message": "Has excedido el límite..."
# }
```

---

## 🚀 HACER MAÑANA (2-3 horas)

### ✅ TAREA 3: Corregir Race Conditions

#### Paso 3.1: Corregir `finalizarCarga` (cargadoresController.js)

**Archivo**: `backend/src/controllers/cargadoresController.js`

**Buscar la función** `finalizarCarga` (o similar que cambie estado de cargadores)

**Patrón VULNERABLE a buscar**:
```javascript
// ❌ ESTO ESTÁ MAL
const doc = await cargadorRef.get();
const data = doc.data();

if (data.estado === 'disponible') {
  await cargadorRef.update({ estado: 'ocupado' });
}
```

**Reemplazar con**:
```javascript
// ✅ ESTO ESTÁ BIEN
import admin from 'firebase-admin';
const db = admin.firestore();

// ... en la función finalizarCarga:

await db.runTransaction(async (transaction) => {
  const doc = await transaction.get(cargadorRef);

  if (!doc.exists) {
    throw new Error('Cargador no encontrado');
  }

  const data = doc.data();

  // Validar DENTRO de la transacción
  if (data.estado === 'ocupado') {
    throw new Error('Cargador ya está ocupado. No se puede asignar dos veces.');
  }

  // Actualización atómica
  transaction.update(cargadorRef, {
    estado: 'ocupado',
    fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
    asignadoA: req.user.uid
  });
});

// Si llegamos aquí, la transacción fue exitosa
res.json({ message: 'Cargador asignado exitosamente' });
```

#### Paso 3.2: Corregir Función de Cierre de Contenedores

**Buscar** la función que cierra contenedores (puede estar en `contenedores.js`, `rutaController.js`, etc.)

**Aplicar el mismo patrón**:
```javascript
await db.runTransaction(async (transaction) => {
  const doc = await transaction.get(contenedorRef);

  if (!doc.exists) {
    throw new Error('Contenedor no encontrado');
  }

  const data = doc.data();

  if (data.estado === 'cerrado') {
    throw new Error('Contenedor ya está cerrado.');
  }

  transaction.update(contenedorRef, {
    estado: 'cerrado',
    fechaCierre: admin.firestore.FieldValue.serverTimestamp(),
    cerradoPor: req.user.uid
  });
});
```

#### Paso 3.3: Testing de Race Conditions

**Test manual con Postman** (o similar):

```
1. Crear 2 tabs en Postman con la misma request
2. Endpoint: POST /api/cargadores/{id}/finalizar (o similar)
3. Ejecutar AMBAS al mismo tiempo (click rápido)

Resultado esperado:
- Tab 1: 200 OK - "Cargador asignado exitosamente"
- Tab 2: 500 ERROR - "Cargador ya está ocupado"

❌ Si ambas responden 200 OK: Race condition NO corregida
✅ Si una responde 200 y otra error: Race condition CORREGIDA
```

---

## 📋 CHECKLIST COMPLETO

### HOY
- [ ] **Firestore Rules**: Copiar reglas actuales (backup)
- [ ] **Firestore Rules**: Generar reglas seguras con Gemini
- [ ] **Firestore Rules**: Probar en Rules Playground
- [ ] **Firestore Rules**: Publicar si tests pasan
- [ ] **Firestore Rules**: Validar en app que usuarios autenticados acceden

- [ ] **Rate Limiting**: `npm install express-rate-limit`
- [ ] **Rate Limiting**: Crear `config/rateLimiters.js`
- [ ] **Rate Limiting**: Aplicar `apiLimiter` en app.js
- [ ] **Rate Limiting**: Aplicar `strictLimiter` en upload
- [ ] **Rate Limiting**: Aplicar `loginLimiter` en login
- [ ] **Rate Limiting**: Testing (intentar 6 logins)

### MAÑANA
- [ ] **Race Conditions**: Encontrar función `finalizarCarga`
- [ ] **Race Conditions**: Reemplazar con `db.runTransaction()`
- [ ] **Race Conditions**: Testing con 2 requests concurrentes
- [ ] **Race Conditions**: Encontrar función de cierre de contenedores
- [ ] **Race Conditions**: Aplicar mismo patrón
- [ ] **Race Conditions**: Testing

### ESTA SEMANA
- [ ] Buscar otras funciones con patrón vulnerable en controllers
- [ ] Testing completo de integración
- [ ] Documentar cambios

---

## 🆘 Si Algo Falla

### Firestore Rules bloquearon a usuarios legítimos
```
1. Ir a Firebase Console → Firestore Database → Rules
2. Pegar las reglas anteriores (backup)
3. Publicar
4. Revisar qué test falló en Rules Playground
5. Ajustar reglas y volver a probar
```

### Rate Limiting bloquea requests normales
```
1. Aumentar el límite temporalmente:
   max: 500  // En vez de 300

2. O ajustar el tiempo:
   windowMs: 5 * 60 * 1000  // 5 minutos en vez de 15
```

### Race Condition causa errores en producción
```
1. Verificar que db está importado:
   import admin from 'firebase-admin';
   const db = admin.firestore();

2. Verificar que transaction.update() está DENTRO del async (transaction)

3. No mezclar await ref.update() CON transaction.update()
```

---

## 📊 Tiempo Estimado Total

| Tarea | Tiempo |
|-------|--------|
| Firestore Rules | 1-2 horas |
| Rate Limiting | 1-2 horas |
| Race Conditions | 2-3 horas |
| **TOTAL** | **4-7 horas** |

---

## 🎯 Prioridad de Implementación

```
1. 🔴 CRÍTICA: Firestore Rules (1-2 horas)
   ↓
2. 🔴 CRÍTICA: Rate Limiting (1-2 horas)
   ↓
3. 🟡 ALTA: Race Conditions (2-3 horas)
```

---

## 📞 Recursos de Ayuda

- **Firestore Rules**: `.security-audit/prompt-firestore-rules-audit.md`
- **Rate Limiting**: `.security-audit/prompt-rate-limiting-audit.md`
- **Race Conditions**: `.security-audit/prompt-race-condition-audit.md`
- **Reporte Completo**: `.security-audit/reportes/gemini-auditoria-completa-2025-12-24.md`

---

**Última actualización**: 2025-12-24
**Siguiente acción**: Implementar Firestore Rules (Tarea 1)

**🚀 EMPIEZA AHORA: Firestore Rules es la tarea más crítica y toma solo 1-2 horas**

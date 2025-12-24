# 🎯 GUÍA: Prompts para Siguientes Pasos de Seguridad

Esta guía contiene todos los prompts que necesitas para que **Gemini Pro** audite los siguientes aspectos de seguridad de tu proyecto.

---

## 📋 Índice de Prompts

| # | Prompt | Archivo | Prioridad | Tiempo Estimado |
|---|--------|---------|-----------|-----------------|
| 1 | **Race Condition Audit** | [prompt-race-condition-audit.md](prompt-race-condition-audit.md) | 🔴 CRÍTICA | 30-45 min |
| 2 | **Rate Limiting Audit** | [prompt-rate-limiting-audit.md](prompt-rate-limiting-audit.md) | 🔴 CRÍTICA | 45-60 min |
| 3 | **Firestore Rules Audit** | [prompt-firestore-rules-audit.md](prompt-firestore-rules-audit.md) | 🔴 CRÍTICA | 60-90 min |
| 4 | **Security Headers Audit** | [Ver abajo](#4-security-headers-audit) | 🟡 ALTA | 20-30 min |
| 5 | **Dependency Audit** | [Ver abajo](#5-dependency-vulnerability-audit) | 🟡 ALTA | 15-20 min |
| 6 | **Token Revocation Audit** | [Ver abajo](#6-token-revocation-audit) | 🟡 MEDIA | 30-40 min |

---

## 🚀 Cómo Usar Esta Guía

### Opción 1: Auditoría Manual con Gemini

1. **Selecciona un prompt** de la tabla de arriba
2. **Abre el archivo** del prompt (ej: `prompt-race-condition-audit.md`)
3. **Copia TODO el contenido** del prompt
4. **Pega en Gemini Pro** (AnythingLLM o Google AI Studio)
5. **Espera confirmación** de Gemini
6. **Copia el código a auditar** (ej: `rutaController.js`, `cargadoresController.js`, etc.)
7. **Pega en Gemini**
8. **Gemini generará un reporte** con vulnerabilidades y correcciones

### Opción 2: Auditoría Automática con Script

```bash
# Auditar todos los archivos modificados
node .security-audit/security-audit-auto.js

# Auditar archivo específico con prompt de race conditions
node .security-audit/security-audit-auto.js --file=backend/src/controllers/cargadoresController.js
```

---

## 📚 Prompts Disponibles

### 1. Race Condition Audit

**Archivo**: [prompt-race-condition-audit.md](prompt-race-condition-audit.md)

**¿Qué audita?**
- Operaciones Read-Check-Update NO atómicas
- Funciones que modifican estados críticos sin transacciones
- Cálculos financieros sin `db.runTransaction()`
- Potenciales duplicaciones de notificaciones/reportes

**¿Cuándo usarlo?**
- Después de corregir `cerrarRuta` en `rutaController.js`
- Para auditar `finalizarRuta` y otras funciones similares
- Antes de lanzar a producción

**Archivos a auditar**:
```bash
backend/src/controllers/rutaController.js       # finalizarRuta, etc.
backend/src/controllers/cargadoresController.js  # Operaciones de estado
backend/src/controllers/almacenUsaController.js  # Operaciones financieras
```

**Ejemplo de uso**:
1. Abre [prompt-race-condition-audit.md](prompt-race-condition-audit.md)
2. Copia TODO el contenido
3. Pega en Gemini Pro
4. Copia `backend/src/controllers/cargadoresController.js`
5. Pega en Gemini
6. Gemini generará reporte con vulnerabilidades

---

### 2. Rate Limiting Audit

**Archivo**: [prompt-rate-limiting-audit.md](prompt-rate-limiting-audit.md)

**¿Qué audita?**
- Endpoints sin rate limiting
- Endpoints de autenticación sin protección contra brute force
- Endpoints de upload sin límites
- Configuraciones de rate limiting muy permisivas

**¿Cuándo usarlo?**
- AHORA (antes de que alguien abuse de la API)
- Después de agregar nuevos endpoints
- Antes de lanzar a producción

**Archivos a auditar**:
```bash
backend/src/routes/*.js                  # Todas las rutas
backend/src/routes/contenedores.js       # Prioridad: tiene upload
backend/src/routes/auth.js               # Prioridad: login/registro
backend/src/routes/usuarios.js           # Registro, recuperación contraseña
```

**Ejemplo de uso**:
1. Abre [prompt-rate-limiting-audit.md](prompt-rate-limiting-audit.md)
2. Copia TODO el contenido
3. Pega en Gemini Pro
4. Copia `backend/src/routes/contenedores.js`
5. Pega en Gemini
6. Gemini dirá qué endpoints necesitan rate limiting y cómo implementarlo

---

### 3. Firestore Rules Audit

**Archivo**: [prompt-firestore-rules-audit.md](prompt-firestore-rules-audit.md)

**¿Qué audita?**
- Reglas completamente abiertas (`allow read, write: if true`)
- Colecciones sin autenticación
- Falta de aislamiento por `companyId`
- Falta de validación de roles
- Escritura sin validación de campos críticos

**¿Cuándo usarlo?**
- AHORA (si tus reglas están abiertas, TODOS tus datos están expuestos)
- Cada vez que agregues una nueva colección
- Mensualmente como auditoría de rutina

**Dónde obtener las reglas actuales**:
1. Abre Firebase Console: https://console.firebase.google.com
2. Selecciona tu proyecto
3. Ve a "Firestore Database"
4. Click en pestaña "Rules"
5. Copia TODAS las reglas

**Ejemplo de uso**:
1. Abre [prompt-firestore-rules-audit.md](prompt-firestore-rules-audit.md)
2. Copia TODO el contenido
3. Pega en Gemini Pro
4. Copia las reglas de Firestore (desde Firebase Console)
5. Pega en Gemini
6. Gemini generará reglas seguras completas

---

## 🆕 Prompts Adicionales (Inline)

### 4. Security Headers Audit

**¿Qué audita?**
- Ausencia de headers de seguridad (CSP, X-Frame-Options, etc.)
- Configuración incorrecta de CORS
- Falta de Helmet.js

**Prompt para Gemini**:

```markdown
# PROMPT: Security Headers Auditor

Audita el archivo de configuración de Express para detectar ausencia de **Security Headers**.

## Busca:

1. **Helmet.js NO configurado**
   - Falta `app.use(helmet())`
   - Headers críticos sin configurar

2. **CORS mal configurado**
   - `origin: '*'` (permite cualquier origen)
   - Falta validación de orígenes permitidos

3. **Headers faltantes**:
   - `Content-Security-Policy` (CSP)
   - `X-Frame-Options` (anti-clickjacking)
   - `X-Content-Type-Options: nosniff`
   - `Strict-Transport-Security` (HSTS)
   - `Referrer-Policy`

## Código a buscar:

```javascript
// ❌ VULNERABLE: Sin helmet
const express = require('express');
const app = express();

app.use(cors({ origin: '*' }));  // ❌ Permite CUALQUIER origen

// Sin headers de seguridad
```

## Solución:

```javascript
// ✅ SEGURO
import helmet from 'helmet';
import cors from 'cors';

// Headers de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configurado correctamente
const allowedOrigins = [
  'https://tu-dominio.com',
  'https://app.tu-dominio.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));
```

## Genera reporte con:
- Headers faltantes
- Severidad de cada uno
- Código de corrección completo
```

**Archivos a auditar**:
```bash
backend/src/app.js           # Configuración principal
backend/src/server.js        # Server setup
backend/src/index.js         # Entry point
```

---

### 5. Dependency Vulnerability Audit

**¿Qué audita?**
- Dependencias con vulnerabilidades conocidas
- Versiones desactualizadas con CVEs
- Paquetes deprecados

**Prompt para Gemini**:

```markdown
# PROMPT: Dependency Vulnerability Auditor

Analiza el archivo `package.json` para detectar **dependencias con vulnerabilidades conocidas**.

## Instrucciones:

1. **Revisa CADA dependencia** en `dependencies` y `devDependencies`
2. **Identifica versiones antiguas** que puedan tener CVEs
3. **Busca paquetes deprecados** o abandonados
4. **Recomienda actualizaciones** seguras

## Dependencias CRÍTICAS a revisar:

- `express` - Framework web
- `firebase-admin` - SDK de Firebase
- `jsonwebtoken` - Autenticación JWT
- `bcrypt` / `bcryptjs` - Hashing de passwords
- `cors` - CORS middleware
- `multer` - File uploads
- `axios` - HTTP client
- `dotenv` - Environment variables

## Formato de reporte:

```markdown
# AUDITORÍA: Dependencias Vulnerables

## Vulnerabilidades Encontradas

### 1. express@4.17.1
**Severidad**: ALTA
**CVE**: CVE-2022-24999
**Problema**: Vulnerabilidad de ReDoS en body-parser
**Versión afectada**: < 4.18.0
**Corrección**: Actualizar a express@4.18.2 o superior

```bash
npm install express@latest
```

### 2. jsonwebtoken@8.5.1
**Severidad**: CRÍTICA
**CVE**: CVE-2022-23529
**Problema**: Bypass de verificación de firma JWT
**Versión afectada**: < 9.0.0
**Corrección**: Actualizar a jsonwebtoken@9.0.0 o superior

```bash
npm install jsonwebtoken@latest
```

## Dependencias Seguras

- firebase-admin@11.0.0 ✅
- bcryptjs@2.4.3 ✅

## Comando de Actualización Completa

```bash
npm update
npm audit fix
npm audit fix --force  # Solo si es necesario
```
```

**Archivos a auditar**:
```bash
package.json
package-lock.json
```

**Alternativa: Usar npm audit directamente**:

```bash
# Auditoría automática
npm audit

# Auditoría detallada en JSON
npm audit --json > audit-report.json

# Corregir automáticamente
npm audit fix

# Corregir incluyendo breaking changes
npm audit fix --force
```

---

### 6. Token Revocation Audit

**¿Qué audita?**
- Falta de mecanismo de revocación de tokens
- Sesiones que persisten después de logout
- Tokens comprometidos que no pueden invalidarse

**Prompt para Gemini**:

```markdown
# PROMPT: Token Revocation Auditor

Audita el sistema de autenticación para detectar **ausencia de revocación de tokens**.

## Busca:

1. **Función de Logout SIN revocación**
   ```javascript
   // ❌ VULNERABLE: Solo elimina token del cliente
   export const logout = async (req, res) => {
     res.json({ message: 'Logout exitoso' });
     // Problema: Token sigue siendo válido en el servidor
   };
   ```

2. **Middleware de autenticación SIN verificar revocación**
   ```javascript
   // ❌ VULNERABLE
   export const verifyToken = async (req, res, next) => {
     const token = req.headers.authorization;
     const decoded = await admin.auth().verifyIdToken(token);
     // Problema: No verifica si el token fue revocado
     req.user = decoded;
     next();
   };
   ```

3. **Falta de blacklist de tokens**
   - No hay colección `revokedTokens` en Firestore
   - No se guarda `tokenId` al revocar

## Solución Recomendada:

### Opción 1: Revocar tokens con Firebase Admin

```javascript
// ✅ SEGURO: Revocar tokens del usuario
export const logout = async (req, res) => {
  try {
    const uid = req.user.uid;

    // Revocar TODOS los tokens del usuario
    await admin.auth().revokeRefreshTokens(uid);

    res.json({
      message: 'Logout exitoso',
      note: 'Todos tus tokens han sido revocados'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al revocar tokens' });
  }
};

// Middleware actualizado
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    // Verificar y validar token
    const decoded = await admin.auth().verifyIdToken(token, true);  // ✅ checkRevoked: true

    req.user = decoded;
    next();
  } catch (error) {
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        error: 'Token revocado',
        message: 'Por favor, inicia sesión de nuevo'
      });
    }
    res.status(401).json({ error: 'Token inválido' });
  }
};
```

### Opción 2: Blacklist de tokens en Firestore

```javascript
// Agregar a blacklist al hacer logout
export const logout = async (req, res) => {
  const tokenId = req.user.jti;  // JWT ID

  await db.collection('revokedTokens').doc(tokenId).set({
    revokedAt: admin.firestore.FieldValue.serverTimestamp(),
    userId: req.user.uid,
    expiresAt: new Date(req.user.exp * 1000)  // Expiry del token
  });

  res.json({ message: 'Logout exitoso' });
};

// Verificar blacklist en middleware
export const verifyToken = async (req, res, next) => {
  const decoded = await admin.auth().verifyIdToken(token);

  // Verificar si está revocado
  const revokedDoc = await db.collection('revokedTokens').doc(decoded.jti).get();

  if (revokedDoc.exists) {
    return res.status(401).json({ error: 'Token revocado' });
  }

  req.user = decoded;
  next();
};
```

## Genera reporte con:
- Funciones de logout sin revocación
- Middleware sin verificación de revocación
- Código de corrección completo
```

**Archivos a auditar**:
```bash
backend/src/middleware/auth.js
backend/src/routes/auth.js
backend/src/controllers/authController.js
```

---

## 📊 Plan de Auditoría Recomendado

### Semana 1: Vulnerabilidades Críticas

| Día | Tarea | Prompt | Tiempo |
|-----|-------|--------|--------|
| Lunes | Auditar race conditions | [prompt-race-condition-audit.md](prompt-race-condition-audit.md) | 1-2 horas |
| Martes | Implementar correcciones de race conditions | - | 2-3 horas |
| Miércoles | Auditar rate limiting | [prompt-rate-limiting-audit.md](prompt-rate-limiting-audit.md) | 1 hora |
| Jueves | Implementar rate limiting | - | 2-3 horas |
| Viernes | Auditar Firestore Rules | [prompt-firestore-rules-audit.md](prompt-firestore-rules-audit.md) | 1-2 horas |

### Semana 2: Mejoras de Seguridad

| Día | Tarea | Prompt | Tiempo |
|-----|-------|--------|--------|
| Lunes | Implementar Firestore Rules | - | 2-3 horas |
| Martes | Auditar security headers | Prompt #4 (arriba) | 30 min |
| Miércoles | Implementar Helmet.js | - | 1 hora |
| Jueves | Auditar dependencias | Prompt #5 (arriba) | 30 min |
| Viernes | Auditar token revocation | Prompt #6 (arriba) | 1 hora |

### Semana 3: Testing y Validación

| Día | Tarea | Tiempo |
|-----|-------|--------|
| Lunes | Testing de race conditions | 2 horas |
| Martes | Testing de rate limiting | 2 horas |
| Miércoles | Testing de Firestore Rules | 2 horas |
| Jueves | Pentesting manual | 3-4 horas |
| Viernes | Documentación y cierre | 2 horas |

---

## 🎯 Checklist de Seguridad Completa

### Autenticación y Autorización
- [x] Endpoints protegidos con autenticación
- [x] Validación de roles (RBAC)
- [x] Información sensible removida de errores
- [ ] Token revocation implementado
- [ ] Rate limiting en login/auth

### Validación de Entrada
- [x] Validación contra NoSQL injection
- [x] Sanitización anti-XSS
- [x] Validación de archivos (magic bytes, tamaño)
- [ ] Rate limiting en uploads

### Seguridad de Datos
- [x] Aislamiento por companyId en backend
- [ ] Firestore Security Rules configuradas
- [ ] Datos sensibles encriptados en reposo

### Lógica de Negocio
- [x] Race condition en cerrarRuta corregida
- [ ] Race conditions en otras funciones auditadas
- [ ] Transacciones atómicas en operaciones financieras

### Infraestructura
- [ ] Security headers (Helmet.js)
- [ ] CORS configurado correctamente
- [ ] Rate limiting general
- [ ] Dependencias actualizadas sin CVEs

### Monitoreo y Logging
- [ ] Audit logging de accesos denegados
- [ ] Alertas de intentos de brute force
- [ ] Logging de operaciones financieras críticas

---

## 📞 Soporte

Para preguntas sobre los prompts:
- Ver documentación completa: [README.md](README.md)
- Ver changelog: [CHANGELOG-SECURITY.md](CHANGELOG-SECURITY.md)
- Ver resumen final: [RESUMEN-FINAL-SEGURIDAD.md](RESUMEN-FINAL-SEGURIDAD.md)

---

**Última actualización**: 2025-12-24
**Mantenedor**: Equipo de Desarrollo

---

**🎉 ¡Buena suerte con las auditorías! Recuerda: la seguridad es un proceso continuo, no un destino.**

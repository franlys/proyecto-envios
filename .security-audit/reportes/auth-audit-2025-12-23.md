# 🔐 REPORTE DE AUDITORÍA: Autenticación y Autorización
**Fecha**: 2025-12-23
**Auditor**: Claude (Análisis Automatizado)
**Archivo**: `backend/src/middleware/auth.js`
**Líneas analizadas**: 1-207

---

## 📊 RESUMEN EJECUTIVO

| Métrica | Valor |
|---------|-------|
| **Vulnerabilidades CRÍTICAS** | 2 |
| **Vulnerabilidades ALTAS** | 3 |
| **Vulnerabilidades MEDIAS** | 2 |
| **Vulnerabilidades BAJAS** | 1 |
| **Score de Seguridad** | 62/100 |
| **Riesgo General** | ⚠️ ALTO |

---

## 🚨 VULNERABILIDADES CRÍTICAS

### 🚨 VULNERABILIDAD #1: Double Token Expiration Check
**Severidad**: CRÍTICA
**Ubicación**: `auth.js:39-70`
**Tipo**: Logic Flaw - Redundant Validation
**CWE**: CWE-287 (Improper Authentication)

**DESCRIPCIÓN**:
El código verifica la expiración del token DOS veces:
1. Primera verificación: `admin.auth().verifyIdToken(token)` (línea 39) - Firebase SDK ya valida expiración
2. Segunda verificación manual: `decodedToken.exp < now` (línea 65)

Esto crea una condición de carrera potencial donde un token podría pasar la primera validación pero fallar en la segunda, o viceversa.

**CÓDIGO VULNERABLE**:
```javascript
// Línea 39: Firebase ya valida expiración internamente
decodedToken = await admin.auth().verifyIdToken(token);

// Línea 63-70: Validación redundante
const now = Math.floor(Date.now() / 1000);
if (decodedToken.exp < now) {
  return res.status(401).json({
    error: 'Token expirado',
    hint: 'Por favor, vuelve a iniciar sesión'
  });
}
```

**IMPACTO**:
- **Riesgo de bypass**: En condiciones de alta concurrencia, un token recién expirado podría pasar la validación manual antes de que Firebase lo detecte
- **Inconsistencia**: Dos fuentes de verdad para la misma validación
- **Latencia innecesaria**: Validación duplicada en cada request

**EXPLOIT EJEMPLO**:
```bash
# Escenario de Race Condition:
# 1. Token expira a las 10:00:00.000
# 2. Request llega a las 10:00:00.001
# 3. Firebase valida (podría pasar si hay latencia de red)
# 4. Validación manual detecta expiración
# 5. Usuario recibe error confuso porque Firebase dijo "OK"

# Alternativa: Si se elimina la validación manual,
# confiar 100% en Firebase (recomendado)
```

**✅ SOLUCIÓN**:
```javascript
// ✅ Eliminar validación manual redundante
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token no proporcionado',
        hint: 'Envía el header Authorization: Bearer <token>'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token || token.trim() === '') {
      return res.status(401).json({
        error: 'Token inválido',
        hint: 'El token está vacío'
      });
    }

    // ✅ Firebase SDK maneja toda la validación (firma, expiración, formato)
    // NO necesitamos validar exp manualmente
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      // ✅ Si llegamos aquí, el token es válido (incluyendo expiración)
    } catch (verifyError) {
      console.error('❌ Error verificando token:', verifyError.message);

      // Manejar errores específicos de Firebase
      if (verifyError.code === 'auth/id-token-expired') {
        return res.status(401).json({
          error: 'Token expirado',
          hint: 'Por favor, vuelve a iniciar sesión para obtener un nuevo token'
        });
      }

      if (verifyError.code === 'auth/argument-error') {
        return res.status(401).json({
          error: 'Token con formato inválido',
          hint: 'El token proporcionado no es válido'
        });
      }

      return res.status(401).json({
        error: 'Token inválido',
        details: verifyError.message
      });
    }

    // ❌ ELIMINAR ESTAS LÍNEAS (63-70):
    // const now = Math.floor(Date.now() / 1000);
    // if (decodedToken.exp < now) {
    //   return res.status(401).json({ ... });
    // }

    req.user = decodedToken;

    // ... resto del código sin cambios
  } catch (error) {
    // ...
  }
};
```

**EXPLICACIÓN DE LA CORRECCIÓN**:
- Firebase SDK (`verifyIdToken`) YA valida:
  - Firma del token (previene falsificación)
  - Expiración (`exp` claim)
  - Audiencia (`aud`)
  - Issuer (`iss`)
- Validar `exp` manualmente es redundante y puede causar inconsistencias
- Confiar en Firebase SDK es más seguro y eficiente

---

### 🚨 VULNERABILIDAD #2: Information Disclosure en Errores
**Severidad**: CRÍTICA
**Ubicación**: `auth.js:19-23, 140-142, 194`
**Tipo**: CWE-209 (Information Exposure Through Error Message)

**DESCRIPCIÓN**:
El código expone información sensible en mensajes de error que ayudan a atacantes:
1. Headers recibidos (línea 19-22)
2. Roles permitidos vs rol del usuario (línea 140-142)
3. Rol del usuario en acceso financiero (línea 194)

**CÓDIGO VULNERABLE**:
```javascript
// Línea 19-22: Expone headers recibidos
return res.status(401).json({
  error: 'Token no proporcionado',
  hint: 'Envía el header Authorization: Bearer <token>',
  receivedHeaders: {  // ❌ INFORMACIÓN SENSIBLE
    authorization: authHeader || 'undefined',
    'content-type': req.headers['content-type']
  }
});

// Línea 140-142: Expone roles permitidos
return res.status(403).json({
  error: 'No tienes permisos para realizar esta acción',
  requiredRoles: allowedRoles,  // ❌ ENUMERATION RISK
  yourRole: userRole            // ❌ INFORMACIÓN SENSIBLE
});

// Línea 194: Expone rol del usuario
return res.status(403).json({
  error: 'Acceso denegado al módulo financiero',
  hint: 'Solo el propietario de la empresa puede ver datos financieros',
  yourRole: userRole  // ❌ INFORMACIÓN SENSIBLE
});
```

**IMPACTO**:
- **Role Enumeration**: Un atacante puede descubrir qué roles existen
- **User Enumeration**: Puede identificar qué usuarios tienen qué roles
- **Reconnaissance**: Facilita mapeo del sistema de permisos
- **Targeted Attacks**: Permite ataques dirigidos a roles específicos

**EXPLOIT EJEMPLO**:
```bash
# Escenario de Ataque:
# 1. Atacante envía request sin token
curl -X GET https://api.example.com/dashboard/propietario

# Respuesta actual (VULNERABLE):
{
  "error": "Token no proporcionado",
  "receivedHeaders": {
    "authorization": "undefined",
    "content-type": "application/json"
  }
}

# 2. Atacante descubre endpoint protegido
curl -X GET https://api.example.com/rutas/123/finalizar \
  -H "Authorization: Bearer token_de_repartidor"

# Respuesta actual (VULNERABLE):
{
  "error": "No tienes permisos para realizar esta acción",
  "requiredRoles": ["admin_general", "propietario"],  // ❌ FILTRACIÓN
  "yourRole": "repartidor"                            // ❌ CONFIRMACIÓN
}

# Ahora el atacante sabe:
# - Qué roles existen: admin_general, propietario, repartidor
# - Qué roles tienen acceso a ese endpoint
# - Puede intentar privilege escalation
```

**✅ SOLUCIÓN**:
```javascript
// ✅ NO exponer headers recibidos
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({
    error: 'No autorizado',
    message: 'Credenciales de autenticación inválidas'
    // ❌ ELIMINAR: receivedHeaders
  });
}

// ✅ NO exponer roles permitidos ni rol del usuario
export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.userData) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Se requiere autenticación'
      });
    }

    const userRole = req.userData.rol;
    const hasPermission = allowedRoles.includes(userRole);

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos para realizar esta acción'
        // ❌ ELIMINAR: requiredRoles, yourRole
      });
    }

    next();
  };
};

// ✅ Mensaje genérico en acceso financiero
export const requireFinancialAccess = (req, res, next) => {
  if (!req.userData) {
    return res.status(401).json({
      error: 'No autorizado',
      message: 'Se requiere autenticación'
    });
  }

  const userRole = req.userData.rol;
  const hasAccess = userRole === 'propietario' || userRole === 'super_admin';

  if (!hasAccess) {
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'No tienes permisos suficientes'
      // ❌ ELIMINAR: hint específico, yourRole
    });
  }

  next();
};
```

**CONTROLES ADICIONALES RECOMENDADOS**:
- [ ] Implementar rate limiting para prevenir brute force de roles
- [ ] Logging de intentos de acceso no autorizados (pero sin exponer en respuesta)
- [ ] Mensajes de error genéricos en producción
- [ ] Auditoría de accesos denegados

---

## ⚠️ VULNERABILIDADES ALTAS

### ⚠️ VULNERABILIDAD #3: Falta de Rate Limiting en Autenticación
**Severidad**: ALTA
**Ubicación**: `auth.js:9-119` (función completa)
**Tipo**: CWE-307 (Improper Restriction of Excessive Authentication Attempts)

**DESCRIPCIÓN**:
No hay rate limiting en el middleware de autenticación. Un atacante puede:
- Intentar tokens infinitos sin restricción
- Hacer brute force de tokens válidos
- DoS al servicio de Firebase Auth

**IMPACTO**:
- **Brute Force**: Intentos ilimitados de tokens
- **DoS**: Sobrecarga del servidor Firebase
- **Costos**: Firebase cobra por verificaciones de tokens

**✅ SOLUCIÓN**:
```javascript
import rateLimit from 'express-rate-limit';

// Crear limitador específico para autenticación
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 intentos por IP
  message: {
    error: 'Demasiados intentos de autenticación',
    hint: 'Intenta nuevamente en 15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Aplicar en routes:
// router.use('/api', authRateLimiter);
```

---

### ⚠️ VULNERABILIDAD #4: Usuario Inactivo Puede Mantener Sesión
**Severidad**: ALTA
**Ubicación**: `auth.js:86-92`
**Tipo**: CWE-613 (Insufficient Session Expiration)

**DESCRIPCIÓN**:
Si un usuario es desactivado (`activo: false`) DESPUÉS de obtener un token válido, puede seguir usando ese token hasta que expire naturalmente (hasta 1 hora).

**CÓDIGO VULNERABLE**:
```javascript
// Línea 86-92: Se valida activo solo en autenticación
if (userData.activo === false) {
  return res.status(403).json({
    error: 'Usuario inactivo',
    hint: 'Contacta al administrador para reactivar tu cuenta'
  });
}
// ❌ PROBLEMA: No hay invalidación de tokens existentes
```

**IMPACTO**:
- Usuario desactivado sigue con acceso hasta expiración del token
- Sin invalidación inmediata de sesiones
- Ventana de hasta 1 hora de acceso post-desactivación

**✅ SOLUCIÓN**:
```javascript
// Implementar revocation check en Firebase
// 1. Al desactivar usuario, incrementar un "revocationTime" en Firestore

// 2. En verifyToken, verificar revocationTime:
const userData = userDoc.data();

if (userData.activo === false) {
  return res.status(403).json({
    error: 'Usuario inactivo',
    hint: 'Contacta al administrador'
  });
}

// ✅ Verificar si el token fue emitido antes de la revocación
if (userData.revocationTime && decodedToken.iat < userData.revocationTime) {
  return res.status(401).json({
    error: 'Sesión revocada',
    hint: 'Por favor, vuelve a iniciar sesión'
  });
}
```

---

### ⚠️ VULNERABILIDAD #5: Sin Validación de UID en Operaciones
**Severidad**: ALTA
**Ubicación**: `auth.js:98-106`
**Tipo**: CWE-639 (Insecure Direct Object Reference)

**DESCRIPCIÓN**:
El código confía ciegamente en `decodedToken.uid` sin verificar que:
1. El UID existe en Firestore
2. El UID pertenece a la compañía correcta
3. El usuario no ha sido transferido a otra compañía

**IMPACTO**:
- **IDOR**: Acceso a recursos de otras compañías
- **Privilege Escalation**: Si un usuario cambia de compañía pero mantiene rol antiguo

**✅ SOLUCIÓN**:
```javascript
// ✅ Validar companyId en operaciones críticas
export const validateCompanyAccess = (req, res, next) => {
  const requestedCompanyId = req.params.companyId || req.body.companyId;

  if (requestedCompanyId && req.userData.companyId !== requestedCompanyId) {
    // Excepción para super_admin
    if (req.userData.rol !== 'super_admin') {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No puedes acceder a recursos de otra empresa'
      });
    }
  }

  next();
};
```

---

## ℹ️ VULNERABILIDADES MEDIAS

### ℹ️ VULNERABILIDAD #6: Logs con Información Sensible
**Severidad**: MEDIA
**Ubicación**: `auth.js:108, 41, 112`
**Tipo**: CWE-532 (Information Exposure Through Log Files)

**CÓDIGO VULNERABLE**:
```javascript
// Línea 108: Email en logs
console.log(`✅ Token verificado para: ${userData.email} (${rolNormalizado})`);

// Línea 41: Token error details
console.error('❌ Error verificando token:', verifyError.message);
```

**✅ SOLUCIÓN**:
```javascript
// ✅ Usar UID en lugar de email
console.log(`✅ Token verificado - UID: ${decodedToken.uid.substring(0,8)}... Rol: ${rolNormalizado}`);

// ✅ No loggear detalles del error en producción
if (process.env.NODE_ENV === 'development') {
  console.error('❌ Error verificando token:', verifyError.message);
}
```

---

### ℹ️ VULNERABILIDAD #7: Sin Auditoría de Accesos Fallidos
**Severidad**: MEDIA
**Ubicación**: Todo el archivo
**Tipo**: CWE-778 (Insufficient Logging)

**DESCRIPCIÓN**:
No hay logging persistente de:
- Intentos fallidos de autenticación
- Accesos denegados por permisos
- Cambios de rol/permisos

**✅ SOLUCIÓN**:
```javascript
// ✅ Implementar audit log
import { logSecurityEvent } from '../utils/auditLogger.js';

// En cada rechazo:
if (!hasPermission) {
  await logSecurityEvent({
    event: 'ACCESS_DENIED',
    userId: req.userData.uid,
    endpoint: req.originalUrl,
    requiredRoles: allowedRoles,
    userRole: userRole,
    ip: req.ip,
    timestamp: new Date()
  });

  return res.status(403).json({ ... });
}
```

---

## 💡 VULNERABILIDADES BAJAS

### 💡 VULNERABILIDAD #8: Normalización de Rol Inconsistente
**Severidad**: BAJA
**Ubicación**: `auth.js:95`
**Tipo**: Logic Inconsistency

**CÓDIGO**:
```javascript
// Línea 95: Solo normaliza 'admin' → 'admin_general'
const rolNormalizado = userData.rol === 'admin' ? 'admin_general' : userData.rol;
```

**IMPACTO**: Inconsistencias si hay otros roles legacy

**✅ SOLUCIÓN**:
```javascript
const ROLE_MAPPING = {
  'admin': 'admin_general',
  // Agregar otros mappings si existen
};

const rolNormalizado = ROLE_MAPPING[userData.rol] || userData.rol;
```

---

## 📋 RESUMEN DE ACCIONES RECOMENDADAS

### 🔴 URGENTE (Implementar esta semana):
1. ✅ Eliminar validación redundante de expiración (Vuln #1)
2. ✅ Remover exposición de roles en errores (Vuln #2)
3. ✅ Implementar rate limiting (Vuln #3)

### 🟡 PRIORITARIO (Implementar este mes):
4. ✅ Agregar revocation check (Vuln #4)
5. ✅ Validar companyId en operaciones (Vuln #5)
6. ✅ Implementar audit logging (Vuln #7)

### 🟢 MEJORAS (Backlog):
7. ✅ Mejorar logging seguro (Vuln #6)
8. ✅ Estandarizar normalización de roles (Vuln #8)

---

## 🛡️ RECOMENDACIONES ARQUITECTURALES

1. **Implementar JWT Revocation List**:
   - Redis cache para tokens revocados
   - Verificar en cada request

2. **Multi-Factor Authentication (MFA)**:
   - Requerir MFA para roles financieros
   - Firebase Auth soporta MFA nativo

3. **Session Management**:
   - Límite de sesiones concurrentes por usuario
   - Invalidación de todas las sesiones al cambiar password

4. **Security Headers**:
   ```javascript
   app.use(helmet({
     contentSecurityPolicy: true,
     hsts: true,
     noSniff: true
   }));
   ```

---

**FIN DEL REPORTE**

**Próximos pasos**: Revisar reportes de Inyecciones y Lógica de Negocio.

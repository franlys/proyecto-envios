# 🛑 AUDITORÍA: Rate Limiting & DoS Protection

**Fecha**: 2025-12-24
**Auditor**: Gemini Pro
**Archivos Auditados**:
- `backend/src/routes/contenedores.js`
- `backend/src/routes/users.js`

---

## 📊 Resumen Ejecutivo

- **Endpoints auditados**: 8
- **Protección Rate Limit**: 0% (Ningún endpoint protegido)
- **Severidad Predominante**: 🔴 **ALTA**
- **Estado Global**: ❌ VULNERABLE

---

## 🚨 Vulnerabilidades Detectadas

### Vulnerabilidad #1: Falta de Rate Limiting Global
**Severidad**: 🔴 **ALTA**
**Ubicación**: Todas las rutas (`router.get`, `router.post`)
**CWE**: CWE-799 (Improper Control of Interaction Frequency)

**Problema**:
No existe middleware de limitación de tasa (como `express-rate-limit`) aplicado a las rutas. Esto permite que un atacante automatizado envíe miles de peticiones por segundo.

**Riesgos Específicos**:
1.  **Brute Force en Login/Upload**: Aunque `contenedores/upload-from-drive` requiere auth, un usuario malicioso autenticado podría saturar el servidor subiendo archivos Excel masivos en bucle, causando **Denial of Service (DoS)** por agotamiento de memoria o CPU (procesamiento de Excel).
2.  **Scraping de Datos**: En `/api/users/`, un usuario podría escrapear todos los usuarios de la base de datos repetidamente, elevando los costos de lectura de Firestore.
3.  **Abuso de Token**: Si un token es robado, el atacante puede exfiltrar toda la información posible antes de que expire, sin freno de velocidad.

---

## 🛠️ Solución Recomendada: Implementar `express-rate-limit`

Se recomienda instalar el paquete:
`npm install express-rate-limit`

Y crear un middleware global o específico por ruta.

### Código de Ejemplo (Para `backend/src/middleware/rateLimiter.js`):

```javascript
import rateLimit from 'express-rate-limit';

// 1. Limiter General (para la mayoría de rutas)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 peticiones por IP
  message: { error: 'Demasiadas peticiones, intenta más tarde.' }
});

// 2. Limiter Estricto (para Logins o Uploads pesados)
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // Máximo 10 intentos
  message: { error: 'Límite de intentos excedido.' }
});
```

### Aplicación en Rutas:

En `backend/src/routes/contenedores.js`:
```javascript
import { strictLimiter } from '../middleware/rateLimiter.js';

// Aplicar al upload que consume mucha CPU
router.post('/upload-from-drive', verifyToken, strictLimiter, async (req, res) => { ... });
```

En `app.js` (Global):
```javascript
import { apiLimiter } from './middleware/rateLimiter.js';
app.use('/api/', apiLimiter);
```

---
*Reporte generado por Gemini Pro Security Auditor*

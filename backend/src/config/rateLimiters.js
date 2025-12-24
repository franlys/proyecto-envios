import rateLimit from 'express-rate-limit';

/**
 * Configuraciones de Rate Limiting para el proyecto
 *
 * Implementado según recomendaciones de Gemini Pro (2025-12-24)
 * Previene: DoS, brute force, abuso de recursos
 */

// ========================================
// RATE LIMITER GENERAL (API Completa)
// ========================================

/**
 * Limiter general para toda la API
 * 300 requests / 15 minutos (suficiente para uso normal)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 300,  // 300 requests
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Has excedido el límite de solicitudes. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,   // Retorna headers RateLimit-* (RFC 7231)
  legacyHeaders: false,    // Desactiva X-RateLimit-* (deprecado)
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

// ========================================
// RATE LIMITER ESTRICTO (Endpoints Pesados)
// ========================================

/**
 * Limiter para endpoints que consumen muchos recursos
 * Uso: Uploads, exports, búsquedas complejas
 * 20 requests / 1 hora
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hora
  max: 20,  // 20 requests por hora
  message: {
    error: 'Demasiadas operaciones pesadas',
    message: 'Has excedido el límite de operaciones por hora. Intenta más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// ========================================
// RATE LIMITER PARA LOGIN (Anti-Brute Force)
// ========================================

/**
 * Limiter para prevenir ataques de fuerza bruta en login
 * 5 intentos / 15 minutos
 *
 * IMPORTANTE: skipSuccessfulRequests = true
 * Los logins exitosos NO cuentan para el límite
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 5,  // Solo 5 intentos fallidos
  skipSuccessfulRequests: true,  // ✅ NO cuenta logins exitosos
  message: {
    error: 'Demasiados intentos de login',
    message: 'Has excedido el límite de intentos. Por favor intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ========================================
// RATE LIMITER PARA UPLOADS
// ========================================

/**
 * Limiter específico para uploads de archivos
 * 20 uploads / 1 hora
 *
 * Más restrictivo que strictLimiter para prevenir
 * DoS mediante uploads masivos
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hora
  max: 20,  // 20 uploads por hora
  message: {
    error: 'Demasiados uploads',
    message: 'Has excedido el límite de uploads por hora. El límite se reiniciará en 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// ========================================
// RATE LIMITER PARA EMAILS/NOTIFICACIONES
// ========================================

/**
 * Limiter para endpoints que envían emails/SMS
 * 10 requests / 1 hora
 *
 * Previene abuso de servicios externos (costos)
 */
export const notificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hora
  max: 10,  // 10 notificaciones por hora
  message: {
    error: 'Demasiadas notificaciones',
    message: 'Has excedido el límite de envío de notificaciones por hora.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ========================================
// RATE LIMITER PARA REGISTRO
// ========================================

/**
 * Limiter para prevenir spam de registros de usuarios
 * 3 registros / 1 hora por IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hora
  max: 3,  // Solo 3 registros por hora
  message: {
    error: 'Demasiados registros',
    message: 'Has excedido el límite de registros por hora. Intenta más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// ========================================
// EXPORTAR TODAS LAS CONFIGURACIONES
// ========================================

export default {
  apiLimiter,
  strictLimiter,
  loginLimiter,
  uploadLimiter,
  notificationLimiter,
  registerLimiter
};

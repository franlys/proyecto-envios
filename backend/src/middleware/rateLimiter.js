import rateLimit from 'express-rate-limit';

// ==========================================
// 🛡️ RATE LIMITERS (Protección Anti-DoS)
// ==========================================

// 1. Limiter Genérico (Para la mayoría de rutas API)
// Permite 300 peticiones cada 15 minutos por IP (aprox 1 cada 3 segundos sostenido)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.',
        error: 'TOO_MANY_REQUESTS'
    }
});

// 2. Limiter Estricto (Para Logins, Registros, Uploads pesados)
// Permite solo 20 intentos por hora para evitar fuerza bruta o saturación de recursos
export const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Límite de intentos excedido, por favor espere una hora.',
        error: 'RATE_LIMIT_EXCEEDED'
    }
});

// 3. Limiter para Operaciones Críticas (Cambios de estado masivos, reportes)
export const criticalOpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 50,
    message: {
        success: false,
        message: 'Demasiadas operaciones críticas, espere unos minutos.',
        error: 'TOO_MANY_CRITICAL_OPS'
    }
});

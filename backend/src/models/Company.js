// backend/models/Company.js

/**
 * FEATURES POR PLAN
 *
 * ✅ = Feature IMPLEMENTADA y funcional
 * 🚧 = Feature PARCIALMENTE implementada
 * ❌ = Feature NO implementada (roadmap)
 */
const PLAN_FEATURES = {
  operativo: {
    // ============================================
    // LÍMITES DE USUARIOS
    // ============================================
    maxAdmins: 1,
    maxRepartidores: 5,
    maxSecretarias: 2,
    maxCargadores: 3,

    // ============================================
    // LÍMITES OPERACIONALES
    // ============================================
    maxEmbarquesActivos: 2,
    maxFacturasPorEmbarque: 100,
    maxRutasSimultaneas: 5,
    historialDias: 30,

    // ============================================
    // 📊 GESTIÓN BÁSICA (✅ Implementado)
    // ============================================
    importarCSV: true,           // ✅ Importación CSV funcional
    importarExcel: false,        // ❌ Solo en planes superiores
    exportarReportes: true,      // ✅ Exportación de reportes
    dashboardBasico: true,       // ✅ Dashboard con estadísticas
    trackingPublico: true,       // ✅ Tracking sin login

    // ============================================
    // 📱 APP MÓVIL (🚧 Básico con Capacitor)
    // ============================================
    appMovilBasica: true,        // ✅ WebView Capacitor funcional
    escaneoConCamara: false,     // ❌ Solo en planes superiores
    modoOffline: false,          // ❌ Sin almacenamiento offline avanzado
    fotoComprobante: false,      // ❌ Solo en planes superiores
    firmaDigital: false,         // ❌ No implementado

    // ============================================
    // 🔔 NOTIFICACIONES (✅ Multicanal)
    // ============================================
    notificacionesWeb: true,     // ✅ Notificaciones en dashboard
    emailBasico: true,           // ✅ Resend configurado
    emailAutomatizado: false,    // ❌ Solo en planes superiores
    whatsappBusiness: false,     // ❌ Evolution API disponible pero no en plan básico
    smsCliente: false,           // ❌ No implementado

    // ============================================
    // 🖨️ IMPRESIÓN Y HARDWARE (✅ Completo)
    // ============================================
    impresionEtiquetas: false,   // ❌ Solo en planes superiores
    impresorasBluetooth: false,  // ❌ Solo en planes superiores
    escanerCodigoBarras: false,  // ❌ Solo en planes superiores

    // ============================================
    // 🗺️ GPS Y TRACKING (🚧 Parcial)
    // ============================================
    trackingBasico: true,        // ✅ Tracking público + estados
    gpsEnTiempoReal: false,      // ❌ No implementado
    historialRutas: false,       // ❌ No implementado

    // ============================================
    // 🔌 API Y WEBHOOKS (✅ Funcional)
    // ============================================
    apiPublica: false,           // ❌ API existe pero no expuesta públicamente
    webhooks: false,             // ❌ Solo para WhatsApp interno

    // ============================================
    // 🔒 SEGURIDAD
    // ============================================
    autenticacion2FA: false,     // ❌ No implementado
    logsAuditoria: false,        // ❌ No implementado
    backupAutomatico: 'manual',  // Manual por defecto

    // ============================================
    // 🆘 SOPORTE
    // ============================================
    soporte: 'email',            // Email básico
  },

  automatizado: {
    // ============================================
    // LÍMITES DE USUARIOS
    // ============================================
    maxAdmins: 3,
    maxRepartidores: 20,
    maxSecretarias: 5,
    maxCargadores: 10,

    // ============================================
    // LÍMITES OPERACIONALES
    // ============================================
    maxEmbarquesActivos: 10,
    maxFacturasPorEmbarque: 1000,
    maxRutasSimultaneas: 20,
    historialDias: 365,

    // ============================================
    // 📊 GESTIÓN AVANZADA
    // ============================================
    importarCSV: true,
    importarExcel: true,         // ✅ Excel y CSV
    exportarReportes: true,
    dashboardAvanzado: true,     // ✅ Gráficas y analytics
    trackingPublico: true,

    // ============================================
    // 📱 APP MÓVIL
    // ============================================
    appMovilBasica: true,
    escaneoConCamara: true,      // ✅ html5-qrcode + cámara
    modoOffline: false,          // ❌ Capacitor básico sin storage avanzado
    fotoComprobante: true,       // 🚧 Capacitor permite cámara
    firmaDigital: false,         // ❌ No implementado

    // ============================================
    // 🔔 NOTIFICACIONES
    // ============================================
    notificacionesWeb: true,
    emailBasico: true,
    emailAutomatizado: true,     // ✅ Resend + node-cron
    whatsappBusiness: true,      // ✅ Evolution API funcional
    smsCliente: false,           // ❌ No implementado

    // ============================================
    // 🖨️ HARDWARE
    // ============================================
    impresionEtiquetas: true,    // ✅ LabelPrinter.jsx funcional
    impresorasBluetooth: true,   // ✅ bluetoothPrinter.js completo
    escanerCodigoBarras: true,   // ✅ BarcodeScanner + hardware support

    // ============================================
    // 🗺️ GPS Y TRACKING
    // ============================================
    trackingBasico: true,
    gpsEnTiempoReal: false,      // ❌ No implementado
    historialRutas: false,       // ❌ gpsUtils tiene stubs vacíos

    // ============================================
    // 🔌 API Y WEBHOOKS
    // ============================================
    apiPublica: true,            // ✅ API REST completa (169+ endpoints)
    webhooks: true,              // ✅ Evolution webhook funcional

    // ============================================
    // 🔒 SEGURIDAD
    // ============================================
    autenticacion2FA: false,     // ❌ No implementado
    logsAuditoria: true,         // 🚧 Logs básicos en controllers
    backupAutomatico: 'diario',

    // ============================================
    // 🆘 SOPORTE
    // ============================================
    soporte: 'chat',
  },

  smart: {
    // ============================================
    // LÍMITES ILIMITADOS
    // ============================================
    maxAdmins: -1,
    maxRepartidores: -1,
    maxSecretarias: -1,
    maxCargadores: -1,
    maxEmbarquesActivos: -1,
    maxFacturasPorEmbarque: -1,
    maxRutasSimultaneas: -1,
    historialDias: -1,

    // ============================================
    // 📊 GESTIÓN PREMIUM
    // ============================================
    importarCSV: true,
    importarExcel: true,
    exportarReportes: true,
    dashboardAvanzado: true,
    trackingPublico: true,
    reportesPersonalizados: false,  // ❌ No implementado (roadmap)

    // ============================================
    // 📱 APP MÓVIL COMPLETA
    // ============================================
    appMovilBasica: true,
    escaneoConCamara: true,
    modoOffline: false,             // ❌ Requiere IndexedDB avanzado
    fotoComprobante: true,
    firmaDigital: false,            // ❌ No implementado

    // ============================================
    // 🔔 NOTIFICACIONES MULTICANAL
    // ============================================
    notificacionesWeb: true,
    emailBasico: true,
    emailAutomatizado: true,
    whatsappBusiness: true,
    smsCliente: false,              // ❌ No implementado

    // ============================================
    // 🖨️ HARDWARE PREMIUM
    // ============================================
    impresionEtiquetas: true,
    impresorasBluetooth: true,
    escanerCodigoBarras: true,

    // ============================================
    // 🗺️ GPS Y TRACKING AVANZADO
    // ============================================
    trackingBasico: true,
    gpsEnTiempoReal: false,         // ❌ No implementado (roadmap)
    historialRutas: false,          // ❌ No implementado
    geofencing: false,              // ❌ No implementado

    // ============================================
    // 🤖 INTELIGENCIA ARTIFICIAL (Roadmap)
    // ============================================
    optimizacionRutasIA: false,     // ❌ gpsUtils.optimizarRuta() está vacío
    prediccionTiempos: false,       // ❌ No implementado
    chatbotIA: false,               // ❌ No hay Gemini/n8n integrado

    // ============================================
    // 🔌 API Y WEBHOOKS
    // ============================================
    apiPublica: true,
    webhooks: true,
    integraciones: true,            // ✅ Posibilidad de integraciones custom

    // ============================================
    // 👥 MULTI-COMPAÑÍA
    // ============================================
    multiCompania: true,            // ✅ Sistema soporta múltiples empresas
    rolesPersonalizados: false,     // ❌ Roles son fijos (roadmap)

    // ============================================
    // 🔒 SEGURIDAD AVANZADA
    // ============================================
    autenticacion2FA: false,        // ❌ No implementado
    logsAuditoria: true,
    backupAutomatico: 'diario',     // Firebase auto-backup
    encriptacionE2E: false,         // ❌ No implementado

    // ============================================
    // 🆘 SOPORTE DEDICADO
    // ============================================
    soporte: 'dedicado',
  }
};

/**
 * Obtener features según el plan
 */
const getPlanFeatures = (plan) => {
  return PLAN_FEATURES[plan] || PLAN_FEATURES.basic;
};

/**
 * Verificar si una compañía tiene una feature
 * Ahora soporta overrides personalizados (customFeatures)
 *
 * PRIORIDAD:
 * 1. customFeatures (overrides del super admin)
 * 2. Features del plan base
 *
 * Ejemplo:
 * - Plan "operativo" no tiene whatsappBusiness
 * - Pero super admin puede habilitarlo con customFeatures.whatsappBusiness = true
 */
const hasFeature = (company, featureName) => {
  // 1. Primero verificar si hay override personalizado
  if (company.customFeatures && featureName in company.customFeatures) {
    const customValue = company.customFeatures[featureName];
    return customValue === true || customValue === -1;
  }

  // 2. Si no hay override, usar el valor del plan
  const features = getPlanFeatures(company.plan);
  return features[featureName] === true || features[featureName] === -1;
};

/**
 * Verificar si se alcanzó un límite
 */
const checkLimit = (company, limitName, currentCount) => {
  const features = getPlanFeatures(company.plan);
  const limit = features[limitName];
  
  // -1 significa ilimitado
  if (limit === -1) return { allowed: true, limit: -1, current: currentCount };
  
  return {
    allowed: currentCount < limit,
    limit: limit,
    current: currentCount,
    remaining: Math.max(0, limit - currentCount)
  };
};

export {
  PLAN_FEATURES,
  getPlanFeatures,
  hasFeature,
  checkLimit
};
// backend/models/Company.js

/**
 * FEATURES POR PLAN
 */
const PLAN_FEATURES = {
  operativo: {
    // Límites de usuarios
    maxAdmins: 1,
    maxRepartidores: 5,
    maxSecretarias: 2,
    
    // Límites operacionales
    maxEmbarquesActivos: 2,
    maxFacturasPorEmbarque: 100,
    maxRutasSimultaneas: 5,
    
    // Historial
    historialDias: 30,
    
    // Features
    importarCSV: true,
    importarExcel: false,
    exportarReportes: true,
    dashboardBasico: true,
    
    // Móvil
    appMovilBasica: true,
    gpsMovil: false,
    modoOffline: false,
    fotoComprobante: false,
    firmaDigital: false,
    
    // Notificaciones
    notificacionesWeb: true,
    notificacionesPush: false,
    smsCliente: false,
    whatsappBusiness: false,
    emailAutomatizado: false,
    
    // GPS & IoT
    gpsTracking: false,
    gpsVehicular: false,
    sensoresIoT: false,
    geofencing: false,
    
    // Cámaras
    camarasIP: false,
    streamingLive: false,
    grabacionNube: false,
    
    // IA
    optimizacionRutas: false,
    prediccionTiempos: false,
    chatbot: false,
    
    // API
    apiAccess: false,
    webhooks: false,
    
    // Soporte
    soporte: 'email', // 'email', 'chat', 'telefono', 'dedicado'
    
    // Seguridad
    autenticacion2FA: false,
    logsAuditoria: false,
    backupAutomatico: 'semanal', // 'semanal', 'diario', 'horario'
  },

  automatizado: {
    maxAdmins: 3,
    maxRepartidores: 20,
    maxSecretarias: 5,
    
    maxEmbarquesActivos: 10,
    maxFacturasPorEmbarque: 1000,
    maxRutasSimultaneas: 20,
    
    historialDias: 365,
    
    importarCSV: true,
    importarExcel: true,
    exportarReportes: true,
    dashboardAvanzado: true,
    graficasAnalytics: true,
    
    appMovilCompleta: true,
    gpsMovil: true,
    modoOffline: true,
    fotoComprobante: true,
    firmaDigital: true,
    navegacionIntegrada: true,
    
    notificacionesWeb: true,
    notificacionesPush: true,
    smsCliente: true,
    whatsappBusiness: false,
    emailAutomatizado: true,
    
    gpsTracking: true,
    gpsVehicular: false,
    sensoresIoT: false,
    geofencing: false,
    historialUbicaciones: 7, // días
    
    camarasIP: false,
    streamingLive: false,
    grabacionNube: false,
    
    optimizacionRutas: true,
    asignacionAutomatica: true,
    prediccionTiempos: false,
    chatbot: false,
    
    apiAccess: false,
    webhooks: false,
    
    soporte: 'chat',
    
    autenticacion2FA: true,
    logsAuditoria: true,
    backupAutomatico: 'diario',
  },

  smart: {
    maxAdmins: -1, // Ilimitado
    maxRepartidores: -1,
    maxSecretarias: -1,
    
    maxEmbarquesActivos: -1,
    maxFacturasPorEmbarque: -1,
    maxRutasSimultaneas: -1,
    
    historialDias: -1, // Ilimitado
    
    importarCSV: true,
    importarExcel: true,
    exportarReportes: true,
    dashboardAvanzado: true,
    graficasAnalytics: true,
    reportesPersonalizados: true,
    businessIntelligence: true,
    
    appMovilCompleta: true,
    gpsMovil: true,
    modoOffline: true,
    fotoComprobante: true,
    firmaDigital: true,
    navegacionIntegrada: true,
    chatDispatcher: true,
    llamadasVoIP: true,
    
    notificacionesWeb: true,
    notificacionesPush: true,
    smsCliente: true,
    whatsappBusiness: true,
    emailAutomatizado: true,
    
    gpsTracking: true,
    gpsVehicular: true,
    sensoresIoT: true,
    sensorTemperatura: true,
    sensorPuertas: true,
    sensorVelocidad: true,
    geofencing: true,
    alertasDesvio: true,
    historialUbicaciones: -1,
    
    camarasIP: true,
    camarasVehiculares: true,
    streamingLive: true,
    grabacionNube: true,
    diasGrabacion: 30,
    deteccionEventos: true,
    reconocimientoFacial: true,
    
    optimizacionRutasIA: true,
    asignacionAutomaticaIA: true,
    prediccionTiempos: true,
    analisisComportamiento: true,
    deteccionFraudes: true,
    chatbot: true,
    
    apiAccess: true,
    webhooks: true,
    integraciones: true,
    
    multiCompania: true, // Franquicias
    rolesPersonalizados: true,
    
    soporte: 'dedicado',
    
    autenticacion2FA: true,
    logsAuditoria: true,
    backupAutomatico: 'horario',
    recuperacionDesastres: true,
    encriptacionE2E: true,
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

module.exports = {
  PLAN_FEATURES,
  getPlanFeatures,
  hasFeature,
  checkLimit
};
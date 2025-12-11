/**
 * 🎯 CONFIGURACIÓN DE PLANES SAAS
 *
 * Definición de los 3 planes disponibles:
 * - Plan Operativo (RD$ 50k): Control Total de la Operación
 * - Plan Automatizado (RD$ 75k): Ahorro de Personal y Tiempo
 * - Plan Smart Logistics (RD$ 120k+): Innovación y Cero Errores
 */

export const PLANES_SAAS = {
  operativo: {
    id: 'operativo',
    nombre: 'Plan Operativo',
    descripcion: 'Control Total de la Operación',
    precio: 50000, // RD$ (equivalente a ~$850 USD)
    precioUSD: 850,
    moneda: 'RD$',
    periodo: 'mensual',
    popular: false,

    // Límites del plan
    limites: {
      camiones: 10,
      usuarios: -1, // Ilimitado
      recolecciones: -1, // Ilimitado
      almacenamiento: 'Ilimitado',
      facturas: -1 // Ilimitado
    },

    // Características incluidas
    caracteristicas: [
      { nombre: 'Camiones / Choferes', valor: 'Hasta 10', incluido: true },
      { nombre: 'Usuarios Admin', valor: 'Ilimitados', incluido: true },
      { nombre: 'App Móvil Choferes', valor: 'Estándar (Android)', incluido: true },
      { nombre: 'Dashboard Financiero', valor: 'Ingresos/Gastos', incluido: true },
      { nombre: 'Rastreo GPS', valor: 'Tiempo Real', incluido: true },
      { nombre: 'Atención al Cliente', valor: 'Manual (Teléfono/Email)', incluido: true },
      { nombre: 'Cobros', valor: 'Manual', incluido: true },
      { nombre: 'Optimización Rutas', valor: 'Manual', incluido: true },
      { nombre: 'Carga de Contenedor', valor: 'Manual (Pistola)', incluido: true },
      { nombre: 'Soporte Técnico', valor: 'Email (24h)', incluido: true },
      { nombre: 'Automatización n8n', valor: 'No incluido', incluido: false },
      { nombre: 'WhatsApp Bot', valor: 'No incluido', incluido: false },
      { nombre: 'IA Predictiva', valor: 'No incluido', incluido: false },
      { nombre: 'RFID/Sensores', valor: 'No incluido', incluido: false }
    ],

    // Color del plan (para UI)
    color: '#6366f1', // Indigo
    colorSecundario: '#818cf8'
  },

  automatizado: {
    id: 'automatizado',
    nombre: 'Plan Automatizado',
    descripcion: 'Ahorro de Personal y Tiempo',
    precio: 75000, // RD$ (equivalente a ~$1,280 USD)
    precioUSD: 1280,
    moneda: 'RD$',
    periodo: 'mensual',
    popular: true, // ⭐ Plan recomendado

    // Límites del plan
    limites: {
      camiones: 25,
      usuarios: -1, // Ilimitado
      recolecciones: -1, // Ilimitado
      almacenamiento: 'Ilimitado',
      facturas: -1 // Ilimitado
    },

    // Características incluidas
    caracteristicas: [
      { nombre: 'Camiones / Choferes', valor: 'Hasta 25', incluido: true },
      { nombre: 'Usuarios Admin', valor: 'Ilimitados', incluido: true },
      { nombre: 'App Móvil Choferes', valor: 'Estándar (Android)', incluido: true },
      { nombre: 'Dashboard Financiero', valor: 'Proyecciones + Alertas', incluido: true },
      { nombre: 'Rastreo GPS', valor: 'Tiempo Real', incluido: true },
      { nombre: 'Atención al Cliente', valor: 'Bots WhatsApp (n8n)', incluido: true },
      { nombre: 'Cobros', valor: 'Recordatorios Automáticos', incluido: true },
      { nombre: 'Optimización Rutas', valor: 'Algoritmo de Rutas', incluido: true },
      { nombre: 'Carga de Contenedor', valor: 'Manual (Pistola)', incluido: true },
      { nombre: 'Soporte Técnico', valor: 'WhatsApp (Horario Oficina)', incluido: true },
      { nombre: 'Automatización n8n', valor: '✅ Incluido', incluido: true, destacado: true },
      { nombre: 'WhatsApp Bot "Cero Preguntas"', valor: '✅ Incluido', incluido: true, destacado: true },
      { nombre: 'Cobranza Automática Implacable', valor: '✅ Incluido', incluido: true, destacado: true },
      { nombre: 'Facturación y Notificaciones Proactivas', valor: '✅ Incluido', incluido: true, destacado: true },
      { nombre: 'IA Predictiva', valor: 'No incluido', incluido: false },
      { nombre: 'RFID/Sensores', valor: 'No incluido', incluido: false }
    ],

    // Beneficios de automatización con n8n
    automatizaciones: [
      {
        nombre: 'WhatsApp Bot "Cero Preguntas"',
        descripcion: 'Responde automáticamente preguntas comunes como estado del paquete, ubicación, factura o pagos.',
        ahorro: 'Reduce 4 horas diarias de trabajo humano.'
      },
      {
        nombre: 'Cobranza Automática Implacable',
        descripcion: 'Detecta facturas vencidas y envía recordatorios automáticos por WhatsApp.',
        ahorro: 'Reduce la morosidad y acelera el flujo de caja.'
      },
      {
        nombre: 'Facturación y Notificaciones Proactivas',
        descripcion: 'Cuando el chofer marca una entrega, el sistema envía automáticamente el PDF de la factura al cliente y guarda una copia en Google Drive de Contabilidad.',
        ahorro: 'Elimina 100% del trabajo manual de envío de facturas.'
      }
    ],

    // Color del plan (para UI)
    color: '#10b981', // Emerald
    colorSecundario: '#34d399'
  },

  smart: {
    id: 'smart',
    nombre: 'Plan Smart Logistics',
    descripcion: 'Innovación y Cero Errores',
    precio: 120000, // RD$ base (equivalente a ~$2,050 USD)
    precioUSD: 2050,
    moneda: 'RD$',
    periodo: 'mensual',
    popular: false,
    personalizable: true, // Precio varía según necesidades

    // Límites del plan
    limites: {
      camiones: -1, // Ilimitado
      usuarios: -1, // Ilimitado
      recolecciones: -1, // Ilimitado
      almacenamiento: 'Ilimitado',
      facturas: -1 // Ilimitado
    },

    // Características incluidas
    caracteristicas: [
      { nombre: 'Camiones / Choferes', valor: 'Ilimitados', incluido: true },
      { nombre: 'Usuarios Admin', valor: 'Ilimitados', incluido: true },
      { nombre: 'App Móvil Choferes', valor: 'White Label (App Propia)', incluido: true, destacado: true },
      { nombre: 'Dashboard Financiero', valor: 'Multi-Sucursal / Holding', incluido: true },
      { nombre: 'Rastreo GPS', valor: 'Geocercas Avanzadas', incluido: true },
      { nombre: 'Atención al Cliente', valor: 'IA Conversacional', incluido: true, destacado: true },
      { nombre: 'Cobros', valor: 'Pasarela de Pago', incluido: true },
      { nombre: 'Optimización Rutas', valor: 'IA Predictiva', incluido: true, destacado: true },
      { nombre: 'Carga de Contenedor', valor: 'Arcos RFID / Sensores Zebra', incluido: true, destacado: true },
      { nombre: 'Soporte Técnico', valor: 'Gerente 24/7', incluido: true },
      { nombre: 'Todo de Plan Automatizado', valor: '✅ Incluido', incluido: true },
      { nombre: 'IA Predictiva', valor: '✅ Incluido', incluido: true, destacado: true },
      { nombre: 'RFID/Sensores Zebra', valor: '✅ Incluido', incluido: true, destacado: true },
      { nombre: 'App White Label', valor: '✅ Incluido', incluido: true, destacado: true },
      { nombre: 'Personalización Total', valor: '✅ Incluido', incluido: true, destacado: true }
    ],

    // Color del plan (para UI)
    color: '#f59e0b', // Amber
    colorSecundario: '#fbbf24'
  }
};

/**
 * Obtener configuración de un plan por su ID
 */
export const obtenerPlan = (planId) => {
  return PLANES_SAAS[planId] || null;
};

/**
 * Obtener todos los planes disponibles
 */
export const obtenerTodosLosPlanes = () => {
  return Object.values(PLANES_SAAS);
};

/**
 * Verificar si un plan permite cierto límite
 */
export const verificarLimite = (planId, tipo, cantidad) => {
  const plan = obtenerPlan(planId);
  if (!plan) return false;

  const limite = plan.limites[tipo];

  // -1 significa ilimitado
  if (limite === -1 || limite === 'Ilimitado') return true;

  return cantidad <= limite;
};

/**
 * Calcular ahorro mensual estimado del Plan Automatizado
 *
 * Basado en:
 * - 4 horas/día de atención al cliente x 30 días = 120 horas/mes
 * - Salario promedio RD$ 500/hora
 * - Ahorro: 120 horas x RD$ 500 = RD$ 60,000/mes
 */
export const calcularAhorroAutomatizacion = () => {
  const horasAhorradasPorDia = 4;
  const diasLaborales = 30;
  const salarioPorHora = 500; // RD$

  const horasTotales = horasAhorradasPorDia * diasLaborales;
  const ahorroMensual = horasTotales * salarioPorHora;

  return {
    horasAhorradas: horasTotales,
    ahorroMensualRD: ahorroMensual,
    ahorroMensualUSD: Math.round(ahorroMensual / 58.5),
    salarioPorHora
  };
};

export default PLANES_SAAS;

// Middleware para verificar que la empresa tenga un plan activo (mínimo Plan Operativo)
import { db } from '../config/firebase.js';
import { obtenerPlan } from '../config/planesSaaS.js';

/**
 * Middleware que verifica si la empresa tiene un plan activo válido
 * El Plan Operativo es el MÍNIMO requerido para operar
 */
export const checkPlanActivo = async (req, res, next) => {
  try {
    console.log(`🔍 [checkPlanActivo] Verificando usuario: ${req.userData?.uid} - Rol: ${req.userData?.rol}`);

    // ✅ Roles con acceso sin restricciones de plan:
    // - super_admin: Administrador global del sistema SaaS
    // - propietario: Dueño de la empresa (acceso informativo completo)
    // - admin_general: Administrador operativo de la empresa
    // - cargador: Operario que carga camiones
    // - repartidor: Operario que entrega paquetes
    // - secretaria: Personal que confirma facturas
    const rolesConAccesoTotal = ['super_admin', 'propietario', 'admin_general', 'cargador', 'repartidor', 'secretaria'];

    if (rolesConAccesoTotal.includes(req.userData?.rol)) {
      console.log(`✅ [checkPlanActivo] ${req.userData.rol} detectado - Bypass activado`);
      return next();
    }

    const companyId = req.userData?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró compañía asociada al usuario',
        code: 'NO_COMPANY'
      });
    }

    // Obtener datos de la empresa
    const companyDoc = await db.collection('companies').doc(companyId).get();

    if (!companyDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Empresa no encontrada',
        code: 'COMPANY_NOT_FOUND'
      });
    }

    const companyData = companyDoc.data();

    // Verificar que la empresa esté activa
    // ✅ CORRECCIÓN: Usar 'activo' (español) en lugar de 'active' (inglés)
    if (companyData.activo === false) {
      return res.status(403).json({
        success: false,
        message: 'La empresa está inactiva. Contacte al administrador.',
        code: 'COMPANY_INACTIVE'
      });
    }

    // Verificar que tenga un plan asignado
    let planId = companyData.plan;

    // ✅ MIGRACIÓN AUTOMÁTICA: Si no tiene plan, asignar Plan Operativo por defecto
    if (!planId) {
      console.log(`⚠️ [Plan Check] Empresa ${companyData.name} sin plan asignado. Asignando Plan Operativo...`);

      // Asignar Plan Operativo automáticamente
      await db.collection('companies').doc(companyId).update({
        plan: 'operativo',
        planAsignadoAt: new Date(),
        planAsignadoPor: 'sistema_automatico'
      });

      planId = 'operativo';
      console.log(`✅ [Plan Check] Plan Operativo asignado automáticamente a ${companyData.name}`);
    }

    // Verificar que el plan sea válido
    const plan = obtenerPlan(planId);

    if (!plan) {
      return res.status(403).json({
        success: false,
        message: `Plan '${planId}' no es válido. Contacte al administrador.`,
        code: 'INVALID_PLAN'
      });
    }

    // Verificar si hay facturas SaaS pendientes (opcional - advertencia)
    const facturasPendientesSnapshot = await db.collection('saas_invoices')
      .where('companyId', '==', companyId)
      .where('estado', '==', 'pendiente')
      .limit(1)
      .get();

    // Añadir info del plan al request para uso posterior
    req.planInfo = {
      planId: plan.id,
      planNombre: plan.nombre,
      limites: plan.limites,
      tienePendientes: !facturasPendientesSnapshot.empty
    };

    console.log(`✅ [Plan Check] Empresa ${companyData.name}: Plan ${plan.nombre} activo`);

    next();

  } catch (error) {
    console.error('❌ Error verificando plan activo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar plan de suscripción',
      error: error.message
    });
  }
};

/**
 * Middleware que SOLO permite operar si tienen Plan Profesional o superior
 * (Excluye Plan Operativo de ciertas funcionalidades)
 */
export const requireProfessionalPlan = async (req, res, next) => {
  try {
    const companyId = req.userData?.companyId;

    // Super Admin no tiene restricciones
    if (req.userData?.rol === 'super_admin') {
      return next();
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró compañía asociada',
        code: 'NO_COMPANY'
      });
    }

    const companyDoc = await db.collection('companies').doc(companyId).get();
    const planId = companyDoc.data()?.plan;

    // Planes permitidos: automatizado, smart
    const planesPermitidos = ['automatizado', 'smart'];

    if (!planId || !planesPermitidos.includes(planId)) {
      const plan = obtenerPlan(planId);
      return res.status(403).json({
        success: false,
        message: 'Esta funcionalidad requiere Plan Automatizado o superior',
        code: 'UPGRADE_REQUIRED',
        currentPlan: plan?.nombre || 'Ninguno',
        requiredPlans: ['Plan Automatizado', 'Plan Smart Logistics']
      });
    }

    next();

  } catch (error) {
    console.error('❌ Error verificando plan profesional:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar plan',
      error: error.message
    });
  }
};

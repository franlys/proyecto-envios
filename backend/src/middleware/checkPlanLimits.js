// backend/src/middleware/checkPlanLimits.js
import { db } from '../config/firebase.js';
import { checkLimit, hasFeature, getPlanFeatures } from '../models/Company.js';

/**
 * Middleware para verificar límites del plan
 */
export const checkPlanLimit = (limitName) => {
  return async (req, res, next) => {
    try {
      const companyId = req.userData?.companyId;
      
      if (!companyId) {
        return res.status(403).json({ 
          success: false, // ✅ CORRECCIÓN
          error: 'No tienes una compañía asociada' 
        });
      }

      // Obtener compañía
      const companyDoc = await db.collection('companies').doc(companyId).get();
      
      if (!companyDoc.exists) {
        return res.status(404).json({ 
          success: false, // ✅ CORRECCIÓN
          error: 'Compañía no encontrada' 
        });
      }

      const company = companyDoc.data();
      
      // Obtener conteo actual según el límite
      let currentCount = 0;
      
      switch (limitName) {
        case 'maxRepartidores':
          const repartidoresSnap = await db.collection('usuarios')
            .where('companyId', '==', companyId)
            .where('rol', '==', 'repartidor')
            .where('activo', '==', true)
            .get();
          currentCount = repartidoresSnap.size;
          break;
          
        case 'maxEmbarquesActivos':
          const embarquesSnap = await db.collection('embarques')
            .where('companyId', '==', companyId)
            .where('estado', '==', 'activo')
            .get();
          currentCount = embarquesSnap.size;
          break;
          
        case 'maxRutasSimultaneas':
          const rutasSnap = await db.collection('rutas')
            .where('companyId', '==', companyId)
            .where('estado', 'in', ['pendiente', 'en_proceso'])
            .get();
          currentCount = rutasSnap.size;
          break;
          
        // Agregar más casos según necesidad
      }

      // Verificar límite
      const limitCheck = checkLimit(company, limitName, currentCount);
      
      if (!limitCheck.allowed) {
        return res.status(403).json({
          success: false, // ✅ CORRECCIÓN
          error: `Has alcanzado el límite de tu plan`,
          plan: company.plan,
          limit: limitCheck.limit,
          current: limitCheck.current,
          upgradeUrl: '/planes'
        });
      }

      // Pasar información al siguiente middleware
      req.planInfo = {
        plan: company.plan,
        limit: limitCheck.limit,
        current: limitCheck.current,
        remaining: limitCheck.remaining
      };

      next();
    } catch (error) {
      console.error('Error verificando límite:', error);
      res.status(500).json({ 
        success: false, // ✅ CORRECCIÓN
        error: 'Error verificando límite del plan' 
      });
    }
  };
};

/**
 * Middleware para verificar si tiene una feature
 */
export const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const companyId = req.userData?.companyId;
      
      if (!companyId) {
        return res.status(403).json({ 
          success: false, // ✅ CORRECCIÓN
          error: 'No tienes una compañía asociada' 
        });
      }

      const companyDoc = await db.collection('companies').doc(companyId).get();
      
      if (!companyDoc.exists) {
        return res.status(404).json({ 
          success: false, // ✅ CORRECCIÓN
          error: 'Compañía no encontrada' 
        });
      }

      const company = companyDoc.data();
      
      if (!hasFeature(company, featureName)) {
        const features = getPlanFeatures(company.plan);
        
        return res.status(403).json({
          success: false, // ✅ CORRECCIÓN
          error: `Esta función no está disponible en tu plan actual`,
          feature: featureName,
          plan: company.plan,
          upgradeUrl: '/planes',
          availableIn: Object.keys(features).filter(plan => 
            getPlanFeatures(plan)[featureName]
          )
        });
      }

      req.planInfo = {
        plan: company.plan,
        features: getPlanFeatures(company.plan)
      };

      next();
    } catch (error) {
      console.error('Error verificando feature:', error);
      res.status(500).json({ 
        success: false, // ✅ CORRECCIÓN
        error: 'Error verificando permisos' 
      });
    }
  };
};

export default {
  checkPlanLimit,
  requireFeature
};
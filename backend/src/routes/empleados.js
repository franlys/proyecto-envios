// backend/src/routes/empleados.js
import express from 'express';
import { verifyToken, checkRole } from '../middleware/auth.js';

// ✅ 1. IMPORTAR EL CONTROLADOR
import { empleadoController } from '../controllers/empleadoController.js';

const router = express.Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(verifyToken);

/**
 * ✅ CORREGIDO - GET /api/empleados
 * Obtener lista de empleados (usa el controlador)
 */
router.get('/', 
    checkRole('super_admin', 'admin_general', 'admin'), // Roles que pueden ver lista
    empleadoController.getEmpleados
);

/**
 * ✅ CORREGIDO - GET /api/empleados/repartidores
 * Obtener solo repartidores activos (usa el controlador)
 */
router.get('/repartidores', 
    checkRole('super_admin', 'admin_general', 'admin', 'secretaria', 'almacen_rd'), // Roles que pueden ver repartidores
    empleadoController.getRepartidores
);

/**
 * ✅ CORREGIDO - GET /api/empleados/:id
 * Obtener un empleado específico (usa el controlador)
 */
router.get('/:id', 
    checkRole('super_admin', 'admin_general', 'admin'), 
    empleadoController.getEmpleado
);

/**
 * ✅ CORREGIDO - POST /api/empleados
 * Crear nuevo empleado (usa el controlador)
 *
 * NOTA: Esta ruta ahora choca con POST /api/auth/register.
 * Deberías decidir cuál usar. Por ahora, la dejamos apuntando
 * al controlador de empleados que SÍ tiene 'cargador'.
 */
router.post('/', 
    checkRole('super_admin', 'admin_general', 'admin'), 
    empleadoController.createEmpleado
);

/**
 * ✅ CORREGIDO - PUT /api/empleados/:id
 * Actualizar empleado (usa el controlador)
 */
router.put('/:id', 
    checkRole('super_admin', 'admin_general', 'admin'), 
    empleadoController.updateEmpleado
);

/**
 * ✅ CORREGIDO - DELETE /api/empleados/:id
 * Eliminar empleado (usa el controlador)
 */
router.delete('/:id', 
    checkRole('super_admin', 'admin_general', 'admin'), 
    empleadoController.deleteEmpleado
);

// --- NUEVAS RUTAS (desde el controlador) ---

/**
 * PATCH /api/empleados/:id/toggle
 * Activar/Desactivar un empleado
 */
router.patch('/:id/toggle',
    checkRole('super_admin', 'admin_general', 'admin'),
    empleadoController.toggleEmpleado
);

/**
 * POST /api/empleados/:id/change-password
 * Cambiar la contraseña de un empleado (solo admins)
 */
router.post('/:id/change-password',
    checkRole('super_admin', 'admin_general', 'admin'),
    empleadoController.changePassword
);


export default router;
// backend/src/routes/empleados.js
import express from 'express';
import { verifyUser, requireRole, requireCompany } from '../middleware/authSimple.js';
import { db, admin } from '../config/firebase.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(verifyUser);

/**
 * GET /api/empleados
 * Listar empleados
 * - super_admin: ve todos los empleados
 * - admin_general: ve solo empleados de su compañía
 */
router.get('/', async (req, res) => {
  try {
    const { companyId, rol, activo } = req.query;
    let empleados = [];

    console.log('📡 Listando empleados - Usuario:', req.user.uid, 'Rol:', req.user.rol);

    // Super admin puede ver todos o filtrar por companyId
    if (req.user.rol === 'super_admin') {
      let query = db.collection('usuarios');

      if (companyId) {
        query = query.where('companyId', '==', companyId);
        console.log('🔍 Filtrando por companyId:', companyId);
      }

      if (rol) {
        query = query.where('rol', '==', rol);
        console.log('🔍 Filtrando por rol:', rol);
      }

      if (activo !== undefined) {
        query = query.where('activo', '==', activo === 'true');
        console.log('🔍 Filtrando por activo:', activo);
      }

      const snapshot = await query.get();
      
      snapshot.forEach(doc => {
        empleados.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`✅ Super Admin - ${empleados.length} empleados encontrados`);
    }
    // Admin general solo ve empleados de su compañía
    else if (req.user.companyId) {
      let query = db.collection('usuarios')
        .where('companyId', '==', req.user.companyId);

      if (rol) {
        query = query.where('rol', '==', rol);
      }

      if (activo !== undefined) {
        query = query.where('activo', '==', activo === 'true');
      }

      const snapshot = await query.get();
      
      snapshot.forEach(doc => {
        empleados.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`✅ Admin General - ${empleados.length} empleados de compañía ${req.user.companyId}`);
    }
    // Usuario sin compañía - solo se ve a sí mismo
    else {
      empleados.push({
        id: req.user.uid,
        ...req.user
      });
      console.log('✅ Usuario sin compañía - solo datos propios');
    }

    res.json({
      success: true,
      count: empleados.length,
      data: empleados
    });

  } catch (error) {
    console.error('❌ Error listando empleados:', error);
    res.status(500).json({
      success: false,
      error: 'Error al listar empleados',
      details: error.message
    });
  }
});

/**
 * GET /api/empleados/:id
 * Obtener empleado específico
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const empleadoDoc = await db.collection('usuarios').doc(id).get();

    if (!empleadoDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Empleado no encontrado'
      });
    }

    const empleadoData = empleadoDoc.data();

    // Verificar permisos
    if (req.user.rol !== 'super_admin' && 
        req.user.companyId !== empleadoData.companyId &&
        req.user.uid !== id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes acceso a este empleado'
      });
    }

    res.json({
      success: true,
      data: {
        id: empleadoDoc.id,
        ...empleadoData
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo empleado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener empleado',
      details: error.message
    });
  }
});

/**
 * POST /api/empleados
 * Crear nuevo empleado
 * Solo super_admin y admin_general
 */
router.post('/', requireRole('super_admin', 'admin_general'), async (req, res) => {
  try {
    const { nombre, email, password, telefono, rol, direccion } = req.body;

    // Validaciones
    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos',
        required: ['nombre', 'email', 'password', 'rol']
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Roles válidos
    const rolesValidos = [
      'super_admin',
      'admin_general',
      'recolector',
      'almacen_eeuu',
      'almacen_rd',
      'secretaria',
      'repartidor'
    ];

    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({
        success: false,
        error: 'Rol inválido',
        rolesPermitidos: rolesValidos
      });
    }

    // Determinar companyId
    let companyId = null;
    if (req.user.rol === 'super_admin') {
      // Super admin puede asignar cualquier companyId o ninguno
      companyId = req.body.companyId || null;
    } else {
      // Admin general solo puede crear en su compañía
      companyId = req.user.companyId;
    }

    // Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: nombre
    });

    // Crear documento en Firestore
    const userData = {
      uid: userRecord.uid,
      email: email,
      nombre: nombre,
      rol: rol,
      activo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.uid
    };

    if (companyId) userData.companyId = companyId;
    if (telefono) userData.telefono = telefono;
    if (direccion) userData.direccion = direccion;

    await db.collection('usuarios').doc(userRecord.uid).set(userData);

    console.log('✅ Empleado creado:', userRecord.uid, '-', nombre);

    res.status(201).json({
      success: true,
      message: 'Empleado creado exitosamente',
      data: {
        uid: userRecord.uid,
        email: email,
        nombre: nombre,
        rol: rol
      }
    });

  } catch (error) {
    console.error('❌ Error creando empleado:', error);

    // Manejo de errores específicos de Firebase
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({
        success: false,
        error: 'Email inválido'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear empleado',
      details: error.message
    });
  }
});

/**
 * PATCH /api/empleados/:id
 * Actualizar empleado
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, direccion, activo } = req.body;

    // Verificar que el empleado existe
    const empleadoDoc = await db.collection('usuarios').doc(id).get();
    if (!empleadoDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Empleado no encontrado'
      });
    }

    const empleadoData = empleadoDoc.data();

    // Verificar permisos
    if (req.user.rol !== 'super_admin' && 
        req.user.companyId !== empleadoData.companyId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para editar este empleado'
      });
    }

    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (nombre) updateData.nombre = nombre;
    if (telefono) updateData.telefono = telefono;
    if (direccion) updateData.direccion = direccion;
    if (typeof activo === 'boolean') updateData.activo = activo;

    await db.collection('usuarios').doc(id).update(updateData);

    // Actualizar en Firebase Auth si cambió el nombre
    if (nombre) {
      await admin.auth().updateUser(id, {
        displayName: nombre
      });
    }

    res.json({
      success: true,
      message: 'Empleado actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error actualizando empleado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar empleado',
      details: error.message
    });
  }
});

/**
 * PATCH /api/empleados/:id/estado
 * Cambiar estado activo/inactivo de empleado
 */
router.patch('/:id/estado', requireRole('super_admin', 'admin_general'), async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'El campo activo debe ser true o false'
      });
    }

    // Verificar que el empleado existe
    const empleadoDoc = await db.collection('usuarios').doc(id).get();
    if (!empleadoDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Empleado no encontrado'
      });
    }

    const empleadoData = empleadoDoc.data();

    // Verificar permisos
    if (req.user.rol !== 'super_admin' && 
        req.user.companyId !== empleadoData.companyId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para cambiar el estado de este empleado'
      });
    }

    await db.collection('usuarios').doc(id).update({
      activo: activo,
      updatedAt: new Date().toISOString()
    });

    // También deshabilitar en Firebase Auth si se desactiva
    await admin.auth().updateUser(id, {
      disabled: !activo
    });

    res.json({
      success: true,
      message: `Empleado ${activo ? 'activado' : 'desactivado'} exitosamente`
    });

  } catch (error) {
    console.error('❌ Error cambiando estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar estado',
      details: error.message
    });
  }
});

/**
 * PATCH /api/empleados/:id/change-password
 * Cambiar contraseña de empleado
 */
router.patch('/:id/change-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Verificar permisos: puede ser el mismo usuario o un admin
    const empleadoDoc = await db.collection('usuarios').doc(id).get();
    if (!empleadoDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Empleado no encontrado'
      });
    }

    const empleadoData = empleadoDoc.data();

    if (req.user.uid !== id && 
        req.user.rol !== 'super_admin' && 
        req.user.companyId !== empleadoData.companyId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para cambiar esta contraseña'
      });
    }

    await admin.auth().updateUser(id, {
      password: newPassword
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar contraseña',
      details: error.message
    });
  }
});

/**
 * DELETE /api/empleados/:id
 * Eliminar empleado
 */
router.delete('/:id', requireRole('super_admin', 'admin_general'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el empleado existe
    const empleadoDoc = await db.collection('usuarios').doc(id).get();
    if (!empleadoDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Empleado no encontrado'
      });
    }

    const empleadoData = empleadoDoc.data();

    // Verificar permisos
    if (req.user.rol !== 'super_admin' && 
        req.user.companyId !== empleadoData.companyId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para eliminar este empleado'
      });
    }

    // No permitir que un admin se elimine a sí mismo
    if (req.user.uid === id) {
      return res.status(400).json({
        success: false,
        error: 'No puedes eliminarte a ti mismo'
      });
    }

    // Eliminar de Firebase Auth
    await admin.auth().deleteUser(id);

    // Eliminar de Firestore
    await db.collection('usuarios').doc(id).delete();

    res.json({
      success: true,
      message: 'Empleado eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando empleado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar empleado',
      details: error.message
    });
  }
});

export default router;
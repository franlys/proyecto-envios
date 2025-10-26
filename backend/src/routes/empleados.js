// backend/src/routes/empleados.js
import express from 'express';
import { admin } from '../config/firebase.js';
import { db } from '../config/firebase.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(verifyToken);

/**
 * GET /api/empleados
 * Obtener lista de empleados
 */
router.get('/', checkRole('super_admin', 'admin_general'), async (req, res) => {
  try {
    const { rol, companyId, activo } = req.query;

    let query = db.collection('usuarios');

    // Filtrar por compañía si no es super_admin
    if (req.userData.rol !== 'super_admin') {
      query = query.where('companyId', '==', req.userData.companyId);
    } else if (companyId) {
      query = query.where('companyId', '==', companyId);
    }

    // Filtrar por rol si se especifica
    if (rol) {
      query = query.where('rol', '==', rol);
    }

    // Filtrar por estado activo/inactivo
    if (activo !== undefined) {
      query = query.where('activo', '==', activo === 'true');
    }

    const snapshot = await query.get();

    const empleados = [];
    snapshot.forEach(doc => {
      empleados.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      data: empleados // ✅ CORRECCIÓN: Cambia "empleados" por "data"
    });

  } catch (error) {
    console.error('❌ Error obteniendo empleados:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener empleados',
      details: error.message
    });
  }
});

/**
 * ✅ NUEVO ENDPOINT: GET /api/empleados/repartidores
 * Obtener solo repartidores activos de la compañía del usuario
 */
router.get('/repartidores', async (req, res) => {
  try {
    let query = db.collection('usuarios')
      .where('rol', '==', 'repartidor')
      .where('activo', '==', true);

    // Si no es super_admin, filtrar por su compañía
    if (req.userData.rol !== 'super_admin') {
      query = query.where('companyId', '==', req.userData.companyId);
    }

    const snapshot = await query.get();

    const repartidores = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      repartidores.push({
        id: doc.id,
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono || '',
        vehiculo: data.vehiculo || 'No asignado',
        zonas: data.zonas || [],
        activo: data.activo
      });
    });

    res.json({
      success: true,
      repartidores
    });

  } catch (error) {
    console.error('❌ Error obteniendo repartidores:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener repartidores',
      details: error.message
    });
  }
});

/**
 * GET /api/empleados/:id
 * Obtener un empleado específico
 */
router.get('/:id', checkRole('super_admin', 'admin_general'), async (req, res) => {
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

    // Verificar permisos: admin_general solo puede ver empleados de su compañía
    if (req.userData.rol !== 'super_admin' && 
        req.userData.companyId !== empleadoData.companyId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para ver este empleado'
      });
    }

    res.json({
      success: true,
      empleado: {
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
 */
router.post('/', checkRole('super_admin', 'admin_general'), async (req, res) => {
  try {
    const { email, password, nombre, rol, telefono, companyId } = req.body;

    // Validaciones
    if (!email || !password || !nombre || !rol) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: email, password, nombre, rol'
      });
    }

    // Determinar companyId
    let finalCompanyId = companyId;
    if (req.userData.rol !== 'super_admin') {
      finalCompanyId = req.userData.companyId;
    }

    if (!finalCompanyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId es requerido'
      });
    }

    // Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
      disabled: false
    });

    // Crear documento en Firestore
    await db.collection('usuarios').doc(userRecord.uid).set({
      email,
      nombre,
      rol,
      telefono: telefono || '',
      companyId: finalCompanyId,
      activo: true,
      createdAt: new Date().toISOString(),
      createdBy: req.userData.uid
    });

    res.status(201).json({
      success: true,
      message: 'Empleado creado exitosamente',
      empleado: {
        id: userRecord.uid,
        email,
        nombre,
        rol,
        companyId: finalCompanyId
      }
    });

  } catch (error) {
    console.error('❌ Error creando empleado:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({
        success: false,
        error: 'El email ya está registrado'
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
 * PUT /api/empleados/:id
 * Actualizar empleado
 */
router.put('/:id', checkRole('super_admin', 'admin_general'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, rol, activo, companyId } = req.body;

    const empleadoDoc = await db.collection('usuarios').doc(id).get();
    if (!empleadoDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Empleado no encontrado'
      });
    }

    const empleadoData = empleadoDoc.data();

    // Verificar permisos
    if (req.userData.rol !== 'super_admin' && 
        req.userData.companyId !== empleadoData.companyId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para actualizar este empleado'
      });
    }

    const updateData = {
      updatedAt: new Date().toISOString(),
      updatedBy: req.userData.uid
    };

    if (nombre) updateData.nombre = nombre;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (rol) updateData.rol = rol;
    if (activo !== undefined) updateData.activo = activo;
    if (companyId && req.userData.rol === 'super_admin') {
      updateData.companyId = companyId;
    }

    await db.collection('usuarios').doc(id).update(updateData);

    // Si se desactivó el usuario, también deshabilitarlo en Auth
    if (activo === false) {
      await admin.auth().updateUser(id, { disabled: true });
    } else if (activo === true) {
      await admin.auth().updateUser(id, { disabled: false });
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
 * DELETE /api/empleados/:id
 * Eliminar empleado
 */
router.delete('/:id', checkRole('super_admin', 'admin_general'), async (req, res) => {
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

    if (req.userData.rol !== 'super_admin' && 
        req.userData.companyId !== empleadoData.companyId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para eliminar este empleado'
      });
    }

    if (req.user.uid === id) {
      return res.status(400).json({
        success: false,
        error: 'No puedes eliminarte a ti mismo'
      });
    }

    await admin.auth().deleteUser(id);
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
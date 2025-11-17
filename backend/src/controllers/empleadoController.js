// backend/src/controllers/empleadoController.js
import { db, auth } from '../config/firebase.js';
import admin from 'firebase-admin';

export const empleadoController = {
  // Crear nuevo empleado/repartidor
  async createEmpleado(req, res) {
    try {
      console.log('🔍 Datos recibidos para crear empleado:', req.body);
      
      const { email, password, nombre, telefono, rol, companyId } = req.body;

      // Validaciones
      if (!email || !password || !nombre) {
        return res.status(400).json({ 
          success: false,
          error: 'Email, contraseña y nombre son requeridos' 
        });
      }

      if (password.length < 6) {
        return res.status(400).json({ 
          success: false,
          error: 'La contraseña debe tener al menos 6 caracteres' 
        });
      }

      // Obtener datos del usuario actual
      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
      const userData = userDoc.data();

      console.log('👤 Usuario que crea:', userData.email, '- Rol:', userData.rol);

      // Validar que tenga companyId si NO es super_admin
      if (userData.rol !== 'super_admin' && !userData.companyId) {
        return res.status(403).json({ 
          success: false,
          error: 'Usuario sin compañía asignada' 
        });
      }

      // Validar roles según quien crea
      let validRoles = [];
      if (userData.rol === 'super_admin') {
        // ✅ AÑADIDO 'cargador'
        validRoles = ['super_admin', 'admin', 'secretaria', 'almacen', 'repartidor', 'empleado', 'cargador'];
      } else if (userData.rol === 'admin') {
        // ✅ AÑADIDO 'cargador'
        validRoles = ['secretaria', 'almacen', 'repartidor', 'empleado', 'cargador'];
      } else {
        return res.status(403).json({ 
          success: false,
          error: 'No tienes permisos para crear empleados' 
        });
      }

      if (rol && !validRoles.includes(rol)) {
        return res.status(400).json({ 
          success: false,
          error: `Rol inválido. Roles permitidos: ${validRoles.join(', ')}` 
        });
      }

      // Crear usuario en Firebase Auth
      console.log('🔐 Creando usuario en Firebase Auth...');
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: nombre
      });
      console.log('✅ Usuario creado en Auth:', userRecord.uid);

      // Asignar companyId correctamente
      let assignedCompanyId;
      if (userData.rol === 'super_admin') {
        if (rol === 'super_admin') {
          assignedCompanyId = null;
        } else {
          assignedCompanyId = companyId || null;
        }
      } else {
        assignedCompanyId = userData.companyId;
      }

      console.log('🏢 CompanyId asignado:', assignedCompanyId);

      const empleadoData = {
        uid: userRecord.uid,
        email,
        nombre,
        telefono: telefono || '',
        rol: rol || 'repartidor',
        companyId: assignedCompanyId,
        activo: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: req.user.uid,
        createdByName: userData.nombre || userData.email
      };

      console.log('💾 Guardando en Firestore...');
      await db.collection('usuarios').doc(userRecord.uid).set(empleadoData);
      console.log('✅ Empleado guardado exitosamente en Firestore');

      res.status(201).json({
        success: true,
        message: 'Empleado creado exitosamente',
        empleado: {
          uid: userRecord.uid,
          email,
          nombre,
          telefono: telefono || '',
          rol: rol || 'repartidor',
          companyId: assignedCompanyId,
          activo: true
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
  },

  // Listar todos los empleados
  async getEmpleados(req, res) {
    try {
      const { rol, activo } = req.query;

      // ✅ NOTA: req.user es establecido por el middleware verifyToken
      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
      const userData = userDoc.data();

      console.log('🔍 userData.rol:', userData.rol);
      console.log('🔍 userData.companyId:', userData.companyId);

      let query = db.collection('usuarios');

      if (userData.rol !== 'super_admin') {
        if (!userData.companyId) {
          return res.status(403).json({ 
            success: false,
            error: 'Usuario sin compañía asignada' 
          });
        }
        query = query.where('companyId', '==', userData.companyId);
        console.log('🔍 Filtrando por companyId:', userData.companyId);
      } else {
        console.log('✅ Usuario super_admin, mostrando todos los empleados');
      }

      if (rol) {
        query = query.where('rol', '==', rol);
      }

      if (activo !== undefined) {
        query = query.where('activo', '==', activo === 'true');
      }

      const snapshot = await query.get();

      const empleados = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data.uid || doc.id,
          nombre: data.nombre,
          email: data.email,
          rol: data.rol,
          telefono: data.telefono || '',
          companyId: data.companyId,
          activo: data.activo !== false,
          createdAt: data.createdAt ? 
            (typeof data.createdAt.toDate === 'function' ? 
              data.createdAt.toDate().toISOString() : 
              data.createdAt
            ) : 
            null
        };
      });

      console.log(`✅ Empleados encontrados: ${empleados.length}`);

      // ✅ CORRECCIÓN: Devolver en el formato { success: true, data: [...] }
      res.json({
        success: true,
        data: empleados
      });

    } catch (error) {
      console.error('❌ Error obteniendo empleados:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error al obtener empleados',
        details: error.message 
      });
    }
  },

  // Obtener empleado por ID
  async getEmpleado(req, res) {
    try {
      const { id } = req.params;

      const doc = await db.collection('usuarios').doc(id).get();

      if (!doc.exists) {
        return res.status(404).json({ 
          success: false,
          error: 'Empleado no encontrado' 
        });
      }

      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
      const userData = userDoc.data();
      const empleadoData = doc.data();

      if (userData.rol !== 'super_admin' && empleadoData.companyId !== userData.companyId) {
        return res.status(403).json({ 
          success: false,
          error: 'No tienes acceso a este empleado' 
        });
      }

      const data = doc.data();
      const empleado = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? 
          (typeof data.createdAt.toDate === 'function' ? 
            data.createdAt.toDate().toISOString() : 
            data.createdAt
          ) : 
          null
      };
      
      // ✅ CORRECCIÓN: Devolver en el formato { success: true, data: {...} }
      res.json({
        success: true,
        data: empleado
      });

    } catch (error) {
      console.error('❌ Error obteniendo empleado:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error al obtener empleado',
        details: error.message 
      });
    }
  },

  // Actualizar empleado
  async updateEmpleado(req, res) {
    try {
      const { id } = req.params;
      const { nombre, telefono, rol, activo } = req.body;

      console.log('🔄 Actualizando empleado:', id);

      const empleadoRef = db.collection('usuarios').doc(id);
      const doc = await empleadoRef.get();

      if (!doc.exists) {
        return res.status(404).json({ 
          success: false,
          error: 'Empleado no encontrado' 
        });
      }

      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
      const userData = userDoc.data();
      const empleadoData = doc.data();

      if (userData.rol !== 'super_admin' && empleadoData.companyId !== userData.companyId) {
        return res.status(403).json({ 
          success: false,
          error: 'No tienes acceso a este empleado' 
        });
      }

      const updateData = {};

      if (nombre) updateData.nombre = nombre;
      if (telefono !== undefined) updateData.telefono = telefono;
      if (rol) {
        // ✅ AÑADIDO 'cargador'
        const validRoles = userData.rol === 'super_admin' 
          ? ['super_admin', 'admin', 'secretaria', 'almacen', 'repartidor', 'empleado', 'cargador']
          : ['secretaria', 'almacen', 'repartidor', 'empleado', 'cargador'];
        
        if (!validRoles.includes(rol)) {
          return res.status(400).json({ 
            success: false,
            error: 'Rol inválido' 
          });
        }
        updateData.rol = rol;
      }
      if (activo !== undefined) updateData.activo = activo;

      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      updateData.updatedBy = req.user.uid;

      await empleadoRef.update(updateData);
      console.log('✅ Empleado actualizado en Firestore');

      if (nombre) {
        try {
          await auth.updateUser(id, {
            displayName: nombre
          });
          console.log('✅ DisplayName actualizado en Auth');
        } catch (authError) {
          console.error('⚠️ Error actualizando Auth:', authError);
        }
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
  },

  // Desactivar/Activar empleado
  async toggleEmpleado(req, res) {
    try {
      const { id } = req.params;

      console.log('🔄 Toggle empleado:', id);

      const empleadoRef = db.collection('usuarios').doc(id);
      const doc = await empleadoRef.get();

      if (!doc.exists) {
        return res.status(404).json({ 
          success: false,
          error: 'Empleado no encontrado' 
        });
      }

      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
      const userData = userDoc.data();
      const empleadoData = doc.data();

      if (userData.rol !== 'super_admin' && empleadoData.companyId !== userData.companyId) {
        return res.status(403).json({ 
          success: false,
          error: 'No tienes acceso a este empleado' 
        });
      }

      const currentStatus = doc.data().activo !== false;
      const newStatus = !currentStatus;

      await empleadoRef.update({
        activo: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: req.user.uid
      });

      console.log(`✅ Empleado ${newStatus ? 'activado' : 'desactivado'}`);

      res.json({
        success: true,
        message: `Empleado ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
        activo: newStatus
      });

    } catch (error) {
      console.error('❌ Error cambiando estado del empleado:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error al cambiar estado del empleado',
        details: error.message 
      });
    }
  },

  // Eliminar empleado permanentemente
  async deleteEmpleado(req, res) {
    try {
      const { id } = req.params;

      console.log('🗑️ Eliminando empleado:', id);

      const doc = await db.collection('usuarios').doc(id).get();

      if (!doc.exists) {
        return res.status(404).json({ 
          success: false,
          error: 'Empleado no encontrado' 
        });
      }

      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
      const userData = userDoc.data();
      const empleadoData = doc.data();

      if (userData.rol !== 'super_admin' && empleadoData.companyId !== userData.companyId) {
        return res.status(403).json({ 
          success: false,
          error: 'No tienes acceso a este empleado' 
        });
      }

      if (id === req.user.uid) {
        return res.status(400).json({ 
          success: false,
          error: 'No puedes eliminarte a ti mismo' 
        });
      }

      await db.collection('usuarios').doc(id).delete();
      console.log('✅ Empleado eliminado de Firestore');

      try {
        await auth.deleteUser(id);
        console.log('✅ Empleado eliminado de Firebase Auth');
      } catch (authError) {
        if (authError.code === 'auth/user-not-found') {
          console.log('⚠️ Usuario no existía en Auth, solo en Firestore');
        } else {
          console.error('⚠️ Error eliminando de Auth:', authError);
        }
      }

      res.json({
        success: true,
        message: 'Empleado eliminado permanentemente'
      });

    } catch (error) {
      console.error('❌ Error eliminando empleado:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error al eliminar empleado',
        details: error.message 
      });
    }
  },

  // ✅ NUEVO: Cambiar contraseña de empleado
  async changePassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      console.log('🔐 Cambiando contraseña para usuario:', id);

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ 
          success: false,
          error: 'La contraseña debe tener al menos 6 caracteres' 
        });
      }

      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
      const userData = userDoc.data();

      if (userData.rol !== 'super_admin' && userData.rol !== 'admin') {
        return res.status(403).json({ 
          success: false,
          error: 'No tienes permisos para cambiar contraseñas' 
        });
      }

      const empleadoDoc = await db.collection('usuarios').doc(id).get();
      
      if (!empleadoDoc.exists) {
        return res.status(404).json({ 
          success: false,
          error: 'Empleado no encontrado' 
        });
      }

      const empleadoData = empleadoDoc.data();

      // ✅ AQUÍ ESTABA EL ERROR: 40Loss -> 403
      if (userData.rol !== 'super_admin' && empleadoData.companyId !== userData.companyId) {
        return res.status(403).json({ 
          success: false,
          error: 'No tienes acceso a este empleado' 
        });
      }

      try {
        await auth.updateUser(id, {
          password: newPassword
        });
        console.log('✅ Contraseña actualizada en Firebase Auth');
      } catch (authError) {
        console.error('❌ Error actualizando contraseña en Auth:', authError);
        return res.status(500).json({ 
          success: false,
          error: 'Error al actualizar contraseña en Firebase Auth',
          details: authError.message 
        });
      }

      await db.collection('usuarios').doc(id).update({
        passwordChangedAt: admin.firestore.FieldValue.serverTimestamp(),
        passwordChangedBy: req.user.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('✅ Contraseña cambiada exitosamente');

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
  },

  // Obtener repartidores activos
  async getRepartidores(req, res) {
    try {
      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
      const userData = userDoc.data();

      let query = db.collection('usuarios')
        .where('rol', '==', 'repartidor')
        .where('activo', '==', true);

      if (userData.rol !== 'super_admin') {
        if (!userData.companyId) {
          return res.status(403).json({ 
            success: false,
            error: 'Usuario sin compañía asignada' 
          });
        }
        query = query.where('companyId', '==', userData.companyId);
      }

      const snapshot = await query.get();

      const repartidores = snapshot.docs.map(doc => ({
        id: doc.id,
        uid: doc.data().uid || doc.id,
        nombre: doc.data().nombre,
        email: doc.data().email,
        telefono: doc.data().telefono || ''
      }));

      // ✅ CORRECCIÓN: Devolver en el formato { success: true, data: [...] }
      res.json({
        success: true,
        count: repartidores.length,
        data: repartidores // (Cambié 'repartidores' a 'data' por consistencia)
      });

    } catch (error) { 
      console.error('❌ Error obteniendo repartidores:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error al obtener repartidores',
        details: error.message 
      });
    }
  }
};
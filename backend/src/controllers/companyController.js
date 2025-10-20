import { auth, db } from '../config/firebase.js';

// Crear nueva compañía (solo super_admin)
export const createCompany = async (req, res) => {
  try {
    const { nombre, adminEmail, adminPassword, telefono, direccion, plan } = req.body;

    // Validar que el usuario sea super_admin
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().rol !== 'super_admin') {
      return res.status(403).json({ error: 'No tienes permisos para crear compañías' });
    }

    if (!nombre || !adminEmail || !adminPassword) {
      return res.status(400).json({ 
        error: 'Nombre, email de administrador y contraseña son requeridos' 
      });
    }

    if (adminPassword.length < 6) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    // Crear ID único para la compañía (slug)
    const companyId = nombre
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    // Verificar que no exista
    const existingCompany = await db.collection('companies').doc(companyId).get();
    if (existingCompany.exists) {
      return res.status(400).json({ 
        error: 'Ya existe una compañía con ese nombre' 
      });
    }

    // Crear usuario admin de la compañía en Firebase Auth
    const userRecord = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: `Admin - ${nombre}`
    });

    // Crear documento de usuario en Firestore
    await db.collection('usuarios').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: adminEmail,
      nombre: `Administrador ${nombre}`,
      rol: 'admin',
      companyId: companyId,
      telefono: telefono || '',
      activo: true,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    });

    // Crear la compañía
    const companyData = {
      nombre,
      adminEmail,
      adminUserId: userRecord.uid,
      telefono: telefono || '',
      direccion: direccion || '',
      plan: plan || 'basic',
      activo: true,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    };

    await db.collection('companies').doc(companyId).set(companyData);

    res.status(201).json({
      message: 'Compañía y usuario admin creados exitosamente',
      company: {
        id: companyId,
        ...companyData
      },
      admin: {
        uid: userRecord.uid,
        email: adminEmail
      }
    });
  } catch (error) {
    console.error('Error creando compañía:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ 
        error: 'El email del administrador ya está registrado' 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
};

// Obtener todas las compañías (solo super_admin)
export const getAllCompanies = async (req, res) => {
  try {
    // Validar que el usuario sea super_admin
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().rol !== 'super_admin') {
      return res.status(403).json({ error: 'No tienes permisos para ver compañías' });
    }

    const snapshot = await db.collection('companies')
      .orderBy('createdAt', 'desc')
      .get();
    
    const companies = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(companies);
  } catch (error) {
    console.error('Error obteniendo compañías:', error);
    res.status(500).json({ error: error.message });
  }
};

// Obtener compañía por ID
export const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar permisos
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();
    
    if (userData.rol !== 'super_admin' && userData.companyId !== id) {
      return res.status(403).json({ error: 'No tienes permisos para ver esta compañía' });
    }

    const companyDoc = await db.collection('companies').doc(id).get();
    
    if (!companyDoc.exists) {
      return res.status(404).json({ error: 'Compañía no encontrada' });
    }

    res.json({
      id: companyDoc.id,
      ...companyDoc.data()
    });
  } catch (error) {
    console.error('Error obteniendo compañía:', error);
    res.status(500).json({ error: error.message });
  }
};

// Actualizar compañía
export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, direccion, plan, activo } = req.body;
    
    // Validar que el usuario sea super_admin
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().rol !== 'super_admin') {
      return res.status(403).json({ error: 'No tienes permisos para actualizar compañías' });
    }

    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (telefono !== undefined) updates.telefono = telefono;
    if (direccion !== undefined) updates.direccion = direccion;
    if (plan !== undefined) updates.plan = plan;
    if (activo !== undefined) updates.activo = activo;
    updates.updatedAt = new Date().toISOString();

    await db.collection('companies').doc(id).update(updates);

    res.json({ message: 'Compañía actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando compañía:', error);
    res.status(500).json({ error: error.message });
  }
};

// Desactivar/Activar compañía
export const toggleCompany = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar que el usuario sea super_admin
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().rol !== 'super_admin') {
      return res.status(403).json({ error: 'No tienes permisos para modificar compañías' });
    }

    const companyDoc = await db.collection('companies').doc(id).get();
    if (!companyDoc.exists) {
      return res.status(404).json({ error: 'Compañía no encontrada' });
    }

    const currentStatus = companyDoc.data().activo;
    
    await db.collection('companies').doc(id).update({
      activo: !currentStatus,
      updatedAt: new Date().toISOString()
    });

    res.json({ 
      message: `Compañía ${!currentStatus ? 'activada' : 'desactivada'} exitosamente`,
      activo: !currentStatus
    });
  } catch (error) {
    console.error('Error cambiando estado de compañía:', error);
    res.status(500).json({ error: error.message });
  }
};

// Resetear contraseña de usuario (solo super_admin)
export const resetUserPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    // Validar que el usuario sea super_admin
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().rol !== 'super_admin') {
      return res.status(403).json({ error: 'No tienes permisos para resetear contraseñas' });
    }

    if (!userId || !newPassword) {
      return res.status(400).json({ 
        error: 'ID de usuario y nueva contraseña son requeridos' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    // Verificar que el usuario existe
    const targetUserDoc = await db.collection('usuarios').doc(userId).get();
    if (!targetUserDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualizar contraseña en Firebase Auth
    await auth.updateUser(userId, {
      password: newPassword
    });

    // Registrar el cambio en Firestore
    await db.collection('usuarios').doc(userId).update({
      passwordResetAt: new Date().toISOString(),
      passwordResetBy: req.user.uid
    });

    res.json({ 
      message: 'Contraseña actualizada exitosamente',
      userId,
      email: targetUserDoc.data().email
    });
  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    res.status(500).json({ error: error.message });
  }
};

// Eliminar compañía y TODOS sus datos (solo super_admin)
export const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que el usuario sea super_admin
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();
    
    if (!userData || userData.rol !== 'super_admin') {
      return res.status(403).json({ error: 'No tienes permisos para eliminar compañías' });
    }

    // Verificar que la compañía existe
    const companyDoc = await db.collection('companies').doc(id).get();
    if (!companyDoc.exists) {
      return res.status(404).json({ error: 'Compañía no encontrada' });
    }

    const companyData = companyDoc.data();

    // Obtener todos los datos de la compañía
    const usuariosSnapshot = await db.collection('usuarios')
      .where('companyId', '==', id)
      .get();

    const embarquesSnapshot = await db.collection('embarques')
      .where('companyId', '==', id)
      .get();

    const rutasSnapshot = await db.collection('rutas')
      .where('companyId', '==', id)
      .get();

    const facturasSnapshot = await db.collection('facturas')
      .where('companyId', '==', id)
      .get();

    const gastosSnapshot = await db.collection('gastos')
      .where('companyId', '==', id)
      .get();

    const historialSnapshot = await db.collection('historial_reasignaciones')
      .where('companyId', '==', id)
      .get();

    // Eliminar usuarios de Firebase Auth
    const deletePromises = [];
    for (const doc of usuariosSnapshot.docs) {
      const userId = doc.id;
      try {
        deletePromises.push(auth.deleteUser(userId));
      } catch (error) {
        console.log(`No se pudo eliminar usuario ${userId} de Auth:`, error.message);
      }
    }

    await Promise.allSettled(deletePromises);

    // Usar batch para eliminar todo de Firestore
    const batch = db.batch();

    usuariosSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    embarquesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    rutasSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    facturasSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    gastosSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    historialSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection('companies').doc(id));

    await batch.commit();

    const stats = {
      usuarios: usuariosSnapshot.size,
      embarques: embarquesSnapshot.size,
      rutas: rutasSnapshot.size,
      facturas: facturasSnapshot.size,
      gastos: gastosSnapshot.size,
      historial: historialSnapshot.size
    };

    res.json({ 
      message: 'Compañía y todos sus datos eliminados permanentemente',
      companyName: companyData.nombre,
      stats
    });
  } catch (error) {
    console.error('Error eliminando compañía:', error);
    res.status(500).json({ error: error.message });
  }
};
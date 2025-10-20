import { auth, db } from '../config/firebase.js';

// Obtener todos los usuarios
export const getAllUsers = async (req, res) => {
  try {
    // ← NUEVO: Obtener datos del usuario
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('usuarios');

    // ← NUEVO: Si NO es super_admin, filtrar por compañía
    if (userData.rol !== 'super_admin') {
      if (!userData.companyId) {
        return res.status(403).json({ 
          error: 'Usuario sin compañía asignada' 
        });
      }
      query = query.where('companyId', '==', userData.companyId);
    }

    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(users);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: error.message });
  }
};

// Obtener usuarios por rol
export const getUsersByRole = async (req, res) => {
  try {
    const { rol } = req.params;
    
    // ← NUEVO: Obtener datos del usuario
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('usuarios')
      .where('rol', '==', rol)
      .where('activo', '==', true);

    // ← NUEVO: Si NO es super_admin, filtrar por compañía
    if (userData.rol !== 'super_admin') {
      if (!userData.companyId) {
        return res.status(403).json({ 
          error: 'Usuario sin compañía asignada' 
        });
      }
      query = query.where('companyId', '==', userData.companyId);
    }
    
    const snapshot = await query.get();
    
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(users);
  } catch (error) {
    console.error('Error obteniendo usuarios por rol:', error);
    res.status(500).json({ error: error.message });
  }
};

// Obtener un usuario por ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const userDoc = await db.collection('usuarios').doc(id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // ← NUEVO: Verificar permisos
    const currentUserDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const currentUserData = currentUserDoc.data();
    const targetUserData = userDoc.data();

    if (currentUserData.rol !== 'super_admin' && targetUserData.companyId !== currentUserData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este usuario' });
    }

    res.json({ id: userDoc.id, ...userDoc.data() });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: error.message });
  }
};

// Actualizar usuario
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, rol, activo } = req.body;
    
    // ← NUEVO: Verificar que el usuario existe
    const targetUserDoc = await db.collection('usuarios').doc(id).get();
    if (!targetUserDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // ← NUEVO: Verificar permisos
    const currentUserDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const currentUserData = currentUserDoc.data();
    const targetUserData = targetUserDoc.data();

    if (currentUserData.rol !== 'super_admin' && targetUserData.companyId !== currentUserData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este usuario' });
    }

    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (telefono !== undefined) updates.telefono = telefono;
    if (rol !== undefined) updates.rol = rol;
    if (activo !== undefined) updates.activo = activo;
    updates.updatedAt = new Date().toISOString();

    await db.collection('usuarios').doc(id).update(updates);

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: error.message });
  }
};

// Desactivar usuario
export const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ← NUEVO: Verificar que el usuario existe
    const targetUserDoc = await db.collection('usuarios').doc(id).get();
    if (!targetUserDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // ← NUEVO: Verificar permisos
    const currentUserDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const currentUserData = currentUserDoc.data();
    const targetUserData = targetUserDoc.data();

    if (currentUserData.rol !== 'super_admin' && targetUserData.companyId !== currentUserData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este usuario' });
    }

    await db.collection('usuarios').doc(id).update({
      activo: false,
      updatedAt: new Date().toISOString()
    });

    // Deshabilitar en Firebase Auth
    await auth.updateUser(id, { disabled: true });

    res.json({ message: 'Usuario desactivado exitosamente' });
  } catch (error) {
    console.error('Error desactivando usuario:', error);
    res.status(500).json({ error: error.message });
  }
};

// Activar usuario
export const activateUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ← NUEVO: Verificar que el usuario existe
    const targetUserDoc = await db.collection('usuarios').doc(id).get();
    if (!targetUserDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // ← NUEVO: Verificar permisos
    const currentUserDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const currentUserData = currentUserDoc.data();
    const targetUserData = targetUserDoc.data();

    if (currentUserData.rol !== 'super_admin' && targetUserData.companyId !== currentUserData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este usuario' });
    }

    await db.collection('usuarios').doc(id).update({
      activo: true,
      updatedAt: new Date().toISOString()
    });

    // Habilitar en Firebase Auth
    await auth.updateUser(id, { disabled: false });

    res.json({ message: 'Usuario activado exitosamente' });
  } catch (error) {
    console.error('Error activando usuario:', error);
    res.status(500).json({ error: error.message });
  }
};
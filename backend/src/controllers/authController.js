import { auth, db } from '../config/firebase.js';

// Registrar nuevo usuario
export const register = async (req, res) => {
  try {
    const { email, password, nombre, rol, telefono, companyId } = req.body;

    // Validaciones
    if (!email || !password || !nombre || !rol) {
      return res.status(400).json({ 
        error: 'Email, contraseña, nombre y rol son requeridos' 
      });
    }

    // Si no es super_admin, requiere companyId
    if (rol !== 'super_admin' && !companyId) {
      return res.status(400).json({ 
        error: 'Se requiere ID de compañía para este usuario' 
      });
    }

    // Validar que la compañía existe (si no es super_admin)
    if (rol !== 'super_admin') {
      const companyDoc = await db.collection('companies').doc(companyId).get();
      if (!companyDoc.exists) {
        return res.status(404).json({ 
          error: 'Compañía no encontrada' 
        });
      }
    }

    // Crear usuario en Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: nombre
    });

    // Guardar datos adicionales en Firestore
    const userData = {
      uid: userRecord.uid,
      email,
      nombre,
      rol,
      telefono: telefono || '',
      activo: true,
      createdAt: new Date().toISOString()
    };

    // Agregar companyId solo si no es super_admin
    if (rol !== 'super_admin') {
      userData.companyId = companyId;
    }

    await db.collection('usuarios').doc(userRecord.uid).set(userData);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      uid: userRecord.uid
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: error.message });
  }
};

// Obtener información del usuario actual
export const getProfile = async (req, res) => {
  try {
    console.log('🔍 Buscando usuario con UID:', req.user.uid); // ← AGREGAR
    
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    
    console.log('📄 Documento existe:', userDoc.exists); // ← AGREGAR
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userData = userDoc.data();

    // Si tiene companyId, incluir info de la compañía
    if (userData.companyId) {
      const companyDoc = await db.collection('companies').doc(userData.companyId).get();
      if (companyDoc.exists) {
        userData.company = {
          id: companyDoc.id,
          ...companyDoc.data()
        };
      }
    }

    console.log('✅ Usuario encontrado:', userData.email); // ← AGREGAR

    res.json(userData);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: error.message });
  }
};
// Actualizar perfil
export const updateProfile = async (req, res) => {
  try {
    const { nombre, telefono } = req.body;
    const updates = {};

    if (nombre) updates.nombre = nombre;
    if (telefono) updates.telefono = telefono;
    updates.updatedAt = new Date().toISOString();

    await db.collection('usuarios').doc(req.user.uid).update(updates);

    res.json({ message: 'Perfil actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ error: error.message });
  }
};
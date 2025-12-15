import { auth, db } from '../config/firebase.js';
import { obtenerPrefijoUnico, validarPrefijo } from '../utils/trackingUtils.js';

// Crear nueva compañía (solo super_admin)
export const createCompany = async (req, res) => {
  try {
    const { nombre, adminEmail, adminPassword, telefono, direccion, plan, emailConfig, invoiceDesign } = req.body;

    // Validar que el usuario sea super_admin
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
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
      createdBy: req.userData.uid
    });

    // ======================================================================
    // GENERAR PREFIJO ÚNICO (ACRONYM)
    // ======================================================================
    // Ejemplo: "Embarques Ivan" -> "EMI"
    let prefijo = nombre.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    if (prefijo.length < 3) {
      prefijo = nombre.substring(0, 3).toUpperCase().padEnd(3, 'X');
    }

    // Verificar si el prefijo existe (simple check, en producción ser más robusto)
    const prefixCheck = await db.collection('companies').where('prefijo', '==', prefijo).get();
    if (!prefixCheck.empty) {
      // Si existe, agregar número aleatorio
      prefijo = prefijo.substring(0, 2) + Math.floor(Math.random() * 9);
    }

    console.log(`🏢 Generando prefijo de tracking para: "${nombre}" -> ${prefijo}`);
    const trackingPrefix = await obtenerPrefijoUnico(companyId, nombre); // Mantener legacy por si acaso

    // Crear la compañía
    const companyData = {
      nombre,
      adminEmail,
      adminUserId: userRecord.uid,
      telefono: telefono || '',
      direccion: direccion || '',
      plan: plan || 'operativo',
      activo: true,
      createdAt: new Date().toISOString(),
      createdBy: req.userData.uid,
      // ✅ NUEVO: Sistema de tracking estandarizado
      prefijo,                     // Acrónimo (ej: "EMI")
      recolecciones_count: 0,      // Contador para RC
      contenedores_count: 0,       // Contador para CNT

      // Legacy tracking (mantener compatible por ahora)
      trackingPrefix,
      currentTrackingNumber: 0,
      lastTrackingGenerated: null
    };

    // Agregar emailConfig si se proporciona
    if (emailConfig) {
      companyData.emailConfig = {
        service: emailConfig.service || 'gmail',
        user: emailConfig.user || '',
        pass: emailConfig.pass || '',
        from: emailConfig.from || emailConfig.user || ''
      };
    }

    // Agregar invoiceDesign si se proporciona
    if (invoiceDesign) {
      companyData.invoiceDesign = {
        logoUrl: invoiceDesign.logoUrl || '',
        primaryColor: invoiceDesign.primaryColor || '#1976D2',
        secondaryColor: invoiceDesign.secondaryColor || '#f5f5f5',
        template: invoiceDesign.template || 'modern',
        headerText: invoiceDesign.headerText || 'Gracias por su preferencia',
        footerText: invoiceDesign.footerText || ''
      };
    }

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
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
    if (!userDoc.exists || userDoc.data().rol !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver compañías'
      });
    }

    const snapshot = await db.collection('companies')
      .orderBy('createdAt', 'desc')
      .get();

    const companies = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      count: companies.length,
      data: companies
    });
  } catch (error) {
    console.error('Error obteniendo compañías:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Obtener compañía por ID
export const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar permisos
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
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
    const { nombre, telefono, supportPhone, direccion, plan, activo, emailConfig, invoiceDesign } = req.body;

    // Validar que el usuario sea super_admin
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
    if (!userDoc.exists || userDoc.data().rol !== 'super_admin') {
      return res.status(403).json({ error: 'No tienes permisos para actualizar compañías' });
    }

    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (telefono !== undefined) updates.telefono = telefono;
    if (supportPhone !== undefined) updates.supportPhone = supportPhone; // ✅ Nuevo campo
    if (direccion !== undefined) updates.direccion = direccion;
    if (plan !== undefined) updates.plan = plan;
    if (activo !== undefined) updates.activo = activo;

    if (plan !== undefined) updates.plan = plan;
    if (activo !== undefined) updates.activo = activo;
    if (req.body.prefijo !== undefined) updates.prefijo = req.body.prefijo; // Permite corregir manual

    // Actualización parcial de emailConfig
    if (emailConfig !== undefined) {
      updates.emailConfig = {
        service: emailConfig.service || 'gmail',
        user: emailConfig.user || '',
        pass: emailConfig.pass || '',
        from: emailConfig.from || emailConfig.user || ''
      };
    }

    // Actualización parcial de invoiceDesign
    if (invoiceDesign !== undefined) {
      updates.invoiceDesign = {
        logoUrl: invoiceDesign.logoUrl || '',
        primaryColor: invoiceDesign.primaryColor || '#1976D2',
        secondaryColor: invoiceDesign.secondaryColor || '#f5f5f5',
        template: invoiceDesign.template || 'modern',
        headerText: invoiceDesign.headerText || 'Gracias por su preferencia',
        footerText: invoiceDesign.footerText || ''
      };
    }

    // ✅ NUEVO: Configuración de Secuencias NCF (Módulo Contable)
    if (req.body.ncfSequences !== undefined) {
      updates.ncfSequences = req.body.ncfSequences;
    }

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
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
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
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
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
      passwordResetBy: req.userData.uid
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
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
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

    // ✅ CORRECCIÓN: Usar 'recolecciones' en lugar de 'facturas'
    const recoleccionesSnapshot = await db.collection('recolecciones')
      .where('companyId', '==', id)
      .get();

    // ✅ NOTA: 'gastos' ya no existe como colección (están en ruta.gastos array)
    // Mantener por compatibilidad con datos legacy
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
    recoleccionesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    gastosSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    historialSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection('companies').doc(id));

    await batch.commit();

    const stats = {
      usuarios: usuariosSnapshot.size,
      embarques: embarquesSnapshot.size,
      rutas: rutasSnapshot.size,
      recolecciones: recoleccionesSnapshot.size,
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

// Subir logo de compañía
export const uploadCompanyLogo = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que el usuario sea super_admin
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
    if (!userDoc.exists || userDoc.data().rol !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para subir logos'
      });
    }

    // Verificar que la compañía existe
    const companyDoc = await db.collection('companies').doc(id).get();
    if (!companyDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Compañía no encontrada'
      });
    }

    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se ha subido ningún archivo'
      });
    }

    const file = req.file;
    console.log(`📤 Subiendo logo para compañía ${id}: ${file.originalname}`);

    // Importar storage dinámicamente
    const { storage } = await import('../config/firebase.js');
    const bucket = storage.bucket();

    // Nombre único: logos/COMPANY_ID_TIMESTAMP.ext
    const extension = file.originalname.split('.').pop();
    const filename = `logos/${id}_${Date.now()}.${extension}`;
    const fileUpload = bucket.file(filename);

    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype
      }
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        console.error('❌ Error subiendo logo a Storage:', error);
        reject(error);
      });

      blobStream.on('finish', async () => {
        try {
          // Hacer el archivo público
          await fileUpload.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

          // Actualizar la compañía con la nueva URL del logo
          await db.collection('companies').doc(id).update({
            'invoiceDesign.logoUrl': publicUrl,
            updatedAt: new Date().toISOString()
          });

          console.log(`✅ Logo subido exitosamente: ${publicUrl}`);

          res.json({
            success: true,
            message: 'Logo subido exitosamente',
            logoUrl: publicUrl
          });

          resolve();
        } catch (error) {
          console.error('❌ Error actualizando URL del logo:', error);
          res.status(500).json({
            success: false,
            error: error.message
          });
          reject(error);
        }
      });

      blobStream.end(file.buffer);
    });

  } catch (error) {
    console.error('❌ Error en uploadCompanyLogo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Actualizar Configuración Fiscal (NCF/RNC)
export const updateCompanyNCFConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { rnc, ncfSequences, ncfExpiry } = req.body;

    // Verificar permisos: Propietario de la compañía o Super Admin
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
    if (!userDoc.exists) return res.status(403).json({ error: 'Usuario no encontrado' });

    const userData = userDoc.data();
    const isSuperAdmin = userData.rol === 'super_admin';
    const isOwner = userData.rol === 'propietario' && userData.companyId === id;

    if (!isSuperAdmin && !isOwner) {
      return res.status(403).json({ error: 'No tienes permisos para modificar la configuración fiscal de esta compañía' });
    }

    // 🔒 RESTRICCIÓN SAAS: Verificar que la compañía tenga plan SMART
    // Los Super Admins pueden bypassear para configuración inicial o soporte
    if (!isSuperAdmin) {
      const companyDoc = await db.collection('companies').doc(id).get();
      if (!companyDoc.exists) return res.status(404).json({ error: 'Compañía no encontrada' });

      const companyData = companyDoc.data();
      if (companyData.plan !== 'smart') {
        return res.status(403).json({
          error: 'Funcionalidad restringida',
          message: 'La configuración de NCF solo está disponible en el plan SMART.'
        });
      }
    }

    const updates = {};
    if (rnc !== undefined) updates.rnc = rnc;
    if (ncfSequences !== undefined) updates.ncfSequences = ncfSequences;
    if (ncfExpiry !== undefined) updates.ncfExpiry = ncfExpiry;

    updates.updatedAt = new Date().toISOString();

    await db.collection('companies').doc(id).update(updates);

    res.json({ success: true, message: 'Configuración fiscal actualizada exitosamente' });

  } catch (error) {
    console.error('Error actualizando configuración fiscal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
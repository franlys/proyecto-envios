// backend/src/controllers/authController.js
/**
 * CONTROLADOR DE AUTENTICACIÓN
 * Gestión de registro de empleados y login.
 */

import { admin, db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { sendEmail, generateBrandedEmailHTML } from '../services/notificationService.js';

// ========================================
// REGISTRAR NUEVO EMPLEADO
// ========================================
export const register = async (req, res) => {
  const { email, password, nombre, rol, telefono, companyId } = req.body;
  const adminUid = req.headers['x-user-id'];

  try {
    console.log('Iniciando registro para:', email, 'por admin:', adminUid);

    // 1. Obtener datos del administrador que crea
    let adminData = null;
    if (adminUid) {
      const adminDoc = await db.collection('usuarios').doc(adminUid).get();
      if (adminDoc.exists) {
        adminData = adminDoc.data();
      }
    }

    console.log('Admin data:', adminData?.rol);

    // 2. Validar datos básicos
    if (!email || !password || !nombre || !rol) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, nombre y rol son obligatorios'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // 3. Validación de Roles
    const rolesValidos = [
      'admin_general',
      'secretaria',
      'repartidor',
      'recolector',
      'almacen_eeuu',
      'almacen_rd',
      'cargador',
      'propietario'
    ];

    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({
        success: false,
        error: `Rol no válido. Roles permitidos: ${rolesValidos.join(', ')}`
      });
    }

    // 4. Determinar la companyId
    let finalCompanyId = null;

    if (adminData?.rol === 'super_admin') {
      // Si es super_admin, puede asignar la companyId del body
      finalCompanyId = companyId || null;
      console.log('Super Admin asignando companyId:', finalCompanyId);
    } else if (adminData?.companyId) {
      // Si es admin_general, usa su propia companyId
      finalCompanyId = adminData.companyId;
      console.log('Admin General asignando su companyId:', finalCompanyId);
    } else {
      // Casos borde (p.ej. primer admin o admin sin companyId)
      console.warn('No se pudo determinar la companyId. Dejando nulo.');
    }

    // 5. Crear usuario en Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: nombre,
      disabled: false
    });

    console.log('Usuario creado en Auth:', userRecord.uid);

    // 6. Crear documento de usuario en Firestore
    const userDocRef = db.collection('usuarios').doc(userRecord.uid);

    const newUser = {
      uid: userRecord.uid,
      nombre: nombre,
      email: email,
      emailNormalizado: email.toLowerCase(),
      rol: rol,
      telefono: telefono || null,
      companyId: finalCompanyId || null,
      activo: true,
      fechaCreacion: FieldValue.serverTimestamp(),
      creadoPor: adminUid || null,
      creadoPorNombre: adminData?.nombre || 'Sistema',
      fotoURL: null
    };

    await userDocRef.set(newUser);

    console.log('Documento de usuario creado en Firestore');

    // 7. Establecer custom claims (rol y companyId)
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      rol: rol,
      companyId: finalCompanyId || null
    });

    console.log('Custom claims establecidos');

    res.status(201).json({
      success: true,
      message: 'Empleado registrado exitosamente',
      data: {
        uid: userRecord.uid,
        ...newUser
      }
    });

  } catch (error) {
    console.error('❌ Error en el registro:', error);

    // Manejar errores comunes
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({
        success: false,
        error: 'El correo electrónico ya está en uso'
      });
    }
    if (error.code === 'auth/invalid-password') {
      return res.status(400).json({
        success: false,
        error: 'La contraseña no es válida'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno al registrar el empleado',
      details: error.message
    });
  }
};

// ========================================
// INICIAR SESIÓN (LOGIN)
// ========================================
export const login = async (req, res) => {
  // Esta función es manejada por Firebase Auth en el frontend
  // Este endpoint solo existiría para login con email/pass personalizado
  // Por ahora, solo devolvemos un placeholder
  res.status(501).json({
    success: false,
    error: 'La autenticación se maneja en el cliente (frontend)'
  });
};

// ========================================
// OBTENER DATOS DEL USUARIO (POST-LOGIN)
// ========================================
export const getUserData = async (req, res) => {
  const { uid } = req.params;
  const requestingUid = req.userData?.uid; // UID del token verificado

  try {
    if (uid !== requestingUid) {
      return res.status(403).json({
        success: false,
        error: 'No autorizado para ver este perfil'
      });
    }

    // ✅ CORRECCIÓN: 'users' -> 'usuarios'
    const userDoc = await db.collection('usuarios').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado en Firestore'
      });
    }

    const userData = userDoc.data();

    // Asegurarse de que el rol está actualizado (claims vs firestore)
    const authUser = await admin.auth().getUser(uid);
    const claims = authUser.customClaims || {};

    if (userData.rol !== claims.rol || userData.companyId !== claims.companyId) {
      console.warn(`Discrepancia de datos para ${uid}. Firestore: ${userData.rol}, Claims: ${claims.rol}. Actualizando claims...`);

      // Firestore (la base de datos) es la fuente de verdad
      await admin.auth().setCustomUserClaims(uid, {
        rol: userData.rol,
        companyId: userData.companyId
      });
    }

    res.status(200).json({
      success: true,
      data: userData
    });

  } catch (error) {
    console.error('Error obteniendo datos de usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos del usuario',
      details: error.message
    });
  }
};

// ========================================
// SOLICITAR RECUPERACION DE CONTRASENA
// ========================================
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    console.log('Solicitud de recuperacion para:', email);

    // Validar email
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'El email es obligatorio'
      });
    }

    const emailNormalizado = email.toLowerCase().trim();

    // Buscar usuario por email de empresa
    const usuariosRef = db.collection('usuarios');
    const querySnapshot = await usuariosRef
      .where('emailNormalizado', '==', emailNormalizado)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      // Por seguridad, no revelamos si el email existe o no
      return res.status(200).json({
        success: true,
        message: 'Si el email existe, recibiras un enlace de recuperacion en tu correo personal'
      });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Verificar que tenga emailPersonal
    if (!userData.emailPersonal) {
      console.warn(`Usuario ${userData.uid} no tiene emailPersonal configurado`);
      return res.status(200).json({
        success: true,
        message: 'Si el email existe, recibiras un enlace de recuperacion en tu correo personal'
      });
    }

    // Generar token de recuperacion
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Guardar token en Firestore
    await db.collection('passwordResetTokens').doc(token).set({
      uid: userData.uid,
      email: userData.email,
      emailPersonal: userData.emailPersonal,
      expiresAt: expiresAt,
      createdAt: FieldValue.serverTimestamp(),
      used: false
    });

    console.log(`Token generado para ${userData.email}, expira en 10 minutos`);

    // Obtener configuracion de la empresa
    let companyConfig = null;
    if (userData.companyId) {
      const companyDoc = await db.collection('companies').doc(userData.companyId).get();
      if (companyDoc.exists) {
        companyConfig = companyDoc.data();
      }
    }

    // Generar URL de recuperacion
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    // Enviar email al emailPersonal
    const subject = 'Recuperacion de contrasena';
    const contentHTML = `
      <h2>Recuperacion de Contrasena</h2>
      <p>Hola <strong>${userData.nombre}</strong>,</p>
      <p>Recibimos una solicitud para restablecer la contrasena de tu cuenta <strong>${userData.email}</strong>.</p>
      <p>Haz clic en el siguiente enlace para crear una nueva contrasena:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}"
           style="background-color: #1976D2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Restablecer Contrasena
        </a>
      </p>
      <p><strong>Este enlace expira en 10 minutos.</strong></p>
      <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
      <p>Por seguridad, nunca compartas este enlace con nadie.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #CCCCCC;">
      <p style="font-size: 12px; color: #666666;">
        Si el boton no funciona, copia y pega este enlace en tu navegador:<br>
        <a href="${resetUrl}">${resetUrl}</a>
      </p>
    `;

    const brandedHTML = generateBrandedEmailHTML(contentHTML, companyConfig);

    await sendEmail(
      userData.emailPersonal,
      subject,
      brandedHTML,
      [],
      companyConfig
    );

    console.log(`Email de recuperacion enviado a ${userData.emailPersonal}`);

    res.status(200).json({
      success: true,
      message: 'Si el email existe, recibiras un enlace de recuperacion en tu correo personal'
    });

  } catch (error) {
    console.error('Error en forgot password:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar la solicitud',
      details: error.message
    });
  }
};

// ========================================
// RESTABLECER CONTRASENA CON TOKEN
// ========================================
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    console.log('Intento de reseteo con token:', token?.substring(0, 10) + '...');

    // Validar datos
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token y nueva contrasena son obligatorios'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contrasena debe tener al menos 6 caracteres'
      });
    }

    // Buscar token en Firestore
    const tokenDoc = await db.collection('passwordResetTokens').doc(token).get();

    if (!tokenDoc.exists) {
      return res.status(400).json({
        success: false,
        error: 'Token invalido o expirado'
      });
    }

    const tokenData = tokenDoc.data();

    // Verificar si ya fue usado
    if (tokenData.used) {
      return res.status(400).json({
        success: false,
        error: 'Este token ya fue utilizado'
      });
    }

    // Verificar si expiro
    const now = new Date();
    const expiresAt = tokenData.expiresAt.toDate();

    if (now > expiresAt) {
      // Marcar como usado para evitar reutilizacion
      await db.collection('passwordResetTokens').doc(token).update({ used: true });

      return res.status(400).json({
        success: false,
        error: 'El token ha expirado. Solicita un nuevo enlace de recuperacion'
      });
    }

    // Actualizar contrasena en Firebase Auth
    await admin.auth().updateUser(tokenData.uid, {
      password: newPassword
    });

    // Marcar token como usado
    await db.collection('passwordResetTokens').doc(token).update({
      used: true,
      usedAt: FieldValue.serverTimestamp()
    });

    console.log(`Contrasena actualizada exitosamente para usuario ${tokenData.uid}`);

    res.status(200).json({
      success: true,
      message: 'Contrasena actualizada exitosamente. Ya puedes iniciar sesion con tu nueva contrasena'
    });

  } catch (error) {
    console.error('Error en reset password:', error);
    res.status(500).json({
      success: false,
      error: 'Error al restablecer la contrasena',
      details: error.message
    });
  }
};

// ========================================
// HEARTBEAT - REGISTRAR ACTIVIDAD DEL USUARIO
// ========================================
/**
 * Endpoint para que los clientes (web/móvil) registren su actividad
 * Debe llamarse cada 1-2 minutos mientras la app esté activa
 */
export const heartbeat = async (req, res) => {
  try {
    const userId = req.userData?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    // Actualizar timestamp de última actividad
    await db.collection('usuarios').doc(userId).update({
      ultimaActividad: FieldValue.serverTimestamp(),
      fechaActualizacion: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Actividad registrada',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en heartbeat:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar actividad',
      details: error.message
    });
  }
};
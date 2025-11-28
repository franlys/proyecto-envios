// backend/src/controllers/ticketController.js
import { db } from '../config/firebase.js';
import admin from 'firebase-admin';

export const ticketController = {
  /**
   * Crear nuevo ticket de soporte
   * @route POST /api/tickets
   * @access Private (todos los usuarios autenticados)
   */
  async createTicket(req, res) {
    try {
      const { asunto, mensaje, prioridad, categoria } = req.body;

      // Validación de campos requeridos
      if (!asunto || !mensaje) {
        return res.status(400).json({
          success: false,
          error: 'Asunto y mensaje son requeridos'
        });
      }

      // Obtener datos del usuario
      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const userData = userDoc.data();

      // Crear objeto del ticket
      const ticketData = {
        asunto,
        mensaje,
        prioridad: prioridad || 'media',
        categoria: categoria || 'general',
        estado: 'abierto',
        usuarioId: req.user.uid,
        usuarioNombre: userData.nombre,
        usuarioEmail: userData.email,
        companyId: userData.companyId || null,
        respuesta: null,
        respuestaPor: null,
        respuestaAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Guardar en Firestore
      const docRef = await db.collection('tickets').add(ticketData);

      // =====================================================
      // 📧 NOTIFICACIÓN POR CORREO AL USUARIO
      // =====================================================
      try {
        // 1. Obtener configuración de la compañía
        let companyConfig = null;
        if (userData.companyId) {
          const companyDoc = await db.collection('companies').doc(userData.companyId).get();
          if (companyDoc.exists) {
            companyConfig = companyDoc.data();
          }
        }

        // 2. Enviar correo de confirmación
        if (userData.email) {
          const { sendEmail } = await import('../services/notificationService.js');

          const subject = `🎫 Ticket Recibido: ${asunto}`;
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1976D2;">Hemos recibido tu solicitud</h2>
              <p>Hola <strong>${userData.nombre}</strong>,</p>
              <p>Tu ticket de soporte ha sido creado exitosamente. Nuestro equipo lo revisará lo antes posible.</p>
              
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Detalles del Ticket</h3>
                <p><strong>Asunto:</strong> ${asunto}</p>
                <p><strong>Categoría:</strong> ${categoria || 'General'}</p>
                <p><strong>Prioridad:</strong> ${prioridad || 'Media'}</p>
                <p><strong>ID:</strong> ${docRef.id}</p>
              </div>

              <p>Te notificaremos cuando haya una respuesta.</p>
            </div>
          `;

          // 3. Enviar correo
          sendEmail(userData.email, subject, html, [], companyConfig)
            .then(() => console.log(`📧 Confirmación de ticket enviada a ${userData.email}`))
            .catch(err => console.error('❌ Error enviando email de ticket:', err));
        }
      } catch (emailError) {
        console.error('⚠️ Error en notificación de ticket:', emailError);
      }

      res.status(201).json({
        success: true,
        message: 'Ticket creado exitosamente',
        data: {
          ticketId: docRef.id
        }
      });
    } catch (error) {
      console.error('❌ Error creando ticket:', error);
      res.status(500).json({
        success: false,
        error: 'Error al crear ticket',
        message: error.message
      });
    }
  },

  /**
   * Obtener todos los tickets del usuario autenticado
   * @route GET /api/tickets/my-tickets
   * @access Private (usuario autenticado)
   */
  async getMyTickets(req, res) {
    try {
      const snapshot = await db.collection('tickets')
        .where('usuarioId', '==', req.user.uid)
        .get();

      const tickets = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        tickets.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
          respuestaAt: data.respuestaAt?.toDate ? data.respuestaAt.toDate() : null
        });
      });

      // Ordenar por fecha (más recientes primero)
      tickets.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });

      res.json({
        success: true,
        data: tickets,
        count: tickets.length
      });
    } catch (error) {
      console.error('❌ Error obteniendo mis tickets:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener tickets',
        message: error.message
      });
    }
  },

  /**
   * Obtener todos los tickets del sistema (solo super_admin)
   * @route GET /api/tickets/all
   * @access Private (solo super_admin)
   */
  async getAllTickets(req, res) {
    try {
      // Verificar rol de super_admin
      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const userData = userDoc.data();

      if (userData.rol !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para ver todos los tickets'
        });
      }

      // Obtener todos los tickets
      const snapshot = await db.collection('tickets').get();

      const tickets = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        tickets.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
          respuestaAt: data.respuestaAt?.toDate ? data.respuestaAt.toDate() : null
        });
      });

      // Ordenar: tickets abiertos primero, luego por fecha
      tickets.sort((a, b) => {
        // Prioridad: abiertos > respondidos > cerrados
        if (a.estado === 'abierto' && b.estado !== 'abierto') return -1;
        if (a.estado !== 'abierto' && b.estado === 'abierto') return 1;

        // Si tienen el mismo estado, ordenar por fecha
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });

      // Estadísticas
      const stats = {
        total: tickets.length,
        abiertos: tickets.filter(t => t.estado === 'abierto').length,
        respondidos: tickets.filter(t => t.estado === 'respondido').length,
        cerrados: tickets.filter(t => t.estado === 'cerrado').length
      };

      res.json({
        success: true,
        data: tickets,
        stats
      });
    } catch (error) {
      console.error('❌ Error obteniendo todos los tickets:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener tickets',
        message: error.message
      });
    }
  },

  /**
   * Responder a un ticket (solo super_admin)
   * @route PATCH /api/tickets/:id/respond
   * @access Private (solo super_admin)
   */
  async respondTicket(req, res) {
    try {
      const { id } = req.params;
      const { respuesta } = req.body;

      // Validación
      if (!respuesta || respuesta.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'La respuesta es requerida'
        });
      }

      // Verificar permisos
      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const userData = userDoc.data();

      if (userData.rol !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para responder tickets'
        });
      }

      // Verificar que el ticket existe
      const ticketDoc = await db.collection('tickets').doc(id).get();

      if (!ticketDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Ticket no encontrado'
        });
      }

      // Actualizar el ticket
      await db.collection('tickets').doc(id).update({
        respuesta: respuesta.trim(),
        respuestaPor: userData.nombre,
        respuestaAt: admin.firestore.FieldValue.serverTimestamp(),
        estado: 'respondido',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({
        success: true,
        message: 'Ticket respondido exitosamente'
      });
    } catch (error) {
      console.error('❌ Error respondiendo ticket:', error);
      res.status(500).json({
        success: false,
        error: 'Error al responder ticket',
        message: error.message
      });
    }
  },

  /**
   * Cerrar un ticket
   * @route PATCH /api/tickets/:id/close
   * @access Private (creador del ticket o super_admin)
   */
  async closeTicket(req, res) {
    try {
      const { id } = req.params;

      // Verificar que el ticket existe
      const ticketDoc = await db.collection('tickets').doc(id).get();

      if (!ticketDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Ticket no encontrado'
        });
      }

      const ticketData = ticketDoc.data();

      // Verificar permisos del usuario
      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const userData = userDoc.data();

      // Solo el creador del ticket o super_admin pueden cerrarlo
      const isOwner = ticketData.usuarioId === req.user.uid;
      const isSuperAdmin = userData.rol === 'super_admin';

      if (!isOwner && !isSuperAdmin) {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para cerrar este ticket'
        });
      }

      // Cerrar el ticket
      await db.collection('tickets').doc(id).update({
        estado: 'cerrado',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({
        success: true,
        message: 'Ticket cerrado exitosamente'
      });
    } catch (error) {
      console.error('❌ Error cerrando ticket:', error);
      res.status(500).json({
        success: false,
        error: 'Error al cerrar ticket',
        message: error.message
      });
    }
  }
};
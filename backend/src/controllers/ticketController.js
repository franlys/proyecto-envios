// backend/src/controllers/ticketController.js
import { db } from '../config/firebase.js';
import admin from 'firebase-admin';

export const ticketController = {
  // Crear nuevo ticket
  async createTicket(req, res) {
    try {
      const { asunto, mensaje, prioridad, categoria } = req.body;

      if (!asunto || !mensaje) {
        return res.status(400).json({
          success: false,
          error: 'Asunto y mensaje son requeridos'
        });
      }

      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
      const userData = userDoc.data();

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

      const docRef = await db.collection('tickets').add(ticketData);

      res.status(201).json({
        success: true,
        message: 'Ticket creado exitosamente',
        ticketId: docRef.id
      });
    } catch (error) {
      console.error('Error creando ticket:', error);
      res.status(500).json({
        success: false,
        error: 'Error al crear ticket'
      });
    }
  },

  // Obtener tickets del usuario
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

      // Ordenar por fecha
      tickets.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });

      res.json({
        success: true,
        data: tickets  // ✅ CORREGIDO
      });
    } catch (error) {
      console.error('Error obteniendo tickets:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener tickets'
      });
    }
  },

  // Obtener todos los tickets (solo super_admin)
  async getAllTickets(req, res) {
    try {
      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
      const userData = userDoc.data();

      if (userData.rol !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para ver todos los tickets'
        });
      }

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

      // Ordenar: abiertos primero, luego por fecha
      tickets.sort((a, b) => {
        if (a.estado === 'abierto' && b.estado !== 'abierto') return -1;
        if (a.estado !== 'abierto' && b.estado === 'abierto') return 1;
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });

      res.json({
        success: true,
        data: tickets  // ✅ CORREGIDO
      });
    } catch (error) {
      console.error('Error obteniendo tickets:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener tickets'
      });
    }
  },

  // Responder ticket (solo super_admin)
  async respondTicket(req, res) {
    try {
      const { id } = req.params;
      const { respuesta } = req.body;

      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
      const userData = userDoc.data();

      if (userData.rol !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para responder tickets'
        });
      }

      if (!respuesta) {
        return res.status(400).json({
          success: false,
          error: 'La respuesta es requerida'
        });
      }

      await db.collection('tickets').doc(id).update({
        respuesta,
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
      console.error('Error respondiendo ticket:', error);
      res.status(500).json({
        success: false,
        error: 'Error al responder ticket'
      });
    }
  },

  // Cerrar ticket
  async closeTicket(req, res) {
    try {
      const { id } = req.params;

      const ticketDoc = await db.collection('tickets').doc(id).get();
      if (!ticketDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Ticket no encontrado'
        });
      }

      const ticketData = ticketDoc.data();

      // Solo el usuario que creó el ticket o super_admin pueden cerrarlo
      const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
      const userData = userDoc.data();

      if (ticketData.usuarioId !== req.user.uid && userData.rol !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para cerrar este ticket'
        });
      }

      await db.collection('tickets').doc(id).update({
        estado: 'cerrado',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({
        success: true,
        message: 'Ticket cerrado exitosamente'
      });
    } catch (error) {
      console.error('Error cerrando ticket:', error);
      res.status(500).json({
        success: false,
        error: 'Error al cerrar ticket'
      });
    }
  }
};
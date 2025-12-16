import { db } from '../config/firebase.js';
import whatsappService from '../services/whatsappService.js';

// ============================================
// 📅 CREAR SOLICITUD DE RECOLECCIÓN (CITA)
// ============================================
export const createSolicitud = async (req, res) => {
    try {
        const {
            clienteNombre,
            clienteTelefono,
            direccion,
            sector,
            referencia,
            fechaPreferida,
            horaPreferida,
            notas
        } = req.body;

        const companyId = req.userData?.companyId;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Usuario sin compañía asignada' });
        }

        if (!clienteNombre || !direccion) {
            return res.status(400).json({ success: false, error: 'Nombre y Dirección son obligatorios' });
        }

        const nuevaSolicitud = {
            companyId,
            creadoPor: req.userData.uid,
            cliente: {
                nombre: clienteNombre,
                telefono: clienteTelefono || '',
            },
            ubicacion: {
                direccion,
                sector: sector || '',
                referencia: referencia || ''
            },
            programacion: {
                fecha: fechaPreferida || new Date().toISOString().split('T')[0], // YYYY-MM-DD
                hora: horaPreferida || '09:00',
            },
            notas: notas || '',
            estado: 'pendiente', // pendiente, asignada, completada, cancelada
            recolectorId: null,
            recolectorNombre: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await db.collection('solicitudes_recoleccion').add(nuevaSolicitud);

        res.status(201).json({
            success: true,
            message: 'Solicitud de recolección creada correctamente',
            data: { id: docRef.id, ...nuevaSolicitud }
        });

    } catch (error) {
        console.error('❌ Error creando solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 📋 OBTENER SOLICITUDES (POOL o HISTORIAL)
// ============================================
export const getSolicitudes = async (req, res) => {
    try {
        const companyId = req.userData?.companyId;
        const { estado, recolectorId } = req.query;

        if (!companyId) return res.status(403).json({ error: 'Acceso denegado' });

        let query = db.collection('solicitudes_recoleccion')
            .where('companyId', '==', companyId);

        // Filtros
        if (estado) query = query.where('estado', '==', estado);
        if (recolectorId) query = query.where('recolectorId', '==', recolectorId);

        // Ordenar por fecha de creación (más recientes primero)
        // Nota: Requiere índice compuesto si se combina con filtros.
        // Por seguridad fall-back, ordenamos en memoria si falla.

        try {
            query = query.orderBy('createdAt', 'desc');
            const snapshot = await query.get();
            const solicitudes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return res.json({ success: true, data: solicitudes });
        } catch (error) {
            // Fallback sin order by
            const snapshot = await query.get();
            const solicitudes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            solicitudes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return res.json({ success: true, data: solicitudes });
        }

    } catch (error) {
        console.error('❌ Error obteniendo solicitudes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 🙋‍♂️ ASIGNAR/RECLAMAR SOLICITUD
// ============================================
/**
 * Asigna una solicitud a un recolector
 *
 * Casos de uso:
 * 1. Recolector toma la solicitud del pool (auto-asignación) - NO envía recolectorId
 * 2. Secretaria asigna a un recolector específico - SÍ envía recolectorId
 *
 * En caso 2, se notifica por WhatsApp y sistema al recolector asignado
 */
export const asignarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { recolectorId } = req.body; // El ID del usuario que la reclama (o asignado por admin)

        const companyId = req.userData?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Usuario sin compañía asignada' });
        }

        // Obtener datos de la solicitud
        const solicitudDoc = await db.collection('solicitudes_recoleccion').doc(id).get();
        if (!solicitudDoc.exists) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }
        const solicitudData = solicitudDoc.data();

        // ✅ DETERMINAR MODO DE ASIGNACIÓN
        const esAsignacionManual = Boolean(recolectorId); // Secretaria asigna
        const esAutoAsignacion = !recolectorId; // Recolector toma del pool

        const targetId = recolectorId || req.userData.uid;

        // Obtener datos del recolector
        const userDoc = await db.collection('usuarios').doc(targetId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, error: 'Recolector no encontrado' });
        }
        const userData = userDoc.data();
        const recolectorNombre = userData.nombre || 'Recolector';
        const recolectorTelefono = userData.telefono;

        // Obtener nombre de quien asigna (para logs y notificaciones)
        const asignadoPor = req.userData.uid;
        const asignadoPorDoc = await db.collection('usuarios').doc(asignadoPor).get();
        const asignadoPorNombre = asignadoPorDoc.exists ? asignadoPorDoc.data().nombre : 'Sistema';

        // Actualizar solicitud
        await db.collection('solicitudes_recoleccion').doc(id).update({
            estado: 'asignada',
            recolectorId: targetId,
            recolectorNombre: recolectorNombre,
            asignadoPor: asignadoPor,
            asignadoPorNombre: asignadoPorNombre,
            tipoAsignacion: esAsignacionManual ? 'manual' : 'auto',
            updatedAt: new Date().toISOString()
        });

        // ✅ NOTIFICACIONES: Solo si es asignación manual (Secretaria → Recolector)
        if (esAsignacionManual && recolectorTelefono) {
            const cliente = solicitudData.cliente || {};
            const ubicacion = solicitudData.ubicacion || {};
            const programacion = solicitudData.programacion || {};

            const mensajeWhatsapp = `📦 *Nueva Recolección Asignada*\n\nHola *${recolectorNombre}*,\n\nSe te ha asignado una nueva recolección:\n\n👤 *Cliente:* ${cliente.nombre}\n📞 *Teléfono:* ${cliente.telefono || 'No especificado'}\n📍 *Dirección:* ${ubicacion.direccion}\n🏘️ *Sector:* ${ubicacion.sector || 'No especificado'}\n📅 *Fecha programada:* ${programacion.fecha}\n🕐 *Hora:* ${programacion.hora}${ubicacion.referencia ? `\n🗺️ *Referencia:* ${ubicacion.referencia}` : ''}${solicitudData.notas ? `\n\n📝 *Notas:* ${solicitudData.notas}` : ''}\n\nAsignada por: *${asignadoPorNombre}*\n\n✅ Por favor coordina con el cliente para completar la recolección.`;

            // Enviar WhatsApp (no bloqueante)
            whatsappService.sendMessage(companyId, recolectorTelefono, mensajeWhatsapp)
                .then(() => console.log(`📲 Notificación WhatsApp enviada a recolector: ${recolectorNombre} (${recolectorTelefono})`))
                .catch(error => console.error('❌ Error enviando WhatsApp a recolector:', error));

            console.log(`✅ Asignación MANUAL: Secretaria ${asignadoPorNombre} asignó solicitud ${id} a recolector ${recolectorNombre}`);
        } else if (esAutoAsignacion) {
            console.log(`✅ Asignación AUTO: Recolector ${recolectorNombre} tomó solicitud ${id} del pool`);
        }

        res.json({
            success: true,
            message: esAsignacionManual
                ? `Solicitud asignada a ${recolectorNombre}. Notificación enviada.`
                : `Solicitud asignada exitosamente`,
            data: {
                id,
                recolectorId: targetId,
                estado: 'asignada',
                tipoAsignacion: esAsignacionManual ? 'manual' : 'auto'
            }
        });

    } catch (error) {
        console.error('❌ Error asignando solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 👥 OBTENER LISTA DE RECOLECTORES DISPONIBLES
// ============================================
/**
 * Endpoint para que Secretaria obtenga lista de recolectores
 * de su empresa para asignarles solicitudes
 */
export const getRecolectoresDisponibles = async (req, res) => {
    try {
        const companyId = req.userData?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Usuario sin compañía asignada' });
        }

        // Obtener todos los usuarios de la empresa con rol 'recolector'
        const snapshot = await db.collection('usuarios')
            .where('companyId', '==', companyId)
            .where('rol', '==', 'recolector')
            .where('activo', '==', true)
            .get();

        const recolectores = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                nombre: data.nombre || 'Recolector',
                telefono: data.telefono || null,
                email: data.email || null,
                zonaAsignada: data.zonaAsignada || null
            };
        });

        res.json({
            success: true,
            data: recolectores
        });

    } catch (error) {
        console.error('❌ Error obteniendo recolectores:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// ✅ COMPLETAR SOLICITUD (Convertir a Recolección)
// ============================================
// Esta función se llamará cuando el recolector genere la factura real
export const completarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { recoleccionRealId } = req.body; // ID de la factura creada

        await db.collection('solicitudes_recoleccion').doc(id).update({
            estado: 'completada',
            recoleccionRealId: recoleccionRealId || null,
            updatedAt: new Date().toISOString()
        });

        res.json({ success: true, message: 'Solicitud marcada como completada' });

    } catch (error) {
        console.error('❌ Error completando solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

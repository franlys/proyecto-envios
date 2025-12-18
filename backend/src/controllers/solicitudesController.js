import { db } from '../config/firebase.js';
import whatsappService from '../services/whatsappService.js';

// ============================================
// 📅 CREAR SOLICITUD PÚBLICA (Formulario Web/Bot)
// ============================================
/**
 * Endpoint PÚBLICO para crear solicitudes desde:
 * - Formulario web público (sin autenticación)
 * - Bot de WhatsApp
 *
 * NO requiere autenticación, solo companyId
 */
export const createSolicitudPublica = async (req, res) => {
    try {
        const {
            companyId,
            remitenteNombre,
            remitenteTelefono,
            remitenteEmail,
            remitenteDireccion,
            fechaPreferida,
            horaPreferida,
            items,
            fotos,
            notasAdicionales
        } = req.body;

        // Validar compañía existe
        if (!companyId) {
            return res.status(400).json({ success: false, error: 'companyId es requerido' });
        }

        const companyDoc = await db.collection('companies').doc(companyId).get();
        if (!companyDoc.exists) {
            return res.status(404).json({ success: false, error: 'Compañía no encontrada' });
        }

        // Validar campos mínimos
        if (!remitenteNombre || !remitenteDireccion) {
            return res.status(400).json({ success: false, error: 'Nombre y Dirección son obligatorios' });
        }

        const nuevaSolicitud = {
            companyId,
            creadoPor: 'publico', // Marca que viene del formulario público
            cliente: {
                nombre: remitenteNombre,
                telefono: remitenteTelefono || '',
                email: remitenteEmail || ''
            },
            ubicacion: {
                direccion: remitenteDireccion,
                sector: '',
                referencia: ''
            },
            programacion: {
                fecha: fechaPreferida || new Date().toISOString().split('T')[0],
                hora: horaPreferida || '09:00',
            },
            items: items || [],
            fotos: fotos || [],
            notas: notasAdicionales || '',
            estado: 'pendiente',
            recolectorId: null,
            recolectorNombre: null,
            fechaAsignacion: null,
            fechaLimiteAceptacion: null, // Se establece cuando secretaria asigna
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await db.collection('solicitudes_recoleccion').add(nuevaSolicitud);

        // Enviar confirmación por WhatsApp al cliente
        if (remitenteTelefono) {
            const companyData = companyDoc.data();
            const companyName = companyData.nombre || 'Nuestra empresa';

            const mensajeConfirmacion = `✅ *Solicitud de Recolección Confirmada*\n\nHola *${remitenteNombre}*,\n\nTu solicitud de recolección ha sido recibida exitosamente.\n\n📅 *Fecha solicitada:* ${nuevaSolicitud.programacion.fecha}\n🕐 *Hora:* ${nuevaSolicitud.programacion.hora}\n📍 *Dirección:* ${remitenteDireccion}\n\nPronto un recolector se pondrá en contacto contigo.\n\nGracias por confiar en *${companyName}*.`;

            whatsappService.sendMessage(companyId, remitenteTelefono, mensajeConfirmacion)
                .catch(err => console.error('❌ Error enviando confirmación al cliente:', err));
        }

        console.log(`✅ Solicitud pública creada: ${docRef.id} para ${remitenteNombre}`);

        res.status(201).json({
            success: true,
            message: 'Solicitud creada exitosamente. Te contactaremos pronto.',
            data: { id: docRef.id, ...nuevaSolicitud }
        });

    } catch (error) {
        console.error('❌ Error creando solicitud pública:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

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
            const queryConOrden = query.orderBy('createdAt', 'desc');
            const snapshot = await queryConOrden.get();
            const solicitudes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return res.json({ success: true, data: solicitudes });
        } catch (error) {
            // Fallback sin order by (usa la query ORIGINAL sin .orderBy)
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

        // 🕐 Calcular tiempo límite de aceptación (solo para asignación manual)
        let fechaLimiteAceptacion = null;
        if (esAsignacionManual) {
            const ahora = new Date();
            const limite = new Date(ahora.getTime() + 10 * 60 * 1000); // +10 minutos
            fechaLimiteAceptacion = limite.toISOString();
        }

        // Actualizar solicitud
        // ✅ CORRECCIÓN: Siempre usar 'asignada', sin estado intermedio 'asignada_pendiente'
        const updateData = {
            estado: 'asignada',
            recolectorId: targetId,
            recolectorNombre: recolectorNombre,
            asignadoPor: asignadoPor,
            asignadoPorNombre: asignadoPorNombre,
            tipoAsignacion: esAsignacionManual ? 'manual' : 'auto',
            fechaAsignacion: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (fechaLimiteAceptacion) {
            updateData.fechaLimiteAceptacion = fechaLimiteAceptacion;
        }

        await db.collection('solicitudes_recoleccion').doc(id).update(updateData);

        // ✅ NOTIFICACIONES: Solo si es asignación manual (Secretaria → Recolector)
        if (esAsignacionManual && recolectorTelefono) {
            const cliente = solicitudData.cliente || {};
            const ubicacion = solicitudData.ubicacion || {};
            const programacion = solicitudData.programacion || {};

            const mensajeWhatsapp = `📦 *Nueva Recolección Asignada*\n\nHola *${recolectorNombre}*,\n\nSe te ha asignado una nueva recolección:\n\n👤 *Cliente:* ${cliente.nombre}\n📞 *Teléfono:* ${cliente.telefono || 'No especificado'}\n📍 *Dirección:* ${ubicacion.direccion}\n🏘️ *Sector:* ${ubicacion.sector || 'No especificado'}\n📅 *Fecha programada:* ${programacion.fecha}\n🕐 *Hora:* ${programacion.hora}${ubicacion.referencia ? `\n🗺️ *Referencia:* ${ubicacion.referencia}` : ''}${solicitudData.notas ? `\n\n📝 *Notas:* ${solicitudData.notas}` : ''}\n\nAsignada por: *${asignadoPorNombre}*\n\n✅ *Ingresa al sistema para crear la recolección.*`;

            // Enviar WhatsApp (no bloqueante)
            whatsappService.sendMessage(companyId, recolectorTelefono, mensajeWhatsapp)
                .then(() => console.log(`📲 Notificación WhatsApp enviada a recolector: ${recolectorNombre} (${recolectorTelefono})`))
                .catch(error => console.error('❌ Error enviando WhatsApp a recolector:', error));

            console.log(`✅ Asignación MANUAL: Secretaria ${asignadoPorNombre} asignó solicitud ${id} a recolector ${recolectorNombre} (límite: 10 min)`);
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
// ✅ ACEPTAR SOLICITUD (Recolector confirma)
// ============================================
/**
 * El recolector acepta la solicitud asignada por la secretaria
 * - Cambia estado de asignada_pendiente a asignada
 * - Notifica al cliente por WhatsApp/Email
 */
export const aceptarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.userData?.companyId;
        const recolectorId = req.userData?.uid;

        if (!companyId || !recolectorId) {
            return res.status(403).json({ success: false, error: 'Usuario no autenticado' });
        }

        // Obtener solicitud
        const solicitudDoc = await db.collection('solicitudes_recoleccion').doc(id).get();
        if (!solicitudDoc.exists) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        const solicitudData = solicitudDoc.data();

        // Validar que esté asignada al recolector que acepta
        if (solicitudData.recolectorId !== recolectorId) {
            return res.status(403).json({ success: false, error: 'Esta solicitud no te fue asignada' });
        }

        // Validar que esté en estado pendiente
        if (solicitudData.estado !== 'asignada_pendiente') {
            return res.status(400).json({ success: false, error: 'Esta solicitud ya fue aceptada o expiró' });
        }

        // Verificar que no haya expirado el tiempo límite
        if (solicitudData.fechaLimiteAceptacion) {
            const limite = new Date(solicitudData.fechaLimiteAceptacion);
            const ahora = new Date();
            if (ahora > limite) {
                // Expiró - devolver al pool
                await db.collection('solicitudes_recoleccion').doc(id).update({
                    estado: 'pendiente',
                    recolectorId: null,
                    recolectorNombre: null,
                    fechaAsignacion: null,
                    fechaLimiteAceptacion: null,
                    motivoRechazo: 'Tiempo límite excedido (10 minutos)',
                    updatedAt: new Date().toISOString()
                });

                return res.status(400).json({
                    success: false,
                    error: 'El tiempo para aceptar esta solicitud ha expirado. Ha vuelto al pool.'
                });
            }
        }

        // Actualizar a estado aceptado
        await db.collection('solicitudes_recoleccion').doc(id).update({
            estado: 'asignada',
            fechaAceptacion: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // 📲 NOTIFICAR AL CLIENTE
        const cliente = solicitudData.cliente || {};
        const ubicacion = solicitudData.ubicacion || {};
        const programacion = solicitudData.programacion || {};

        if (cliente.telefono) {
            const mensajeCliente = `✅ *Recolección Confirmada*\n\nHola *${cliente.nombre}*,\n\nTu recolección ha sido confirmada.\n\n👤 *Recolector asignado:* ${solicitudData.recolectorNombre}\n📅 *Fecha:* ${programacion.fecha}\n🕐 *Hora:* ${programacion.hora}\n📍 *Dirección:* ${ubicacion.direccion}\n\nEl recolector se pondrá en contacto contigo pronto.\n\nGracias por tu preferencia.`;

            whatsappService.sendMessage(companyId, cliente.telefono, mensajeCliente)
                .then(() => console.log(`📲 Cliente notificado: ${cliente.nombre} (${cliente.telefono})`))
                .catch(err => console.error('❌ Error notificando cliente:', err));
        }

        console.log(`✅ Solicitud ${id} aceptada por recolector ${solicitudData.recolectorNombre}`);

        res.json({
            success: true,
            message: 'Solicitud aceptada. El cliente ha sido notificado.',
            data: { id, estado: 'asignada' }
        });

    } catch (error) {
        console.error('❌ Error aceptando solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// ❌ RECHAZAR SOLICITUD (Recolector declina)
// ============================================
/**
 * El recolector rechaza la solicitud asignada
 * - La solicitud vuelve al pool (estado pendiente)
 * - Queda disponible para otros recolectores
 */
export const rechazarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        const companyId = req.userData?.companyId;
        const recolectorId = req.userData?.uid;

        if (!companyId || !recolectorId) {
            return res.status(403).json({ success: false, error: 'Usuario no autenticado' });
        }

        // Obtener solicitud
        const solicitudDoc = await db.collection('solicitudes_recoleccion').doc(id).get();
        if (!solicitudDoc.exists) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        const solicitudData = solicitudDoc.data();

        // Validar que esté asignada al recolector que rechaza
        if (solicitudData.recolectorId !== recolectorId) {
            return res.status(403).json({ success: false, error: 'Esta solicitud no te fue asignada' });
        }

        // Devolver al pool
        await db.collection('solicitudes_recoleccion').doc(id).update({
            estado: 'pendiente',
            recolectorId: null,
            recolectorNombre: null,
            fechaAsignacion: null,
            fechaLimiteAceptacion: null,
            fechaRechazo: new Date().toISOString(),
            motivoRechazo: motivo || 'Recolector no disponible',
            rechazadoPor: recolectorId,
            updatedAt: new Date().toISOString()
        });

        console.log(`❌ Solicitud ${id} rechazada por ${solicitudData.recolectorNombre}. Vuelta al pool.`);

        res.json({
            success: true,
            message: 'Solicitud rechazada. Ha vuelto al pool de solicitudes disponibles.',
            data: { id, estado: 'pendiente' }
        });

    } catch (error) {
        console.error('❌ Error rechazando solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// ✅ COMPLETAR SOLICITUD (Recolector crea recolección)
// ============================================
/**
 * El recolector completó la recolección y creó el registro
 * - Cambia estado de asignada a completada
 * - Guarda referencia al código de recolección
 */
export const completarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { codigoRecoleccion } = req.body;
        const companyId = req.userData?.companyId;
        const recolectorId = req.userData?.uid;

        if (!companyId || !recolectorId) {
            return res.status(403).json({ success: false, error: 'Usuario no autenticado' });
        }

        // Obtener solicitud
        const solicitudDoc = await db.collection('solicitudes_recoleccion').doc(id).get();
        if (!solicitudDoc.exists) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        const solicitudData = solicitudDoc.data();

        // Validar que esté asignada al recolector que completa
        if (solicitudData.recolectorId !== recolectorId) {
            return res.status(403).json({ success: false, error: 'Esta solicitud no te fue asignada' });
        }

        // Marcar como completada
        await db.collection('solicitudes_recoleccion').doc(id).update({
            estado: 'completada',
            fechaCompletada: new Date().toISOString(),
            codigoRecoleccion: codigoRecoleccion || null,
            updatedAt: new Date().toISOString()
        });

        console.log(`✅ Solicitud ${id} completada por recolector ${solicitudData.recolectorNombre}`);

        res.json({
            success: true,
            message: 'Solicitud marcada como completada exitosamente.',
            data: { id, estado: 'completada', codigoRecoleccion }
        });

    } catch (error) {
        console.error('❌ Error completando solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// 🔄 VERIFICAR SOLICITUDES EXPIRADAS (Cron Job)
// ============================================
/**
 * Función para verificar solicitudes con tiempo límite expirado
 * Se debe llamar periódicamente (cada 1 minuto) desde un cron job
 * o cuando se carga la lista de solicitudes
 */
export const verificarSolicitudesExpiradas = async () => {
    try {
        const ahora = new Date();

        // Buscar solicitudes asignadas_pendiente con tiempo expirado
        const snapshot = await db.collection('solicitudes_recoleccion')
            .where('estado', '==', 'asignada_pendiente')
            .get();

        const batch = db.batch();
        let contador = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.fechaLimiteAceptacion) {
                const limite = new Date(data.fechaLimiteAceptacion);
                if (ahora > limite) {
                    // Expiró - devolver al pool
                    batch.update(doc.ref, {
                        estado: 'pendiente',
                        recolectorId: null,
                        recolectorNombre: null,
                        fechaAsignacion: null,
                        fechaLimiteAceptacion: null,
                        motivoRechazo: 'Tiempo límite excedido (10 minutos)',
                        fechaExpiracion: ahora.toISOString(),
                        updatedAt: ahora.toISOString()
                    });
                    contador++;
                    console.log(`⏰ Solicitud ${doc.id} expirada. Devuelta al pool.`);
                }
            }
        });

        if (contador > 0) {
            await batch.commit();
            console.log(`✅ ${contador} solicitud(es) expirada(s) devuelta(s) al pool`);
        }

        return contador;

    } catch (error) {
        console.error('❌ Error verificando solicitudes expiradas:', error);
        return 0;
    }
};

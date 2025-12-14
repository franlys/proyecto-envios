import { db } from '../config/firebase.js';

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
export const asignarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { recolectorId } = req.body; // El ID del usuario que la reclama (o asignado por admin)

        // Si no se envía recolectorId, asumir el usuario actual (Auto-asignación del Pool)
        const targetId = recolectorId || req.userData.uid;

        // Obtener nombre del recolector
        const userDoc = await db.collection('usuarios').doc(targetId).get();
        if (!userDoc.exists) return res.status(404).json({ error: 'Recolector no encontrado' });
        const recolectorNombre = userDoc.data().nombre;

        await db.collection('solicitudes_recoleccion').doc(id).update({
            estado: 'asignada',
            recolectorId: targetId,
            recolectorNombre: recolectorNombre,
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Solicitud asignada a ${recolectorNombre}`,
            data: { id, recolectorId: targetId, estado: 'asignada' }
        });

    } catch (error) {
        console.error('❌ Error asignando solicitud:', error);
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

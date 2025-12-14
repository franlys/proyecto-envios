
import { db } from '../config/firebase.js';

// ============================================
// 📊 GENERAR REPORTE 606 (Compras y Gastos)
// ============================================
export const getReporte606 = async (req, res) => {
    try {
        const { id: companyId } = req.params;
        const { year, month } = req.query;

        if (!year || !month) {
            return res.status(400).json({ success: false, error: 'Año y Mes son requeridos' });
        }

        console.log(`📊 Generando Reporte 606 para Compañía ${companyId} - ${month}/${year}`);

        // Calcular rango de fechas (Inicio y Fin de mes)
        // Nota: month es 1-based (1 = Enero)
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59); // Último día del mes

        // Buscar gastos de la compañía en ese rango

        // 🔒 RESTRICCIÓN SAAS: Verificar Plan
        const companyDoc = await db.collection('companies').doc(companyId).get();
        if (!companyDoc.exists) return res.status(404).json({ success: false, error: 'Compañía no encontrada' });

        if (companyDoc.data().plan !== 'smart') {
            return res.status(403).json({
                success: false,
                error: 'El Reporte 606 solo está disponible en el plan SMART.'
            });
        }

        // Importante: Debemos tener un índice compuesto en Firestore para [companyId + fecha]
        // Si no existe, Firebase arrojará error con el link para crearlo.
        const snapshot = await db.collection('gastos')
            .where('companyId', '==', companyId)
            .where('fecha', '>=', startDate)
            .where('fecha', '<=', endDate)
            .get();

        const reporte = [];
        let totalMonto = 0;
        let totalItbis = 0;

        snapshot.forEach(doc => {
            const data = doc.data();

            // FILTRO: Solo gastos con NCF válido (Fiscales)
            if (data.ncf && data.rnc) {

                // Estructura simplificada para DGII 606
                const monto = parseFloat(data.monto) || 0;

                // Estimación de ITBIS (Si no lo guardamos explícitamente, asumumos 18% incluido o cero?)
                // En un sistema real de contabilidad, el ITBIS debe guardarse por separado al crear el gasto.
                // Por ahora, asumiremos que el monto es el total y el ITBIS es 0 si no está desglosado,
                // O si implementamos desglose en el futuro, lo leeremos de data.itbis.
                // Para MVP: ITBIS = 0 (Usuario debe editar o implementar desglose luego).
                const itbis = data.itbis ? parseFloat(data.itbis) : 0;

                // Fecha Comprobante: AAAAMMDD
                // Usamos la fecha del gasto
                const fechaGasto = data.fecha.toDate ? data.fecha.toDate() : new Date(data.fecha);
                const yyyy = fechaGasto.getFullYear();
                const mm = String(fechaGasto.getMonth() + 1).padStart(2, '0');
                const dd = String(fechaGasto.getDate()).padStart(2, '0');
                const fechaComprobante = `${yyyy}${mm}${dd}`;

                const item = {
                    rnc: data.rnc.replace(/[^0-9]/g, ''), // Solo números
                    tipoId: data.rnc.length === 9 ? 1 : 2, // 1=RNC, 2=Cédula (aprox)
                    tipoBienes: '02', // 02 = Gastos por Trabajos, Suministros y Servicios (Default común)
                    ncf: data.ncf,
                    ncfModificado: '', // Para notas de crédito/débito
                    fechaComprobante,
                    fechaPago: fechaComprobante, // Asumimos pago inmediato por ahora
                    montoFacturado: (monto - itbis).toFixed(2), // Base imponible
                    itbisFacturado: itbis.toFixed(2),
                    itbisRetenido: '0.00',
                    montoTotal: monto.toFixed(2),
                    tipoPago: '01' // 01 = Efectivo (Default)
                };

                reporte.push(item);
                totalMonto += monto;
                totalItbis += itbis;
            }
        });

        res.json({
            success: true,
            data: reporte,
            meta: {
                totalRegistros: reporte.length,
                totalMonto: totalMonto.toFixed(2),
                totalItbis: totalItbis.toFixed(2),
                periodo: `${year}${String(month).padStart(2, '0')}`
            }
        });

    } catch (error) {
        console.error('❌ Error generando Reporte 606:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

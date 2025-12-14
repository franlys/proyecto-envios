
import { db } from '../config/firebase.js';

/**
 * Obtiene el siguiente NCF disponible para una compañía y actualiza la secuencia de forma atómica.
 * @param {string} companyId - ID de la compañía
 * @param {string} type - Tipo de NCF (ej: 'B01', 'B02', 'B14', 'B15')
 * @returns {Promise<string>} - El NCF completo generado (ej: 'B0200000005')
 */
export const getNextNCF = async (companyId, type) => {
    if (!companyId || !type) throw new Error('CompanyId y Type son requeridos para generar NCF');

    const companyRef = db.collection('companies').doc(companyId);

    try {
        const ncfGenerado = await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(companyRef);

            if (!doc.exists) {
                throw new Error('Compañía no encontrada');
            }

            const data = doc.data();

            // 🔒 RESTRICCIÓN SAAS: Solo plan SMART
            if (data.plan !== 'smart') {
                throw new Error('La emisión automática de NCF requiere el plan SMART.');
            }

            const sequences = data.ncfSequences || {};

            // Obtener secuencia actual, o iniciar en 0 si no existe (aunque config fiscal debería existir)
            // La secuencia guardada es el ÚLTIMO usado, así que el siguiente es +1
            // O podemos asumir que es el PRÓXIMO a usar.
            // Estandar: Guardamos el ULTIMO generado.

            // Si el usuario ingresó "B0100000000", el sistema debe saber parsearlo.
            // Asumiremos que en config guardamos el NCF COMPLETO "B020000100" o solo la secuencia numérica?
            // Revisando el frontend, guardamos el NCF COMPLETO ej "B0200000001".

            const currentNCF = sequences[type];

            let nextSequenceNumber = 1;

            if (currentNCF) {
                // Extraer la parte numérica (últimos 8 dígitos estándar, pero permitamos flexibilidad)
                // Formato esperado: B02 + 8 digitos
                const prefix = type; // "B02"
                if (currentNCF.startsWith(prefix)) {
                    const numberPart = currentNCF.substring(prefix.length); // "00000005"
                    const currentNumber = parseInt(numberPart, 10);
                    if (!isNaN(currentNumber)) {
                        nextSequenceNumber = currentNumber + 1;
                    }
                }
            }

            // Validar fecha de vencimiento si existe (Opcional, pero recomendado)
            if (data.ncfExpiry) {
                const expiry = new Date(data.ncfExpiry);
                if (new Date() > expiry) {
                    throw new Error(`Los NCFs vencieron el ${data.ncfExpiry}. Por favor actualice la configuración fiscal.`);
                }
            }

            // Formatear nuevo NCF: B02 + 00000006 (Padding a 8 dígitos)
            const nextSequenceStr = nextSequenceNumber.toString().padStart(8, '0');
            const nextNCF = `${type}${nextSequenceStr}`;

            // Actualizar la secuencia en Firestore
            transaction.update(companyRef, {
                [`ncfSequences.${type}`]: nextNCF,
                updatedAt: new Date().toISOString()
            });

            console.log(`✅ NCF Generado para ${companyId} [${type}]: ${nextNCF}`);
            return nextNCF;
        });

        return ncfGenerado;

    } catch (error) {
        console.error('❌ Error generando NCF:', error);
        throw error;
    }
};

// backend/src/controllers/nominaController.js
import { db } from '../config/firebase.js';
import { generateBHDFile } from '../utils/bankGenerators/bhdGenerator.js';
import { generatePopularFile } from '../utils/bankGenerators/popularGenerator.js';
import { generateBanreservasFile } from '../utils/bankGenerators/banreservasGenerator.js';

/**
 * Genera el archivo de pago para el banco seleccionado.
 * Recibe: { banco: 'BHD' | 'POPULAR', nomina: [{ userId, monto, nombre (opcional) }] }
 */
export const generarArchivoBanco = async (req, res) => {
    try {
        const { banco, nomina } = req.body;
        const companyId = req.userData.companyId;

        if (!nomina || !Array.isArray(nomina) || nomina.length === 0) {
            return res.status(400).json({ error: 'La lista de nómina es requerida y no puede estar vacía' });
        }

        // 1. Obtener datos de la empresa (para el Header del archivo)
        const companyDoc = await db.collection('companies').doc(companyId).get();
        const companyName = companyDoc.exists ? companyDoc.data().nombre : 'EMPRESA';

        // 2. Enriquecer datos de empleados (Buscar Cuentas y Cédulas en DB)
        const payments = [];
        const errors = [];

        // Usamos Promise.all para paralelarizar lecturas
        await Promise.all(nomina.map(async (item) => {
            // Si el frontend manda el objeto completo (nombre, cuenta, cedula), lo usamos (Modo Manual)
            // Si manda solo userId, buscamos en DB (Modo Seguro)

            let paymentData = { ...item };

            if (item.userId) {
                const userDoc = await db.collection('usuarios').doc(item.userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    // Priorizar datos de DB sobre los del frontend
                    paymentData.nombre = userData.nombre || item.nombre;
                    paymentData.cedula = userData.cedula || userData.dni || '';
                    paymentData.cuenta = userData.cuentaBanco || '';
                    paymentData.banco = userData.banco || '';
                }
            }

            // Validaciones mínimas
            if (!paymentData.cuenta) {
                errors.push(`El empleado ${paymentData.nombre} no tiene número de cuenta configurado.`);
            } else if (!paymentData.cedula) {
                errors.push(`El empleado ${paymentData.nombre} no tiene cédula configurada.`);
            } else {
                payments.push(paymentData);
            }
        }));

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Datos incompletos para generar el archivo',
                details: errors
            });
        }

        // 3. Generar el archivo según el banco
        let fileContent = '';
        let fileName = '';

        if (banco === 'BHD' || banco === 'bhd') {
            fileContent = generateBHDFile(payments, companyName);
            fileName = `Nomina_BHD_${new Date().toISOString().split('T')[0]}.txt`;
        } else if (banco === 'POPULAR' || banco === 'popular') {
            fileContent = generatePopularFile(payments, companyName);
            fileName = `Nomina_Popular_${new Date().toISOString().split('T')[0]}.txt`;
        } else if (banco === 'BANRESERVAS' || banco === 'banreservas') {
            fileContent = generateBanreservasFile(payments, companyName);
            fileName = `Nomina_Banreservas_${new Date().toISOString().split('T')[0]}.txt`;
        } else {
            return res.status(400).json({ error: `Banco no soportado: ${banco}` });
        }

        // 4. Enviar archivo
        // Enviamos como texto plano para que el frontend lo descargue
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.json({
            success: true,
            fileName,
            content: fileContent
        });

    } catch (error) {
        console.error('Error generando archivo de banco:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

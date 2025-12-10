
import 'dotenv/config';
import { db } from './src/config/firebase.js';

async function debugFinanzas() {
    const companyId = 'embarques_ivan'; // The company ID we are debugging
    const dateRange = '30';

    console.log(`🔍 Debugging finances for company: ${companyId}`);

    try {
        // Calcular fechas
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - parseInt(dateRange));

        console.log(`📅 Date range: ${startDate.toISOString()} to ${now.toISOString()}`);

        // 1. Test Recolecciones Query (Ingresos)
        console.log("👉 Testing 'recolecciones' query (Ingresos)...");
        try {
            const facturasSnapshot = await db.collection('recolecciones')
                .where('companyId', '==', companyId)
                .where('estado', '==', 'entregada')
                .where('fechaEntrega', '>=', startDate)
                .get();
            console.log(`✅ 'recolecciones' query success. Found ${facturasSnapshot.size} docs.`);
        } catch (error) {
            console.error("❌ 'recolecciones' query FAILED:", error.message);
            if (error.code === 9 || error.message.includes('index')) { // FAILED_PRECONDITION
                console.error("💡 Likely missing index. Check the link in the error message above if available.");
            }
        }

        // 2. Test Facturas Activas Query
        console.log("👉 Testing 'facturas activas' query...");
        try {
            const facturasActivasSnapshot = await db.collection('recolecciones')
                .where('companyId', '==', companyId)
                .where('estado', 'in', ['pendiente', 'en_ruta', 'en_almacen', 'recolectada'])
                .get();
            console.log(`✅ 'facturas activas' query success. Found ${facturasActivasSnapshot.size} docs.`);
        } catch (error) {
            console.error("❌ 'facturas activas' query FAILED:", error.message);
            if (error.code === 9 || error.message.includes('index')) {
                console.error("💡 Likely missing index.");
            }
        }

        // 3. Test Pagos Repartidores
        console.log("👉 Testing 'pagos_repartidores' query...");
        try {
            const pagosRepartidoresSnapshot = await db.collection('pagos_repartidores')
                .where('companyId', '==', companyId)
                .where('fecha', '>=', startDate)
                .get();
            console.log(`✅ 'pagos_repartidores' query success. Found ${pagosRepartidoresSnapshot.size} docs.`);
        } catch (error) {
            console.error("❌ 'pagos_repartidores' query FAILED:", error.message);
            if (error.code === 9 || error.message.includes('index')) {
                console.error("💡 Likely missing index.");
            }
        }

        // 4. Test Gastos Operacionales
        console.log("👉 Testing 'gastos_operacionales' query...");
        try {
            const gastosSnapshot = await db.collection('gastos_operacionales')
                .where('companyId', '==', companyId)
                .where('fecha', '>=', startDate)
                .get();
            console.log(`✅ 'gastos_operacionales' query success. Found ${gastosSnapshot.size} docs.`);
        } catch (error) {
            console.error("❌ 'gastos_operacionales' query FAILED:", error.message);
            if (error.code === 9 || error.message.includes('index')) {
                console.error("💡 Likely missing index.");
            }
        }

    } catch (error) {
        console.error("💥 General script error:", error);
    }
}

debugFinanzas();

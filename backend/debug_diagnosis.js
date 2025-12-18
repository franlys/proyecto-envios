import dotenv from 'dotenv';
dotenv.config();
import { db } from './src/config/firebase.js';

import fs from 'fs';

function log(msg) {
    console.log(msg);
    fs.appendFileSync('diagnosis_result.txt', msg + '\n');
}

async function diagnose() {
    try {
        fs.writeFileSync('diagnosis_result.txt', 'INICIO DIAGNOSTICO\n');
        log('🔍 Iniciando diagnóstico...');

        log('\n--- 🏢 BUSCANDO COMPAÑÍA ---');
        const companiesSnapshot = await db.collection('companies').get();

        let targetCompany = null;
        companiesSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.nombre === 'Embarques Ivan' || doc.id === 'embarques_ivan' || JSON.stringify(data).includes('ivan')) {
                log(`✅ Encontrada coincidencia: ID=${doc.id}, Nombre=${data.nombre}`);
                targetCompany = { id: doc.id, ...data };
            }
        });

        if (!targetCompany) {
            log('❌ No se encontró la compañía. Listando primeras 3:');
            companiesSnapshot.docs.slice(0, 3).forEach(doc => log(`- ${doc.id}: ${doc.data().nombre}`));
            return;
        }

        log(`\n📋 DATOS DE COMPAÑÍA (${targetCompany.id}):`);
        log(`- active: ${targetCompany.active} (Tipo: ${typeof targetCompany.active})`);
        log(`- plan: ${targetCompany.plan}`);

        const companyId = targetCompany.id;
        let query = db.collection('solicitudes_recoleccion').where('companyId', '==', companyId);

        log('\n--- 🧪 SIMULANDO QUERY ---');
        const queryEstado = query.where('estado', '==', 'pendiente');
        try {
            const snap = await queryEstado.get();
            log(`   ✅ Query simple OK: ${snap.size} docs`);
        } catch (e) {
            log(`   ❌ Query simple FALLÓ: ${e.message}`);
        }

        try {
            const queryOrden = queryEstado.orderBy('createdAt', 'desc');
            await queryOrden.get();
            log(`   ✅ Query con OrderBy OK`);
        } catch (e) {
            log(`   ⚠️ Query con OrderBy FALLÓ: ${e.message}`);
            try {
                const snap = await queryEstado.get();
                const solicitudes = snap.docs.map(d => d.data());
                solicitudes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                log('   ✅ Fallback Manual OK');
            } catch (e2) {
                log(`   ❌ Fallback FALLÓ: ${e2.message}`);
            }
        }

    } catch (error) {
        log(`❌ Error general: ${error.message}`);
        if (error.stack) log(error.stack);
    }
}

diagnose();

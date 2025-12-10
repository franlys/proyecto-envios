// Test script para verificar la generación de URLs de fotos
import dotenv from 'dotenv';
dotenv.config();

import { db, storage } from './src/config/firebase.js';

async function testPhotoUrls() {
  try {
    console.log('\n🔍 Buscando facturas con fotos de entrega...\n');

    // Buscar facturas entregadas recientes con fotos
    const snapshot = await db.collection('facturas')
      .where('estado', '==', 'entregada')
      .orderBy('fechaEntrega', 'desc')
      .limit(3)
      .get();

    if (snapshot.empty) {
      console.log('❌ No se encontraron facturas entregadas con fotos');
      process.exit(0);
    }

    console.log(`✅ Encontradas ${snapshot.size} facturas entregadas\n`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log(`\n📦 Factura: ${data.codigoTracking || doc.id}`);
      console.log(`   Estado: ${data.estado}`);
      console.log(`   Fecha entrega: ${data.fechaEntrega}`);

      if (data.fotosEntrega && data.fotosEntrega.length > 0) {
        console.log(`   ✅ Tiene ${data.fotosEntrega.length} fotos`);

        for (let i = 0; i < data.fotosEntrega.length; i++) {
          const fotoUrl = data.fotosEntrega[i];
          console.log(`\n   📸 Foto ${i + 1}:`);
          console.log(`      URL original: ${fotoUrl.substring(0, 80)}...`);

          // Intentar generar URL pública
          try {
            let filePath = fotoUrl;

            // Si es una URL completa de Firebase Storage, extraer el path
            if (fotoUrl.includes('firebasestorage.googleapis.com')) {
              const urlParts = fotoUrl.split('/o/')[1];
              if (urlParts) {
                filePath = decodeURIComponent(urlParts.split('?')[0]);
              }
            }

            console.log(`      Path extraído: ${filePath.substring(0, 60)}...`);

            const bucket = storage.bucket();
            const file = bucket.file(filePath);

            // Verificar si el archivo existe
            const [exists] = await file.exists();
            console.log(`      ¿Existe el archivo? ${exists ? '✅' : '❌'}`);

            if (exists) {
              // Intentar hacer público
              try {
                await file.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
                console.log(`      ✅ URL pública generada:`);
                console.log(`         ${publicUrl.substring(0, 80)}...`);
              } catch (makePublicError) {
                console.log(`      ⚠️ No se pudo hacer público: ${makePublicError.message}`);

                // Intentar con signed URL
                try {
                  const [signedUrl] = await file.getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
                  });
                  console.log(`      ✅ URL firmada generada:`);
                  console.log(`         ${signedUrl.substring(0, 80)}...`);
                } catch (signedError) {
                  console.log(`      ❌ Error generando signed URL: ${signedError.message}`);
                }
              }
            }
          } catch (error) {
            console.error(`      ❌ Error procesando foto: ${error.message}`);
          }
        }
      } else {
        console.log(`   ⚠️ No tiene fotos de entrega`);
      }
    }

    console.log('\n✅ Análisis completado\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPhotoUrls();

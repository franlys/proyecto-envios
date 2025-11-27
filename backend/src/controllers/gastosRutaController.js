// backend/src/controllers/gastosRutaController.js
/**
 * CONTROLADOR DE GASTOS DE RUTA
 * Gestión de gastos del repartidor durante la ruta
 */

import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

// ==========================================================================
// 💰 AGREGAR GASTO A UNA RUTA
// ==========================================================================
export const agregarGasto = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const { tipo, monto, descripcion } = req.body;
    const repartidorId = req.user?.uid || req.userData?.uid;
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    const nombreRepartidor = userDoc.data()?.nombre || req.userData?.nombre || 'Repartidor';
    const companyId = userDoc.data()?.companyId;

    console.log(`💰 Agregando gasto a ruta ${rutaId}:`, { tipo, monto });

    // Validaciones
    if (!tipo || !monto) {
      return res.status(400).json({
        success: false,
        message: 'Tipo y monto son requeridos'
      });
    }

    if (isNaN(monto) || parseFloat(monto) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto debe ser un número positivo'
      });
    }

    const rutaRef = db.collection('rutas').doc(rutaId);
    const doc = await rutaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    const rutaData = doc.data();

    // Validar permisos
    if (rutaData.companyId !== companyId || rutaData.repartidorId !== repartidorId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para agregar gastos a esta ruta'
      });
    }

    // Crear objeto de gasto
    const nuevoGasto = {
      id: `gasto_${Date.now()}`,
      tipo: tipo.trim(),
      monto: parseFloat(monto),
      descripcion: descripcion?.trim() || '',
      fecha: new Date().toISOString(),
      registradoPor: repartidorId,
      nombreRegistrador: nombreRepartidor
    };

    // Obtener gastos actuales
    const gastosActuales = rutaData.gastos || [];
    gastosActuales.push(nuevoGasto);

    // Calcular nuevo total de gastos
    const totalGastos = gastosActuales.reduce((sum, g) => sum + (g.monto || 0), 0);

    // Actualizar ruta
    await rutaRef.update({
      gastos: gastosActuales,
      totalGastos: totalGastos,
      updatedAt: new Date().toISOString(),
      historial: FieldValue.arrayUnion({
        accion: 'gasto_agregado',
        descripcion: `Gasto agregado: ${tipo} - $${monto}`,
        usuario: repartidorId,
        nombreUsuario: nombreRepartidor,
        fecha: new Date().toISOString()
      })
    });

    console.log(`✅ Gasto agregado: ${tipo} - $${monto}`);

    res.json({
      success: true,
      message: 'Gasto agregado exitosamente',
      data: {
        gasto: nuevoGasto,
        totalGastos,
        montoAsignado: rutaData.montoAsignado || 0,
        balance: (rutaData.montoAsignado || 0) - totalGastos
      }
    });

  } catch (error) {
    console.error('❌ Error agregando gasto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar el gasto',
      error: error.message
    });
  }
};

// ==========================================================================
// 📋 OBTENER GASTOS DE UNA RUTA
// ==========================================================================
export const obtenerGastos = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const repartidorId = req.user?.uid || req.userData?.uid;
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    const companyId = userDoc.data()?.companyId;

    const rutaRef = db.collection('rutas').doc(rutaId);
    const doc = await rutaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    const rutaData = doc.data();

    // Validar permisos
    if (rutaData.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para ver esta ruta'
      });
    }

    const gastos = rutaData.gastos || [];
    const totalGastos = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);

    res.json({
      success: true,
      data: {
        gastos,
        totalGastos,
        montoAsignado: rutaData.montoAsignado || 0,
        balance: (rutaData.montoAsignado || 0) - totalGastos
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo gastos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los gastos',
      error: error.message
    });
  }
};

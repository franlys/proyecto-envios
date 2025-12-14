// backend/src/routes/gastos.js
import express from 'express';
import { db } from '../config/firebase.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// POST - Crear nuevo gasto
router.post('/', checkRole('empleado', 'propietario'), async (req, res) => {
  try {
    const { rutaId, tipo, descripcion, monto } = req.body;

    if (!rutaId || !tipo || !monto) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    if (monto <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    const rutaDoc = await db.collection('rutas').doc(rutaId).get();
    if (!rutaDoc.exists) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    const rutaData = rutaDoc.data();

    if (rutaData.estado === 'completada') {
      return res.status(400).json({
        error: 'No se pueden agregar gastos a una ruta completada'
      });
    }

    // ✅ ESTANDARIZACIÓN: Usar repartidorId en lugar de empleadoId
    const nuevoGasto = {
      companyId: req.userData.companyId, // ✅ VINCULAR A LA EMPRESA
      rutaId,
      repartidorId: rutaData.repartidorId,
      tipo,
      descripcion: descripcion || '',
      monto: parseFloat(monto),
      fecha: new Date(),
      createdBy: req.userData.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
      // ✅ CAMPOS FISCALES (Opcionales)
      ncf: req.body.ncf || null,
      rnc: req.body.rnc || null,
      imgUrl: req.body.imgUrl || null
    };

    const gastoRef = await db.collection('gastos').add(nuevoGasto);

    // ✅ CORRECCIÓN: Formato estandarizado
    res.status(201).json({
      success: true,
      message: 'Gasto registrado exitosamente',
      data: {
        id: gastoRef.id,
        ...nuevoGasto
      }
    });

  } catch (error) {
    console.error('Error al crear gasto:', error);
    res.status(500).json({ error: 'Error al crear el gasto' });
  }
});

// GET - Obtener todos los gastos de la empresa
router.get('/', checkRole('admin_general', 'propietario', 'auditor'), async (req, res) => {
  try {
    const { companyId } = req.userData;
    const { ncfOnly } = req.query;

    let query = db.collection('gastos').where('companyId', '==', companyId);

    // Nota: Para filtrar por NCF, lo hacemos en memoria o requeriríamos index compuesto
    // query = query.orderBy('fecha', 'desc').limit(200);
    // index issues might occur if we combine == companyId and orderBy fecha without index.
    // For safety in this environment, we rely on default sorting or simple Fetch.

    const snapshot = await query.get();

    let gastos = [];
    snapshot.forEach(doc => {
      const g = { id: doc.id, ...doc.data() };
      // Client-side like filter for NCF if requested
      if (ncfOnly === 'true' && !g.ncf) return;
      gastos.push(g);
    });

    // Sort in memory to avoid index requirement
    gastos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json({ success: true, data: gastos });

  } catch (error) {
    console.error('Error fetching company expenses:', error);
    res.status(500).json({ error: 'Error cargando gastos' });
  }
});

// GET - Obtener gastos por ruta
router.get('/ruta/:rutaId', async (req, res) => {
  try {
    const { rutaId } = req.params;

    const rutaDoc = await db.collection('rutas').doc(rutaId).get();
    if (!rutaDoc.exists) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    const gastosSnapshot = await db.collection('gastos')
      .where('rutaId', '==', rutaId)
      .orderBy('fecha', 'desc')
      .get();

    const gastos = [];
    let totalGastos = 0;

    gastosSnapshot.forEach(doc => {
      const gasto = { id: doc.id, ...doc.data() };
      gastos.push(gasto);
      totalGastos += gasto.monto || 0;
    });

    const rutaData = rutaDoc.data();
    const montoAsignado = rutaData.montoAsignado || 0;
    const balance = montoAsignado - totalGastos;

    // ✅ CORRECCIÓN: success + data
    res.json({
      success: true,
      data: gastos,
      resumen: {
        totalGastos,
        montoAsignado,
        balance,
        cantidadGastos: gastos.length
      }
    });

  } catch (error) {
    console.error('Error al obtener gastos de ruta:', error);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
});

// GET - Obtener gastos por repartidor
// ✅ ESTANDARIZACIÓN: Usar repartidorId internamente
router.get('/empleado/:empleadoId', async (req, res) => {
  try {
    const { empleadoId } = req.params; // Mantener nombre del parámetro para compatibilidad
    const repartidorId = empleadoId; // Usar repartidorId internamente

    const { fechaDesde, fechaHasta } = req.query;

    const repartidorDoc = await db.collection('usuarios').doc(repartidorId).get();
    if (!repartidorDoc.exists) {
      return res.status(404).json({ error: 'Repartidor no encontrado' });
    }

    // ✅ ESTANDARIZACIÓN: Buscar por repartidorId
    let query = db.collection('gastos').where('repartidorId', '==', repartidorId);

    if (fechaDesde) {
      query = query.where('fecha', '>=', new Date(fechaDesde));
    }
    if (fechaHasta) {
      const fechaFin = new Date(fechaHasta);
      fechaFin.setHours(23, 59, 59, 999);
      query = query.where('fecha', '<=', fechaFin);
    }

    const gastosSnapshot = await query.orderBy('fecha', 'desc').get();

    const gastos = [];
    let totalGastos = 0;
    const gastosPorTipo = {};

    for (const doc of gastosSnapshot.docs) {
      const gastoData = doc.data();

      let rutaNombre = 'Sin ruta';
      if (gastoData.rutaId) {
        const rutaDoc = await db.collection('rutas').doc(gastoData.rutaId).get();
        if (rutaDoc.exists) {
          rutaNombre = rutaDoc.data().nombre;
        }
      }

      const gasto = { id: doc.id, ...gastoData, rutaNombre };
      gastos.push(gasto);
      totalGastos += gastoData.monto || 0;

      const tipo = gastoData.tipo || 'Otros';
      gastosPorTipo[tipo] = (gastosPorTipo[tipo] || 0) + (gastoData.monto || 0);
    }

    // ✅ CORRECCIÓN: success + data
    res.json({
      success: true,
      empleado: { id: repartidorId, nombre: repartidorDoc.data().nombre },
      data: gastos,
      resumen: {
        totalGastos,
        cantidadGastos: gastos.length,
        gastosPorTipo,
        promedioGasto: gastos.length > 0
          ? Math.round(totalGastos / gastos.length * 100) / 100
          : 0
      }
    });

  } catch (error) {
    console.error('Error al obtener gastos de empleado:', error);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
});

// PUT - Actualizar gasto
router.put('/:id', checkRole('admin_general', 'propietario', 'empleado'), async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, descripcion, monto } = req.body;

    const gastoDoc = await db.collection('gastos').doc(id).get();
    if (!gastoDoc.exists) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    const gastoData = gastoDoc.data();

    if (gastoData.rutaId) {
      const rutaDoc = await db.collection('rutas').doc(gastoData.rutaId).get();
      if (rutaDoc.exists && rutaDoc.data().estado === 'completada') {
        return res.status(400).json({
          error: 'No se pueden modificar gastos de rutas completadas'
        });
      }
    }

    const actualizacion = {
      updatedAt: new Date(),
      updatedBy: req.userData.uid
    };

    if (tipo) actualizacion.tipo = tipo;
    if (descripcion !== undefined) actualizacion.descripcion = descripcion;
    if (monto) {
      if (parseFloat(monto) <= 0) {
        return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
      }
      actualizacion.monto = parseFloat(monto);
    }

    await db.collection('gastos').doc(id).update(actualizacion);

    // ✅ CORRECCIÓN: success + data
    res.json({
      success: true,
      message: 'Gasto actualizado exitosamente',
      data: { id, ...actualizacion }
    });

  } catch (error) {
    console.error('Error al actualizar gasto:', error);
    res.status(500).json({ error: 'Error al actualizar el gasto' });
  }
});

// DELETE - Eliminar gasto
router.delete('/:id', checkRole('super_admin', 'propietario', 'admin_general'), async (req, res) => {
  try {
    const { id } = req.params;

    const gastoDoc = await db.collection('gastos').doc(id).get();
    if (!gastoDoc.exists) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    const gastoData = gastoDoc.data();

    if (gastoData.rutaId) {
      const rutaDoc = await db.collection('rutas').doc(gastoData.rutaId).get();
      if (rutaDoc.exists && rutaDoc.data().estado === 'completada') {
        return res.status(400).json({
          error: 'No se pueden eliminar gastos de rutas completadas'
        });
      }
    }

    await db.collection('gastos').doc(id).delete();

    // ✅ CORRECCIÓN: success
    res.json({
      success: true,
      message: 'Gasto eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar gasto:', error);
    res.status(500).json({ error: 'Error al eliminar el gasto' });
  }
});

export default router;
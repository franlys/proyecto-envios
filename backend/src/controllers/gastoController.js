// backend/src/controllers/gastosController.js
import { db } from '../config/firebase.js';

// POST - Crear nuevo gasto
export const createGasto = async (req, res) => {
  try {
    const { rutaId, tipo, descripcion, monto } = req.body;

    // Validaciones
    if (!rutaId || !tipo || !monto) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos' 
      });
    }

    if (monto <= 0) {
      return res.status(400).json({ 
        error: 'El monto debe ser mayor a 0' 
      });
    }

    // Verificar que la ruta existe
    const rutaDoc = await db.collection('rutas').doc(rutaId).get();
    if (!rutaDoc.exists) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    const rutaData = rutaDoc.data();

    // ← NUEVO: Verificar permisos
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && rutaData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a esta ruta' });
    }

    // Verificar que la ruta no esté completada
    if (rutaData.estado === 'completada') {
      return res.status(400).json({ 
        error: 'No se pueden agregar gastos a una ruta completada' 
      });
    }

    // Crear el gasto
    const nuevoGasto = {
      rutaId,
      empleadoId: rutaData.empleadoId,
      companyId: rutaData.companyId, // ← NUEVO: Heredar companyId de la ruta
      tipo,
      descripcion: descripcion || '',
      monto: parseFloat(monto),
      fecha: new Date(),
      createdBy: req.user.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const gastoRef = await db.collection('gastos').add(nuevoGasto);

    res.status(201).json({
      id: gastoRef.id,
      ...nuevoGasto,
      message: 'Gasto registrado exitosamente'
    });

  } catch (error) {
    console.error('Error al crear gasto:', error);
    res.status(500).json({ error: 'Error al crear el gasto' });
  }
};

// GET - Obtener gastos por ruta
export const getGastosByRuta = async (req, res) => {
  try {
    const { rutaId } = req.params;

    // Verificar que la ruta existe
    const rutaDoc = await db.collection('rutas').doc(rutaId).get();
    if (!rutaDoc.exists) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    const rutaData = rutaDoc.data();

    // ← NUEVO: Verificar permisos
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && rutaData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a esta ruta' });
    }

    // Obtener gastos
    const gastosSnapshot = await db.collection('gastos')
      .where('rutaId', '==', rutaId)
      .orderBy('fecha', 'desc')
      .get();

    const gastos = [];
    let totalGastos = 0;

    gastosSnapshot.forEach(doc => {
      const gasto = {
        id: doc.id,
        ...doc.data()
      };
      gastos.push(gasto);
      totalGastos += gasto.monto || 0;
    });

    // Calcular balance
    const montoAsignado = rutaData.montoAsignado || 0;
    const balance = montoAsignado - totalGastos;

    res.json({
      gastos,
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
};

// GET - Obtener gastos por empleado
export const getGastosByEmpleado = async (req, res) => {
  try {
    const { empleadoId } = req.params;
    const { fechaDesde, fechaHasta } = req.query;

    // ← NUEVO: Obtener datos del usuario
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    // Verificar que el empleado existe
    const empleadoDoc = await db.collection('usuarios').doc(empleadoId).get();
    if (!empleadoDoc.exists) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const empleadoData = empleadoDoc.data();

    // ← NUEVO: Verificar permisos
    if (userData.rol !== 'super_admin' && empleadoData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este empleado' });
    }

    // Construir query
    let query = db.collection('gastos')
      .where('empleadoId', '==', empleadoId);

    // ← NUEVO: Filtrar por compañía si NO es super_admin
    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }

    // Aplicar filtros de fecha si se proporcionan
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
      
      // Obtener información de la ruta
      let rutaNombre = 'Sin ruta';
      if (gastoData.rutaId) {
        const rutaDoc = await db.collection('rutas').doc(gastoData.rutaId).get();
        if (rutaDoc.exists) {
          rutaNombre = rutaDoc.data().nombre;
        }
      }

      const gasto = {
        id: doc.id,
        ...gastoData,
        rutaNombre
      };

      gastos.push(gasto);
      totalGastos += gastoData.monto || 0;

      // Agrupar por tipo
      const tipo = gastoData.tipo || 'Otros';
      gastosPorTipo[tipo] = (gastosPorTipo[tipo] || 0) + (gastoData.monto || 0);
    }

    res.json({
      empleado: {
        id: empleadoId,
        nombre: empleadoData.nombre
      },
      gastos,
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
};

// PUT - Actualizar gasto
export const updateGasto = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, descripcion, monto } = req.body;

    // Verificar que el gasto existe
    const gastoDoc = await db.collection('gastos').doc(id).get();
    if (!gastoDoc.exists) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    const gastoData = gastoDoc.data();

    // ← NUEVO: Verificar permisos
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && gastoData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este gasto' });
    }

    // Verificar que la ruta asociada no esté completada
    if (gastoData.rutaId) {
      const rutaDoc = await db.collection('rutas').doc(gastoData.rutaId).get();
      if (rutaDoc.exists && rutaDoc.data().estado === 'completada') {
        return res.status(400).json({ 
          error: 'No se pueden modificar gastos de rutas completadas' 
        });
      }
    }

    // Construir actualización
    const actualizacion = {
      updatedAt: new Date(),
      updatedBy: req.user.uid
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

    res.json({
      message: 'Gasto actualizado exitosamente',
      id,
      ...actualizacion
    });

  } catch (error) {
    console.error('Error al actualizar gasto:', error);
    res.status(500).json({ error: 'Error al actualizar el gasto' });
  }
};

// DELETE - Eliminar gasto
export const deleteGasto = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el gasto existe
    const gastoDoc = await db.collection('gastos').doc(id).get();
    if (!gastoDoc.exists) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    const gastoData = gastoDoc.data();

    // ← NUEVO: Verificar permisos
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && gastoData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este gasto' });
    }

    // Verificar que la ruta asociada no esté completada
    if (gastoData.rutaId) {
      const rutaDoc = await db.collection('rutas').doc(gastoData.rutaId).get();
      if (rutaDoc.exists && rutaDoc.data().estado === 'completada') {
        return res.status(400).json({ 
          error: 'No se pueden eliminar gastos de rutas completadas' 
        });
      }
    }

    await db.collection('gastos').doc(id).delete();

    res.json({
      message: 'Gasto eliminado exitosamente',
      id
    });

  } catch (error) {
    console.error('Error al eliminar gasto:', error);
    res.status(500).json({ error: 'Error al eliminar el gasto' });
  }
};
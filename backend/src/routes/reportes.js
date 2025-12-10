// backend/src/routes/reportes.js
import express from 'express';
import { db } from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken);

// ✅ CORREGIDO - GET - Reporte de Rutas
router.get('/rutas', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta, empleadoId } = req.query;
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('rutas');

    if (userData.rol !== 'super_admin') {
      if (!userData.companyId) {
        return res.status(403).json({ 
          success: false,
          error: 'Usuario sin compañía asignada' 
        });
      }
      query = query.where('companyId', '==', userData.companyId);
    }

    if (empleadoId) {
      query = query.where('empleadoId', '==', empleadoId);
    }

    const rutasSnapshot = await query.get();

    const rutas = [];
    let totalRutas = 0;
    let facturasTotales = 0;
    let facturasEntregadasTotal = 0;
    let montoTotalAsignado = 0;
    let totalGastosGeneral = 0;

    for (const rutaDoc of rutasSnapshot.docs) {
      const rutaData = rutaDoc.data();
      
      // Filtrar por fechas en memoria
      if (fechaDesde || fechaHasta) {
        const fechaRuta = rutaData.createdAt?.toDate ? rutaData.createdAt.toDate() : new Date(rutaData.createdAt);
        if (fechaDesde && fechaRuta < new Date(fechaDesde)) continue;
        if (fechaHasta) {
          const fechaFin = new Date(fechaHasta);
          fechaFin.setHours(23, 59, 59, 999);
          if (fechaRuta > fechaFin) continue;
        }
      }

      let empleadoNombre = 'Sin asignar';
      if (rutaData.empleadoId) {
        const empleadoDoc = await db.collection('usuarios').doc(rutaData.empleadoId).get();
        if (empleadoDoc.exists) {
          empleadoNombre = empleadoDoc.data().nombre;
        }
      }

      const facturasSnapshot = await db.collection('facturas')
        .where('rutaId', '==', rutaDoc.id)
        .get();

      let facturasEntregadas = 0;
      let facturasNoEntregadas = 0;
      
      facturasSnapshot.forEach(facturaDoc => {
        const factura = facturaDoc.data();
        // ✅ CORRECCIÓN: Soportar ambas variantes del estado
        if (factura.estado === 'entregado' || factura.estado === 'entregada') {
          facturasEntregadas++;
        } else if (factura.estado === 'no_entregado' || factura.estado === 'no_entregada') {
          facturasNoEntregadas++;
        }
      });

      const gastosSnapshot = await db.collection('gastos')
        .where('rutaId', '==', rutaDoc.id)
        .get();

      let totalGastos = 0;
      gastosSnapshot.forEach(gastoDoc => {
        totalGastos += gastoDoc.data().monto || 0;
      });

      const totalFacturas = facturasSnapshot.size;
      const porcentajeEntrega = totalFacturas > 0 
        ? Math.round((facturasEntregadas / totalFacturas) * 100) 
        : 0;

      const rutaCompleta = {
        id: rutaDoc.id,
        fecha: rutaData.createdAt?.toDate ? rutaData.createdAt.toDate() : rutaData.createdAt,
        nombre: rutaData.nombre,
        empleadoNombre,
        estado: rutaData.estado,
        totalFacturas,
        facturasEntregadas,
        facturasNoEntregadas,
        porcentajeEntrega,
        montoAsignado: rutaData.montoAsignado || 0,
        totalGastos,
        balance: (rutaData.montoAsignado || 0) - totalGastos
      };

      rutas.push(rutaCompleta);

      totalRutas++;
      facturasTotales += totalFacturas;
      facturasEntregadasTotal += facturasEntregadas;
      montoTotalAsignado += rutaData.montoAsignado || 0;
      totalGastosGeneral += totalGastos;
    }

    // Ordenar en memoria después de obtener los datos
    rutas.sort((a, b) => {
      const dateA = a.fecha ? new Date(a.fecha) : new Date(0);
      const dateB = b.fecha ? new Date(b.fecha) : new Date(0);
      return dateB - dateA;
    });

    const resumen = {
      total_rutas: totalRutas,
      facturas_totales: facturasTotales,
      facturas_entregadas: facturasEntregadasTotal,
      porcentaje_entrega: facturasTotales > 0 
        ? Math.round((facturasEntregadasTotal / facturasTotales) * 100) 
        : 0,
      monto_total_asignado: montoTotalAsignado,
      total_gastos: totalGastosGeneral,
      balance_general: montoTotalAsignado - totalGastosGeneral
    };

    // ✅ FORMATO ESTANDARIZADO
    res.json({ 
      success: true,
      data: {
        rutas,
        resumen
      }
    });

  } catch (error) {
    console.error('Error al generar reporte de rutas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al generar reporte de rutas' 
    });
  }
});

// ✅ CORREGIDO - GET - Reporte de Gastos
router.get('/gastos', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta, empleadoId, rutaId } = req.query;
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('gastos');

    if (rutaId) {
      query = query.where('rutaId', '==', rutaId);
    }

    const gastosSnapshot = await query.get();

    const gastos = [];
    const gastosPorTipo = {
      'Combustible': 0,
      'Peajes': 0,
      'Comida': 0,
      'Otros': 0
    };
    let totalGastos = 0;
    const rutasConGastos = new Set();

    for (const gastoDoc of gastosSnapshot.docs) {
      const gastoData = gastoDoc.data();
      
      // Filtrar por fechas en memoria
      if (fechaDesde || fechaHasta) {
        const fechaGasto = gastoData.fecha?.toDate ? gastoData.fecha.toDate() : new Date(gastoData.fecha);
        if (fechaDesde && fechaGasto < new Date(fechaDesde)) continue;
        if (fechaHasta) {
          const fechaFin = new Date(fechaHasta);
          fechaFin.setHours(23, 59, 59, 999);
          if (fechaGasto > fechaFin) continue;
        }
      }

      let rutaNombre = 'Sin ruta';
      let empleadoNombre = 'Sin asignar';
      let empleadoIdRuta = null;
      let rutaCompanyId = null;

      if (gastoData.rutaId) {
        const rutaDoc = await db.collection('rutas').doc(gastoData.rutaId).get();
        if (rutaDoc.exists) {
          const rutaData = rutaDoc.data();
          rutaNombre = rutaData.nombre;
          empleadoIdRuta = rutaData.empleadoId;
          rutaCompanyId = rutaData.companyId;
          rutasConGastos.add(gastoData.rutaId);

          if (userData.rol !== 'super_admin' && rutaCompanyId !== userData.companyId) {
            continue;
          }

          if (rutaData.empleadoId) {
            const empleadoDoc = await db.collection('usuarios').doc(rutaData.empleadoId).get();
            if (empleadoDoc.exists) {
              empleadoNombre = empleadoDoc.data().nombre;
            }
          }
        }
      }

      if (empleadoId && empleadoIdRuta !== empleadoId) {
        continue;
      }

      const gastoCompleto = {
        id: gastoDoc.id,
        fecha: gastoData.fecha?.toDate ? gastoData.fecha.toDate() : gastoData.fecha,
        rutaId: gastoData.rutaId,
        rutaNombre,
        empleadoId: empleadoIdRuta,
        empleadoNombre,
        tipoGasto: gastoData.tipo || 'Otros',
        descripcion: gastoData.descripcion || '',
        monto: gastoData.monto || 0
      };

      gastos.push(gastoCompleto);
      
      const tipo = gastoData.tipo || 'Otros';
      if (gastosPorTipo.hasOwnProperty(tipo)) {
        gastosPorTipo[tipo] += gastoData.monto || 0;
      } else {
        gastosPorTipo['Otros'] += gastoData.monto || 0;
      }
      
      totalGastos += gastoData.monto || 0;
    }

    // Ordenar en memoria
    gastos.sort((a, b) => {
      const dateA = a.fecha ? new Date(a.fecha) : new Date(0);
      const dateB = b.fecha ? new Date(b.fecha) : new Date(0);
      return dateB - dateA;
    });

    const resumen = {
      total_gastos: totalGastos,
      cantidad_gastos: gastos.length,
      promedio_por_ruta: rutasConGastos.size > 0 
        ? Math.round(totalGastos / rutasConGastos.size * 100) / 100 
        : 0
    };

    // ✅ FORMATO ESTANDARIZADO
    res.json({ 
      success: true,
      data: {
        gastos,
        gastosPorTipo,
        resumen
      }
    });

  } catch (error) {
    console.error('Error al generar reporte de gastos:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al generar reporte de gastos' 
    });
  }
});

// ✅ CORREGIDO - GET - Reporte de Facturas
router.get('/facturas', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta, rutaId } = req.query;
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('facturas');

    if (userData.rol !== 'super_admin') {
      if (!userData.companyId) {
        return res.status(403).json({ 
          success: false,
          error: 'Usuario sin compañía asignada' 
        });
      }
      query = query.where('companyId', '==', userData.companyId);
    }

    if (rutaId) {
      query = query.where('rutaId', '==', rutaId);
    }

    const facturasSnapshot = await query.get();

    const facturas = [];
    let facturasEntregadas = 0;
    let facturasNoEntregadas = 0;
    let facturasPendientes = 0;
    let montoTotal = 0;
    let montoEntregado = 0;

    for (const facturaDoc of facturasSnapshot.docs) {
      const facturaData = facturaDoc.data();
      
      const fechaFactura = facturaData.createdAt?.toDate ? 
        facturaData.createdAt.toDate() : 
        new Date(facturaData.createdAt);

      if (fechaDesde && fechaFactura < new Date(fechaDesde)) {
        continue;
      }
      if (fechaHasta) {
        const fechaFin = new Date(fechaHasta);
        fechaFin.setHours(23, 59, 59, 999);
        if (fechaFactura > fechaFin) {
          continue;
        }
      }

      let rutaNombre = 'Sin asignar';
      if (facturaData.rutaId) {
        const rutaDoc = await db.collection('rutas').doc(facturaData.rutaId).get();
        if (rutaDoc.exists) {
          rutaNombre = rutaDoc.data().nombre;
        }
      }

      const facturaCompleta = {
        id: facturaDoc.id,
        numeroFactura: facturaData.numeroFactura,
        cliente: facturaData.cliente,
        direccion: facturaData.direccion,
        monto: facturaData.monto || 0,
        estado: facturaData.estado || 'pendiente',
        rutaId: facturaData.rutaId || null,
        rutaNombre,
        fechaIntento: facturaData.fechaIntento?.toDate ? 
          facturaData.fechaIntento.toDate() : 
          facturaData.fechaIntento,
        motivoNoEntrega: facturaData.motivoNoEntrega || null
      };

      facturas.push(facturaCompleta);

      // ✅ CORRECCIÓN: Soportar ambas variantes del estado
      const estado = facturaData.estado;
      if (estado === 'entregado' || estado === 'entregada') {
        facturasEntregadas++;
        montoEntregado += facturaData.monto || 0;
      } else if (estado === 'no_entregado' || estado === 'no_entregada') {
        facturasNoEntregadas++;
      } else {
        facturasPendientes++;
      }
      
      montoTotal += facturaData.monto || 0;
    }

    const totalFacturas = facturas.length;
    const porcentajeCumplimiento = totalFacturas > 0 
      ? Math.round((facturasEntregadas / totalFacturas) * 100) 
      : 0;

    const resumen = {
      total_facturas: totalFacturas,
      facturas_entregadas: facturasEntregadas,
      facturas_no_entregadas: facturasNoEntregadas,
      facturas_pendientes: facturasPendientes,
      monto_total: montoTotal,
      monto_entregado: montoEntregado,
      porcentaje_cumplimiento: porcentajeCumplimiento
    };

    // ✅ FORMATO ESTANDARIZADO
    res.json({ 
      success: true,
      data: {
        facturas,
        resumen
      }
    });

  } catch (error) {
    console.error('Error al generar reporte de facturas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al generar reporte de facturas' 
    });
  }
});

// GET - Reporte de liquidación por empleado (devuelve objeto único)
router.get('/liquidacion/:empleadoId', async (req, res) => {
  try {
    const { empleadoId } = req.params;
    const { fechaDesde, fechaHasta } = req.query;
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    const empleadoDoc = await db.collection('usuarios').doc(empleadoId).get();
    if (!empleadoDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Empleado no encontrado' 
      });
    }

    const empleadoData = empleadoDoc.data();

    if (userData.rol !== 'super_admin' && empleadoData.companyId !== userData.companyId) {
      return res.status(403).json({ 
        success: false,
        error: 'No tienes acceso a este empleado' 
      });
    }

    let rutasQuery = db.collection('rutas')
      .where('empleadoId', '==', empleadoId);

    if (userData.rol !== 'super_admin' && userData.companyId) {
      rutasQuery = rutasQuery.where('companyId', '==', userData.companyId);
    }

    const rutasSnapshot = await rutasQuery.get();

    let totalMontoAsignado = 0;
    let totalGastos = 0;
    let totalFacturas = 0;
    let facturasEntregadas = 0;
    const detalleRutas = [];

    for (const rutaDoc of rutasSnapshot.docs) {
      const rutaData = rutaDoc.data();
      
      // Filtrar fechas en memoria
      if (fechaDesde || fechaHasta) {
        const fechaRuta = rutaData.createdAt?.toDate ? rutaData.createdAt.toDate() : new Date(rutaData.createdAt);
        if (fechaDesde && fechaRuta < new Date(fechaDesde)) continue;
        if (fechaHasta) {
          const fechaFin = new Date(fechaHasta);
          fechaFin.setHours(23, 59, 59, 999);
          if (fechaRuta > fechaFin) continue;
        }
      }

      const gastosSnapshot = await db.collection('gastos')
        .where('rutaId', '==', rutaDoc.id)
        .get();

      let gastosRuta = 0;
      gastosSnapshot.forEach(gastoDoc => {
        gastosRuta += gastoDoc.data().monto || 0;
      });

      const facturasSnapshot = await db.collection('facturas')
        .where('rutaId', '==', rutaDoc.id)
        .get();

      let entregadasRuta = 0;
      facturasSnapshot.forEach(facturaDoc => {
        // ✅ CORRECCIÓN: Soportar ambas variantes del estado
        const estado = facturaDoc.data().estado;
        if (estado === 'entregado' || estado === 'entregada') {
          entregadasRuta++;
        }
      });

      detalleRutas.push({
        id: rutaDoc.id,
        nombre: rutaData.nombre,
        fecha: rutaData.createdAt?.toDate ? rutaData.createdAt.toDate() : rutaData.createdAt,
        montoAsignado: rutaData.montoAsignado || 0,
        gastos: gastosRuta,
        balance: (rutaData.montoAsignado || 0) - gastosRuta,
        totalFacturas: facturasSnapshot.size,
        facturasEntregadas: entregadasRuta
      });

      totalMontoAsignado += rutaData.montoAsignado || 0;
      totalGastos += gastosRuta;
      totalFacturas += facturasSnapshot.size;
      facturasEntregadas += entregadasRuta;
    }

    const liquidacion = {
      empleado: {
        id: empleadoId,
        nombre: empleadoData.nombre,
        email: empleadoData.email
      },
      periodo: {
        desde: fechaDesde || 'Sin especificar',
        hasta: fechaHasta || 'Sin especificar'
      },
      resumen: {
        totalRutas: detalleRutas.length,
        totalMontoAsignado,
        totalGastos,
        balanceGeneral: totalMontoAsignado - totalGastos,
        totalFacturas,
        facturasEntregadas,
        porcentajeEntrega: totalFacturas > 0 
          ? Math.round((facturasEntregadas / totalFacturas) * 100) 
          : 0
      },
      detalleRutas
    };

    res.json({
      success: true,
      data: liquidacion
    });

  } catch (error) {
    console.error('Error al generar liquidación:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al generar liquidación' 
    });
  }
});

// GET - Dashboard resumen general (devuelve objeto único)
router.get('/dashboard', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

    let rutasQuery = db.collection('rutas');
    let facturasQuery = db.collection('facturas');

    if (userData.rol !== 'super_admin' && userData.companyId) {
      rutasQuery = rutasQuery.where('companyId', '==', userData.companyId);
      facturasQuery = facturasQuery.where('companyId', '==', userData.companyId);
    }

    const rutasSnapshot = await rutasQuery.get();
    const facturasSnapshot = await facturasQuery.get();

    // Filtrar rutas del mes en memoria
    const rutasDelMes = [];
    rutasSnapshot.forEach(doc => {
      const ruta = doc.data();
      const fechaRuta = ruta.createdAt?.toDate ? ruta.createdAt.toDate() : new Date(ruta.createdAt);
      if (fechaRuta >= inicioMes && fechaRuta <= finMes) {
        rutasDelMes.push({ id: doc.id, ...ruta });
      }
    });

    let totalGastos = 0;
    for (const ruta of rutasDelMes) {
      const gastosSnapshot = await db.collection('gastos')
        .where('rutaId', '==', ruta.id)
        .get();

      gastosSnapshot.forEach(doc => {
        const gasto = doc.data();
        const fechaGasto = gasto.fecha?.toDate ? gasto.fecha.toDate() : new Date(gasto.fecha);
        if (fechaGasto >= inicioMes && fechaGasto <= finMes) {
          totalGastos += gasto.monto || 0;
        }
      });
    }

    let totalRutas = rutasDelMes.length;
    let rutasActivas = 0;
    let rutasCompletadas = 0;

    rutasDelMes.forEach(ruta => {
      if (ruta.estado === 'completada') {
        rutasCompletadas++;
      } else {
        rutasActivas++;
      }
    });

    let facturasPendientes = 0;
    let facturasEntregadas = 0;
    let facturasNoEntregadas = 0;

    facturasSnapshot.forEach(doc => {
      const factura = doc.data();
      // ✅ CORRECCIÓN: Soportar ambas variantes del estado
      const estado = factura.estado;
      if (estado === 'entregado' || estado === 'entregada') {
        facturasEntregadas++;
      } else if (estado === 'no_entregado' || estado === 'no_entregada') {
        facturasNoEntregadas++;
      } else {
        facturasPendientes++;
      }
    });

    res.json({
      success: true,
      data: {
        periodo: {
          inicio: inicioMes.toISOString(),
          fin: finMes.toISOString()
        },
        rutas: {
          total: totalRutas,
          activas: rutasActivas,
          completadas: rutasCompletadas
        },
        facturas: {
          pendientes: facturasPendientes,
          entregadas: facturasEntregadas,
          noEntregadas: facturasNoEntregadas,
          total: facturasSnapshot.size
        },
        finanzas: {
          totalGastos,
          promedioGastoPorRuta: totalRutas > 0 
            ? Math.round(totalGastos / totalRutas * 100) / 100 
            : 0
        },
        porcentajeExito: facturasSnapshot.size > 0
          ? Math.round((facturasEntregadas / facturasSnapshot.size) * 100)
          : 0
      }
    });

  } catch (error) {
    console.error('Error al generar dashboard:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al generar dashboard' 
    });
  }
});

export default router;
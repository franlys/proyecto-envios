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
    const repartidorId = empleadoId; // ✅ ESTANDARIZACIÓN: Usar repartidorId internamente
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
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

    // ✅ ESTANDARIZACIÓN: Filtrar por repartidorId
    if (repartidorId) {
      query = query.where('repartidorId', '==', repartidorId);
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

      // ✅ ESTANDARIZACIÓN: Usar repartidorId (no empleadoId)
      let empleadoNombre = 'Sin asignar';
      if (rutaData.repartidorId) {
        const empleadoDoc = await db.collection('usuarios').doc(rutaData.repartidorId).get();
        if (empleadoDoc.exists) {
          empleadoNombre = empleadoDoc.data().nombre;
        }
      }

      // ✅ BUSCAR FACTURAS EN RECOLECCIONES (donde se guardan las facturas de rutas)
      const facturasSnapshot = await db.collection('recolecciones')
        .where('rutaId', '==', rutaDoc.id)
        .get();

      let facturasEntregadas = 0;
      let facturasNoEntregadas = 0;
      let totalCobros = 0; // ✅ NUEVO: Total cobrado en facturas

      facturasSnapshot.forEach(facturaDoc => {
        const factura = facturaDoc.data();
        // ✅ CORRECCIÓN: Soportar ambas variantes del estado
        if (factura.estado === 'entregado' || factura.estado === 'entregada') {
          facturasEntregadas++;

          // ✅ COBROS CONTRAENTREGA: Solo contar si es pago contraentrega (pagado durante la ruta)
          // NO incluir facturas ya pagadas previamente
          if (factura.pago && factura.pago.estado === 'pagada' && factura.pago.metodoPago) {
            // Solo si fue pagado durante la entrega (tiene metodoPago registrado)
            totalCobros += factura.pago.montoPagado || 0;
          }
        } else if (factura.estado === 'no_entregado' || factura.estado === 'no_entregada') {
          facturasNoEntregadas++;
        }
      });

      // ✅ GASTOS: Leer desde el array 'gastos' dentro del documento de ruta
      // Los gastos se guardan como array en la ruta, NO en colección separada
      const gastosArray = rutaData.gastos || [];
      let totalGastos = 0;
      gastosArray.forEach(gasto => {
        totalGastos += gasto.monto || 0;
      });

      const totalFacturas = facturasSnapshot.size;
      const porcentajeEntrega = totalFacturas > 0
        ? Math.round((facturasEntregadas / totalFacturas) * 100)
        : 0;

      // ✅ NUEVO: Calcular efectivo a entregar
      const balanceMonto = (rutaData.montoAsignado || 0) - totalGastos;
      const efectivoAEntregar = balanceMonto + totalCobros;

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
        balance: balanceMonto,
        totalCobros, // ✅ NUEVO
        efectivoAEntregar // ✅ NUEVO
      };

      rutas.push(rutaCompleta);

      totalRutas++;
      facturasTotales += totalFacturas;
      facturasEntregadasTotal += facturasEntregadas;
      montoTotalAsignado += rutaData.montoAsignado || 0;
      totalGastosGeneral += totalGastos;
    }

    // ✅ NUEVO: Calcular totales de cobros y efectivo
    const totalCobrosGeneral = rutas.reduce((sum, r) => sum + (r.totalCobros || 0), 0);
    const totalEfectivoAEntregar = rutas.reduce((sum, r) => sum + (r.efectivoAEntregar || 0), 0);

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
      balance_general: montoTotalAsignado - totalGastosGeneral,
      total_cobros: totalCobrosGeneral, // ✅ NUEVO
      efectivo_total_a_entregar: totalEfectivoAEntregar // ✅ NUEVO
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

// ✅ CORREGIDO - GET - Reporte de Gastos (desde array de rutas)
router.get('/gastos', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta, empleadoId, rutaId } = req.query;
    const repartidorId = empleadoId; // ✅ ESTANDARIZACIÓN: Usar repartidorId internamente
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
    const userData = userDoc.data();

    // ✅ CAMBIO: Consultar rutas en lugar de colección 'gastos'
    let query = db.collection('rutas');

    // Filtrar por companyId para usuarios no super_admin
    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }

    // Filtrar por rutaId si se proporciona
    if (rutaId) {
      query = query.where('__name__', '==', rutaId);
    }

    const rutasSnapshot = await query.get();

    const gastos = [];
    const gastosPorTipo = {
      'Combustible': 0,
      'Peajes': 0,
      'Comida': 0,
      'Otros': 0
    };
    let totalGastos = 0;
    const rutasConGastos = new Set();

    // ✅ Iterar sobre las rutas y extraer gastos del array
    for (const rutaDoc of rutasSnapshot.docs) {
      const rutaData = rutaDoc.data();
      const gastosArray = rutaData.gastos || [];

      // Si la ruta no tiene gastos, continuar
      if (gastosArray.length === 0) continue;

      // ✅ ESTANDARIZACIÓN: Filtrar por repartidorId
      if (repartidorId && rutaData.repartidorId !== repartidorId) {
        continue;
      }

      // Obtener nombre del repartidor
      let repartidorNombre = 'Sin asignar';
      if (rutaData.repartidorId) {
        const repDoc = await db.collection('usuarios').doc(rutaData.repartidorId).get();
        if (repDoc.exists) {
          repartidorNombre = repDoc.data().nombre;
        }
      }

      // Procesar cada gasto del array
      for (const gasto of gastosArray) {
        // Filtrar por fechas
        if (fechaDesde || fechaHasta) {
          const fechaGasto = gasto.fecha ? new Date(gasto.fecha) : null;
          if (!fechaGasto) continue;
          if (fechaDesde && fechaGasto < new Date(fechaDesde)) continue;
          if (fechaHasta) {
            const fechaFin = new Date(fechaHasta);
            fechaFin.setHours(23, 59, 59, 999);
            if (fechaGasto > fechaFin) continue;
          }
        }

        const gastoCompleto = {
          id: gasto.id || `${rutaDoc.id}_${Date.now()}`,
          fecha: gasto.fecha ? new Date(gasto.fecha) : null,
          rutaId: rutaDoc.id,
          rutaNombre: rutaData.nombre || rutaDoc.id,
          repartidorId: rutaData.repartidorId,
          repartidorNombre,
          tipoGasto: gasto.tipo || 'Otros',
          descripcion: gasto.descripcion || '',
          monto: gasto.monto || 0
        };

        gastos.push(gastoCompleto);
        rutasConGastos.add(rutaDoc.id);

        const tipo = gasto.tipo || 'Otros';
        if (gastosPorTipo.hasOwnProperty(tipo)) {
          gastosPorTipo[tipo] += gasto.monto || 0;
        } else {
          gastosPorTipo['Otros'] += gasto.monto || 0;
        }

        totalGastos += gasto.monto || 0;
      }
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
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
    const userData = userDoc.data();

    // ✅ CORRECCIÓN: Usar 'recolecciones' en lugar de 'facturas'
    let query = db.collection('recolecciones');

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

    // ✅ NUEVO: Calcular monto cobrado real (V2 Logic)
    // Incluye facturas entregadas Y facturas pagadas (USA/Pre-pago)
    let montoCobrado = 0;
    facturas.forEach(f => {
      // Reconstruir lógica de cobro:
      // 1. Si está entregada, se asume cobrada (contra entrega o ya pagada)
      // 2. Si tiene estadoPago == 'pagado', se cuenta aunque no esté entregada
      // Nota: 'pago' no viene en la proyección actual de la lista 'facturas', 
      // necesitamos ver si en 'facturaCompleta' tenemos esa info.
      // Como 'facturas' es un array custom, iteramos sobre los docs originales mejor obre 'montoTotal' loop arriba.
    });

    // Mejor, calculamos montoCobrado en el loop principal
    montoCobrado = 0;
    for (const facturaDoc of facturasSnapshot.docs) {
      // ... (validaciones de fecha ya hechas arriba, pero requeriría re-iterar o hacerlo en el bucle principal)
      // Para ser eficientes, mejor modificamos el bucle principal. 
      // Pero como este replace es limitado, haremos un reduce sobre 'facturas' si agregamos info de pago, 
      // O re-iteramos los docs filtrados para ser precisos.

      // Estrategia: Re-iterar facturasSnapshot solo para sumar cobros con las mismas reglas de fecha
      const data = facturaDoc.data();
      const fechaFactura = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);

      // Aplicar mismos filtros de fecha
      if (fechaDesde && fechaFactura < new Date(fechaDesde)) continue;
      if (fechaHasta) {
        const fechaFin = new Date(fechaHasta);
        fechaFin.setHours(23, 59, 59, 999);
        if (fechaFactura > fechaFin) continue;
      }

      // Lógica V2: Cobrado = Entregado O Pagado
      const esEntregado = ['entregado', 'entregada'].includes(data.estado?.toLowerCase());
      const esPagado = data.pago?.estadoPago === 'pagado';

      if (esEntregado || esPagado) {
        // Usar facturacion.total si existe, sino monto
        const montoReal = data.facturacion?.total || data.monto || 0;
        montoCobrado += montoReal;
      }
    }


    const resumen = {
      total_facturas: totalFacturas,
      facturas_entregadas: facturasEntregadas,
      facturas_no_entregadas: facturasNoEntregadas,
      facturas_pendientes: facturasPendientes,
      monto_total: montoTotal,     // Valor total de la mercancía procesada
      monto_entregado: montoEntregado, // Valor entregado operativo
      monto_cobrado: montoCobrado,     // ✅ NUEVO: Dinero real (incluye USA/Pre-pago)
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

// GET - Reporte de liquidación por repartidor (devuelve objeto único)
// ✅ ESTANDARIZACIÓN: Usar repartidorId
router.get('/liquidacion/:empleadoId', async (req, res) => {
  try {
    const { empleadoId } = req.params; // Mantener nombre del parámetro para compatibilidad
    const repartidorId = empleadoId; // Usar repartidorId internamente
    const { fechaDesde, fechaHasta } = req.query;
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
    const userData = userDoc.data();

    const repartidorDoc = await db.collection('usuarios').doc(repartidorId).get();
    if (!repartidorDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Repartidor no encontrado'
      });
    }

    const repartidorData = repartidorDoc.data();

    if (userData.rol !== 'super_admin' && repartidorData.companyId !== userData.companyId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes acceso a este repartidor'
      });
    }

    // ✅ ESTANDARIZACIÓN: Buscar rutas por repartidorId
    let rutasQuery = db.collection('rutas')
      .where('repartidorId', '==', repartidorId);

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

      // ✅ GASTOS: Leer desde el array 'gastos' dentro del documento de ruta
      const gastosArray = rutaData.gastos || [];
      let gastosRuta = 0;
      gastosArray.forEach(gasto => {
        gastosRuta += gasto.monto || 0;
      });

      // ✅ BUSCAR FACTURAS EN RECOLECCIONES (donde se guardan las facturas de rutas)
      const facturasSnapshot = await db.collection('recolecciones')
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
        id: repartidorId,
        nombre: repartidorData.nombre,
        email: repartidorData.email
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
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
    const userData = userDoc.data();

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

    let rutasQuery = db.collection('rutas');
    // ✅ CORRECCIÓN: Usar 'recolecciones' en lugar de 'facturas'
    let facturasQuery = db.collection('recolecciones');

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

    // ✅ GASTOS: Leer desde el array 'gastos' dentro de cada ruta
    let totalGastos = 0;
    for (const ruta of rutasDelMes) {
      const gastosArray = ruta.gastos || [];
      gastosArray.forEach(gasto => {
        const fechaGasto = gasto.fecha ? new Date(gasto.fecha) : null;
        if (!fechaGasto || (fechaGasto >= inicioMes && fechaGasto <= finMes)) {
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
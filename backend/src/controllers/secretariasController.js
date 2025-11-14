// backend/src/controllers/secretariasController.js
/**
 * CONTROLADOR DE SECRETARIAS
 * Gestión de confirmación y edición de facturas recibidas
 * 
 * Funcionalidades:
 * - Ver contenedores recibidos en RD
 * - Ver facturas de un contenedor
 * - Confirmar facturas una por una
 * - Editar información de facturas (dirección, teléfono, pago, notas)
 * - Exportar facturas confirmadas para organización de rutas
 */

import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

// ========================================
// OBTENER CONTENEDORES RECIBIDOS
// Solo contenedores en estado 'recibido_rd'
// ========================================
export const getContenedoresRecibidos = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;

    console.log('📦 Secretarias: Obteniendo contenedores recibidos');

    const snapshot = await db.collection('contenedores')
      .where('companyId', '==', companyId)
      .where('estado', '==', 'recibido_rd')
      .orderBy('fechaRecepcion', 'desc')
      .get();

    const contenedores = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Contar facturas por estado
      const facturasConfirmadas = data.facturas?.filter(f => f.confirmadaPorSecretaria === true).length || 0;
      const facturasTotal = data.facturas?.length || 0;
      const facturasPendientes = facturasTotal - facturasConfirmadas;

      return {
        id: doc.id,
        numeroContenedor: data.numeroContenedor,
        estado: data.estado,
        fechaRecepcion: data.fechaRecepcion?.toDate?.() || null,
        fechaActualizacion: data.fechaActualizacion?.toDate?.() || null,
        
        // Estadísticas
        estadisticas: {
          totalFacturas: facturasTotal,
          facturasConfirmadas,
          facturasPendientes,
          porcentajeCompletado: facturasTotal > 0 ? Math.round((facturasConfirmadas / facturasTotal) * 100) : 0
        }
      };
    });

    console.log(`✅ ${contenedores.length} contenedores recibidos encontrados`);

    res.json({
      success: true,
      data: contenedores,
      total: contenedores.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo contenedores:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los contenedores',
      error: error.message
    });
  }
};

// ========================================
// OBTENER FACTURAS DE UN CONTENEDOR
// Con toda la información necesaria para trabajar
// ========================================
export const getFacturasDelContenedor = async (req, res) => {
  try {
    const { contenedorId } = req.params;
    const companyId = req.userData?.companyId;

    console.log('📋 Obteniendo facturas del contenedor:', contenedorId);

    // Obtener contenedor
    const contenedorDoc = await db.collection('contenedores').doc(contenedorId).get();

    if (!contenedorDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Contenedor no encontrado'
      });
    }

    const contenedor = contenedorDoc.data();

    // Validar permisos
    if (contenedor.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos'
      });
    }

    // Obtener detalles completos de cada factura desde recolecciones
    const facturasDetalladas = [];

    if (contenedor.facturas && contenedor.facturas.length > 0) {
      for (const facturaResumen of contenedor.facturas) {
        if (facturaResumen.id) {
          const facturaDoc = await db.collection('recolecciones').doc(facturaResumen.id).get();
          
          if (facturaDoc.exists) {
            const facturaData = facturaDoc.data();
            
            facturasDetalladas.push({
              id: facturaDoc.id,
              codigoTracking: facturaData.codigoTracking,
              
              // Estado de confirmación
              confirmadaPorSecretaria: facturaData.confirmadaPorSecretaria || false,
              fechaConfirmacion: facturaData.fechaConfirmacionSecretaria || null,
              confirmadaPor: facturaData.confirmadaPorUsuario || null,
              
              // Remitente y Destinatario
              remitente: {
                nombre: facturaData.remitente?.nombre || '',
                telefono: facturaData.remitente?.telefono || '',
                email: facturaData.remitente?.email || '',
                direccion: facturaData.remitente?.direccion || ''
              },
              
              destinatario: {
                nombre: facturaData.destinatario?.nombre || '',
                telefono: facturaData.destinatario?.telefono || '',
                email: facturaData.destinatario?.email || '',
                direccion: facturaData.destinatario?.direccion || '',
                zona: facturaData.destinatario?.zona || ''
              },
              
              // Items
              items: facturaData.items || [],
              itemsTotal: facturaData.items?.length || 0,
              itemsDanados: facturaData.itemsDanados || [],
              
              // Facturación y Pago
              facturacion: facturaData.facturacion || {},
              pago: {
                estado: facturaData.pago?.estado || 'pendiente',
                metodoPago: facturaData.pago?.metodoPago || '',
                montoPagado: facturaData.pago?.montoPagado || 0,
                montoPendiente: facturaData.pago?.montoPendiente || (facturaData.facturacion?.total || 0)
              },
              
              // Estado
              estado: facturaData.estado,
              estadoItems: facturaData.estadoItems || 'completo',
              
              // Notas
              notas: facturaData.notas || '',
              notasSecretaria: facturaData.notasSecretaria || '',
              
              // Fechas
              fechaCreacion: facturaData.fechaCreacion?.toDate?.() || null
            });
          }
        }
      }
    }

    console.log(`✅ ${facturasDetalladas.length} facturas obtenidas`);

    res.json({
      success: true,
      data: {
        contenedor: {
          id: contenedorDoc.id,
          numeroContenedor: contenedor.numeroContenedor,
          estado: contenedor.estado,
          fechaRecepcion: contenedor.fechaRecepcion?.toDate?.() || null
        },
        facturas: facturasDetalladas,
        estadisticas: {
          total: facturasDetalladas.length,
          confirmadas: facturasDetalladas.filter(f => f.confirmadaPorSecretaria).length,
          pendientes: facturasDetalladas.filter(f => !f.confirmadaPorSecretaria).length
        }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo facturas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las facturas',
      error: error.message
    });
  }
};

// ========================================
// CONFIRMAR FACTURA
// Marca una factura como confirmada por secretaria
// ========================================
export const confirmarFactura = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { notasSecretaria } = req.body;
    const companyId = req.userData?.companyId;
    const usuarioId = req.userData?.uid;
    const nombreUsuario = req.userData?.nombre || 'Secretaria';

    console.log('✅ Confirmando factura:', facturaId);

    // Obtener factura
    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();

    // Validar permisos
    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos'
      });
    }

    // Validar estado
    if (data.confirmadaPorSecretaria === true) {
      return res.status(400).json({
        success: false,
        message: 'Esta factura ya fue confirmada'
      });
    }

    // Crear historial
    const historialEntry = {
      accion: 'confirmacion_secretaria',
      descripcion: `Factura confirmada por ${nombreUsuario}`,
      usuario: usuarioId,
      nombreUsuario,
      rol: 'secretaria',
      notas: notasSecretaria || '',
      fecha: new Date().toISOString()
    };

    // Actualizar factura
    await facturaRef.update({
      confirmadaPorSecretaria: true,
      fechaConfirmacionSecretaria: FieldValue.serverTimestamp(),
      confirmadaPorUsuario: usuarioId,
      confirmadaPorNombre: nombreUsuario,
      notasSecretaria: notasSecretaria || '',
      estado: 'confirmada_secretaria',
      fechaActualizacion: FieldValue.serverTimestamp(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    // Actualizar en el contenedor también
    const contenedorRef = db.collection('contenedores').doc(data.contenedorId);
    const contenedorDoc = await contenedorRef.get();
    
    if (contenedorDoc.exists) {
      const contenedor = contenedorDoc.data();
      const facturasActualizadas = contenedor.facturas.map(f => {
        if (f.id === facturaId) {
          return {
            ...f,
            confirmadaPorSecretaria: true,
            fechaConfirmacion: new Date().toISOString()
          };
        }
        return f;
      });

      await contenedorRef.update({
        facturas: facturasActualizadas,
        fechaActualizacion: FieldValue.serverTimestamp()
      });
    }

    console.log('✅ Factura confirmada exitosamente');

    res.json({
      success: true,
      message: 'Factura confirmada exitosamente',
      data: {
        facturaId,
        codigoTracking: data.codigoTracking,
        confirmadaPor: nombreUsuario,
        fechaConfirmacion: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error confirmando factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar la factura',
      error: error.message
    });
  }
};

// ========================================
// EDITAR INFORMACIÓN DE FACTURA
// Permite editar dirección, teléfono, pago, notas
// ========================================
export const editarFactura = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const {
      destinatario,
      pago,
      notasSecretaria
    } = req.body;
    
    const companyId = req.userData?.companyId;
    const usuarioId = req.userData?.uid;
    const nombreUsuario = req.userData?.nombre || 'Secretaria';

    console.log('✏️ Editando factura:', facturaId);

    // Obtener factura
    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();

    // Validar permisos
    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos'
      });
    }

    // Preparar actualización
    const updateData = {
      fechaActualizacion: FieldValue.serverTimestamp()
    };

    const cambios = [];

    // Actualizar destinatario si se proporcionó
    if (destinatario) {
      if (destinatario.nombre) {
        updateData['destinatario.nombre'] = destinatario.nombre;
        cambios.push('nombre destinatario');
      }
      if (destinatario.telefono) {
        updateData['destinatario.telefono'] = destinatario.telefono;
        cambios.push('teléfono');
      }
      if (destinatario.email) {
        updateData['destinatario.email'] = destinatario.email;
        cambios.push('email');
      }
      if (destinatario.direccion) {
        updateData['destinatario.direccion'] = destinatario.direccion;
        cambios.push('dirección');
      }
      if (destinatario.zona) {
        updateData['destinatario.zona'] = destinatario.zona;
        cambios.push('zona');
      }
    }

    // Actualizar pago si se proporcionó
    if (pago) {
      if (pago.estado) {
        updateData['pago.estado'] = pago.estado;
        cambios.push('estado de pago');
      }
      if (pago.metodoPago) {
        updateData['pago.metodoPago'] = pago.metodoPago;
        cambios.push('método de pago');
      }
      if (pago.montoPagado !== undefined) {
        updateData['pago.montoPagado'] = parseFloat(pago.montoPagado);
        const montoTotal = data.facturacion?.total || 0;
        updateData['pago.montoPendiente'] = montoTotal - parseFloat(pago.montoPagado);
        cambios.push('monto pagado');
      }
      if (pago.referenciaPago) {
        updateData['pago.referenciaPago'] = pago.referenciaPago;
        cambios.push('referencia de pago');
      }
    }

    // Actualizar notas
    if (notasSecretaria !== undefined) {
      updateData.notasSecretaria = notasSecretaria;
      cambios.push('notas');
    }

    // Si no hay cambios
    if (cambios.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron cambios'
      });
    }

    // Crear historial
    const historialEntry = {
      accion: 'edicion_secretaria',
      descripcion: `Editado por ${nombreUsuario}: ${cambios.join(', ')}`,
      cambios: cambios,
      usuario: usuarioId,
      nombreUsuario,
      rol: 'secretaria',
      fecha: new Date().toISOString()
    };

    updateData.historial = FieldValue.arrayUnion(historialEntry);

    // Actualizar en Firestore
    await facturaRef.update(updateData);

    console.log('✅ Factura actualizada:', cambios.join(', '));

    res.json({
      success: true,
      message: 'Factura actualizada exitosamente',
      data: {
        facturaId,
        cambios,
        editadoPor: nombreUsuario
      }
    });

  } catch (error) {
    console.error('❌ Error editando factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error al editar la factura',
      error: error.message
    });
  }
};

// ========================================
// EXPORTAR FACTURAS CONFIRMADAS
// Genera CSV para organización manual de rutas
// ========================================
export const exportarFacturasConfirmadas = async (req, res) => {
  try {
    const { contenedorId } = req.params;
    const companyId = req.userData?.companyId;

    console.log('📤 Exportando facturas confirmadas del contenedor:', contenedorId);

    // Obtener contenedor
    const contenedorDoc = await db.collection('contenedores').doc(contenedorId).get();

    if (!contenedorDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Contenedor no encontrado'
      });
    }

    const contenedor = contenedorDoc.data();

    // Validar permisos
    if (contenedor.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos'
      });
    }

    // Obtener facturas confirmadas
    const facturasParaExportar = [];

    if (contenedor.facturas && contenedor.facturas.length > 0) {
      for (const facturaResumen of contenedor.facturas) {
        if (facturaResumen.id) {
          const facturaDoc = await db.collection('recolecciones').doc(facturaResumen.id).get();
          
          if (facturaDoc.exists) {
            const facturaData = facturaDoc.data();
            
            // Solo incluir facturas confirmadas
            if (facturaData.confirmadaPorSecretaria === true) {
              facturasParaExportar.push({
                numeroFactura: facturaData.codigoTracking,
                zona: facturaData.destinatario?.zona || 'Sin zona',
                direccion: facturaData.destinatario?.direccion || 'Sin dirección',
                destinatario: facturaData.destinatario?.nombre || '',
                telefono: facturaData.destinatario?.telefono || '',
                items: facturaData.items?.length || 0,
                monto: facturaData.facturacion?.total || 0,
                estadoPago: facturaData.pago?.estado || 'pendiente',
                notas: facturaData.notasSecretaria || ''
              });
            }
          }
        }
      }
    }

    // Ordenar por zona
    facturasParaExportar.sort((a, b) => a.zona.localeCompare(b.zona));

    console.log(`✅ ${facturasParaExportar.length} facturas confirmadas para exportar`);

    res.json({
      success: true,
      data: {
        contenedor: {
          id: contenedorDoc.id,
          numeroContenedor: contenedor.numeroContenedor
        },
        facturas: facturasParaExportar,
        total: facturasParaExportar.length,
        fechaExportacion: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error exportando facturas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar las facturas',
      error: error.message
    });
  }
};

// ========================================
// OBTENER ESTADÍSTICAS DE SECRETARIAS
// ========================================
export const getEstadisticasSecretarias = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;

    console.log('📊 Obteniendo estadísticas de secretarias');

    // Contenedores recibidos
    const contenedoresSnapshot = await db.collection('contenedores')
      .where('companyId', '==', companyId)
      .where('estado', '==', 'recibido_rd')
      .get();

    const estadisticas = {
      contenedores: {
        recibidos: contenedoresSnapshot.size,
        conFacturasPendientes: 0
      },
      facturas: {
        total: 0,
        confirmadas: 0,
        pendientes: 0,
        porcentajeCompletado: 0
      }
    };

    // Analizar facturas
    contenedoresSnapshot.forEach(doc => {
      const data = doc.data();
      
      if (data.facturas && data.facturas.length > 0) {
        const total = data.facturas.length;
        const confirmadas = data.facturas.filter(f => f.confirmadaPorSecretaria === true).length;
        
        estadisticas.facturas.total += total;
        estadisticas.facturas.confirmadas += confirmadas;
        
        if (confirmadas < total) {
          estadisticas.contenedores.conFacturasPendientes++;
        }
      }
    });

    estadisticas.facturas.pendientes = estadisticas.facturas.total - estadisticas.facturas.confirmadas;
    
    if (estadisticas.facturas.total > 0) {
      estadisticas.facturas.porcentajeCompletado = Math.round(
        (estadisticas.facturas.confirmadas / estadisticas.facturas.total) * 100
      );
    }

    console.log('✅ Estadísticas calculadas');

    res.json({
      success: true,
      data: estadisticas
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};
// backend/src/services/whatsappNotificationService.js
import { db } from '../config/firebase.js';
import whatsappService from './whatsappService.js';

/**
 * Servicio de Notificaciones WhatsApp Internas
 * Gestiona el envío de notificaciones a empleados por WhatsApp
 * Utiliza el whatsappFlota de cada empleado para las notificaciones del sistema
 */

class WhatsAppNotificationService {
  /**
   * Obtiene el usuario por UID
   * @param {string} userId - UID del usuario
   * @returns {Promise<Object>} - Datos del usuario
   */
  async getUserById(userId) {
    try {
      const userDoc = await db.collection('usuarios').doc(userId).get();
      if (!userDoc.exists) {
        console.error(`❌ Usuario no encontrado: ${userId}`);
        return null;
      }
      return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
      console.error(`❌ Error obteniendo usuario ${userId}:`, error);
      return null;
    }
  }

  /**
   * Obtiene usuarios por rol
   * @param {string} companyId - ID de la compañía
   * @param {string|string[]} rol - Rol(es) a buscar
   * @returns {Promise<Array>} - Array de usuarios
   */
  async getUsersByRole(companyId, rol) {
    try {
      const roles = Array.isArray(rol) ? rol : [rol];
      const usersSnapshot = await db.collection('usuarios')
        .where('companyId', '==', companyId)
        .where('activo', '==', true)
        .get();

      const users = [];
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (roles.includes(data.rol)) {
          users.push({ id: doc.id, ...data });
        }
      });

      return users;
    } catch (error) {
      console.error(`❌ Error obteniendo usuarios por rol ${rol}:`, error);
      return [];
    }
  }

  /**
   * Notifica asignación de ruta a un recolector/repartidor
   * @param {string} companyId - ID de la compañía
   * @param {string} userId - ID del empleado
   * @param {Object} rutaData - Datos de la ruta
   */
  async notifyRouteAssignment(companyId, userId, rutaData) {
    try {
      const user = await this.getUserById(userId);
      if (!user || !user.whatsappFlota) {
        console.log(`⚠️ Usuario ${userId} sin WhatsApp de flota configurado`);
        return;
      }

      const { codigoRuta, tipo, zona, totalPaquetes, fechaSalida, mensaje: mensajePersonalizado } = rutaData;

      // Si se proporciona un mensaje personalizado, usarlo
      let mensaje;
      if (mensajePersonalizado) {
        mensaje = `Hola *${user.nombre}*,\n\n${mensajePersonalizado}`;
      } else {
        const tipoLabel = tipo === 'recoleccion' ? 'Recolección' : tipo === 'carga' ? 'Carga' : 'Entrega';
        mensaje = `🚚 *Nueva Ruta Asignada*\n\nHola *${user.nombre}*, se te ha asignado una nueva ruta:\n\n📋 *Código:* ${codigoRuta}\n🏷️ *Tipo:* ${tipoLabel}\n📍 *Zona:* ${zona || 'No especificada'}\n📦 *Paquetes:* ${totalPaquetes}\n📅 *Salida:* ${fechaSalida || 'Por confirmar'}\n\n✅ Revisa los detalles en el sistema.\n💡 Recuerda actualizar el estado de cada paquete.`;
      }

      await whatsappService.sendMessage(companyId, user.whatsappFlota, mensaje);
      console.log(`✅ Notificación de ruta enviada a ${user.nombre} (${user.whatsappFlota})`);
    } catch (error) {
      console.error('❌ Error enviando notificación de ruta:', error);
    }
  }

  /**
   * Notifica a secretarias sobre contenedor listo para confirmar
   * @param {string} companyId - ID de la compañía
   * @param {Object} contenedorData - Datos del contenedor
   */
  async notifySecretariasContenedorReady(companyId, contenedorData) {
    try {
      const secretarias = await this.getUsersByRole(companyId, ['secretaria', 'secretaria_usa']);
      if (secretarias.length === 0) {
        console.log('⚠️ No se encontraron secretarias para notificar');
        return;
      }

      const { numeroContenedor, totalFacturas, totalValor, cargadorNombre } = contenedorData;

      const mensaje = `📦 *Contenedor Listo para Confirmar*\n\n🔢 *Número:* ${numeroContenedor}\n📋 *Facturas:* ${totalFacturas}\n💰 *Valor Total:* $${totalValor.toFixed(2)}\n👤 *Cargador:* ${cargadorNombre}\n\n✅ Por favor, revisa y confirma las facturas en el sistema.`;

      for (const secretaria of secretarias) {
        if (secretaria.whatsappFlota) {
          await whatsappService.sendMessage(companyId, secretaria.whatsappFlota, mensaje);
          console.log(`✅ Notificación enviada a secretaria: ${secretaria.nombre}`);
        }
      }
    } catch (error) {
      console.error('❌ Error notificando secretarias:', error);
    }
  }

  /**
   * Notifica al encargado de almacén RD sobre contenedor en tránsito
   * @param {string} companyId - ID de la compañía
   * @param {Object} contenedorData - Datos del contenedor
   */
  async notifyAlmacenRDContenedorEnTransito(companyId, contenedorData) {
    try {
      const encargadosAlmacen = await this.getUsersByRole(companyId, 'almacen_rd');
      if (encargadosAlmacen.length === 0) {
        console.log('⚠️ No se encontró encargado de almacén RD');
        return;
      }

      const { numeroContenedor, progreso, totalFacturas, valorTotal, etaFecha, etaHora } = contenedorData;

      const mensaje = `🚛 *Contenedor en Camino a RD*\n\n📦 *Número:* ${numeroContenedor}\n📊 *Progreso:* ${progreso}%\n📋 *Facturas:* ${totalFacturas}\n💰 *Valor:* $${valorTotal.toFixed(2)}\n📅 *ETA:* ${etaFecha || 'Por confirmar'}${etaHora ? ` a las ${etaHora}` : ''}\n\n🏭 Prepara espacio en almacén para la recepción.`;

      for (const encargado of encargadosAlmacen) {
        if (encargado.whatsappFlota) {
          await whatsappService.sendMessage(companyId, encargado.whatsappFlota, mensaje);
          console.log(`✅ Notificación enviada a almacén RD: ${encargado.nombre}`);
        }
      }
    } catch (error) {
      console.error('❌ Error notificando almacén RD:', error);
    }
  }

  /**
   * Notifica entrega fallida a admin y secretarias
   * @param {string} companyId - ID de la compañía
   * @param {Object} entregaData - Datos de la entrega fallida
   */
  async notifyEntregaFallida(companyId, entregaData) {
    try {
      const { codigoTracking, rutaCodigo, repartidorNombre, motivo, evidencias, clienteNombre, clienteTelefono } = entregaData;

      const mensaje = `⚠️ *Entrega No Exitosa*\n\n📦 *Tracking:* ${codigoTracking}\n🚚 *Ruta:* ${rutaCodigo}\n👤 *Repartidor:* ${repartidorNombre}\n👥 *Cliente:* ${clienteNombre}\n📞 *Teléfono:* ${clienteTelefono}\n❌ *Motivo:* ${motivo}\n${evidencias ? `📸 *Evidencia:* ${evidencias}` : ''}\n\n🔄 Esta entrega requiere reasignación.`;

      // Notificar a admin_general
      const admins = await this.getUsersByRole(companyId, 'admin_general');
      for (const admin of admins) {
        if (admin.whatsappFlota) {
          await whatsappService.sendMessage(companyId, admin.whatsappFlota, mensaje);
          console.log(`✅ Notificación de entrega fallida enviada a admin: ${admin.nombre}`);
        }
      }

      // Notificar a secretarias
      const secretarias = await this.getUsersByRole(companyId, ['secretaria', 'secretaria_usa']);
      for (const secretaria of secretarias) {
        if (secretaria.whatsappFlota) {
          await whatsappService.sendMessage(companyId, secretaria.whatsappFlota, mensaje);
          console.log(`✅ Notificación de entrega fallida enviada a secretaria: ${secretaria.nombre}`);
        }
      }
    } catch (error) {
      console.error('❌ Error notificando entrega fallida:', error);
    }
  }

  /**
   * Genera y envía reporte diario de entregas no exitosas
   * @param {string} companyId - ID de la compañía
   * @param {Array} entregasFallidas - Array de entregas no exitosas del día
   */
  async sendDailyFailedDeliveriesReport(companyId, entregasFallidas) {
    try {
      if (entregasFallidas.length === 0) {
        console.log('✅ No hay entregas fallidas para reportar');
        return;
      }

      const fecha = new Date().toLocaleDateString('es-DO');
      let mensaje = `📊 *Reporte de Entregas No Exitosas*\n\n📅 *Fecha:* ${fecha}\n📦 *Total:* ${entregasFallidas.length}\n\n`;

      entregasFallidas.forEach((entrega, index) => {
        mensaje += `\n${index + 1}. *${entrega.codigoTracking}*\n`;
        mensaje += `   Ruta: ${entrega.rutaCodigo}\n`;
        mensaje += `   Chofer: ${entrega.repartidorNombre}\n`;
        mensaje += `   Motivo: ${entrega.motivo}\n`;
        if (entrega.evidencias) {
          mensaje += `   📸 Evidencia disponible\n`;
        }
      });

      mensaje += `\n\n🔄 *Estas entregas necesitan reasignación.*\n\n`;
      mensaje += `💬 *COMANDOS DISPONIBLES:*\n`;
      mensaje += `• Escribe \`lista\` - Ver todas las fallidas\n`;
      mensaje += `• Escribe \`info EMI-XXXX\` - Ver detalles\n`;
      mensaje += `• Escribe \`reasignar EMI-XXXX\` - Reasignar una\n`;
      mensaje += `• Escribe \`reasignar todo\` - Reasignar todas\n\n`;
      mensaje += `📱 _Puedes gestionar todo desde WhatsApp._`;

      // Enviar a secretarias
      const secretarias = await this.getUsersByRole(companyId, ['secretaria', 'secretaria_usa']);
      for (const secretaria of secretarias) {
        if (secretaria.whatsappFlota) {
          await whatsappService.sendMessage(companyId, secretaria.whatsappFlota, mensaje);
          console.log(`✅ Reporte diario enviado a secretaria: ${secretaria.nombre}`);
        }
      }

      // Enviar resumen a admin
      const admins = await this.getUsersByRole(companyId, ['admin_general', 'propietario']);
      const mensajeAdmin = `📊 *Resumen Diario de Entregas*\n\n📅 ${fecha}\n\n✅ Entregas exitosas: ${entregasFallidas.length > 0 ? 'Ver dashboard' : 'N/A'}\n❌ No entregadas: ${entregasFallidas.length}\n\n${entregasFallidas.length > 0 ? '⚠️ Requieren atención inmediata para reasignación.' : '🎉 ¡Todas las entregas fueron exitosas!'}`;

      for (const admin of admins) {
        if (admin.whatsappFlota) {
          await whatsappService.sendMessage(companyId, admin.whatsappFlota, mensajeAdmin);
          console.log(`✅ Resumen diario enviado a: ${admin.nombre}`);
        }
      }
    } catch (error) {
      console.error('❌ Error enviando reporte diario:', error);
    }
  }

  /**
   * 💰 Envía reporte financiero detallado al repartidor al cerrar ruta
   * @param {string} companyId - ID de la compañía
   * @param {string} repartidorId - ID del repartidor
   * @param {Object} reporteData - Datos del reporte financiero
   */
  async sendFinancialReportOnRouteClose(companyId, repartidorId, reporteData) {
    try {
      const {
        rutaCodigo,
        montoAsignado,
        gastos,
        totalGastos,
        facturasPagadas,
        totalFacturasPagadas,
        totalCobrado,
        dineroAEntregar,
        facturasEntregadas,
        totalFacturas
      } = reporteData;

      // Obtener datos del repartidor
      const repartidorDoc = await db.collection('usuarios').doc(repartidorId).get();
      if (!repartidorDoc.exists) {
        console.warn(`⚠️ Repartidor ${repartidorId} no encontrado`);
        return;
      }

      const repartidorData = repartidorDoc.data();
      const whatsappNumber = repartidorData.whatsappFlota || repartidorData.whatsapp;

      if (!whatsappNumber) {
        console.warn(`⚠️ Repartidor ${repartidorData.nombre} no tiene WhatsApp configurado`);
        return;
      }

      // Construir mensaje de reporte financiero
      let mensaje = `💼 *REPORTE FINANCIERO DE RUTA*\n\n`;
      mensaje += `🚚 *Ruta:* ${rutaCodigo}\n`;
      mensaje += `📅 *Fecha:* ${new Date().toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
      mensaje += `⏰ *Hora de cierre:* ${new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}\n\n`;

      // Resumen de entregas
      mensaje += `📦 *RESUMEN DE ENTREGAS*\n`;
      mensaje += `   • Total de facturas: ${totalFacturas}\n`;
      mensaje += `   • Facturas entregadas: ${facturasEntregadas}\n`;
      mensaje += `   • Facturas pagadas: ${facturasPagadas}\n\n`;

      // Detalle financiero
      mensaje += `💰 *DETALLE FINANCIERO*\n\n`;
      mensaje += `💵 *Monto asignado:* $${montoAsignado.toFixed(2)}\n\n`;

      // Gastos detallados
      if (gastos && gastos.length > 0) {
        mensaje += `📝 *Gastos realizados:*\n`;
        gastos.forEach((gasto, index) => {
          mensaje += `   ${index + 1}. ${gasto.tipo}: $${gasto.monto.toFixed(2)}\n`;
          if (gasto.descripcion) {
            mensaje += `      _${gasto.descripcion}_\n`;
          }
        });
        mensaje += `   ─────────────────\n`;
        mensaje += `   *Total gastos:* $${totalGastos.toFixed(2)}\n\n`;
      } else {
        mensaje += `✅ *No se registraron gastos*\n\n`;
      }

      // Total cobrado
      mensaje += `💵 *Total cobrado (facturas pagadas):* $${totalFacturasPagadas.toFixed(2)}\n\n`;

      // Cálculo final
      mensaje += `═══════════════════\n`;
      mensaje += `🧮 *CÁLCULO FINAL*\n`;
      mensaje += `   Cobrado: $${totalFacturasPagadas.toFixed(2)}\n`;
      mensaje += `   Gastos: -$${totalGastos.toFixed(2)}\n`;
      mensaje += `   ─────────────────\n`;

      const dineroFinal = totalFacturasPagadas - totalGastos;
      if (dineroFinal >= 0) {
        mensaje += `💰 *Dinero a entregar:* $${dineroFinal.toFixed(2)}\n`;
      } else {
        mensaje += `⚠️ *Déficit:* $${Math.abs(dineroFinal).toFixed(2)}\n`;
        mensaje += `   _(Gastos excedieron lo cobrado)_\n`;
      }
      mensaje += `═══════════════════\n\n`;

      mensaje += `✅ *Ruta completada exitosamente*\n`;
      mensaje += `📍 Pasa por la oficina para hacer entrega del dinero y revisar la ruta.\n\n`;
      mensaje += `¡Excelente trabajo! 👏`;

      // Enviar mensaje
      await whatsappService.sendMessage(companyId, whatsappNumber, mensaje);
      console.log(`✅ Reporte financiero enviado a repartidor ${repartidorData.nombre} (${whatsappNumber})`);

    } catch (error) {
      console.error('❌ Error enviando reporte financiero:', error);
    }
  }

  /**
   * Notifica actualización de progreso de contenedor
   * @param {string} companyId - ID de la compañía
   * @param {Object} contenedorData - Datos del contenedor
   */
  async notifyContenedorProgressUpdate(companyId, contenedorData) {
    try {
      const { numeroContenedor, progreso, estadoActual, totalFacturas, valorTotal } = contenedorData;

      let destinatarios = [];
      let mensaje = `📦 *Actualización de Contenedor*\n\n🔢 *Número:* ${numeroContenedor}\n📊 *Progreso:* ${progreso}%\n🏷️ *Estado:* ${estadoActual}\n📋 *Facturas:* ${totalFacturas}\n💰 *Valor:* $${valorTotal.toFixed(2)}\n\n`;

      // Determinar destinatarios según progreso
      if (progreso >= 75) {
        // Notificar a almacén RD
        destinatarios = await this.getUsersByRole(companyId, 'almacen_rd');
        mensaje += '🚛 El contenedor está en tránsito hacia República Dominicana.';
      } else if (progreso >= 50) {
        // Notificar a cargadores y secretarias
        destinatarios = [
          ...await this.getUsersByRole(companyId, 'cargador'),
          ...await this.getUsersByRole(companyId, ['secretaria', 'secretaria_usa'])
        ];
        mensaje += '✅ Facturas confirmadas, listo para embarque.';
      } else if (progreso >= 25) {
        // Notificar a secretarias
        destinatarios = await this.getUsersByRole(companyId, ['secretaria', 'secretaria_usa']);
        mensaje += '📝 En proceso de recolección y confirmación.';
      }

      for (const user of destinatarios) {
        if (user.whatsappFlota) {
          await whatsappService.sendMessage(companyId, user.whatsappFlota, mensaje);
          console.log(`✅ Actualización de contenedor enviada a: ${user.nombre}`);
        }
      }
    } catch (error) {
      console.error('❌ Error notificando progreso de contenedor:', error);
    }
  }
}

export default new WhatsAppNotificationService();

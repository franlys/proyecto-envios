// backend/src/controllers/hardwareController.js
// Controlador para gestión de hardware (Zebra RFID y Scanners Manuales)

import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

const HARDWARE_SYSTEMS = {
  RFID_ZEBRA: 'rfid_zebra_automatic',
  BARCODE_MANUAL: 'barcode_manual_scanner'
};

// ========================================
// OBTENER CONFIGURACIÓN DE HARDWARE DE UNA COMPAÑÍA
// ========================================
export const getHardwareConfig = async (req, res) => {
  try {
    const { companyId } = req.params;

    // Verificar permisos (solo superadmin o admin de la company)
    const userRole = req.userData?.role;
    const userCompanyId = req.userData?.companyId;

    if (userRole !== 'superadmin' && userCompanyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta configuración'
      });
    }

    // Obtener configuración de hardware
    const hardwareRef = db.collection('hardware_config').doc(companyId);
    const hardwareDoc = await hardwareRef.get();

    if (!hardwareDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Configuración de hardware no encontrada'
      });
    }

    res.json({
      success: true,
      data: hardwareDoc.data()
    });

  } catch (error) {
    console.error('Error obteniendo configuración de hardware:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración de hardware'
    });
  }
};

// ========================================
// CAMBIAR SISTEMA DE HARDWARE (Zebra RFID <-> Barcode Manual)
// ========================================
export const cambiarSistemaHardware = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { nuevoSistema, motivo } = req.body;

    // Solo superadmin puede cambiar sistema
    if (req.userData?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Solo Super Admin puede cambiar el sistema de hardware'
      });
    }

    // Validar sistema
    if (!Object.values(HARDWARE_SYSTEMS).includes(nuevoSistema)) {
      return res.status(400).json({
        success: false,
        message: 'Sistema de hardware inválido'
      });
    }

    const hardwareRef = db.collection('hardware_config').doc(companyId);
    const hardwareDoc = await hardwareRef.get();

    if (!hardwareDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Configuración de hardware no encontrada'
      });
    }

    const configActual = hardwareDoc.data();

    // Agregar al historial
    await hardwareRef.update({
      sistemaActivo: nuevoSistema,
      historialSistema: FieldValue.arrayUnion({
        fecha: new Date().toISOString(),
        sistemaAnterior: configActual.sistemaActivo,
        sistemaNuevo: nuevoSistema,
        realizadoPor: req.userData.uid,
        motivo: motivo || 'Cambio de sistema'
      }),
      actualizadoEn: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Sistema cambiado a ${nuevoSistema === HARDWARE_SYSTEMS.RFID_ZEBRA ? 'Zebra RFID' : 'Scanners Manuales'}`,
      data: {
        sistemaAnterior: configActual.sistemaActivo,
        sistemaNuevo: nuevoSistema
      }
    });

  } catch (error) {
    console.error('Error cambiando sistema de hardware:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar sistema de hardware'
    });
  }
};

// ========================================
// AGREGAR SCANNER MANUAL
// ========================================
export const agregarScanner = async (req, res) => {
  try {
    const { companyId } = req.params;
    const scannerData = req.body;

    // Solo superadmin puede agregar hardware
    if (req.userData?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Solo Super Admin puede agregar hardware'
      });
    }

    const hardwareRef = db.collection('hardware_config').doc(companyId);
    const hardwareDoc = await hardwareRef.get();

    if (!hardwareDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Configuración de hardware no encontrada'
      });
    }

    // Crear ID único para el scanner
    const scannerId = `scanner_${Date.now()}`;

    const nuevoScanner = {
      id: scannerId,
      marca: scannerData.marca,
      modelo: scannerData.modelo || '',
      nombre: scannerData.nombre,
      ubicacion: scannerData.ubicacion || '',
      conexion: scannerData.conexion || 'wireless',
      caracteristicas: {
        lee1D: scannerData.caracteristicas?.lee1D !== false,
        lee2D: scannerData.caracteristicas?.lee2D !== false,
        leeQR: scannerData.caracteristicas?.leeQR !== false,
        alcanceMetros: scannerData.caracteristicas?.alcanceMetros || 100,
        duracionBateria: scannerData.caracteristicas?.duracionBateria || '12 horas'
      },
      precio: scannerData.precio || 0,
      activo: true,
      asignadoA: {
        userId: null,
        nombre: null,
        fechaAsignacion: null
      },
      estadoConexion: {
        online: false,
        ultimaConexion: null,
        bateria: null
      },
      estadisticas: {
        escaneosHoy: 0,
        escaneosTotal: 0,
        erroresHoy: 0
      },
      fechaInstalacion: new Date().toISOString(),
      creadoPor: req.userData.uid
    };

    await hardwareRef.update({
      'barcodeManual.scanners': FieldValue.arrayUnion(nuevoScanner),
      'barcodeManual.estadisticasGenerales.costoTotalInversion': FieldValue.increment(nuevoScanner.precio),
      actualizadoEn: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Scanner agregado exitosamente',
      data: nuevoScanner
    });

  } catch (error) {
    console.error('Error agregando scanner:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar scanner'
    });
  }
};

// ========================================
// AGREGAR IMPRESORA TÉRMICA
// ========================================
export const agregarImpresora = async (req, res) => {
  try {
    const { companyId } = req.params;
    const impresoraData = req.body;

    // Solo superadmin puede agregar hardware
    if (req.userData?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Solo Super Admin puede agregar hardware'
      });
    }

    const hardwareRef = db.collection('hardware_config').doc(companyId);
    const hardwareDoc = await hardwareRef.get();

    if (!hardwareDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Configuración de hardware no encontrada'
      });
    }

    const impresoraId = `printer_${Date.now()}`;

    const nuevaImpresora = {
      id: impresoraId,
      marca: impresoraData.marca,
      modelo: impresoraData.modelo || '',
      nombre: impresoraData.nombre,
      ubicacion: impresoraData.ubicacion || '',
      conexion: impresoraData.conexion || 'usb',
      caracteristicas: {
        tipoImpresion: 'termica_directa',
        anchoPulgadas: impresoraData.caracteristicas?.anchoPulgadas || 4,
        velocidadMmS: impresoraData.caracteristicas?.velocidadMmS || 100,
        lenguaje: impresoraData.caracteristicas?.lenguaje || 'esc-pos',
        resolucionDPI: impresoraData.caracteristicas?.resolucionDPI || 203
      },
      precio: impresoraData.precio || 0,
      activo: true,
      estadoConexion: {
        online: false,
        ultimaImpresion: null,
        errorActual: null
      },
      estadisticas: {
        impresionesHoy: 0,
        impresionesTotal: 0,
        erroresHoy: 0
      },
      fechaInstalacion: new Date().toISOString(),
      creadoPor: req.userData.uid
    };

    await hardwareRef.update({
      'barcodeManual.impresoras': FieldValue.arrayUnion(nuevaImpresora),
      'barcodeManual.estadisticasGenerales.costoTotalInversion': FieldValue.increment(nuevaImpresora.precio),
      actualizadoEn: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Impresora agregada exitosamente',
      data: nuevaImpresora
    });

  } catch (error) {
    console.error('Error agregando impresora:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar impresora'
    });
  }
};

// ========================================
// ELIMINAR DISPOSITIVO (Scanner o Impresora)
// ========================================
export const eliminarDispositivo = async (req, res) => {
  try {
    const { companyId, dispositivoId } = req.params;
    const { tipo } = req.query; // 'scanner' o 'impresora'

    // Solo superadmin puede eliminar hardware
    if (req.userData?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Solo Super Admin puede eliminar hardware'
      });
    }

    const hardwareRef = db.collection('hardware_config').doc(companyId);
    const hardwareDoc = await hardwareRef.get();

    if (!hardwareDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Configuración de hardware no encontrada'
      });
    }

    const configActual = hardwareDoc.data();
    let dispositivoEliminado = null;

    if (tipo === 'scanner') {
      const scanners = configActual.barcodeManual?.scanners || [];
      dispositivoEliminado = scanners.find(s => s.id === dispositivoId);

      if (!dispositivoEliminado) {
        return res.status(404).json({
          success: false,
          message: 'Scanner no encontrado'
        });
      }

      const nuevosScanners = scanners.filter(s => s.id !== dispositivoId);

      await hardwareRef.update({
        'barcodeManual.scanners': nuevosScanners,
        actualizadoEn: new Date().toISOString()
      });

    } else if (tipo === 'impresora') {
      const impresoras = configActual.barcodeManual?.impresoras || [];
      dispositivoEliminado = impresoras.find(i => i.id === dispositivoId);

      if (!dispositivoEliminado) {
        return res.status(404).json({
          success: false,
          message: 'Impresora no encontrada'
        });
      }

      const nuevasImpresoras = impresoras.filter(i => i.id !== dispositivoId);

      await hardwareRef.update({
        'barcodeManual.impresoras': nuevasImpresoras,
        actualizadoEn: new Date().toISOString()
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Tipo de dispositivo inválido'
      });
    }

    res.json({
      success: true,
      message: `${tipo === 'scanner' ? 'Scanner' : 'Impresora'} eliminado exitosamente`,
      data: dispositivoEliminado
    });

  } catch (error) {
    console.error('Error eliminando dispositivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar dispositivo'
    });
  }
};

// ========================================
// ACTUALIZAR CONFIGURACIÓN DE CÓDIGOS DE BARRAS
// ========================================
export const actualizarConfigBarcode = async (req, res) => {
  try {
    const { companyId } = req.params;
    const configData = req.body;

    // Solo superadmin puede actualizar config
    if (req.userData?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Solo Super Admin puede actualizar configuración'
      });
    }

    const hardwareRef = db.collection('hardware_config').doc(companyId);
    const hardwareDoc = await hardwareRef.get();

    if (!hardwareDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Configuración de hardware no encontrada'
      });
    }

    const actualizaciones = {};

    if (configData.formatoCodigo) actualizaciones['barcodeManual.configuracion.formatoCodigo'] = configData.formatoCodigo;
    if (configData.prefijo) actualizaciones['barcodeManual.configuracion.prefijo'] = configData.prefijo;
    if (configData.etiquetas) actualizaciones['barcodeManual.configuracion.etiquetas'] = configData.etiquetas;
    if (typeof configData.autoImprimir === 'boolean') {
      actualizaciones['barcodeManual.configuracion.autoImprimir'] = configData.autoImprimir;
    }

    actualizaciones.actualizadoEn = new Date().toISOString();

    await hardwareRef.update(actualizaciones);

    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: actualizaciones
    });

  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar configuración'
    });
  }
};

// ========================================
// ACTIVAR/DESACTIVAR SISTEMA
// ========================================
export const toggleSistemaHardware = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { enabled } = req.body;

    // Solo superadmin puede activar/desactivar
    if (req.userData?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Solo Super Admin puede activar/desactivar el sistema'
      });
    }

    const hardwareRef = db.collection('hardware_config').doc(companyId);

    await hardwareRef.update({
      enabled: enabled,
      actualizadoEn: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Sistema ${enabled ? 'activado' : 'desactivado'} exitosamente`
    });

  } catch (error) {
    console.error('Error cambiando estado del sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado del sistema'
    });
  }
};

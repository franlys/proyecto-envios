// lib/services/cargador_service.dart
// (El nombre de tu archivo es 'cargador_rutas_screen.dart', pero el contenido es 'CargadorService')
library;

/// 🚚 SERVICIO DE CARGADOR
/// Gestiona operaciones del cargador con transacciones atómicas

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:mobile_app/models/cargador_models.dart';

class CargadorService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // ==================== OBTENER RUTAS STREAM ====================
  
  Stream<List<RutaCarga>> getRutasStream(String cargadorId) {
    return _firestore
        .collection('rutasCarga')
        .where('cargadorId', isEqualTo: cargadorId)
        .orderBy('fechaCreacion', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        return RutaCarga.fromFirestore(doc);
      }).toList();
    });
  }

  // ==================== OBTENER RUTAS POR ESTADO ====================
  
  Stream<List<RutaCarga>> getRutasByEstado(String cargadorId, String estado) {
    return _firestore
        .collection('rutasCarga')
        .where('cargadorId', isEqualTo: cargadorId)
        .where('estado', isEqualTo: estado)
        .orderBy('fechaCreacion', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        return RutaCarga.fromFirestore(doc);
      }).toList();
    });
  }

  // ==================== OBTENER RUTAS ====================

  Future<List<Map<String, dynamic>>> getRutas(String cargadorId) async {
    try {
      final snapshot = await _firestore
          .collection('rutasCarga')
          .where('cargadorId', isEqualTo: cargadorId)
          .orderBy('fechaCreacion', descending: true)
          .get();

      return snapshot.docs.map((doc) {
        return {
          'id': doc.id,
          ...doc.data(),
        };
      }).toList();
    } catch (e) {
      print('Error al obtener rutas: $e');
      rethrow;
    }
  }

  // ==================== OBTENER RUTA ESPECÍFICA ====================
  
  Future<Map<String, dynamic>?> getRuta(String rutaId) async {
    try {
      final doc = await _firestore.collection('rutasCarga').doc(rutaId).get();
      
      if (!doc.exists) return null;
      
      return {
        'id': doc.id,
        ...doc.data()!,
      };
    } catch (e) {
      print('Error al obtener ruta: $e');
      rethrow;
    }
  }

  // ==================== INICIAR CARGA ====================
  
  Future<bool> iniciarCarga(String rutaId) async {
    try {
      await _firestore.collection('rutasCarga').doc(rutaId).update({
        'estado': 'en_proceso',
        'fechaInicio': FieldValue.serverTimestamp(),
        'ultimaActualizacion': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      print('Error al iniciar carga: $e');
      return false;
    }
  }

  // ==================== COMPLETAR CARGA ====================
  
  Future<bool> completarCarga(String rutaId) async {
    try {
      await _firestore.collection('rutasCarga').doc(rutaId).update({
        'estado': 'completada',
        'fechaCompletado': FieldValue.serverTimestamp(),
        'ultimaActualizacion': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      print('Error al completar carga: $e');
      return false;
    }
  }

  // ==================== ACTUALIZAR ESTADO RUTA ====================
  
  Future<bool> actualizarEstadoRuta(String rutaId, String nuevoEstado) async {
    try {
      final Map<String, dynamic> updates = {
        'estado': nuevoEstado,
        'ultimaActualizacion': FieldValue.serverTimestamp(),
      };

      if (nuevoEstado == 'completada') {
        updates['fechaCompletado'] = FieldValue.serverTimestamp();
      }

      await _firestore.collection('rutasCarga').doc(rutaId).update(updates);
      return true;
    } catch (e) {
      print('Error al actualizar estado de ruta: $e');
      return false;
    }
  }

  // ==================== MARCAR ITEM CARGADO ====================

  Future<bool> marcarItemCargado(
    String rutaId,
    String itemId,
    String cargadorId,
    String cargadorNombre,
  ) async {
    try {
      await _firestore.runTransaction((transaction) async {
        final rutaRef = _firestore.collection('rutasCarga').doc(rutaId);
        final rutaDoc = await transaction.get(rutaRef);

        if (!rutaDoc.exists) {
          throw Exception('Ruta no encontrada');
        }

        final items = List<Map<String, dynamic>>.from(rutaDoc.data()!['items'] ?? []);
        
        bool found = false;
        for (var i = 0; i < items.length; i++) {
          if (items[i]['id'] == itemId) {
            items[i]['cargado'] = true;
            items[i]['fechaCarga'] = FieldValue.serverTimestamp();
            items[i]['cargadoPor'] = cargadorNombre;
            found = true;
            break;
          }
        }

        if (!found) {
          throw Exception('Item no encontrado en la ruta');
        }

        transaction.update(rutaRef, {
          'items': items,
          'itemsCargados': FieldValue.increment(1),
          'ultimaActualizacion': FieldValue.serverTimestamp(),
        });
      });

      return true;
    } catch (e) {
      print('Error al marcar item cargado: $e');
      return false;
    }
  }

  // ==================== DESMARCAR ITEM ====================

  Future<bool> desmarcarItem(String rutaId, String itemId) async {
    try {
      await _firestore.runTransaction((transaction) async {
        final rutaRef = _firestore.collection('rutasCarga').doc(rutaId);
        final rutaDoc = await transaction.get(rutaRef);

        if (!rutaDoc.exists) {
          throw Exception('Ruta no encontrada');
        }

        final items = List<Map<String, dynamic>>.from(rutaDoc.data()!['items'] ?? []);
        
        bool found = false;
        for (var i = 0; i < items.length; i++) {
          if (items[i]['id'] == itemId) {
            items[i]['cargado'] = false;
            items[i]['fechaCarga'] = null;
            items[i]['cargadoPor'] = null;
            found = true;
            break;
          }
        }

        if (!found) {
          throw Exception('Item no encontrado en la ruta');
        }

        transaction.update(rutaRef, {
          'items': items,
          'itemsCargados': FieldValue.increment(-1),
          'ultimaActualizacion': FieldValue.serverTimestamp(),
        });
      });

      return true;
    } catch (e) {
      print('Error al desmarcar item: $e');
      return false;
    }
  }

  // ==================== REPORTAR DAÑO (CORREGIDO) ====================
  
  /// 💡 FIX: Se corrigió la firma de la función.
  /// Se eliminó el parámetro 'ReporteDano reporte' que no se usaba.
  /// Se eliminaron los parámetros duplicados 'rutaId' y 'itemId' de la sección 'named'.
  Future<bool> reportarDano(
    String rutaId, // Parámetro posicional
    String itemId, // Parámetro posicional
    { // Parámetros nombrados
      required String descripcion,
      String? fotoUrl,
      required String reportadoPor,
    }
  ) async {
    try {
      await _firestore.runTransaction((transaction) async {
        final rutaRef = _firestore.collection('rutasCarga').doc(rutaId);
        final rutaDoc = await transaction.get(rutaRef);

        if (!rutaDoc.exists) {
          throw Exception('Ruta no encontrada');
        }

        final items = List<Map<String, dynamic>>.from(rutaDoc.data()!['items'] ?? []);
        
        bool found = false;
        for (var i = 0; i < items.length; i++) {
          if (items[i]['id'] == itemId) {
            items[i]['danado'] = true;
            items[i]['descripcionDano'] = descripcion;
            items[i]['fotoDano'] = fotoUrl;
            items[i]['fechaReporteDano'] = FieldValue.serverTimestamp();
            items[i]['reportadoPor'] = reportadoPor;
            found = true;
            break;
          }
        }

        if (!found) {
          throw Exception('Item no encontrado en la ruta');
        }

        transaction.update(rutaRef, {
          'items': items,
          'ultimaActualizacion': FieldValue.serverTimestamp(),
        });

        final danoRef = _firestore.collection('reportesDanos').doc();
        transaction.set(danoRef, {
          'rutaId': rutaId,
          'itemId': itemId,
          'descripcion': descripcion,
          'fotoUrl': fotoUrl,
          'reportadoPor': reportadoPor,
          'fechaReporte': FieldValue.serverTimestamp(),
          'estado': 'pendiente',
        });
      });

      return true;
    } catch (e) {
      print('Error al reportar daño: $e');
      return false;
    }
  }
  // ==================== BUSCAR ITEM POR BARCODE ====================
  
  Future<ItemCarga?> buscarItemPorBarcode(String rutaId, String barcode) async {
    try {
      final rutaDoc = await _firestore.collection('rutasCarga').doc(rutaId).get();
      
      if (!rutaDoc.exists) return null;
      
      final items = List<Map<String, dynamic>>.from(rutaDoc.data()!['items'] ?? []);
      
      for (var itemData in items) {
        if (itemData['barcode'] == barcode) {
          return ItemCarga.fromMap(itemData);
        }
      }
      
      return null;
    } catch (e) {
      print('Error al buscar item por barcode: $e');
      return null;
    }
  }

  // ==================== COMPLETAR RUTA ====================

  Future<bool> completarRuta(String rutaId) async {
    try {
      await _firestore.collection('rutasCarga').doc(rutaId).update({
        'estado': 'completada',
        'fechaCompletado': FieldValue.serverTimestamp(),
        'ultimaActualizacion': FieldValue.serverTimestamp(),
      });

      return true;
    } catch (e) {
      print('Error al completar ruta: $e');
      return false;
    }
  }

  // ==================== ESTADÍSTICAS ====================

  Future<EstadisticasCargador> getEstadisticas(String cargadorId) async {
    try {
      final now = DateTime.now();
      final inicioHoy = DateTime(now.year, now.month, now.day);

      final snapshot = await _firestore
          .collection('rutasCarga')
          .where('cargadorId', isEqualTo: cargadorId)
          .get();

      int totalRutas = 0;
      int rutasEnProceso = 0;
      int rutasCompletadasHoy = 0;
      int itemsCargadosHoy = 0;
      int danosReportadosHoy = 0;
      
      // FIX: Variables añadidas para los campos que faltaban
      int rutasCompletadas = 0;
      int totalItemsCargados = 0;
      int totalDanosReportados = 0;
      List<double> tiemposCarga = [];

      for (var doc in snapshot.docs) {
        final data = doc.data();
        totalRutas++;
        
        if (data['estado'] == 'en_proceso' || data['estado'] == 'pendiente') {
          rutasEnProceso++;
        }

        // --- Cálculo de completadas ---
        if (data['estado'] == 'completada') {
          rutasCompletadas++;
          final fechaCompletado = (data['fechaCompletado'] as Timestamp?)?.toDate();
          if (fechaCompletado != null && fechaCompletado.isAfter(inicioHoy)) {
            rutasCompletadasHoy++;
          }
          // --- Cálculo de tiempo ---
          final fechaInicio = (data['fechaInicio'] as Timestamp?)?.toDate();
          if(fechaInicio != null && fechaCompletado != null) {
             tiemposCarga.add(fechaCompletado.difference(fechaInicio).inMinutes.toDouble());
          }
        }
        
        // --- Cálculo de items y daños ---
        final items = List<Map<String, dynamic>>.from(data['items'] ?? []);
        for (var item in items) {
          if (item['cargado'] == true) {
            totalItemsCargados++; // Total histórico
            final fechaCarga = (item['fechaCarga'] as Timestamp?)?.toDate();
            if (fechaCarga != null && fechaCarga.isAfter(inicioHoy)) {
              itemsCargadosHoy++; // Solo hoy
            }
          }
          
          if (item['danado'] == true) {
            totalDanosReportados++; // Total histórico
            final fechaDano = (item['fechaReporteDano'] as Timestamp?)?.toDate();
            if (fechaDano != null && fechaDano.isAfter(inicioHoy)) {
              danosReportadosHoy++; // Solo hoy
            }
          }
        }
      }

      // --- Cálculo de promedios ---
      double promedioTiempo = 0.0;
      if (tiemposCarga.isNotEmpty) {
        promedioTiempo = tiemposCarga.reduce((a, b) => a + b) / tiemposCarga.length;
      }
      double tasaCompletitud = totalRutas > 0 ? rutasCompletadas / totalRutas : 0.0;

      // FIX: Se pasaron todos los parámetros requeridos al constructor
      return EstadisticasCargador(
        cargadorId: cargadorId,
        totalRutas: totalRutas,
        rutasCompletadas: rutasCompletadas,
        rutasEnProceso: rutasEnProceso,
        totalItemsCargados: totalItemsCargados,
        totalDanosReportados: totalDanosReportados,
        promedioTiempoCarga: promedioTiempo,
        tasaCompletitud: tasaCompletitud,
        rutasCompletadasHoy: rutasCompletadasHoy,
        itemsCargadosHoy: itemsCargadosHoy,
        danosReportadosHoy: danosReportadosHoy,
      );
    } catch (e) {
      print('Error al obtener estadísticas: $e');
      // FIX: Se pasaron todos los parámetros requeridos al constructor por defecto
      return EstadisticasCargador(
        cargadorId: cargadorId,
        totalRutas: 0,
        rutasCompletadas: 0,
        rutasEnProceso: 0,
        totalItemsCargados: 0,
        totalDanosReportados: 0,
        promedioTiempoCarga: 0.0,
        tasaCompletitud: 0.0,
        rutasCompletadasHoy: 0,
        itemsCargadosHoy: 0,
        danosReportadosHoy: 0,
      );
    }
  }
}
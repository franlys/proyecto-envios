library;

/// 📍 SERVICIO DE RECOLECTOR
/// Gestiona operaciones del recolector con transacciones atómicas

import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/recolector_models.dart';

class RecolectorService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // ==================== OBTENER RUTAS STREAM ====================

  Stream<List<RutaRecoleccion>> getRutasRecolector(String recolectorId) {
    return _firestore
        .collection('rutasRecoleccion')
        .where('recolectorId', isEqualTo: recolectorId)
        .orderBy('fechaCreacion', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        return RutaRecoleccion.fromFirestore(doc);
      }).toList();
    });
  }

  // ==================== OBTENER RUTAS ====================

  Future<List<Map<String, dynamic>>> getRutas(String recolectorId) async {
    try {
      final snapshot = await _firestore
          .collection('rutasRecoleccion')
          .where('recolectorId', isEqualTo: recolectorId)
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
      final doc = await _firestore.collection('rutasRecoleccion').doc(rutaId).get();
      
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

  // ==================== INICIAR RUTA ====================

  Future<bool> iniciarRuta(String rutaId) async {
    try {
      await _firestore.collection('rutasRecoleccion').doc(rutaId).update({
        'estado': 'en_proceso',
        'fechaInicio': FieldValue.serverTimestamp(),
        'ultimaActualizacion': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      print('Error al iniciar ruta: $e');
      return false;
    }
  }

  // ==================== MARCAR PUNTO RECOLECTADO ====================

  Future<bool> marcarPuntoRecolectado({
    required String rutaId,
    required String puntoId,
    required int paquetesRecolectados,
    String? observaciones,
  }) async {
    try {
      await _firestore.runTransaction((transaction) async {
        final rutaRef = _firestore.collection('rutasRecoleccion').doc(rutaId);
        final rutaDoc = await transaction.get(rutaRef);

        if (!rutaDoc.exists) {
          throw Exception('Ruta no encontrada');
        }

        final puntos = List<Map<String, dynamic>>.from(rutaDoc.data()!['puntos'] ?? []);
        
        bool found = false;
        for (var i = 0; i < puntos.length; i++) {
          if (puntos[i]['id'] == puntoId) {
            puntos[i]['recolectado'] = true;
            puntos[i]['paquetesRecolectados'] = paquetesRecolectados;
            puntos[i]['fechaRecoleccion'] = FieldValue.serverTimestamp();
            if (observaciones != null) {
              puntos[i]['observaciones'] = observaciones;
            }
            found = true;
            break;
          }
        }

        if (!found) {
          throw Exception('Punto no encontrado en la ruta');
        }

        transaction.update(rutaRef, {
          'puntos': puntos,
          'puntosCompletados': FieldValue.increment(1),
          'totalPaquetesRecolectados': FieldValue.increment(paquetesRecolectados),
          'ultimaActualizacion': FieldValue.serverTimestamp(),
        });
      });

      return true;
    } catch (e) {
      print('Error al marcar punto recolectado: $e');
      return false;
    }
  }

  // ==================== MARCAR PUNTO NO RECOLECTADO ====================

  Future<bool> marcarPuntoNoRecolectado({
    required String rutaId,
    required String puntoId,
    required String motivo,
  }) async {
    try {
      await _firestore.runTransaction((transaction) async {
        final rutaRef = _firestore.collection('rutasRecoleccion').doc(rutaId);
        final rutaDoc = await transaction.get(rutaRef);

        if (!rutaDoc.exists) {
          throw Exception('Ruta no encontrada');
        }

        final puntos = List<Map<String, dynamic>>.from(rutaDoc.data()!['puntos'] ?? []);
        
        bool found = false;
        for (var i = 0; i < puntos.length; i++) {
          if (puntos[i]['id'] == puntoId) {
            puntos[i]['recolectado'] = false;
            puntos[i]['noRecolectado'] = true;
            puntos[i]['motivoNoRecoleccion'] = motivo;
            puntos[i]['fechaNoRecoleccion'] = FieldValue.serverTimestamp();
            found = true;
            break;
          }
        }

        if (!found) {
          throw Exception('Punto no encontrado en la ruta');
        }

        transaction.update(rutaRef, {
          'puntos': puntos,
          'puntosCompletados': FieldValue.increment(1),
          'ultimaActualizacion': FieldValue.serverTimestamp(),
        });
      });

      return true;
    } catch (e) {
      print('Error al marcar punto no recolectado: $e');
      return false;
    }
  }

  // ==================== COMPLETAR RUTA ====================

  Future<bool> completarRuta(String rutaId) async {
    try {
      await _firestore.collection('rutasRecoleccion').doc(rutaId).update({
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

  Future<EstadisticasRecolector> getEstadisticas(String recolectorId) async {
    try {
      final now = DateTime.now();
      final inicioHoy = DateTime(now.year, now.month, now.day);

      final snapshot = await _firestore
          .collection('rutasRecoleccion')
          .where('recolectorId', isEqualTo: recolectorId)
          .get();

      int rutasEnProceso = 0;
      int rutasCompletadasHoy = 0;
      int puntosRecolectadosHoy = 0;
      int paquetesRecolectadosHoy = 0;

      for (var doc in snapshot.docs) {
        final data = doc.data();
        
        if (data['estado'] == 'en_proceso' || data['estado'] == 'asignada') {
          rutasEnProceso++;
        }

        final fechaCompletado = (data['fechaCompletado'] as Timestamp?)?.toDate();
        if (fechaCompletado != null && fechaCompletado.isAfter(inicioHoy)) {
          rutasCompletadasHoy++;
        }

        final puntos = List<Map<String, dynamic>>.from(data['puntos'] ?? []);
        for (var punto in puntos) {
          final fechaRecoleccion = (punto['fechaRecoleccion'] as Timestamp?)?.toDate();
          if (fechaRecoleccion != null && fechaRecoleccion.isAfter(inicioHoy)) {
            puntosRecolectadosHoy++;
            paquetesRecolectadosHoy += (punto['paquetesRecolectados'] as int?) ?? 0;
          }
        }
      }

      return EstadisticasRecolector(
        rutasEnProceso: rutasEnProceso,
        rutasCompletadasHoy: rutasCompletadasHoy,
        puntosRecolectadosHoy: puntosRecolectadosHoy,
        paquetesRecolectadosHoy: paquetesRecolectadosHoy,
        rutasAsignadas: 0,
        puntoPendientesHoy: 0,
      );
    } catch (e) {
      print('Error al obtener estadísticas: $e');
      return EstadisticasRecolector(
        rutasEnProceso: 0,
        rutasCompletadasHoy: 0,
        puntosRecolectadosHoy: 0,
        paquetesRecolectadosHoy: 0,
        rutasAsignadas: 0,
        puntoPendientesHoy: 0,
      );
    }
  }

  // ==================== HISTORIAL ====================

  Future<List<RutaRecoleccion>> getHistorial(String recolectorId, {required int limit}) async {
    try {
      final snapshot = await _firestore
          .collection('rutasRecoleccion')
          .where('recolectorId', isEqualTo: recolectorId)
          .where('estado', isEqualTo: 'completada')
          .orderBy('fechaCompletado', descending: true)
          .limit(limit)
          .get();

      return snapshot.docs.map((doc) {
        return RutaRecoleccion.fromFirestore(doc);
      }).toList();
    } catch (e) {
      print('Error al obtener historial: $e');
      return [];
    }
  }
}
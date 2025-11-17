// lib/services/almacen_usa_service.dart
/// 🏢 SERVICIO DE ALMACÉN USA
/// Maneja todas las operaciones de Firestore para el almacén en Estados Unidos
library;


import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/almacen_usa_models.dart';

class AlmacenUSAService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // ==================== CONTENEDORES ====================
  
  /// Stream de contenedores
  Stream<List<ContenedorUSA>> getContenedoresStream({String? filtroEstado}) {
    Query query = _firestore
        .collection('contenedores_usa')
        .orderBy('fechaCreacion', descending: true);

    if (filtroEstado != null && filtroEstado != 'todos') {
      query = query.where('estado', isEqualTo: filtroEstado);
    }

    return query.snapshots().map((snapshot) {
      return snapshot.docs
          .map((doc) => ContenedorUSA.fromFirestore(doc))
          .toList();
    });
  }

  /// Crear nuevo contenedor
  Future<String?> crearContenedor(String numeroContenedor, String creadoPor) async {
    try {
      DocumentReference docRef = await _firestore.collection('contenedores_usa').add({
        'numeroContenedor': numeroContenedor,
        'destino': 'republica_dominicana',
        'fechaCreacion': FieldValue.serverTimestamp(),
        'estado': 'abierto',
        'itemIds': [],
        'capacidadMaxima': 1000,
        'itemsActuales': 0,
        'pesoTotal': 0.0,
        'volumenTotal': 0.0,
        'creadoPor': creadoPor,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      print('✅ Contenedor creado: ${docRef.id}');
      return docRef.id;
    } catch (e) {
      print('❌ Error al crear contenedor: $e');
      return null;
    }
  }

  /// Cerrar contenedor
  Future<bool> cerrarContenedor(String contenedorId, String cerradoPor) async {
    try {
      await _firestore.collection('contenedores_usa').doc(contenedorId).update({
        'estado': 'cerrado',
        'fechaCierre': FieldValue.serverTimestamp(),
        'cerradoPor': cerradoPor,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      print('✅ Contenedor cerrado: $contenedorId');
      return true;
    } catch (e) {
      print('❌ Error al cerrar contenedor: $e');
      return false;
    }
  }

  /// Enviar contenedor
  Future<bool> enviarContenedor(
    String contenedorId,
    String naviera,
    String numeroTracking,
  ) async {
    try {
      await _firestore.collection('contenedores_usa').doc(contenedorId).update({
        'estado': 'enviado',
        'fechaEnvio': FieldValue.serverTimestamp(),
        'naviera': naviera,
        'numeroTracking': numeroTracking,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      print('✅ Contenedor enviado: $contenedorId');
      return true;
    } catch (e) {
      print('❌ Error al enviar contenedor: $e');
      return false;
    }
  }

  /// Obtener items de un contenedor
  Future<List<ItemInventario>> getItemsDeContenedor(String contenedorId) async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('items_inventario')
          .where('contenedorId', isEqualTo: contenedorId)
          .get();

      return snapshot.docs
          .map((doc) => ItemInventario.fromFirestore(doc))
          .toList();
    } catch (e) {
      print('❌ Error al obtener items del contenedor: $e');
      return [];
    }
  }

  // ==================== ITEMS DE INVENTARIO ====================
  
  /// Stream de items
  Stream<List<ItemInventario>> getItemsStream({String? filtroEstado}) {
    Query query = _firestore
        .collection('items_inventario')
        .orderBy('fechaIngreso', descending: true);

    if (filtroEstado != null) {
      if (filtroEstado == 'sin_asignar') {
        query = query.where('contenedorId', isNull: true);
      } else if (filtroEstado != 'todos') {
        query = query.where('estado', isEqualTo: filtroEstado);
      }
    }

    return query.snapshots().map((snapshot) {
      return snapshot.docs
          .map((doc) => ItemInventario.fromFirestore(doc))
          .toList();
    });
  }

  /// Registrar nuevo item
  Future<String?> registrarItem(ItemInventario item) async {
    try {
      DocumentReference docRef = await _firestore
          .collection('items_inventario')
          .add(item.toMap());

      print('✅ Item registrado: ${docRef.id}');
      return docRef.id;
    } catch (e) {
      print('❌ Error al registrar item: $e');
      return null;
    }
  }

  /// Buscar item por barcode
  Future<ItemInventario?> buscarItemPorBarcode(String barcode) async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('items_inventario')
          .where('barcode', isEqualTo: barcode)
          .limit(1)
          .get();

      if (snapshot.docs.isNotEmpty) {
        return ItemInventario.fromFirestore(snapshot.docs.first);
      }
      return null;
    } catch (e) {
      print('❌ Error al buscar item: $e');
      return null;
    }
  }

  /// Agregar item a contenedor
  Future<bool> agregarItemAContenedor(String itemId, String contenedorId) async {
    try {
      await _firestore.collection('items_inventario').doc(itemId).update({
        'contenedorId': contenedorId,
        'estado': 'en_contenedor',
        'updatedAt': FieldValue.serverTimestamp(),
      });

      DocumentSnapshot itemDoc = await _firestore
          .collection('items_inventario')
          .doc(itemId)
          .get();

      if (itemDoc.exists) {
        Map<String, dynamic> itemData = itemDoc.data() as Map<String, dynamic>;
        double peso = itemData['peso']?.toDouble() ?? 0.0;

        await _firestore.collection('contenedores_usa').doc(contenedorId).update({
          'itemIds': FieldValue.arrayUnion([itemId]),
          'itemsActuales': FieldValue.increment(1),
          'pesoTotal': FieldValue.increment(peso),
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }

      print('✅ Item agregado a contenedor');
      return true;
    } catch (e) {
      print('❌ Error al agregar item a contenedor: $e');
      return false;
    }
  }

  // ==================== ESTADÍSTICAS ====================
  
  /// Obtener estadísticas del almacén USA
  Future<EstadisticasAlmacenUSA> getEstadisticas() async {
    try {
      QuerySnapshot contenedoresSnapshot = await _firestore
          .collection('contenedores_usa')
          .get();

      List<ContenedorUSA> contenedores = contenedoresSnapshot.docs
          .map((doc) => ContenedorUSA.fromFirestore(doc))
          .toList();

      int abiertos = contenedores.where((c) => c.estado == 'abierto').length;
      int cerrados = contenedores
          .where((c) => c.estado == 'cerrado' || c.estado == 'enviado')
          .length;

      QuerySnapshot itemsSnapshot = await _firestore
          .collection('items_inventario')
          .get();

      int totalItems = itemsSnapshot.docs.length;
      int sinAsignar = itemsSnapshot.docs
          .where((doc) {
            Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
            return data['contenedorId'] == null;
          })
          .length;

      DateTime hoy = DateTime.now();
      DateTime inicioHoy = DateTime(hoy.year, hoy.month, hoy.day);

      QuerySnapshot escaneosSnapshot = await _firestore
          .collection('escaneos')
          .where('fechaEscaneo', isGreaterThanOrEqualTo: Timestamp.fromDate(inicioHoy))
          .get();

      int escaneosDia = escaneosSnapshot.docs.length;

      double pesoTotal = 0.0;
      for (var doc in itemsSnapshot.docs) {
        Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
        pesoTotal += data['peso']?.toDouble() ?? 0.0;
      }

      return EstadisticasAlmacenUSA(
        contenedoresAbiertos: abiertos,
        contenedoresCerrados: cerrados,
        itemsEnInventario: totalItems,
        itemsSinAsignar: sinAsignar,
        escaneosDiaActual: escaneosDia,
        pesoTotalAlmacenado: pesoTotal,
      );
    } catch (e) {
      print('❌ Error al obtener estadísticas: $e');
      return EstadisticasAlmacenUSA(
        contenedoresAbiertos: 0,
        contenedoresCerrados: 0,
        itemsEnInventario: 0,
        itemsSinAsignar: 0,
        escaneosDiaActual: 0,
        pesoTotalAlmacenado: 0.0,
      );
    }
  }

  // ==================== ESCANEO ====================
  
  /// Registrar escaneo
  Future<bool> registrarEscaneo(RegistroEscaneo escaneo) async {
    try {
      await _firestore.collection('escaneos').add(escaneo.toMap());
      return true;
    } catch (e) {
      print('❌ Error al registrar escaneo: $e');
      return false;
    }
  }

  /// Obtener historial de escaneos
  Future<List<RegistroEscaneo>> getHistorialEscaneos({int limit = 50}) async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('escaneos')
          .orderBy('fechaEscaneo', descending: true)
          .limit(limit)
          .get();

      return snapshot.docs
          .map((doc) => RegistroEscaneo.fromFirestore(doc))
          .toList();
    } catch (e) {
      print('❌ Error al obtener historial de escaneos: $e');
      return [];
    }
  }

  // ==================== BÚSQUEDAS ====================
  
  /// Buscar contenedor por número
  Future<ContenedorUSA?> buscarContenedorPorNumero(String numero) async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('contenedores_usa')
          .where('numeroContenedor', isEqualTo: numero)
          .limit(1)
          .get();

      if (snapshot.docs.isNotEmpty) {
        return ContenedorUSA.fromFirestore(snapshot.docs.first);
      }
      return null;
    } catch (e) {
      print('❌ Error al buscar contenedor: $e');
      return null;
    }
  }

  /// Buscar item por tracking
  Future<ItemInventario?> buscarItemPorTracking(String tracking) async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('items_inventario')
          .where('numeroTracking', isEqualTo: tracking)
          .limit(1)
          .get();

      if (snapshot.docs.isNotEmpty) {
        return ItemInventario.fromFirestore(snapshot.docs.first);
      }
      return null;
    } catch (e) {
      print('❌ Error al buscar item: $e');
      return null;
    }
  }

  // ==================== ACTUALIZAR ITEM ====================
  
  /// Actualizar estado de item
  Future<bool> actualizarEstadoItem(String itemId, String nuevoEstado) async {
    try {
      await _firestore.collection('items_inventario').doc(itemId).update({
        'estado': nuevoEstado,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      print('✅ Estado actualizado: $nuevoEstado');
      return true;
    } catch (e) {
      print('❌ Error al actualizar estado: $e');
      return false;
    }
  }

  /// Actualizar ubicación de item
  Future<bool> actualizarUbicacionItem(String itemId, String ubicacion) async {
    try {
      await _firestore.collection('items_inventario').doc(itemId).update({
        'ubicacion': ubicacion,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      print('✅ Ubicación actualizada');
      return true;
    } catch (e) {
      print('❌ Error al actualizar ubicación: $e');
      return false;
    }
  }

  // ==================== ELIMINAR ====================
  
  /// Eliminar item (solo si no está asignado)
  Future<bool> eliminarItem(String itemId) async {
    try {
      DocumentSnapshot doc = await _firestore
          .collection('items_inventario')
          .doc(itemId)
          .get();

      if (doc.exists) {
        Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
        if (data['contenedorId'] != null) {
          print('❌ No se puede eliminar: item asignado a contenedor');
          return false;
        }
      }

      await _firestore.collection('items_inventario').doc(itemId).delete();
      print('✅ Item eliminado');
      return true;
    } catch (e) {
      print('❌ Error al eliminar item: $e');
      return false;
    }
  }
}
// lib/services/almacen_rd_service.dart
/// 🏪 SERVICIO DE ALMACÉN RD
/// Maneja todas las operaciones de Firestore para el almacén en República Dominicana
library;


import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/almacen_rd_models.dart';

class AlmacenRDService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // ==================== CONTENEDORES ====================
  
  /// Stream de contenedores
  Stream<List<ContenedorRecibido>> getContenedoresStream({String? filtroEstado}) {
    Query query = _firestore
        .collection('contenedores')
        .orderBy('fechaRecepcion', descending: true);

    if (filtroEstado != null && filtroEstado != 'todos') {
      query = query.where('estado', isEqualTo: filtroEstado);
    }

    return query.snapshots().map((snapshot) {
      return snapshot.docs
          .map((doc) => ContenedorRecibido.fromFirestore(doc))
          .toList();
    });
  }

  /// Obtener un contenedor específico
  Future<ContenedorRecibido?> getContenedor(String contenedorId) async {
    try {
      DocumentSnapshot doc = await _firestore
          .collection('contenedores')
          .doc(contenedorId)
          .get();

      if (doc.exists) {
        return ContenedorRecibido.fromFirestore(doc);
      }
      return null;
    } catch (e) {
      print('❌ Error al obtener contenedor: $e');
      return null;
    }
  }

  /// Recibir un contenedor (marcar como recibido)
  Future<bool> recibirContenedor(
    String contenedorId,
    String recibioPor,
    String almacenRDId,
  ) async {
    try {
      await _firestore.collection('contenedores').doc(contenedorId).update({
        'estado': 'recibido',
        'fechaRecepcion': FieldValue.serverTimestamp(),
        'recibioPor': recibioPor,
        'almacenRDId': almacenRDId,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      
      print('✅ Contenedor recibido: $contenedorId');
      return true;
    } catch (e) {
      print('❌ Error al recibir contenedor: $e');
      return false;
    }
  }

  /// Marcar contenedor como procesado
  Future<bool> marcarContenedorProcesado(String contenedorId) async {
    try {
      await _firestore.collection('contenedores').doc(contenedorId).update({
        'estado': 'procesado',
        'progresoProcesamiento': 1.0,
        'itemsProcesados': FieldValue.increment(0),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      
      print('✅ Contenedor procesado: $contenedorId');
      return true;
    } catch (e) {
      print('❌ Error al procesar contenedor: $e');
      return false;
    }
  }

  /// Agregar nota a contenedor
  Future<bool> agregarNotaContenedor(String contenedorId, String nota) async {
    try {
      await _firestore.collection('contenedores').doc(contenedorId).update({
        'notas': FieldValue.arrayUnion([nota]),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      print('❌ Error al agregar nota: $e');
      return false;
    }
  }

  // ==================== RUTAS DE DISTRIBUCIÓN ====================
  
  /// Stream de rutas
  Stream<List<RutaDistribucion>> getRutasStream({String? filtroEstado}) {
    Query query = _firestore
        .collection('rutas_distribucion')
        .orderBy('fechaAsignacion', descending: true);

    if (filtroEstado != null && filtroEstado != 'todos') {
      query = query.where('estado', isEqualTo: filtroEstado);
    }

    return query.snapshots().map((snapshot) {
      return snapshot.docs
          .map((doc) => RutaDistribucion.fromFirestore(doc))
          .toList();
    });
  }

  /// Obtener rutas de un repartidor específico
  Stream<List<RutaDistribucion>> getRutasByRepartidor(String repartidorId) {
    return _firestore
        .collection('rutas_distribucion')
        .where('repartidorId', isEqualTo: repartidorId)
        .orderBy('fechaAsignacion', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => RutaDistribucion.fromFirestore(doc))
          .toList();
    });
  }

  /// Crear nueva ruta de distribución
  Future<String?> crearRuta(RutaDistribucion ruta) async {
    try {
      DocumentReference docRef = await _firestore
          .collection('rutas_distribucion')
          .add(ruta.toMap());
      
      print('✅ Ruta creada: ${docRef.id}');
      return docRef.id;
    } catch (e) {
      print('❌ Error al crear ruta: $e');
      return null;
    }
  }

  /// Asignar ruta a repartidor
  Future<bool> asignarRuta(
    String rutaId,
    String repartidorId,
    String repartidorNombre,
    String asignadoPor,
  ) async {
    try {
      await _firestore.collection('rutas_distribucion').doc(rutaId).update({
        'repartidorId': repartidorId,
        'repartidorNombre': repartidorNombre,
        'asignadoPor': asignadoPor,
        'estado': 'asignada',
        'updatedAt': FieldValue.serverTimestamp(),
      });
      
      print('✅ Ruta asignada: $rutaId a $repartidorNombre');
      return true;
    } catch (e) {
      print('❌ Error al asignar ruta: $e');
      return false;
    }
  }

  /// Cancelar ruta
  Future<bool> cancelarRuta(String rutaId) async {
    try {
      await _firestore.collection('rutas_distribucion').doc(rutaId).update({
        'estado': 'cancelada',
        'updatedAt': FieldValue.serverTimestamp(),
      });
      
      print('✅ Ruta cancelada: $rutaId');
      return true;
    } catch (e) {
      print('❌ Error al cancelar ruta: $e');
      return false;
    }
  }

  // ==================== FACTURAS ====================
  
  /// Stream de facturas
  Stream<List<FacturaRD>> getFacturasStream({String? filtroEstado}) {
    Query query = _firestore
        .collection('facturas')
        .orderBy('fechaEmision', descending: true);

    if (filtroEstado != null && filtroEstado != 'todos') {
      query = query.where('estado', isEqualTo: filtroEstado);
    }

    return query.snapshots().map((snapshot) {
      return snapshot.docs
          .map((doc) => FacturaRD.fromFirestore(doc))
          .toList();
    });
  }

  /// Obtener facturas de un cliente
  Stream<List<FacturaRD>> getFacturasByCliente(String clienteId) {
    return _firestore
        .collection('facturas')
        .where('clienteId', isEqualTo: clienteId)
        .orderBy('fechaEmision', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => FacturaRD.fromFirestore(doc))
          .toList();
    });
  }

  /// Crear nueva factura
  Future<String?> crearFactura(FacturaRD factura) async {
    try {
      DocumentReference docRef = await _firestore
          .collection('facturas')
          .add(factura.toMap());
      
      print('✅ Factura creada: ${docRef.id}');
      return docRef.id;
    } catch (e) {
      print('❌ Error al crear factura: $e');
      return null;
    }
  }

  /// Marcar factura como pagada
  Future<bool> marcarFacturaPagada(
    String facturaId,
    double montoPagado,
    String metodoPago,
  ) async {
    try {
      await _firestore.collection('facturas').doc(facturaId).update({
        'estado': 'pagada',
        'montoPagado': montoPagado,
        'metodoPago': metodoPago,
        'fechaPago': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      
      print('✅ Factura pagada: $facturaId');
      return true;
    } catch (e) {
      print('❌ Error al marcar factura pagada: $e');
      return false;
    }
  }

  /// Cancelar factura
  Future<bool> cancelarFactura(String facturaId) async {
    try {
      await _firestore.collection('facturas').doc(facturaId).update({
        'estado': 'cancelada',
        'updatedAt': FieldValue.serverTimestamp(),
      });
      
      print('✅ Factura cancelada: $facturaId');
      return true;
    } catch (e) {
      print('❌ Error al cancelar factura: $e');
      return false;
    }
  }

  // ==================== ESTADÍSTICAS ====================
  
  /// Obtener estadísticas del almacén RD
  Future<EstadisticasAlmacenRD> getEstadisticas() async {
    try {
      // Contenedores
      QuerySnapshot contenedoresSnapshot = await _firestore
          .collection('contenedores')
          .where('almacenRDId', isNotEqualTo: null)
          .get();

      List<ContenedorRecibido> contenedores = contenedoresSnapshot.docs
          .map((doc) => ContenedorRecibido.fromFirestore(doc))
          .toList();

      int recibidos = contenedores
          .where((c) => c.estado == 'recibido' || c.estado == 'procesado')
          .length;
      
      int enProceso = contenedores
          .where((c) => c.estado == 'recibido')
          .length;

      // Rutas
      QuerySnapshot rutasSnapshot = await _firestore
          .collection('rutas_distribucion')
          .where('estado', whereIn: ['asignada', 'en_proceso'])
          .get();

      int rutasActivas = rutasSnapshot.docs.length;

      // Entregas
      List<RutaDistribucion> rutas = rutasSnapshot.docs
          .map((doc) => RutaDistribucion.fromFirestore(doc))
          .toList();

      int pendientes = 0;
      int completadasHoy = 0;
      DateTime hoy = DateTime.now();

      for (var ruta in rutas) {
        pendientes += ruta.entregas.where((e) => !e.entregado).length;
        
        for (var entrega in ruta.entregas) {
          if (entrega.entregado && 
              entrega.fechaEntrega != null &&
              entrega.fechaEntrega!.year == hoy.year &&
              entrega.fechaEntrega!.month == hoy.month &&
              entrega.fechaEntrega!.day == hoy.day) {
            completadasHoy++;
          }
        }
      }

      // Facturas
      QuerySnapshot facturasSnapshot = await _firestore
          .collection('facturas')
          .where('fechaEmision', isGreaterThanOrEqualTo: 
              Timestamp.fromDate(DateTime(hoy.year, hoy.month, 1)))
          .get();

      List<FacturaRD> facturas = facturasSnapshot.docs
          .map((doc) => FacturaRD.fromFirestore(doc))
          .toList();

      double facturacionMensual = facturas
          .where((f) => f.estado == 'pagada')
          .fold<double>(0.0, (sum, f) => sum + f.total);

      double facturacionPendiente = facturas
          .where((f) => f.estado == 'pendiente')
          .fold<double>(0.0, (sum, f) => sum + f.total);

      return EstadisticasAlmacenRD(
        contenedoresRecibidos: recibidos,
        contenedoresEnProceso: enProceso,
        rutasActivas: rutasActivas,
        entregasPendientes: pendientes,
        entregasCompletadasHoy: completadasHoy,
        facturacionMensual: facturacionMensual,
        facturacionPendiente: facturacionPendiente,
      );
    } catch (e) {
      print('❌ Error al obtener estadísticas: $e');
      return EstadisticasAlmacenRD(
        contenedoresRecibidos: 0,
        contenedoresEnProceso: 0,
        rutasActivas: 0,
        entregasPendientes: 0,
        entregasCompletadasHoy: 0,
        facturacionMensual: 0.0,
        facturacionPendiente: 0.0,
      );
    }
  }

  // ==================== BÚSQUEDAS ====================
  
  /// Buscar contenedor por número
  Future<ContenedorRecibido?> buscarContenedorPorNumero(String numero) async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('contenedores')
          .where('numeroContenedor', isEqualTo: numero)
          .limit(1)
          .get();

      if (snapshot.docs.isNotEmpty) {
        return ContenedorRecibido.fromFirestore(snapshot.docs.first);
      }
      return null;
    } catch (e) {
      print('❌ Error al buscar contenedor: $e');
      return null;
    }
  }

  /// Buscar factura por número
  Future<FacturaRD?> buscarFacturaPorNumero(String numero) async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('facturas')
          .where('numeroFactura', isEqualTo: numero)
          .limit(1)
          .get();

      if (snapshot.docs.isNotEmpty) {
        return FacturaRD.fromFirestore(snapshot.docs.first);
      }
      return null;
    } catch (e) {
      print('❌ Error al buscar factura: $e');
      return null;
    }
  }

  // ==================== OBTENER LISTA DE REPARTIDORES ====================
  
  /// Obtener lista de repartidores disponibles
  Future<List<Map<String, String>>> getRepartidoresDisponibles() async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('usuarios')
          .where('rol', isEqualTo: 'repartidor')
          .where('activo', isEqualTo: true)
          .get();

      return snapshot.docs.map((doc) {
        Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
        return {
          'id': doc.id,
          'nombre': (data['nombre'] ?? 'Sin nombre').toString(),
          'email': (data['email'] ?? '').toString(),
        };
      }).toList();
    } catch (e) {
      print('❌ Error al obtener repartidores: $e');
      return [];
    }
  }
}
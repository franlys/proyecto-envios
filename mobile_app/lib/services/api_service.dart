import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/ruta.dart';
import '../models/factura.dart';
import '../models/gasto.dart';

class ApiService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  
  // URL del backend - CAMBIAR cuando uses servidor real
  static const String baseUrl = 'http://localhost:3000/api';

  // ==================== RUTAS ====================
  
  // Obtener rutas del empleado
  Future<List<Ruta>> getRutasEmpleado(String empleadoId) async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('rutas')
          .where('empleadoId', isEqualTo: empleadoId)
          // .orderBy('fechaCreacion', descending: true)  // ← COMENTADO para evitar error de índice
          .get();

      return snapshot.docs.map((doc) {
        Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
        data['id'] = doc.id;
        return Ruta.fromJson(data);
      }).toList();
    } catch (e) {
      print('Error al obtener rutas: $e');
      return [];
    }
  }

  // Obtener detalle de una ruta
  Future<Ruta?> getRutaDetalle(String rutaId) async {
    try {
      DocumentSnapshot doc = await _firestore
          .collection('rutas')
          .doc(rutaId)
          .get();

      if (doc.exists) {
        Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
        data['id'] = doc.id;
        return Ruta.fromJson(data);
      }
      return null;
    } catch (e) {
      print('Error al obtener detalle de ruta: $e');
      return null;
    }
  }

  // ==================== FACTURAS ====================
  
  // Obtener facturas de una ruta
  Future<List<Factura>> getFacturasRuta(String rutaId) async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('facturas')
          .where('rutaId', isEqualTo: rutaId)
          .get();

      return snapshot.docs.map((doc) {
        Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
        data['id'] = doc.id;
        return Factura.fromJson(data);
      }).toList();
    } catch (e) {
      print('Error al obtener facturas: $e');
      return [];
    }
  }

  // Marcar factura como entregada
  Future<bool> marcarFacturaEntregada(String facturaId, String? observaciones) async {
    try {
      // Obtener la factura para conseguir el rutaId
      DocumentSnapshot facturaDoc = await _firestore
          .collection('facturas')
          .doc(facturaId)
          .get();
      
      if (!facturaDoc.exists) {
        print('Factura no encontrada');
        return false;
      }
      
      final facturaData = facturaDoc.data() as Map<String, dynamic>;
      final rutaId = facturaData['rutaId'];
      
      // Actualizar la factura
      await _firestore.collection('facturas').doc(facturaId).update({
        'estado': 'entregado',
        'observaciones': observaciones ?? '',
        'fechaEntrega': FieldValue.serverTimestamp(),
      });
      
      // ← AGREGADO: Incrementar el contador de facturas entregadas en la ruta
      await _firestore.collection('rutas').doc(rutaId).update({
        'facturasEntregadas': FieldValue.increment(1),
      });
      
      return true;
    } catch (e) {
      print('Error al marcar factura como entregada: $e');
      return false;
    }
  }

  // Marcar factura como no entregada
  Future<bool> marcarFacturaNoEntregada(String facturaId, String motivo) async {
    try {
      await _firestore.collection('facturas').doc(facturaId).update({
        'estado': 'no_entregado',
        'observaciones': motivo,
        'fechaEntrega': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      print('Error al marcar factura como no entregada: $e');
      return false;
    }
  }

  // ==================== GASTOS ====================
  
  // Obtener gastos de una ruta
  Future<List<Gasto>> getGastosRuta(String rutaId) async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('gastos')
          .where('rutaId', isEqualTo: rutaId)
          // .orderBy('fecha', descending: true)  // ← COMENTADO para evitar error de índice
          .get();

      return snapshot.docs.map((doc) {
        Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
        data['id'] = doc.id;
        return Gasto.fromJson(data);
      }).toList();
    } catch (e) {
      print('Error al obtener gastos: $e');
      return [];
    }
  }

  // Registrar un gasto
  Future<bool> registrarGasto(Map<String, dynamic> gastoData) async {
    try {
      gastoData['fecha'] = FieldValue.serverTimestamp();
      final rutaId = gastoData['rutaId'];
      final monto = gastoData['monto'];
      
      // Agregar el gasto
      await _firestore.collection('gastos').add(gastoData);
      
      // ← AGREGADO: Actualizar el total de gastos en la ruta
      await _firestore.collection('rutas').doc(rutaId).update({
        'totalGastos': FieldValue.increment(monto),
      });
      
      return true;
    } catch (e) {
      print('Error al registrar gasto: $e');
      return false;
    }
  }

  // ==================== ACTUALIZAR ESTADO DE RUTA ====================
  
  // Actualizar estado de la ruta
  Future<bool> actualizarEstadoRuta(String rutaId, String estado) async {
    try {
      await _firestore.collection('rutas').doc(rutaId).update({
        'estado': estado,
        'fechaActualizacion': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      print('Error al actualizar estado de ruta: $e');
      return false;
    }
  }
}
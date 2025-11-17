library;

/// 💼 SERVICIO DE SECRETARIA
/// Gestiona clientes y operaciones financieras con transacciones atómicas

import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/secretaria_models.dart';

class SecretariaService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // ==================== CLIENTES STREAM ====================
  
  Stream<List<Cliente>> getClientesStream({String? filtroEstado}) {
    Query query = _firestore.collection('clientes');
    
    if (filtroEstado != null && filtroEstado != 'todos') {
      bool activo = filtroEstado == 'activos';
      query = query.where('activo', isEqualTo: activo);
    }
    
    return query
        .orderBy('nombre')
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        return Cliente.fromFirestore(doc);
      }).toList();
    });
  }

  // ==================== CLIENTES ====================

  Future<List<Map<String, dynamic>>> getClientes() async {
    try {
      final snapshot = await _firestore
          .collection('clientes')
          .where('activo', isEqualTo: true)
          .orderBy('nombre')
          .get();

      return snapshot.docs.map((doc) {
        return {
          'id': doc.id,
          ...doc.data(),
        };
      }).toList();
    } catch (e) {
      print('Error al obtener clientes: $e');
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> buscarClientes(String query) async {
    try {
      final snapshot = await _firestore
          .collection('clientes')
          .where('nombre', isGreaterThanOrEqualTo: query)
          .where('nombre', isLessThanOrEqualTo: '$query\uf8ff')
          .limit(20)
          .get();

      return snapshot.docs.map((doc) {
        return {
          'id': doc.id,
          ...doc.data(),
        };
      }).toList();
    } catch (e) {
      print('Error al buscar clientes: $e');
      return [];
    }
  }

  Future<String?> crearCliente(Cliente nuevoCliente, {
    required String nombre,
    required String telefono,
    required String email,
    required String direccion,
    required String cedula,
  }) async {
    try {
      final doc = await _firestore.collection('clientes').add({
        'nombre': nombre,
        'telefono': telefono,
        'email': email,
        'direccion': direccion,
        'cedula': cedula,
        'fechaRegistro': FieldValue.serverTimestamp(),
        'activo': true,
        'saldoPendiente': 0.0,
      });

      return doc.id;
    } catch (e) {
      print('Error al crear cliente: $e');
      return null;
    }
  }

  Future<void> actualizarCliente(String clienteId, Cliente cliente) async {
    try {
      await _firestore.collection('clientes').doc(clienteId).update({
        'nombre': cliente.nombre,
        'telefono': cliente.telefono,
        'email': cliente.email,
        'direccion': cliente.direccionRD,
        'cedula': cliente.cedula,
        'activo': cliente.activo,
        'ultimaActualizacion': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      print('Error al actualizar cliente: $e');
      rethrow;
    }
  }

  // ==================== TICKETS STREAM ====================
  
  Stream<List<TicketSoporte>> getTicketsStream() {
    return _firestore
        .collection('tickets')
        .orderBy('fechaCreacion', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        return TicketSoporte.fromFirestore(doc);
      }).toList();
    });
  }

  Future<void> crearTicket(TicketSoporte ticket) async {
    try {
      await _firestore.collection('tickets').add({
        'clienteId': ticket.clienteId,
        'clienteNombre': ticket.clienteNombre,
        'asunto': ticket.asunto,
        'descripcion': ticket.descripcion,
        'prioridad': ticket.prioridad,
        'estado': ticket.estado,
        'fechaCreacion': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      print('Error al crear ticket: $e');
      rethrow;
    }
  }

  Future<void> resolverTicket(String ticketId, String respuesta) async {
    try {
      await _firestore.collection('tickets').doc(ticketId).update({
        'estado': 'resuelto',
        'respuesta': respuesta,
        'fechaResolucion': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      print('Error al resolver ticket: $e');
      rethrow;
    }
  }

  // ==================== PAGOS STREAM ====================
  
  Stream<List<Pago>> getPagosStream() {
    return _firestore
        .collection('pagos')
        .orderBy('fecha', descending: true)
        .limit(50)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        return Pago.fromFirestore(doc);
      }).toList();
    });
  }

  // ==================== OPERACIONES FINANCIERAS ====================

  Future<bool> registrarPago(Pago pago, {
    required String clienteId,
    required double monto,
    required String metodoPago,
    required String concepto,
    required String registradoPor,
  }) async {
    try {
      await _firestore.runTransaction((transaction) async {
        final clienteRef = _firestore.collection('clientes').doc(clienteId);
        final clienteDoc = await transaction.get(clienteRef);

        if (!clienteDoc.exists) {
          throw Exception('Cliente no encontrado');
        }

        final saldoActual = (clienteDoc.data()!['saldoPendiente'] as num?)?.toDouble() ?? 0.0;
        final nuevoSaldo = saldoActual - monto;

        final pagoRef = _firestore.collection('pagos').doc();
        transaction.set(pagoRef, {
          'clienteId': clienteId,
          'clienteNombre': clienteDoc.data()!['nombre'],
          'monto': monto,
          'metodoPago': metodoPago,
          'concepto': concepto,
          'registradoPor': registradoPor,
          'fecha': FieldValue.serverTimestamp(),
          'estado': 'confirmado',
        });

        transaction.update(clienteRef, {
          'saldoPendiente': nuevoSaldo >= 0 ? nuevoSaldo : 0.0,
          'ultimoPago': FieldValue.serverTimestamp(),
        });

        final operacionRef = _firestore.collection('operacionesFinancieras').doc();
        transaction.set(operacionRef, {
          'tipo': 'ingreso',
          'monto': monto,
          'concepto': concepto,
          'metodoPago': metodoPago,
          'clienteId': clienteId,
          'clienteNombre': clienteDoc.data()!['nombre'],
          'registradoPor': registradoPor,
          'fecha': FieldValue.serverTimestamp(),
        });
      });

      return true;
    } catch (e) {
      print('Error al registrar pago: $e');
      return false;
    }
  }

  Future<bool> registrarEgreso({
    required double monto,
    required String concepto,
    required String metodoPago,
    required String registradoPor,
  }) async {
    try {
      await _firestore.collection('operacionesFinancieras').add({
        'tipo': 'egreso',
        'monto': monto,
        'concepto': concepto,
        'metodoPago': metodoPago,
        'registradoPor': registradoPor,
        'fecha': FieldValue.serverTimestamp(),
      });

      return true;
    } catch (e) {
      print('Error al registrar egreso: $e');
      return false;
    }
  }

  // ==================== RESUMEN FINANCIERO ====================
  
  Future<ResumenFinanciero> getResumenFinanciero() async {
    try {
      final now = DateTime.now();
      final inicioHoy = DateTime(now.year, now.month, now.day);
      final inicioSemana = now.subtract(Duration(days: now.weekday - 1));
      final inicioMes = DateTime(now.year, now.month, 1);

      final results = await Future.wait([
        _calcularIngresos(inicioHoy),
        _calcularIngresos(inicioSemana),
        _calcularIngresos(inicioMes),
        _calcularSaldoPendiente(),
      ]);

      return ResumenFinanciero(
        ingresosDiarios: results[0],
        ingresosSemanales: results[1],
        ingresosMensuales: results[2],
        cuentasPorCobrar: results[3], facturasPendientes: 0, pagosRecibidosHoy: 0,
      );
    } catch (e) {
      print('Error al obtener resumen financiero: $e');
      return ResumenFinanciero(
        ingresosDiarios: 0.0,
        ingresosSemanales: 0.0,
        ingresosMensuales: 0.0,
        cuentasPorCobrar: 0.0, facturasPendientes: 0, pagosRecibidosHoy: 0,
      );
    }
  }

  // ==================== ESTADÍSTICAS ====================

  Future<EstadisticasSecretaria> getEstadisticas() async {
    try {
      final results = await Future.wait([
        _contarClientes(),
        _contarTicketsAbiertos(),
        _contarFacturasPendientes(),
        _contarPagosHoy(),
      ]);

      return EstadisticasSecretaria(
        clientesActivos: results[0],
        ticketsAbiertos: results[1],
        facturaspendientes: results[2],
        pagosHoy: results[3], clientesNuevosHoy: 0, totalCuentasPorCobrar: 0, ingresosHoy: 0, enviosEnProceso: 0,
      );
    } catch (e) {
      print('Error al obtener estadísticas: $e');
      return EstadisticasSecretaria(
        clientesActivos: 0,
        ticketsAbiertos: 0,
        facturaspendientes: 0,
        pagosHoy: 0, clientesNuevosHoy: 0, totalCuentasPorCobrar: 0, ingresosHoy: 0, enviosEnProceso: 0,
      );
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  Future<double> _calcularIngresos(DateTime desde) async {
    final snapshot = await _firestore
        .collection('operacionesFinancieras')
        .where('tipo', isEqualTo: 'ingreso')
        .where('fecha', isGreaterThanOrEqualTo: Timestamp.fromDate(desde))
        .get();

    return snapshot.docs.fold<double>(
      0.0,
      (total, doc) => total + ((doc.data()['monto'] as num?)?.toDouble() ?? 0.0),
    );
  }

  Future<int> _contarClientes() async {
    final snapshot = await _firestore
        .collection('clientes')
        .where('activo', isEqualTo: true)
        .count()
        .get();

    return snapshot.count ?? 0;
  }

  Future<int> _contarTicketsAbiertos() async {
    final snapshot = await _firestore
        .collection('tickets')
        .where('estado', isEqualTo: 'abierto')
        .count()
        .get();

    return snapshot.count ?? 0;
  }

  Future<int> _contarFacturasPendientes() async {
    final snapshot = await _firestore
        .collection('facturas')
        .where('estado', isEqualTo: 'pendiente')
        .count()
        .get();

    return snapshot.count ?? 0;
  }

  Future<int> _contarPagosHoy() async {
    final now = DateTime.now();
    final inicioHoy = DateTime(now.year, now.month, now.day);

    final snapshot = await _firestore
        .collection('pagos')
        .where('fecha', isGreaterThanOrEqualTo: Timestamp.fromDate(inicioHoy))
        .count()
        .get();

    return snapshot.count ?? 0;
  }

  Future<double> _calcularSaldoPendiente() async {
    final snapshot = await _firestore
        .collection('clientes')
        .where('activo', isEqualTo: true)
        .get();

    return snapshot.docs.fold<double>(
      0.0,
      (total, doc) => total + ((doc.data()['saldoPendiente'] as num?)?.toDouble() ?? 0.0),
    );
  }

  Future<List<Map<String, dynamic>>> getOperacionesHoy() async {
    try {
      final now = DateTime.now();
      final inicioHoy = DateTime(now.year, now.month, now.day);

      final snapshot = await _firestore
          .collection('operacionesFinancieras')
          .where('fecha', isGreaterThanOrEqualTo: Timestamp.fromDate(inicioHoy))
          .orderBy('fecha', descending: true)
          .get();

      return snapshot.docs.map((doc) {
        return {
          'id': doc.id,
          ...doc.data(),
        };
      }).toList();
    } catch (e) {
      print('Error al obtener operaciones: $e');
      return [];
    }
  }
}
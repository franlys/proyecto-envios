// lib/models/secretaria_models.dart
/// 💼 MODELOS DE DATOS PARA SECRETARIAS
/// Define las estructuras de datos usadas por las secretarias
library;


import 'package:cloud_firestore/cloud_firestore.dart';

// ==================== CLIENTE ====================
class Cliente {
  final String id;
  final String nombre;
  final String email;
  final String telefono;
  final String? telefonoSecundario;
  final String direccionUSA;
  final String? ciudadUSA;
  final String? estadoUSA;
  final String? zipCodeUSA;
  final String direccionRD;
  final String? ciudadRD;
  final String? sectorRD;
  final String tipoCliente; // 'individual', 'empresa'
  final String estado; // 'activo', 'inactivo', 'suspendido'
  final DateTime fechaRegistro;
  final String? identificacion; // Passport, ID, etc
  final double saldoPendiente;
  final int totalEnvios;
  final String? notas;
  final List<String>? etiquetas;

  Cliente({
    required this.id,
    required this.nombre,
    required this.email,
    required this.telefono,
    this.telefonoSecundario,
    required this.direccionUSA,
    this.ciudadUSA,
    this.estadoUSA,
    this.zipCodeUSA,
    required this.direccionRD,
    this.ciudadRD,
    this.sectorRD,
    required this.tipoCliente,
    required this.estado,
    required this.fechaRegistro,
    this.identificacion,
    this.saldoPendiente = 0.0,
    this.totalEnvios = 0,
    this.notas,
    this.etiquetas,
  });

  factory Cliente.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    return Cliente(
      id: doc.id,
      nombre: data['nombre'] ?? '',
      email: data['email'] ?? '',
      telefono: data['telefono'] ?? '',
      telefonoSecundario: data['telefonoSecundario'],
      direccionUSA: data['direccionUSA'] ?? '',
      ciudadUSA: data['ciudadUSA'],
      estadoUSA: data['estadoUSA'],
      zipCodeUSA: data['zipCodeUSA'],
      direccionRD: data['direccionRD'] ?? '',
      ciudadRD: data['ciudadRD'],
      sectorRD: data['sectorRD'],
      tipoCliente: data['tipoCliente'] ?? 'individual',
      estado: data['estado'] ?? 'activo',
      fechaRegistro: (data['fechaRegistro'] as Timestamp).toDate(),
      identificacion: data['identificacion'],
      saldoPendiente: data['saldoPendiente']?.toDouble() ?? 0.0,
      totalEnvios: data['totalEnvios'] ?? 0,
      notas: data['notas'],
      etiquetas: data['etiquetas'] != null 
        ? List<String>.from(data['etiquetas']) 
        : null,
    );
  }

  get cedula => null;

  get activo => null;

  Map<String, dynamic> toMap() {
    return {
      'nombre': nombre,
      'email': email,
      'telefono': telefono,
      'telefonoSecundario': telefonoSecundario,
      'direccionUSA': direccionUSA,
      'ciudadUSA': ciudadUSA,
      'estadoUSA': estadoUSA,
      'zipCodeUSA': zipCodeUSA,
      'direccionRD': direccionRD,
      'ciudadRD': ciudadRD,
      'sectorRD': sectorRD,
      'tipoCliente': tipoCliente,
      'estado': estado,
      'fechaRegistro': Timestamp.fromDate(fechaRegistro),
      'identificacion': identificacion,
      'saldoPendiente': saldoPendiente,
      'totalEnvios': totalEnvios,
      'notas': notas,
      'etiquetas': etiquetas,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  String getEstadoTexto() {
    switch (estado) {
      case 'inactivo': return 'Inactivo';
      case 'suspendido': return 'Suspendido';
      default: return 'Activo';
    }
  }

  String getDireccionCompletaUSA() {
    String dir = direccionUSA;
    if (ciudadUSA != null) dir += ', $ciudadUSA';
    if (estadoUSA != null) dir += ', $estadoUSA';
    if (zipCodeUSA != null) dir += ' $zipCodeUSA';
    return dir;
  }

  String getDireccionCompletaRD() {
    String dir = direccionRD;
    if (sectorRD != null) dir += ', $sectorRD';
    if (ciudadRD != null) dir += ', $ciudadRD';
    return dir;
  }
}

// ==================== PAGO ====================
class Pago {
  final String id;
  final String clienteId;
  final String clienteNombre;
  final double monto;
  final String metodoPago; // 'efectivo', 'transferencia', 'tarjeta', 'zelle'
  final DateTime fechaPago;
  final String? referencia;
  final String? facturaId;
  final String estado; // 'pendiente', 'confirmado', 'rechazado'
  final String registradoPor;
  final String? comprobanteUrl;
  final String? notas;

  Pago({
    required this.id,
    required this.clienteId,
    required this.clienteNombre,
    required this.monto,
    required this.metodoPago,
    required this.fechaPago,
    this.referencia,
    this.facturaId,
    required this.estado,
    required this.registradoPor,
    this.comprobanteUrl,
    this.notas,
  });

  factory Pago.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    return Pago(
      id: doc.id,
      clienteId: data['clienteId'] ?? '',
      clienteNombre: data['clienteNombre'] ?? '',
      monto: data['monto']?.toDouble() ?? 0.0,
      metodoPago: data['metodoPago'] ?? 'efectivo',
      fechaPago: (data['fechaPago'] as Timestamp).toDate(),
      referencia: data['referencia'],
      facturaId: data['facturaId'],
      estado: data['estado'] ?? 'pendiente',
      registradoPor: data['registradoPor'] ?? '',
      comprobanteUrl: data['comprobanteUrl'],
      notas: data['notas'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'clienteId': clienteId,
      'clienteNombre': clienteNombre,
      'monto': monto,
      'metodoPago': metodoPago,
      'fechaPago': Timestamp.fromDate(fechaPago),
      'referencia': referencia,
      'facturaId': facturaId,
      'estado': estado,
      'registradoPor': registradoPor,
      'comprobanteUrl': comprobanteUrl,
      'notas': notas,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }
}

// ==================== TICKET DE SOPORTE ====================
class TicketSoporte {
  final String id;
  final String clienteId;
  final String clienteNombre;
  final String asunto;
  final String descripcion;
  final String categoria; // 'consulta', 'reclamo', 'seguimiento', 'otro'
  final String prioridad; // 'baja', 'media', 'alta', 'urgente'
  final String estado; // 'abierto', 'en_proceso', 'resuelto', 'cerrado'
  final DateTime fechaCreacion;
  final DateTime? fechaResolucion;
  final String? asignadoA;
  final String? respuesta;
  final String creadoPor;

  TicketSoporte({
    required this.id,
    required this.clienteId,
    required this.clienteNombre,
    required this.asunto,
    required this.descripcion,
    required this.categoria,
    required this.prioridad,
    required this.estado,
    required this.fechaCreacion,
    this.fechaResolucion,
    this.asignadoA,
    this.respuesta,
    required this.creadoPor,
  });

  factory TicketSoporte.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    return TicketSoporte(
      id: doc.id,
      clienteId: data['clienteId'] ?? '',
      clienteNombre: data['clienteNombre'] ?? '',
      asunto: data['asunto'] ?? '',
      descripcion: data['descripcion'] ?? '',
      categoria: data['categoria'] ?? 'consulta',
      prioridad: data['prioridad'] ?? 'media',
      estado: data['estado'] ?? 'abierto',
      fechaCreacion: (data['fechaCreacion'] as Timestamp).toDate(),
      fechaResolucion: data['fechaResolucion'] != null
        ? (data['fechaResolucion'] as Timestamp).toDate()
        : null,
      asignadoA: data['asignadoA'],
      respuesta: data['respuesta'],
      creadoPor: data['creadoPor'] ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'clienteId': clienteId,
      'clienteNombre': clienteNombre,
      'asunto': asunto,
      'descripcion': descripcion,
      'categoria': categoria,
      'prioridad': prioridad,
      'estado': estado,
      'fechaCreacion': Timestamp.fromDate(fechaCreacion),
      'fechaResolucion': fechaResolucion != null 
        ? Timestamp.fromDate(fechaResolucion!) 
        : null,
      'asignadoA': asignadoA,
      'respuesta': respuesta,
      'creadoPor': creadoPor,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }
}

// ==================== ESTADÍSTICAS SECRETARIA ====================
class EstadisticasSecretaria {
  final int clientesActivos;
  final int clientesNuevosHoy;
  final int facturaspendientes;
  final double totalCuentasPorCobrar;
  final int ticketsAbiertos;
  final int pagosHoy;
  final double ingresosHoy;
  final int enviosEnProceso;

  EstadisticasSecretaria({
    required this.clientesActivos,
    required this.clientesNuevosHoy,
    required this.facturaspendientes,
    required this.totalCuentasPorCobrar,
    required this.ticketsAbiertos,
    required this.pagosHoy,
    required this.ingresosHoy,
    required this.enviosEnProceso,
  });
}

// ==================== RESUMEN FINANCIERO ====================
class ResumenFinanciero {
  final double ingresosDiarios;
  final double ingresosSemanales;
  final double ingresosMensuales;
  final double cuentasPorCobrar;
  final int facturasPendientes;
  final int pagosRecibidosHoy;

  ResumenFinanciero({
    required this.ingresosDiarios,
    required this.ingresosSemanales,
    required this.ingresosMensuales,
    required this.cuentasPorCobrar,
    required this.facturasPendientes,
    required this.pagosRecibidosHoy,
  });
}

// ==================== ACTIVIDAD RECIENTE ====================
class ActividadReciente {
  final String tipo; // 'cliente', 'pago', 'ticket', 'factura'
  final String titulo;
  final String descripcion;
  final DateTime fecha;
  final String? icono;
  final String? color;

  ActividadReciente({
    required this.tipo,
    required this.titulo,
    required this.descripcion,
    required this.fecha,
    this.icono,
    this.color,
  });
}
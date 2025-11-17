// lib/models/recolector_models.dart
/// 💡 FIX:
/// - Se corrigió el getter 'id' en 'PuntoRecoleccion' para que devuelva 'clienteId' 
///   en lugar de 'null'.
library;

import 'package:cloud_firestore/cloud_firestore.dart';

// ==================== RUTA DE RECOLECCIÓN ====================
class RutaRecoleccion {
  final String id;
  final String numeroRuta;
  final String zona;
  final String recolectorId;
  final String? recolectorNombre;
  final DateTime fechaAsignacion;
  final DateTime? fechaInicio;
  final DateTime? fechaCompletado;
  final String estado; // 'asignada', 'en_proceso', 'completada', 'cancelada'
  final List<PuntoRecoleccion> puntos;
  final int totalPuntos;
  final int puntosCompletados;
  final double progresoRecoleccion;
  final String? asignadoPor;
  final String? vehiculoPlaca;
  final List<String>? notas;

  RutaRecoleccion({
    required this.id,
    required this.numeroRuta,
    required this.zona,
    required this.recolectorId,
    this.recolectorNombre,
    required this.fechaAsignacion,
    this.fechaInicio,
    this.fechaCompletado,
    required this.estado,
    required this.puntos,
    required this.totalPuntos,
    this.puntosCompletados = 0,
    this.progresoRecoleccion = 0.0,
    this.asignadoPor,
    this.vehiculoPlaca,
    this.notas,
  });

  factory RutaRecoleccion.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    List<PuntoRecoleccion> puntos = [];
    if (data['puntos'] != null) {
      puntos = (data['puntos'] as List)
          .map((p) => PuntoRecoleccion.fromMap(p as Map<String, dynamic>))
          .toList();
    }

    int completados = puntos.where((p) => p.recolectado).length;
    double progreso = puntos.isNotEmpty ? completados / puntos.length : 0.0;

    return RutaRecoleccion(
      id: doc.id,
      numeroRuta: data['numeroRuta'] ?? '',
      zona: data['zona'] ?? '',
      recolectorId: data['recolectorId'] ?? '',
      recolectorNombre: data['recolectorNombre'],
      fechaAsignacion: (data['fechaAsignacion'] as Timestamp).toDate(),
      fechaInicio: data['fechaInicio'] != null
          ? (data['fechaInicio'] as Timestamp).toDate()
          : null,
      fechaCompletado: data['fechaCompletado'] != null
          ? (data['fechaCompletado'] as Timestamp).toDate()
          : null,
      estado: data['estado'] ?? 'asignada',
      puntos: puntos,
      totalPuntos: puntos.length,
      puntosCompletados: completados,
      progresoRecoleccion: progreso,
      asignadoPor: data['asignadoPor'],
      vehiculoPlaca: data['vehiculoPlaca'],
      notas: data['notas'] != null ? List<String>.from(data['notas']) : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'numeroRuta': numeroRuta,
      'zona': zona,
      'recolectorId': recolectorId,
      'recolectorNombre': recolectorNombre,
      'fechaAsignacion': Timestamp.fromDate(fechaAsignacion),
      'fechaInicio': fechaInicio != null ? Timestamp.fromDate(fechaInicio!) : null,
      'fechaCompletado': fechaCompletado != null ? Timestamp.fromDate(fechaCompletado!) : null,
      'estado': estado,
      'puntos': puntos.map((p) => p.toMap()).toList(),
      'totalPuntos': totalPuntos,
      'puntosCompletados': puntosCompletados,
      'progresoRecoleccion': progresoRecoleccion,
      'asignadoPor': asignadoPor,
      'vehiculoPlaca': vehiculoPlaca,
      'notas': notas,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  String getEstadoTexto() {
    switch (estado) {
      case 'en_proceso': return 'En Proceso';
      case 'completada': return 'Completada';
      case 'cancelada': return 'Cancelada';
      default: return 'Asignada';
    }
  }

  static RutaRecoleccion? fromMap(Map<String, dynamic> rutaData) {
    // Implementación pendiente si es necesaria, por ahora retorna null
    return null;
  }
}

// ==================== PUNTO DE RECOLECCIÓN ====================
class PuntoRecoleccion {
  final String clienteId;
  final String clienteNombre;
  final String clienteTelefono;
  final String direccion;
  final String? referencia;
  final String? ciudad;
  final String? estado;
  final String? zipCode;
  final double? latitud;
  final double? longitud;
  final int cantidadPaquetes;
  final bool recolectado;
  final DateTime? fechaRecoleccion;
  final String? observaciones;
  final String? motivoNoRecoleccion;
  final List<PaqueteRecolectado>? paquetes;
  final String? fotoUrl;

  PuntoRecoleccion({
    required this.clienteId,
    required this.clienteNombre,
    required this.clienteTelefono,
    required this.direccion,
    this.referencia,
    this.ciudad,
    this.estado,
    this.zipCode,
    this.latitud,
    this.longitud,
    required this.cantidadPaquetes,
    this.recolectado = false,
    this.fechaRecoleccion,
    this.observaciones,
    this.motivoNoRecoleccion,
    this.paquetes,
    this.fotoUrl,
  });

  factory PuntoRecoleccion.fromMap(Map<String, dynamic> data) {
    List<PaqueteRecolectado>? paquetes;
    if (data['paquetes'] != null) {
      paquetes = (data['paquetes'] as List)
          .map((p) => PaqueteRecolectado.fromMap(p as Map<String, dynamic>))
          .toList();
    }

    return PuntoRecoleccion(
      clienteId: data['clienteId'] ?? '',
      clienteNombre: data['clienteNombre'] ?? '',
      clienteTelefono: data['clienteTelefono'] ?? '',
      direccion: data['direccion'] ?? '',
      referencia: data['referencia'],
      ciudad: data['ciudad'],
      estado: data['estado'],
      zipCode: data['zipCode'],
      latitud: data['latitud']?.toDouble(),
      longitud: data['longitud']?.toDouble(),
      cantidadPaquetes: data['cantidadPaquetes'] ?? 0,
      recolectado: data['recolectado'] ?? false,
      fechaRecoleccion: data['fechaRecoleccion'] != null
          ? (data['fechaRecoleccion'] as Timestamp).toDate()
          : null,
      observaciones: data['observaciones'],
      motivoNoRecoleccion: data['motivoNoRecoleccion'],
      paquetes: paquetes,
      fotoUrl: data['fotoUrl'],
    );
  }

  // FIX: Se corrigió el getter 'id' para devolver clienteId
  String get id => clienteId;

  Map<String, dynamic> toMap() {
    return {
      'clienteId': clienteId,
      'clienteNombre': clienteNombre,
      'clienteTelefono': clienteTelefono,
      'direccion': direccion,
      'referencia': referencia,
      'ciudad': ciudad,
      'estado': estado,
      'zipCode': zipCode,
      'latitud': latitud,
      'longitud': longitud,
      'cantidadPaquetes': cantidadPaquetes,
      'recolectado': recolectado,
      'fechaRecoleccion': fechaRecoleccion != null 
          ? Timestamp.fromDate(fechaRecoleccion!) 
          : null,
      'observaciones': observaciones,
      'motivoNoRecoleccion': motivoNoRecoleccion,
      'paquetes': paquetes?.map((p) => p.toMap()).toList(),
      'fotoUrl': fotoUrl,
    };
  }

  String getDireccionCompleta() {
    String dir = direccion;
    if (ciudad != null) dir += ', $ciudad';
    if (estado != null) dir += ', $estado';
    if (zipCode != null) dir += ' $zipCode';
    return dir;
  }
}

// ==================== PAQUETE RECOLECTADO ====================
class PaqueteRecolectado {
  final String descripcion;
  final String? barcode;
  final double? peso;
  final String? dimensiones;
  final String? fotoUrl;
  final DateTime fechaRegistro;

  PaqueteRecolectado({
    required this.descripcion,
    this.barcode,
    this.peso,
    this.dimensiones,
    this.fotoUrl,
    required this.fechaRegistro,
  });

  factory PaqueteRecolectado.fromMap(Map<String, dynamic> data) {
    return PaqueteRecolectado(
      descripcion: data['descripcion'] ?? '',
      barcode: data['barcode'],
      peso: data['peso']?.toDouble(),
      dimensiones: data['dimensiones'],
      fotoUrl: data['fotoUrl'],
      fechaRegistro: data['fechaRegistro'] != null
          ? (data['fechaRegistro'] as Timestamp).toDate()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'descripcion': descripcion,
      'barcode': barcode,
      'peso': peso,
      'dimensiones': dimensiones,
      'fotoUrl': fotoUrl,
      'fechaRegistro': Timestamp.fromDate(fechaRegistro),
    };
  }
}

// ==================== ESTADÍSTICAS RECOLECTOR ====================
class EstadisticasRecolector {
  final int rutasAsignadas;
  final int rutasEnProceso;
  final int rutasCompletadasHoy;
  final int puntosRecolectadosHoy;
  final int paquetesRecolectadosHoy;
  final int puntoPendientesHoy;

  EstadisticasRecolector({
    required this.rutasAsignadas,
    required this.rutasEnProceso,
    required this.rutasCompletadasHoy,
    required this.puntosRecolectadosHoy,
    required this.paquetesRecolectadosHoy,
    required this.puntoPendientesHoy,
  });
}

// ==================== ZONAS DE RECOLECCIÓN ====================
class ZonasRecoleccion {
  static const String newYork = 'new_york';
  static const String newJersey = 'new_jersey';
  static const String connecticut = 'connecticut';
  static const String pennsylvania = 'pennsylvania';
  static const String miami = 'miami';
  static const String orlando = 'orlando';
  static const String boston = 'boston';
  static const String otros = 'otros';

  static const List<String> todas = [
    newYork,
    newJersey,
    connecticut,
    pennsylvania,
    miami,
    orlando,
    boston,
    otros,
  ];

  static String getNombre(String zona) {
    switch (zona) {
      case newYork: return 'New York';
      case newJersey: return 'New Jersey';
      case connecticut: return 'Connecticut';
      case pennsylvania: return 'Pennsylvania';
      case miami: return 'Miami';
      case orlando: return 'Orlando';
      case boston: return 'Boston';
      default: return 'Otros';
    }
  }

  static String getEstado(String zona) {
    switch (zona) {
      case newYork: return 'NY';
      case newJersey: return 'NJ';
      case connecticut: return 'CT';
      case pennsylvania: return 'PA';
      case miami:
      case orlando:
        return 'FL';
      case boston: return 'MA';
      default: return '';
    }
  }
}
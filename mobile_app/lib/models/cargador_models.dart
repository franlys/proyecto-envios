// lib/models/cargador_models.dart
/// 💡 FIX:
/// - Se agregaron 'rutasCompletadasHoy', 'itemsCargadosHoy', y 'danosReportadosHoy' 
///   como campos 'final int' a la clase `EstadisticasCargador`.
/// - Se actualizaron el constructor, `fromMap`, and `toMap` para incluir estos nuevos campos.
/// - Se eliminaron los getters que devolvían 'null' para estos campos.
library;

import 'package:cloud_firestore/cloud_firestore.dart';

// ==================== RUTA DE CARGA ====================
class RutaCarga {
  final String id;
  final String numeroRuta;
  final String contenedorId;
  final String cargadorId;
  final String cargadorNombre;
  final DateTime fechaAsignacion;
  final String estado; // 'pendiente', 'en_proceso', 'completada', 'cancelada'
  final List<ItemCarga> items;
  final int totalItems;
  final int itemsCargados;
  final double progreso; // 0.0 a 1.0
  final DateTime? fechaInicio;
  final DateTime? fechaCompletado;
  final List<String>? notas;

  RutaCarga({
    required this.id,
    required this.numeroRuta,
    required this.contenedorId,
    required this.cargadorId,
    required this.cargadorNombre,
    required this.fechaAsignacion,
    required this.estado,
    required this.items,
    required this.totalItems,
    this.itemsCargados = 0,
    this.progreso = 0.0,
    this.fechaInicio,
    this.fechaCompletado,
    this.notas,
  });

  // Crear desde Firestore
  factory RutaCarga.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    // Convertir items
    List<ItemCarga> items = [];
    if (data['items'] != null) {
      items = (data['items'] as List)
          .map((item) => ItemCarga.fromMap(item as Map<String, dynamic>))
          .toList();
    }

    // Contar items cargados
    int itemsCargados = items.where((item) => item.cargado).length;
    int totalItems = items.length;
    double progreso = totalItems > 0 ? itemsCargados / totalItems : 0.0;

    return RutaCarga(
      id: doc.id,
      numeroRuta: data['numeroRuta'] ?? '',
      contenedorId: data['contenedorId'] ?? '',
      cargadorId: data['cargadorId'] ?? '',
      cargadorNombre: data['cargadorNombre'] ?? '',
      fechaAsignacion: (data['fechaAsignacion'] as Timestamp).toDate(),
      estado: data['estado'] ?? 'pendiente',
      items: items,
      totalItems: totalItems,
      itemsCargados: itemsCargados,
      progreso: progreso,
      fechaInicio: data['fechaInicio'] != null 
          ? (data['fechaInicio'] as Timestamp).toDate() 
          : null,
      fechaCompletado: data['fechaCompletado'] != null 
          ? (data['fechaCompletado'] as Timestamp).toDate() 
          : null,
      notas: data['notas'] != null 
          ? List<String>.from(data['notas']) 
          : null,
    );
  }

  // Convertir a Map para Firestore
  Map<String, dynamic> toMap() {
    return {
      'numeroRuta': numeroRuta,
      'contenedorId': contenedorId,
      'cargadorId': cargadorId,
      'cargadorNombre': cargadorNombre,
      'fechaAsignacion': Timestamp.fromDate(fechaAsignacion),
      'estado': estado,
      'items': items.map((item) => item.toMap()).toList(),
      'totalItems': totalItems,
      'itemsCargados': itemsCargados,
      'progreso': progreso,
      'fechaInicio': fechaInicio != null 
          ? Timestamp.fromDate(fechaInicio!) 
          : null,
      'fechaCompletado': fechaCompletado != null 
          ? Timestamp.fromDate(fechaCompletado!) 
          : null,
      'notas': notas,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  // Copiar con cambios
  RutaCarga copyWith({
    String? estado,
    List<ItemCarga>? items,
    DateTime? fechaInicio,
    DateTime? fechaCompletado,
    List<String>? notas,
  }) {
    final newItems = items ?? this.items;
    final itemsCargados = newItems.where((item) => item.cargado).length;
    final progreso = newItems.isNotEmpty ? itemsCargados / newItems.length : 0.0;

    return RutaCarga(
      id: id,
      numeroRuta: numeroRuta,
      contenedorId: contenedorId,
      cargadorId: cargadorId,
      cargadorNombre: cargadorNombre,
      fechaAsignacion: fechaAsignacion,
      estado: estado ?? this.estado,
      items: newItems,
      totalItems: newItems.length,
      itemsCargados: itemsCargados,
      progreso: progreso,
      fechaInicio: fechaInicio ?? this.fechaInicio,
      fechaCompletado: fechaCompletado ?? this.fechaCompletado,
      notas: notas ?? this.notas,
    );
  }

  // Obtener color según estado
  String getEstadoColor() {
    switch (estado) {
      case 'completada':
        return 'success';
      case 'en_proceso':
        return 'warning';
      case 'cancelada':
        return 'error';
      default:
        return 'info';
    }
  }

  // Obtener texto del estado
  String getEstadoTexto() {
    switch (estado) {
      case 'completada':
        return 'Completada';
      case 'en_proceso':
        return 'En Proceso';
      case 'cancelada':
        return 'Cancelada';
      default:
        return 'Pendiente';
    }
  }
}

// ==================== ITEM DE CARGA ====================
class ItemCarga {
  final String itemId;
  final String descripcion;
  final String? barcode;
  final String? categoria;
  final double? peso;
  final String? volumen;
  final bool cargado;
  final DateTime? fechaCarga;
  final String? cargadoPor;
  final bool tieneDano;
  final ReporteDano? reporteDano;
  final String? ubicacionCamion; // Ej: "Fila 1, Columna 3"

  ItemCarga({
    required this.itemId,
    required this.descripcion,
    this.barcode,
    this.categoria,
    this.peso,
    this.volumen,
    this.cargado = false,
    this.fechaCarga,
    this.cargadoPor,
    this.tieneDano = false,
    this.reporteDano,
    this.ubicacionCamion,
  });

  // Crear desde Map
  factory ItemCarga.fromMap(Map<String, dynamic> data) {
    return ItemCarga(
      itemId: data['itemId'] ?? '',
      descripcion: data['descripcion'] ?? '',
      barcode: data['barcode'],
      categoria: data['categoria'],
      peso: data['peso']?.toDouble(),
      volumen: data['volumen'],
      cargado: data['cargado'] ?? false,
      fechaCarga: data['fechaCarga'] != null 
          ? (data['fechaCarga'] as Timestamp).toDate() 
          : null,
      cargadoPor: data['cargadoPor'],
      tieneDano: data['tieneDano'] ?? false,
      reporteDano: data['reporteDano'] != null 
          ? ReporteDano.fromMap(data['reporteDano'] as Map<String, dynamic>)
          : null,
      ubicacionCamion: data['ubicacionCamion'],
    );
  }

  // Convertir a Map
  Map<String, dynamic> toMap() {
    return {
      'itemId': itemId,
      'descripcion': descripcion,
      'barcode': barcode,
      'categoria': categoria,
      'peso': peso,
      'volumen': volumen,
      'cargado': cargado,
      'fechaCarga': fechaCarga != null 
          ? Timestamp.fromDate(fechaCarga!) 
          : null,
      'cargadoPor': cargadoPor,
      'tieneDano': tieneDano,
      'reporteDano': reporteDano?.toMap(),
      'ubicacionCamion': ubicacionCamion,
    };
  }

  // Copiar con cambios
  ItemCarga copyWith({
    bool? cargado,
    DateTime? fechaCarga,
    String? cargadoPor,
    bool? tieneDano,
    ReporteDano? reporteDano,
    String? ubicacionCamion,
  }) {
    return ItemCarga(
      itemId: itemId,
      descripcion: descripcion,
      barcode: barcode,
      categoria: categoria,
      peso: peso,
      volumen: volumen,
      cargado: cargado ?? this.cargado,
      fechaCarga: fechaCarga ?? this.fechaCarga,
      cargadoPor: cargadoPor ?? this.cargadoPor,
      tieneDano: tieneDano ?? this.tieneDano,
      reporteDano: reporteDano ?? this.reporteDano,
      ubicacionCamion: ubicacionCamion ?? this.ubicacionCamion,
    );
  }
}

// ==================== REPORTE DE DAÑO ====================
class ReporteDano {
  final String id;
  final String itemId;
  final String tipoDano; // 'rotura', 'mojado', 'aplastado', 'otro'
  final String descripcion;
  final String severidad; // 'leve', 'moderado', 'grave'
  final List<String> fotoUrls;
  final DateTime fechaReporte;
  final String reportadoPor;
  final String? accionTomada;

  ReporteDano({
    required this.id,
    required this.itemId,
    required this.tipoDano,
    required this.descripcion,
    required this.severidad,
    required this.fotoUrls,
    required this.fechaReporte,
    required this.reportadoPor,
    this.accionTomada,
  });

  // Crear desde Map
  factory ReporteDano.fromMap(Map<String, dynamic> data) {
    return ReporteDano(
      id: data['id'] ?? '',
      itemId: data['itemId'] ?? '',
      tipoDano: data['tipoDano'] ?? 'otro',
      descripcion: data['descripcion'] ?? '',
      severidad: data['severidad'] ?? 'leve',
      fotoUrls: List<String>.from(data['fotoUrls'] ?? []),
      fechaReporte: (data['fechaReporte'] as Timestamp).toDate(),
      reportadoPor: data['reportadoPor'] ?? '',
      accionTomada: data['accionTomada'],
    );
  }

  // Convertir a Map
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'itemId': itemId,
      'tipoDano': tipoDano,
      'descripcion': descripcion,
      'severidad': severidad,
      'fotoUrls': fotoUrls,
      'fechaReporte': Timestamp.fromDate(fechaReporte),
      'reportadoPor': reportadoPor,
      'accionTomada': accionTomada,
    };
  }

  // Obtener texto del tipo de daño
  String getTipoDanoTexto() {
    switch (tipoDano) {
      case 'rotura':
        return 'Rotura';
      case 'mojado':
        return 'Mojado';
      case 'aplastado':
        return 'Aplastado';
      default:
        return 'Otro';
    }
  }

  // Obtener texto de severidad
  String getSeveridadTexto() {
    switch (severidad) {
      case 'grave':
        return 'Grave';
      case 'moderado':
        return 'Moderado';
      default:
        return 'Leve';
    }
  }

  // Obtener color de severidad
  String getSeveridadColor() {
    switch (severidad) {
      case 'grave':
        return 'error';
      case 'moderado':
        return 'warning';
      default:
        return 'info';
    }
  }
}

// ==================== ESTADÍSTICAS DE CARGADOR ====================
class EstadisticasCargador {
  final String cargadorId;
  final int totalRutas;
  final int rutasCompletadas;
  final int rutasEnProceso;
  final int totalItemsCargados;
  final int totalDanosReportados;
  final double promedioTiempoCarga; // en minutos
  final double tasaCompletitud; // 0.0 a 1.0
  // CAMPOS CORREGIDOS:
  final int rutasCompletadasHoy;
  final int itemsCargadosHoy;
  final int danosReportadosHoy;

  EstadisticasCargador({
    required this.cargadorId,
    required this.totalRutas,
    required this.rutasCompletadas,
    required this.rutasEnProceso,
    required this.totalItemsCargados,
    required this.totalDanosReportados,
    required this.promedioTiempoCarga,
    required this.tasaCompletitud,
    // CAMPOS CORREGIDOS:
    required this.rutasCompletadasHoy,
    required this.itemsCargadosHoy,
    required this.danosReportadosHoy,
  });

  factory EstadisticasCargador.fromMap(Map<String, dynamic> data) {
    return EstadisticasCargador(
      cargadorId: data['cargadorId'] ?? '',
      totalRutas: data['totalRutas'] ?? 0,
      rutasCompletadas: data['rutasCompletadas'] ?? 0,
      rutasEnProceso: data['rutasEnProceso'] ?? 0,
      totalItemsCargados: data['totalItemsCargados'] ?? 0,
      totalDanosReportados: data['totalDanosReportados'] ?? 0,
      promedioTiempoCarga: data['promedioTiempoCarga']?.toDouble() ?? 0.0,
      tasaCompletitud: data['tasaCompletitud']?.toDouble() ?? 0.0,
      // CAMPOS CORREGIDOS:
      rutasCompletadasHoy: data['rutasCompletadasHoy'] ?? 0,
      itemsCargadosHoy: data['itemsCargadosHoy'] ?? 0,
      danosReportadosHoy: data['danosReportadosHoy'] ?? 0,
    );
  }
  
  // Se eliminaron los getters que devolvían 'null'

  Map<String, dynamic> toMap() {
    return {
      'cargadorId': cargadorId,
      'totalRutas': totalRutas,
      'rutasCompletadas': rutasCompletadas,
      'rutasEnProceso': rutasEnProceso,
      'totalItemsCargados': totalItemsCargados,
      'totalDanosReportados': totalDanosReportados,
      'promedioTiempoCarga': promedioTiempoCarga,
      'tasaCompletitud': tasaCompletitud,
      // CAMPOS CORREGIDOS:
      'rutasCompletadasHoy': rutasCompletadasHoy,
      'itemsCargadosHoy': itemsCargadosHoy,
      'danosReportadosHoy': danosReportadosHoy,
    };
  }
}
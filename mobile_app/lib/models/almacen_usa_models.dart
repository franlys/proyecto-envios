// lib/models/almacen_usa_models.dart
/// 📦 MODELOS DE DATOS PARA ALMACÉN USA
/// Define las estructuras de datos usadas por el almacén en Estados Unidos
library;


import 'package:flutter/material.dart'; // ← ✅ AGREGADO para Icons
import 'package:cloud_firestore/cloud_firestore.dart';

// ==================== CONTENEDOR USA ====================
class ContenedorUSA {
  final String id;
  final String numeroContenedor;
  final String destino; // 'republica_dominicana', etc
  final DateTime fechaCreacion;
  final DateTime? fechaCierre;
  final DateTime? fechaEnvio;
  final String estado; // 'abierto', 'cerrado', 'enviado', 'recibido'
  final List<String> itemIds;
  final int capacidadMaxima;
  final int itemsActuales;
  final double pesoTotal;
  final double volumenTotal;
  final String? creadoPor;
  final String? cerradoPor;
  final String? naviera;
  final String? numeroTracking;
  final List<String>? notas;

  ContenedorUSA({
    required this.id,
    required this.numeroContenedor,
    required this.destino,
    required this.fechaCreacion,
    this.fechaCierre,
    this.fechaEnvio,
    required this.estado,
    required this.itemIds,
    this.capacidadMaxima = 1000,
    this.itemsActuales = 0,
    this.pesoTotal = 0.0,
    this.volumenTotal = 0.0,
    this.creadoPor,
    this.cerradoPor,
    this.naviera,
    this.numeroTracking,
    this.notas,
  });

  factory ContenedorUSA.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    return ContenedorUSA(
      id: doc.id,
      numeroContenedor: data['numeroContenedor'] ?? '',
      destino: data['destino'] ?? 'republica_dominicana',
      fechaCreacion: (data['fechaCreacion'] as Timestamp).toDate(),
      fechaCierre: data['fechaCierre'] != null
          ? (data['fechaCierre'] as Timestamp).toDate()
          : null,
      fechaEnvio: data['fechaEnvio'] != null
          ? (data['fechaEnvio'] as Timestamp).toDate()
          : null,
      estado: data['estado'] ?? 'abierto',
      itemIds: List<String>.from(data['itemIds'] ?? []),
      capacidadMaxima: data['capacidadMaxima'] ?? 1000,
      itemsActuales: data['itemsActuales'] ?? 0,
      pesoTotal: data['pesoTotal']?.toDouble() ?? 0.0,
      volumenTotal: data['volumenTotal']?.toDouble() ?? 0.0,
      creadoPor: data['creadoPor'],
      cerradoPor: data['cerradoPor'],
      naviera: data['naviera'],
      numeroTracking: data['numeroTracking'],
      notas: data['notas'] != null ? List<String>.from(data['notas']) : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'numeroContenedor': numeroContenedor,
      'destino': destino,
      'fechaCreacion': Timestamp.fromDate(fechaCreacion),
      'fechaCierre': fechaCierre != null ? Timestamp.fromDate(fechaCierre!) : null,
      'fechaEnvio': fechaEnvio != null ? Timestamp.fromDate(fechaEnvio!) : null,
      'estado': estado,
      'itemIds': itemIds,
      'capacidadMaxima': capacidadMaxima,
      'itemsActuales': itemsActuales,
      'pesoTotal': pesoTotal,
      'volumenTotal': volumenTotal,
      'creadoPor': creadoPor,
      'cerradoPor': cerradoPor,
      'naviera': naviera,
      'numeroTracking': numeroTracking,
      'notas': notas,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  double get porcentajeLlenado {
    return capacidadMaxima > 0 ? itemsActuales / capacidadMaxima : 0.0;
  }

  bool get estaLleno {
    return itemsActuales >= capacidadMaxima;
  }

  String getEstadoTexto() {
    switch (estado) {
      case 'cerrado': return 'Cerrado';
      case 'enviado': return 'Enviado';
      case 'recibido': return 'Recibido';
      default: return 'Abierto';
    }
  }

  String getEstadoColor() {
    switch (estado) {
      case 'recibido': return 'success';
      case 'enviado': return 'info';
      case 'cerrado': return 'warning';
      default: return 'primary';
    }
  }
}

// ==================== ITEM DE INVENTARIO ====================
class ItemInventario {
  final String id;
  final String numeroTracking;
  final String barcode;
  final String descripcion;
  final String categoria;
  final double peso;
  final String dimensiones;
  final String remitente;
  final String destinatario;
  final String direccionDestino;
  final String telefonoDestino;
  final DateTime fechaIngreso;
  final String? contenedorId;
  final String estado; // 'recibido', 'en_contenedor', 'enviado', 'entregado'
  final String? ubicacion; // Ej: "Estante A-15"
  final List<String>? fotoUrls;
  final bool requiereAtencionEspecial;
  final String? notasEspeciales;
  final String registradoPor;

  ItemInventario({
    required this.id,
    required this.numeroTracking,
    required this.barcode,
    required this.descripcion,
    required this.categoria,
    required this.peso,
    required this.dimensiones,
    required this.remitente,
    required this.destinatario,
    required this.direccionDestino,
    required this.telefonoDestino,
    required this.fechaIngreso,
    this.contenedorId,
    required this.estado,
    this.ubicacion,
    this.fotoUrls,
    this.requiereAtencionEspecial = false,
    this.notasEspeciales,
    required this.registradoPor,
  });

  factory ItemInventario.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    return ItemInventario(
      id: doc.id,
      numeroTracking: data['numeroTracking'] ?? '',
      barcode: data['barcode'] ?? '',
      descripcion: data['descripcion'] ?? '',
      categoria: data['categoria'] ?? 'general',
      peso: data['peso']?.toDouble() ?? 0.0,
      dimensiones: data['dimensiones'] ?? '',
      remitente: data['remitente'] ?? '',
      destinatario: data['destinatario'] ?? '',
      direccionDestino: data['direccionDestino'] ?? '',
      telefonoDestino: data['telefonoDestino'] ?? '',
      fechaIngreso: (data['fechaIngreso'] as Timestamp).toDate(),
      contenedorId: data['contenedorId'],
      estado: data['estado'] ?? 'recibido',
      ubicacion: data['ubicacion'],
      fotoUrls: data['fotoUrls'] != null ? List<String>.from(data['fotoUrls']) : null,
      requiereAtencionEspecial: data['requiereAtencionEspecial'] ?? false,
      notasEspeciales: data['notasEspeciales'],
      registradoPor: data['registradoPor'] ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'numeroTracking': numeroTracking,
      'barcode': barcode,
      'descripcion': descripcion,
      'categoria': categoria,
      'peso': peso,
      'dimensiones': dimensiones,
      'remitente': remitente,
      'destinatario': destinatario,
      'direccionDestino': direccionDestino,
      'telefonoDestino': telefonoDestino,
      'fechaIngreso': Timestamp.fromDate(fechaIngreso),
      'contenedorId': contenedorId,
      'estado': estado,
      'ubicacion': ubicacion,
      'fotoUrls': fotoUrls,
      'requiereAtencionEspecial': requiereAtencionEspecial,
      'notasEspeciales': notasEspeciales,
      'registradoPor': registradoPor,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  String getEstadoTexto() {
    switch (estado) {
      case 'en_contenedor': return 'En Contenedor';
      case 'enviado': return 'Enviado';
      case 'entregado': return 'Entregado';
      default: return 'Recibido';
    }
  }
}

// ==================== ESCANEO ====================
class RegistroEscaneo {
  final String id;
  final String barcode;
  final String? itemId;
  final String? contenedorId;
  final DateTime fechaEscaneo;
  final String escaneadoPor;
  final String accion; // 'registro', 'agregar_contenedor', 'verificacion'
  final bool exitoso;
  final String? mensajeError;

  RegistroEscaneo({
    required this.id,
    required this.barcode,
    this.itemId,
    this.contenedorId,
    required this.fechaEscaneo,
    required this.escaneadoPor,
    required this.accion,
    required this.exitoso,
    this.mensajeError,
  });

  factory RegistroEscaneo.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    return RegistroEscaneo(
      id: doc.id,
      barcode: data['barcode'] ?? '',
      itemId: data['itemId'],
      contenedorId: data['contenedorId'],
      fechaEscaneo: (data['fechaEscaneo'] as Timestamp).toDate(),
      escaneadoPor: data['escaneadoPor'] ?? '',
      accion: data['accion'] ?? 'registro',
      exitoso: data['exitoso'] ?? false,
      mensajeError: data['mensajeError'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'barcode': barcode,
      'itemId': itemId,
      'contenedorId': contenedorId,
      'fechaEscaneo': Timestamp.fromDate(fechaEscaneo),
      'escaneadoPor': escaneadoPor,
      'accion': accion,
      'exitoso': exitoso,
      'mensajeError': mensajeError,
    };
  }
}

// ==================== ESTADÍSTICAS ALMACÉN USA ====================
class EstadisticasAlmacenUSA {
  final int contenedoresAbiertos;
  final int contenedoresCerrados;
  final int itemsEnInventario;
  final int itemsSinAsignar;
  final int escaneosDiaActual;
  final double pesoTotalAlmacenado;

  EstadisticasAlmacenUSA({
    required this.contenedoresAbiertos,
    required this.contenedoresCerrados,
    required this.itemsEnInventario,
    required this.itemsSinAsignar,
    required this.escaneosDiaActual,
    required this.pesoTotalAlmacenado,
  });
}

// ==================== CATEGORÍAS DE ITEMS ====================
class CategoriasItems {
  static const String electronica = 'electronica';
  static const String ropa = 'ropa';
  static const String alimentos = 'alimentos';
  static const String documentos = 'documentos';
  static const String medicamentos = 'medicamentos';
  static const String juguetes = 'juguetes';
  static const String otros = 'otros';

  static const List<String> todas = [
    electronica,
    ropa,
    alimentos,
    documentos,
    medicamentos,
    juguetes,
    otros,
  ];

  static String getNombre(String categoria) {
    switch (categoria) {
      case electronica: return 'Electrónica';
      case ropa: return 'Ropa';
      case alimentos: return 'Alimentos';
      case documentos: return 'Documentos';
      case medicamentos: return 'Medicamentos';
      case juguetes: return 'Juguetes';
      default: return 'Otros';
    }
  }

  static IconData getIcono(String categoria) {
    switch (categoria) {
      case electronica: return Icons.devices;
      case ropa: return Icons.checkroom;
      case alimentos: return Icons.fastfood;
      case documentos: return Icons.description;
      case medicamentos: return Icons.medication;
      case juguetes: return Icons.toys;
      default: return Icons.inventory;
    }
  }
}
// lib/models/almacen_rd_models.dart
/// 🏪 MODELOS DE DATOS PARA ALMACÉN RD
/// Define las estructuras de datos usadas por el almacén en República Dominicana
library;


import 'package:cloud_firestore/cloud_firestore.dart';

// ==================== CONTENEDOR RECIBIDO ====================
class ContenedorRecibido {
  final String id;
  final String numeroContenedor;
  final DateTime? fechaRecepcion;
  final DateTime fechaEnvio; // ✅ AÑADIDO
  final String estado;
  final String procedencia; // ✅ AÑADIDO
  final int itemsTotal; // ✅ RENOMBRADO de totalItems
  final int itemsProcesados;
  final String? recibioPor;
  final String? almacenRDId;
  final List<String>? notas;
  final double progresoProcesamiento;

  ContenedorRecibido({
    required this.id,
    required this.numeroContenedor,
    this.fechaRecepcion,
    required this.fechaEnvio,
    required this.estado,
    required this.procedencia,
    required this.itemsTotal,
    this.itemsProcesados = 0,
    this.recibioPor,
    this.almacenRDId,
    this.notas,
    this.progresoProcesamiento = 0.0,
  });

  factory ContenedorRecibido.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    return ContenedorRecibido(
      id: doc.id,
      numeroContenedor: data['numeroContenedor'] ?? '',
      fechaRecepcion: data['fechaRecepcion'] != null
          ? (data['fechaRecepcion'] as Timestamp).toDate()
          : null,
      fechaEnvio: data['fechaEnvio'] != null
          ? (data['fechaEnvio'] as Timestamp).toDate()
          : DateTime.now(),
      estado: data['estado'] ?? 'pendiente',
      procedencia: data['procedencia'] ?? 'usa',
      itemsTotal: data['itemsTotal'] ?? data['totalItems'] ?? 0,
      itemsProcesados: data['itemsProcesados'] ?? 0,
      recibioPor: data['recibioPor'],
      almacenRDId: data['almacenRDId'],
      notas: data['notas'] != null ? List<String>.from(data['notas']) : null,
      progresoProcesamiento: data['progresoProcesamiento']?.toDouble() ?? 0.0,
    );
  }

  // ✅ AÑADIDO: Propiedad totalItems como alias
  int get totalItems => itemsTotal;
}

// ==================== RUTA DE DISTRIBUCIÓN ====================
class RutaDistribucion {
  final String id;
  final String nombre;
  final String numeroRuta; // ✅ AÑADIDO
  final String zona; // ✅ AÑADIDO
  final String? repartidorId;
  final String? repartidorNombre;
  final DateTime fechaAsignacion;
  final String estado;
  final List<EntregaItem> entregas;
  final String? asignadoPor;

  RutaDistribucion({
    required this.id,
    required this.nombre,
    required this.numeroRuta,
    required this.zona,
    this.repartidorId,
    this.repartidorNombre,
    required this.fechaAsignacion,
    required this.estado,
    required this.entregas,
    this.asignadoPor,
  });

  factory RutaDistribucion.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    List<EntregaItem> entregas = [];
    if (data['entregas'] != null) {
      entregas = (data['entregas'] as List)
          .map((e) => EntregaItem.fromMap(e as Map<String, dynamic>))
          .toList();
    }
    
    return RutaDistribucion(
      id: doc.id,
      nombre: data['nombre'] ?? '',
      numeroRuta: data['numeroRuta'] ?? data['id'] ?? '',
      zona: data['zona'] ?? 'general',
      repartidorId: data['repartidorId'],
      repartidorNombre: data['repartidorNombre'],
      fechaAsignacion: (data['fechaAsignacion'] as Timestamp).toDate(),
      estado: data['estado'] ?? 'pendiente',
      entregas: entregas,
      asignadoPor: data['asignadoPor'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'nombre': nombre,
      'numeroRuta': numeroRuta,
      'zona': zona,
      'repartidorId': repartidorId,
      'repartidorNombre': repartidorNombre,
      'fechaAsignacion': Timestamp.fromDate(fechaAsignacion),
      'estado': estado,
      'entregas': entregas.map((e) => e.toMap()).toList(),
      'asignadoPor': asignadoPor,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  // ✅ AÑADIDO: Método totalEntregas
  int get totalEntregas => entregas.length;

  // ✅ AÑADIDO: Método entregasCompletadas
  int get entregasCompletadas {
    return entregas.where((e) => e.entregado).length;
  }
}

// ==================== ITEM DE ENTREGA ====================
class EntregaItem {
  final String itemId;
  final String tracking;
  final String destinatario;
  final String destinatarioNombre; // ✅ AÑADIDO como alias
  final String direccion;
  final String direccionEntrega; // ✅ AÑADIDO como alias
  final String telefono;
  final bool entregado;
  final DateTime? fechaEntrega;
  final String? firmaUrl;
  final String? fotoUrl;
  final String? notas;

  EntregaItem({
    required this.itemId,
    required this.tracking,
    required this.destinatario,
    required this.direccion,
    required this.telefono,
    this.entregado = false,
    this.fechaEntrega,
    this.firmaUrl,
    this.fotoUrl,
    this.notas,
  }) : destinatarioNombre = destinatario,
       direccionEntrega = direccion;

  factory EntregaItem.fromMap(Map<String, dynamic> map) {
    return EntregaItem(
      itemId: map['itemId'] ?? '',
      tracking: map['tracking'] ?? '',
      destinatario: map['destinatario'] ?? map['destinatarioNombre'] ?? '',
      direccion: map['direccion'] ?? map['direccionEntrega'] ?? '',
      telefono: map['telefono'] ?? '',
      entregado: map['entregado'] ?? false,
      fechaEntrega: map['fechaEntrega'] != null
          ? (map['fechaEntrega'] as Timestamp).toDate()
          : null,
      firmaUrl: map['firmaUrl'],
      fotoUrl: map['fotoUrl'],
      notas: map['notas'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'itemId': itemId,
      'tracking': tracking,
      'destinatario': destinatario,
      'destinatarioNombre': destinatario,
      'direccion': direccion,
      'direccionEntrega': direccion,
      'telefono': telefono,
      'entregado': entregado,
      'fechaEntrega': fechaEntrega != null 
          ? Timestamp.fromDate(fechaEntrega!) 
          : null,
      'firmaUrl': firmaUrl,
      'fotoUrl': fotoUrl,
      'notas': notas,
    };
  }
}

// ==================== FACTURA RD ====================
class FacturaRD {
  final String id;
  final String numeroFactura;
  final String clienteId;
  final String clienteNombre;
  final String clienteTelefono; // ✅ AÑADIDO
  final DateTime fechaEmision;
  final DateTime? fechaVencimiento;
  final double subtotal;
  final double impuestos;
  final double total;
  final String estado;
  final List<ItemFactura> items;
  final String? metodoPago;
  final double? montoPagado;
  final DateTime? fechaPago;

  FacturaRD({
    required this.id,
    required this.numeroFactura,
    required this.clienteId,
    required this.clienteNombre,
    required this.clienteTelefono,
    required this.fechaEmision,
    this.fechaVencimiento,
    required this.subtotal,
    required this.impuestos,
    required this.total,
    required this.estado,
    required this.items,
    this.metodoPago,
    this.montoPagado,
    this.fechaPago,
  });

  factory FacturaRD.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    List<ItemFactura> items = [];
    if (data['items'] != null) {
      items = (data['items'] as List)
          .map((e) => ItemFactura.fromMap(e as Map<String, dynamic>))
          .toList();
    }
    
    return FacturaRD(
      id: doc.id,
      numeroFactura: data['numeroFactura'] ?? '',
      clienteId: data['clienteId'] ?? '',
      clienteNombre: data['clienteNombre'] ?? '',
      clienteTelefono: data['clienteTelefono'] ?? '',
      fechaEmision: (data['fechaEmision'] as Timestamp).toDate(),
      fechaVencimiento: data['fechaVencimiento'] != null
          ? (data['fechaVencimiento'] as Timestamp).toDate()
          : null,
      subtotal: data['subtotal']?.toDouble() ?? 0.0,
      impuestos: data['impuestos']?.toDouble() ?? 0.0,
      total: data['total']?.toDouble() ?? 0.0,
      estado: data['estado'] ?? 'pendiente',
      items: items,
      metodoPago: data['metodoPago'],
      montoPagado: data['montoPagado']?.toDouble(),
      fechaPago: data['fechaPago'] != null
          ? (data['fechaPago'] as Timestamp).toDate()
          : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'numeroFactura': numeroFactura,
      'clienteId': clienteId,
      'clienteNombre': clienteNombre,
      'clienteTelefono': clienteTelefono,
      'fechaEmision': Timestamp.fromDate(fechaEmision),
      'fechaVencimiento': fechaVencimiento != null 
          ? Timestamp.fromDate(fechaVencimiento!) 
          : null,
      'subtotal': subtotal,
      'impuestos': impuestos,
      'total': total,
      'estado': estado,
      'items': items.map((e) => e.toMap()).toList(),
      'metodoPago': metodoPago,
      'montoPagado': montoPagado,
      'fechaPago': fechaPago != null 
          ? Timestamp.fromDate(fechaPago!) 
          : null,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  // ✅ AÑADIDO: Método getEstadoTexto
  String getEstadoTexto() {
    switch (estado) {
      case 'pagada': return 'Pagada';
      case 'cancelada': return 'Cancelada';
      default: return 'Pendiente';
    }
  }

  // ✅ AÑADIDO: Método estaVencida
  bool estaVencida() {
    if (fechaVencimiento == null) return false;
    return DateTime.now().isAfter(fechaVencimiento!) && estado == 'pendiente';
  }
}

// ==================== ITEM DE FACTURA ====================
class ItemFactura {
  final String descripcion;
  final int cantidad;
  final double precioUnitario;
  final double subtotal;

  ItemFactura({
    required this.descripcion,
    required this.cantidad,
    required this.precioUnitario,
    required this.subtotal,
  });

  factory ItemFactura.fromMap(Map<String, dynamic> map) {
    return ItemFactura(
      descripcion: map['descripcion'] ?? '',
      cantidad: map['cantidad'] ?? 0,
      precioUnitario: map['precioUnitario']?.toDouble() ?? 0.0,
      subtotal: map['subtotal']?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'descripcion': descripcion,
      'cantidad': cantidad,
      'precioUnitario': precioUnitario,
      'subtotal': subtotal,
    };
  }
}

// ==================== ESTADÍSTICAS ALMACÉN RD ====================
class EstadisticasAlmacenRD {
  final int contenedoresRecibidos;
  final int contenedoresEnProceso;
  final int rutasActivas;
  final int entregasPendientes;
  final int entregasCompletadasHoy;
  final double facturacionMensual;
  final double facturacionPendiente;

  EstadisticasAlmacenRD({
    required this.contenedoresRecibidos,
    required this.contenedoresEnProceso,
    required this.rutasActivas,
    required this.entregasPendientes,
    required this.entregasCompletadasHoy,
    required this.facturacionMensual,
    required this.facturacionPendiente,
  });
}
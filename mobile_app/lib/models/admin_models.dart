// lib/models/admin_models.dart
/// 👔 MODELOS DE DATOS PARA ADMINISTRACIÓN
/// Define las estructuras de datos usadas por los administradores
library;


import 'package:cloud_firestore/cloud_firestore.dart';

// ==================== USUARIO DEL SISTEMA ====================
class UsuarioSistema {
  final String id;
  final String nombre;
  final String email;
  final String rol;
  final bool activo;
  final DateTime fechaCreacion;
  final String? telefono;
  final String? zona;
  final DateTime? ultimoAcceso;

  UsuarioSistema({
    required this.id,
    required this.nombre,
    required this.email,
    required this.rol,
    required this.activo,
    required this.fechaCreacion,
    this.telefono,
    this.zona,
    this.ultimoAcceso,
  });

  factory UsuarioSistema.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    return UsuarioSistema(
      id: doc.id,
      nombre: data['nombre'] ?? '',
      email: data['email'] ?? '',
      rol: data['rol'] ?? '',
      activo: data['activo'] ?? true,
      fechaCreacion: (data['fechaCreacion'] as Timestamp).toDate(),
      telefono: data['telefono'],
      zona: data['zona'],
      ultimoAcceso: data['ultimoAcceso'] != null
          ? (data['ultimoAcceso'] as Timestamp).toDate()
          : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'nombre': nombre,
      'email': email,
      'rol': rol,
      'activo': activo,
      'fechaCreacion': Timestamp.fromDate(fechaCreacion),
      'telefono': telefono,
      'zona': zona,
      'ultimoAcceso': ultimoAcceso != null 
          ? Timestamp.fromDate(ultimoAcceso!) 
          : null,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  // ✅ AÑADIDO: Método getRoleName
  String getRolNombre() {
    switch (rol) {
      case 'superAdmin': return 'Super Admin';
      case 'admin': return 'Admin General';
      case 'secretaria': return 'Secretaria';
      case 'almacenUSA': return 'Almacén USA';
      case 'almacenRD': return 'Almacén RD';
      case 'cargador': return 'Cargador';
      case 'recolector': return 'Recolector';
      case 'repartidor': return 'Repartidor';
      default: return rol;
    }
  }
}

// ==================== ESTADÍSTICAS GLOBALES ====================
class EstadisticasGlobales {
  final int totalUsuarios;
  final int usuariosActivos;
  final int totalClientes;
  final int clientesActivos;
  final int enviosEnProceso;
  final int enviosCompletados;
  final int contenedoresEnTransito;
  final int rutasActivas;
  final double ingresosMensuales;
  final double ingresosAnuales;
  final int ticketsAbiertos;
  final int ticketsPendientes;

  EstadisticasGlobales({
    required this.totalUsuarios,
    required this.usuariosActivos,
    required this.totalClientes,
    required this.clientesActivos,
    required this.enviosEnProceso,
    required this.enviosCompletados,
    required this.contenedoresEnTransito,
    required this.rutasActivas,
    required this.ingresosMensuales,
    required this.ingresosAnuales,
    required this.ticketsAbiertos,
    required this.ticketsPendientes,
  });
}

// ==================== MÉTRICAS POR ROL ====================
class MetricasPorRol {
  final String rol;
  final int totalUsuarios;
  final int activos;
  final int inactivos;

  MetricasPorRol({
    required this.rol,
    required this.totalUsuarios,
    required this.activos,
    required this.inactivos,
  });
}

// ==================== RESUMEN FINANCIERO ====================
class ResumenFinancieroAdmin {
  final double ingresosDiarios;
  final double ingresosSemanales;
  final double ingresosMensuales;
  final double ingresosAnuales;
  final double cuentasPorCobrar;
  final double gastosOperativos;
  final double utilidadNeta;
  final int facturasPendientes;
  final int facturasVencidas;

  ResumenFinancieroAdmin({
    required this.ingresosDiarios,
    required this.ingresosSemanales,
    required this.ingresosMensuales,
    required this.ingresosAnuales,
    required this.cuentasPorCobrar,
    required this.gastosOperativos,
    required this.utilidadNeta,
    required this.facturasPendientes,
    required this.facturasVencidas,
  });
}

// ==================== ACTIVIDAD DEL SISTEMA ====================
class ActividadSistema {
  final String id;
  final String tipo;
  final String descripcion;
  final String usuarioId;
  final String usuarioNombre;
  final DateTime fecha;
  final Map<String, dynamic>? metadata;

  ActividadSistema({
    required this.id,
    required this.tipo,
    required this.descripcion,
    required this.usuarioId,
    required this.usuarioNombre,
    required this.fecha,
    this.metadata,
  });

  factory ActividadSistema.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    return ActividadSistema(
      id: doc.id,
      tipo: data['tipo'] ?? '',
      descripcion: data['descripcion'] ?? '',
      usuarioId: data['usuarioId'] ?? '',
      usuarioNombre: data['usuarioNombre'] ?? '',
      fecha: (data['fecha'] as Timestamp).toDate(),
      metadata: data['metadata'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'tipo': tipo,
      'descripcion': descripcion,
      'usuarioId': usuarioId,
      'usuarioNombre': usuarioNombre,
      'fecha': Timestamp.fromDate(fecha),
      'metadata': metadata,
    };
  }
}

// ==================== ALERTA DEL SISTEMA ====================
class AlertaSistema {
  final String id;
  final String tipo;
  final String titulo;
  final String mensaje;
  final String prioridad;
  final DateTime fecha;
  final bool leida;
  final String? accionUrl;

  AlertaSistema({
    required this.id,
    required this.tipo,
    required this.titulo,
    required this.mensaje,
    required this.prioridad,
    required this.fecha,
    required this.leida,
    this.accionUrl,
  });

  factory AlertaSistema.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    return AlertaSistema(
      id: doc.id,
      tipo: data['tipo'] ?? '',
      titulo: data['titulo'] ?? '',
      mensaje: data['mensaje'] ?? '',
      prioridad: data['prioridad'] ?? 'normal',
      fecha: (data['fecha'] as Timestamp).toDate(),
      leida: data['leida'] ?? false,
      accionUrl: data['accionUrl'],
    );
  }
}

// ==================== CONFIGURACIÓN DEL SISTEMA ====================
class ConfiguracionSistema {
  final String id;
  final String clave;
  final dynamic valor;
  final String descripcion;
  final String tipo;
  final DateTime? ultimaModificacion;
  final String? modificadoPor;

  ConfiguracionSistema({
    required this.id,
    required this.clave,
    required this.valor,
    required this.descripcion,
    required this.tipo,
    this.ultimaModificacion,
    this.modificadoPor,
  });

  factory ConfiguracionSistema.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    return ConfiguracionSistema(
      id: doc.id,
      clave: data['clave'] ?? '',
      valor: data['valor'],
      descripcion: data['descripcion'] ?? '',
      tipo: data['tipo'] ?? 'string',
      ultimaModificacion: data['ultimaModificacion'] != null
          ? (data['ultimaModificacion'] as Timestamp).toDate()
          : null,
      modificadoPor: data['modificadoPor'],
    );
  }
}
import 'package:cloud_firestore/cloud_firestore.dart';

class Ruta {
  final String id;
  final String nombre;
  final String embarqueId;
  final String empleadoId;
  final String empleadoNombre;
  final String estado;
  final DateTime? fechaCreacion;
  final DateTime? fechaActualizacion;
  final int totalFacturas;
  final int facturasEntregadas;
  final double totalGastos;
  final double montoAsignado;  // ← AGREGADO

  Ruta({
    required this.id,
    required this.nombre,
    required this.embarqueId,
    required this.empleadoId,
    required this.empleadoNombre,
    required this.estado,
    this.fechaCreacion,
    this.fechaActualizacion,
    this.totalFacturas = 0,
    this.facturasEntregadas = 0,
    this.totalGastos = 0.0,
    this.montoAsignado = 0.0,  // ← AGREGADO
  });

  factory Ruta.fromJson(Map<String, dynamic> json) {
    return Ruta(
      id: json['id'] ?? '',
      nombre: json['nombre'] ?? 'Sin nombre',
      embarqueId: json['embarqueId'] ?? '',
      empleadoId: json['empleadoId'] ?? '',
      empleadoNombre: json['empleadoNombre'] ?? '',
      estado: json['estado'] ?? 'pendiente',
      fechaCreacion: json['fechaCreacion'] != null 
          ? (json['fechaCreacion'] as Timestamp).toDate()
          : null,
      fechaActualizacion: json['fechaActualizacion'] != null
          ? (json['fechaActualizacion'] as Timestamp).toDate()
          : null,
      totalFacturas: json['totalFacturas'] ?? 0,
      facturasEntregadas: json['facturasEntregadas'] ?? 0,
      totalGastos: (json['totalGastos'] ?? 0).toDouble(),
      montoAsignado: (json['montoAsignado'] ?? 0).toDouble(),  // ← AGREGADO
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nombre': nombre,
      'embarqueId': embarqueId,
      'empleadoId': empleadoId,
      'empleadoNombre': empleadoNombre,
      'estado': estado,
      'fechaCreacion': fechaCreacion,
      'fechaActualizacion': fechaActualizacion,
      'totalFacturas': totalFacturas,
      'facturasEntregadas': facturasEntregadas,
      'totalGastos': totalGastos,
      'montoAsignado': montoAsignado,  // ← AGREGADO
    };
  }

  String getEstadoColor() {
    switch (estado) {
      case 'pendiente':
        return 'orange';
      case 'en_proceso':
        return 'blue';
      case 'completada':
        return 'green';
      default:
        return 'grey';
    }
  }

  String getEstadoTexto() {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_proceso':
        return 'En Proceso';
      case 'completada':
        return 'Completada';
      default:
        return 'Desconocido';
    }
  }

  double getProgreso() {
    if (totalFacturas == 0) return 0.0;
    return (facturasEntregadas / totalFacturas) * 100;
  }

  // ← AGREGADO: Calcular balance (dinero restante)
  double getBalance() {
    return montoAsignado - totalGastos;
  }

  // ← AGREGADO: Obtener texto del balance formateado
  String getBalanceTexto() {
    final balance = getBalance();
    if (balance >= 0) {
      return 'Balance: +\$${balance.toStringAsFixed(2)}';
    } else {
      return 'Balance: -\$${balance.abs().toStringAsFixed(2)}';
    }
  }

  // ← AGREGADO: Verificar si hay balance positivo
  bool tieneBalancePositivo() {
    return getBalance() >= 0;
  }
}
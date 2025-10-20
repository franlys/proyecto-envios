// mobile_app/lib/models/factura.dart
import 'package:cloud_firestore/cloud_firestore.dart';

class Factura {
  final String id;
  final String numeroFactura;
  final String clienteNombre;
  final String direccion;
  final String telefono;
  final double monto;
  final String estado;
  final String rutaId;
  final String? observaciones;
  final DateTime? fechaEntrega;
  final String? fotoUrl;

  Factura({
    required this.id,
    required this.numeroFactura,
    required this.clienteNombre,
    required this.direccion,
    required this.telefono,
    required this.monto,
    required this.estado,
    required this.rutaId,
    this.observaciones,
    this.fechaEntrega,
    this.fotoUrl,
  });

  factory Factura.fromJson(Map<String, dynamic> json) {
    return Factura(
      id: json['id'] ?? '',
      numeroFactura: json['numeroFactura'] ?? '',
      clienteNombre: json['cliente'] ?? 'Desconocido',  // ← CORREGIDO
      direccion: json['direccion'] ?? '',
      telefono: json['telefono'] ?? '',
      monto: (json['monto'] ?? 0).toDouble(),
      estado: json['estado'] ?? 'pendiente',
      rutaId: json['rutaId'] ?? '',
      observaciones: json['observaciones'],
      fechaEntrega: json['fechaEntrega'] != null
          ? (json['fechaEntrega'] as Timestamp).toDate()
          : null,
      fotoUrl: json['fotoUrl'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'numeroFactura': numeroFactura,
      'cliente': clienteNombre,  // ← CORREGIDO
      'direccion': direccion,
      'telefono': telefono,
      'monto': monto,
      'estado': estado,
      'rutaId': rutaId,
      'observaciones': observaciones,
      'fechaEntrega': fechaEntrega,
      'fotoUrl': fotoUrl,
    };
  }

  String getEstadoColor() {
    switch (estado) {
      case 'pendiente':
      case 'asignado':  // ← AGREGADO
        return 'orange';
      case 'entregado':
        return 'green';
      case 'no_entregado':
        return 'red';
      default:
        return 'grey';
    }
  }

  String getEstadoTexto() {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'asignado':  // ← AGREGADO
        return 'Asignado';
      case 'entregado':
        return 'Entregado';
      case 'no_entregado':
        return 'No Entregado';
      default:
        return 'Desconocido';
    }
  }

  bool isEntregada() {
    return estado == 'entregado';
  }

  bool isPendiente() {
    return estado == 'pendiente' || estado == 'asignado';  // ← CORREGIDO
  }
}
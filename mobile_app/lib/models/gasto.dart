import 'package:cloud_firestore/cloud_firestore.dart';

class Gasto {
  final String id;
  final String rutaId;
  final String tipo;
  final double monto;
  final String? descripcion;
  final DateTime? fecha;
  final String? fotoReciboUrl;

  Gasto({
    required this.id,
    required this.rutaId,
    required this.tipo,
    required this.monto,
    this.descripcion,
    this.fecha,
    this.fotoReciboUrl,
  });

  factory Gasto.fromJson(Map<String, dynamic> json) {
    return Gasto(
      id: json['id'] ?? '',
      rutaId: json['rutaId'] ?? '',
      tipo: json['tipo'] ?? 'otro',
      monto: (json['monto'] ?? 0).toDouble(),
      descripcion: json['descripcion'],
      fecha: json['fecha'] != null
          ? (json['fecha'] as Timestamp).toDate()
          : null,
      fotoReciboUrl: json['fotoReciboUrl'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'rutaId': rutaId,
      'tipo': tipo,
      'monto': monto,
      'descripcion': descripcion,
      'fecha': fecha,
      'fotoReciboUrl': fotoReciboUrl,
    };
  }

  String getTipoIcono() {
    switch (tipo) {
      case 'combustible':
        return '⛽';
      case 'peaje':
        return '🚧';
      case 'estacionamiento':
        return '🅿️';
      case 'comida':
        return '🍽️';
      case 'otro':
        return '💰';
      default:
        return '💵';
    }
  }

  String getTipoTexto() {
    switch (tipo) {
      case 'combustible':
        return 'Combustible';
      case 'peaje':
        return 'Peaje';
      case 'estacionamiento':
        return 'Estacionamiento';
      case 'comida':
        return 'Comida';
      case 'otro':
        return 'Otro';
      default:
        return 'Desconocido';
    }
  }

  static List<String> getTiposDisponibles() {
    return [
      'combustible',
      'peaje',
      'estacionamiento',
      'comida',
      'otro',
    ];
  }

  static String getTipoNombre(String tipo) {
    switch (tipo) {
      case 'combustible':
        return 'Combustible';
      case 'peaje':
        return 'Peaje';
      case 'estacionamiento':
        return 'Estacionamiento';
      case 'comida':
        return 'Comida';
      case 'otro':
        return 'Otro';
      default:
        return tipo;
    }
  }
}
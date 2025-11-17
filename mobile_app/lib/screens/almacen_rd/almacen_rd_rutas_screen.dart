library;

// lib/screens/almacen_rd/almacen_rd_rutas_screen.dart
/// 🚚 PANTALLA DE ASIGNACIÓN DE RUTAS
/// Crear y asignar rutas a repartidores desde el almacén RD

import 'package:flutter/material.dart';
import '../../services/almacen_rd_service.dart';
import '../../models/almacen_rd_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';

class AlmacenRDRutasScreen extends StatefulWidget {
  const AlmacenRDRutasScreen({super.key});

  @override
  State<AlmacenRDRutasScreen> createState() => _AlmacenRDRutasScreenState();
}

class _AlmacenRDRutasScreenState extends State<AlmacenRDRutasScreen> {
  final AlmacenRDService _almacenService = AlmacenRDService();
  String _filtroEstado = 'todos';

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Asignación de Rutas'),
            automaticallyImplyLeading: false,
            actions: [
              PopupMenuButton<String>(
                icon: const Icon(Icons.filter_list),
                onSelected: (value) => setState(() => _filtroEstado = value),
                itemBuilder: (context) => const [
                  PopupMenuItem(value: 'todos', child: Text('Todas')),
                  PopupMenuItem(value: 'asignada', child: Text('Asignadas')),
                  PopupMenuItem(value: 'en_proceso', child: Text('En Proceso')),
                  PopupMenuItem(value: 'completada', child: Text('Completadas')),
                ],
              ),
            ],
          ),
          body: StreamBuilder<List<RutaDistribucion>>(
            stream: _almacenService.getRutasStream(
              filtroEstado: _filtroEstado == 'todos' ? null : _filtroEstado,
            ),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              final rutas = snapshot.data ?? [];

              if (rutas.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.local_shipping, size: 80, color: Colors.grey[300]),
                      const SizedBox(height: 16),
                      Text(
                        'No hay rutas',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                );
              }

              return ListView.builder(
                padding: helper.screenPadding,
                itemCount: rutas.length,
                itemBuilder: (context, index) => _buildRutaCard(rutas[index], helper),
              );
            },
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _mostrarCrearRuta(context),
            icon: const Icon(Icons.add),
            label: const Text('Nueva Ruta'),
            backgroundColor: AppTheme.almacenRDColor,
          ),
        );
      },
    );
  }

  Widget _buildRutaCard(RutaDistribucion ruta, ResponsiveHelper helper) {
    final color = _getEstadoColor(ruta.estado);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.2),
          child: Icon(Icons.local_shipping, color: color),
        ),
        title: Text(
          'Ruta ${ruta.numeroRuta}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Zona: ${ruta.zona}'),
            Text('Repartidor: ${ruta.repartidorNombre ?? "Sin asignar"}'),
            Text('${ruta.entregasCompletadas}/${ruta.totalEntregas} entregas'),
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            _getEstadoTexto(ruta.estado),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ),
        onTap: () => _mostrarDetalleRuta(ruta),
      ),
    );
  }

  void _mostrarCrearRuta(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Crear Nueva Ruta'),
        content: const Text(
          'Función de crear ruta:\n\n'
          '1. Seleccionar zona\n'
          '2. Agregar entregas\n'
          '3. Asignar repartidor\n\n'
          'Implementar formulario completo',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  void _mostrarDetalleRuta(RutaDistribucion ruta) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Ruta ${ruta.numeroRuta}'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Zona: ${ruta.zona}'),
              Text('Repartidor: ${ruta.repartidorNombre ?? "Sin asignar"}'),
              Text('Estado: ${_getEstadoTexto(ruta.estado)}'),
              Text('Entregas: ${ruta.entregasCompletadas}/${ruta.totalEntregas}'),
              const SizedBox(height: 16),
              const Text('Entregas:', style: TextStyle(fontWeight: FontWeight.bold)),
              ...ruta.entregas.map((e) => ListTile(
                dense: true,
                leading: Icon(
                  e.entregado ? Icons.check_circle : Icons.pending,
                  color: e.entregado ? Colors.green : Colors.orange,
                ),
                title: Text(e.destinatarioNombre),
                subtitle: Text(e.direccionEntrega),
              )),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  Color _getEstadoColor(String estado) {
    switch (estado) {
      case 'completada': return AppTheme.successColor;
      case 'en_proceso': return AppTheme.warningColor;
      case 'cancelada': return AppTheme.errorColor;
      default: return AppTheme.infoColor;
    }
  }

  String _getEstadoTexto(String estado) {
    switch (estado) {
      case 'completada': return 'Completada';
      case 'en_proceso': return 'En Proceso';
      case 'cancelada': return 'Cancelada';
      default: return 'Asignada';
    }
  }
}
// lib/screens/recolector/recolector_historial_screen.dart
/// 📊 PANTALLA DE HISTORIAL DE RECOLECCIONES
/// Ver historial de rutas completadas
library;


import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/recolector_service.dart';
import '../../models/recolector_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';

class RecolectorHistorialScreen extends StatefulWidget {
  const RecolectorHistorialScreen({super.key});

  @override
  State<RecolectorHistorialScreen> createState() => _RecolectorHistorialScreenState();
}

class _RecolectorHistorialScreenState extends State<RecolectorHistorialScreen> {
  final RecolectorService _recolectorService = RecolectorService();

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final recolectorId = authService.getCurrentUserId() ?? '';

    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Historial'),
            automaticallyImplyLeading: false,
          ),
          body: FutureBuilder<List<RutaRecoleccion>>(
            future: _recolectorService.getHistorial(recolectorId, limit: 50),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              if (snapshot.hasError) {
                return Center(child: Text('Error: ${snapshot.error}'));
              }

              final rutas = snapshot.data ?? [];

              if (rutas.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.history, size: 80, color: Colors.grey[300]),
                      const SizedBox(height: 16),
                      Text(
                        'No hay historial',
                        style: TextStyle(
                          fontSize: helper.getFontSize(18),
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
                itemBuilder: (context, index) {
                  return _buildHistorialCard(rutas[index], helper);
                },
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildHistorialCard(RutaRecoleccion ruta, ResponsiveHelper helper) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppTheme.successColor.withOpacity(0.2),
          child: const Icon(Icons.check_circle, color: AppTheme.successColor),
        ),
        title: Text(
          'Ruta ${ruta.numeroRuta}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Zona: ${ZonasRecoleccion.getNombre(ruta.zona)}'),
            Text('Puntos: ${ruta.puntosCompletados}/${ruta.totalPuntos}'),
            if (ruta.fechaCompletado != null)
              Text(_formatFecha(ruta.fechaCompletado!)),
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppTheme.successColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Text(
            '100%',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: AppTheme.successColor,
            ),
          ),
        ),
        onTap: () => _verDetalleRuta(ruta),
      ),
    );
  }

  void _verDetalleRuta(RutaRecoleccion ruta) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Ruta ${ruta.numeroRuta}'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildInfoRow('Zona:', ZonasRecoleccion.getNombre(ruta.zona)),
              _buildInfoRow('Estado:', ruta.getEstadoTexto()),
              _buildInfoRow('Puntos:', '${ruta.puntosCompletados}/${ruta.totalPuntos}'),
              if (ruta.fechaCompletado != null)
                _buildInfoRow('Completado:', _formatFecha(ruta.fechaCompletado!)),
              const SizedBox(height: 16),
              const Text('Puntos recolectados:',
                style: TextStyle(fontWeight: FontWeight.bold)),
              ...ruta.puntos.where((p) => p.recolectado).map((punto) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, size: 16, color: AppTheme.successColor),
                    const SizedBox(width: 8),
                    Expanded(child: Text(punto.clienteNombre)),
                  ],
                ),
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

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  String _formatFecha(DateTime fecha) {
    return '${fecha.day}/${fecha.month}/${fecha.year}';
  }
}
// lib/screens/recolector/recolector_rutas_screen.dart
/// 📍 PANTALLA DE RUTAS DEL RECOLECTOR
/// Ver y gestionar rutas de recolección asignadas
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/recolector_service.dart';
import '../../models/recolector_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';
import 'recolector_puntos_screen.dart';

class RecolectorRutasScreen extends StatefulWidget {
  const RecolectorRutasScreen({super.key});

  @override
  State<RecolectorRutasScreen> createState() => _RecolectorRutasScreenState();
}

class _RecolectorRutasScreenState extends State<RecolectorRutasScreen> {
  final RecolectorService _recolectorService = RecolectorService();

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final recolectorId = authService.getCurrentUserId() ?? '';

    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Mis Rutas'),
            automaticallyImplyLeading: false,
          ),
          body: Column(
            children: [
              _buildEstadisticas(recolectorId, helper),
              Expanded(
                child: _buildRutasList(recolectorId, helper),
              ),
            ],
          ),
        );
      },
    );
  }

  // ==================== ESTADÍSTICAS ====================
  Widget _buildEstadisticas(String recolectorId, ResponsiveHelper helper) {
    return FutureBuilder<EstadisticasRecolector>(
      future: _recolectorService.getEstadisticas(recolectorId),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const SizedBox.shrink();

        final stats = snapshot.data!;

        return Container(
          padding: helper.screenPadding,
          decoration: BoxDecoration(
            color: AppTheme.recolectorColor.withOpacity(0.1),
            border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
          ),
          child: GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: helper.isPhone ? 2 : 4,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: helper.isPhone ? 2.5 : 3.0,
            children: [
              _buildStatCard('Activas', stats.rutasEnProceso.toString(), 
                Icons.local_shipping, AppTheme.recolectorColor, helper),
              _buildStatCard('Completadas Hoy', stats.rutasCompletadasHoy.toString(), 
                Icons.check_circle, AppTheme.successColor, helper),
              _buildStatCard('Puntos Hoy', stats.puntosRecolectadosHoy.toString(), 
                Icons.location_on, AppTheme.infoColor, helper),
              _buildStatCard('Paquetes Hoy', stats.paquetesRecolectadosHoy.toString(), 
                Icons.inventory, AppTheme.warningColor, helper),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color, ResponsiveHelper helper) {
    return Container(
      padding: EdgeInsets.all(helper.responsiveValue(phone: 8, tablet: 12, desktop: 16)),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 24, color: color),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: helper.getFontSize(18), 
            fontWeight: FontWeight.bold, color: color)),
          Text(label, style: TextStyle(fontSize: helper.getFontSize(10), 
            color: Colors.grey[600]), textAlign: TextAlign.center, 
            maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }

  // ==================== LISTA DE RUTAS ====================
  Widget _buildRutasList(String recolectorId, ResponsiveHelper helper) {
    return StreamBuilder<List<RutaRecoleccion>>(
      stream: _recolectorService.getRutasRecolector(recolectorId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(child: Text('Error: ${snapshot.error}'));
        }

        final rutas = snapshot.data ?? [];

        // Filtrar solo rutas activas y asignadas
        final rutasActivas = rutas.where((r) => 
          r.estado == 'asignada' || r.estado == 'en_proceso').toList();

        if (rutasActivas.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.route, size: 80, color: Colors.grey[300]),
                const SizedBox(height: 16),
                Text('No hay rutas asignadas', style: TextStyle(
                  fontSize: helper.getFontSize(18), fontWeight: FontWeight.bold, 
                  color: Colors.grey[600])),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: helper.screenPadding,
          itemCount: rutasActivas.length,
          itemBuilder: (context, index) {
            return _buildRutaCard(rutasActivas[index], helper);
          },
        );
      },
    );
  }

  // ==================== CARD DE RUTA ====================
  Widget _buildRutaCard(RutaRecoleccion ruta, ResponsiveHelper helper) {
    final color = _getEstadoColor(ruta.estado);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _abrirRuta(ruta),
        child: Padding(
          padding: EdgeInsets.all(helper.responsiveValue(phone: 12, tablet: 16, desktop: 20)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: color.withOpacity(0.3)),
                    ),
                    child: Text(
                      'Ruta ${ruta.numeroRuta}',
                      style: TextStyle(
                        fontSize: helper.getFontSize(12),
                        fontWeight: FontWeight.bold,
                        color: color,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      ruta.getEstadoTexto(),
                      style: TextStyle(
                        fontSize: helper.getFontSize(12),
                        fontWeight: FontWeight.bold,
                        color: color,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Zona
              Row(
                children: [
                  Icon(Icons.location_city, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 8),
                  Text(
                    'Zona: ${ZonasRecoleccion.getNombre(ruta.zona)}',
                    style: TextStyle(fontSize: helper.getFontSize(14), color: Colors.grey[700]),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Progreso
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Progreso', style: TextStyle(
                        fontSize: helper.getFontSize(12), color: Colors.grey[600])),
                      Text(
                        '${ruta.puntosCompletados} / ${ruta.totalPuntos} puntos',
                        style: TextStyle(
                          fontSize: helper.getFontSize(12),
                          fontWeight: FontWeight.bold,
                          color: AppTheme.recolectorColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: ruta.progresoRecoleccion,
                    backgroundColor: Colors.grey[200],
                    valueColor: AlwaysStoppedAnimation<Color>(
                      ruta.progresoRecoleccion == 1.0 
                        ? AppTheme.successColor 
                        : AppTheme.recolectorColor,
                    ),
                    minHeight: 8,
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Botón de acción
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    if (ruta.estado == 'asignada') {
                      _iniciarRuta(ruta);
                    } else {
                      _abrirRuta(ruta);
                    }
                  },
                  icon: Icon(ruta.estado == 'asignada' ? Icons.play_arrow : Icons.arrow_forward),
                  label: Text(ruta.estado == 'asignada' ? 'Iniciar Ruta' : 'Ver Puntos'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ruta.estado == 'asignada' 
                      ? AppTheme.successColor 
                      : AppTheme.recolectorColor,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ==================== ACCIONES ====================

  Future<void> _iniciarRuta(RutaRecoleccion ruta) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Iniciar Ruta'),
        content: Text('¿Iniciar ruta ${ruta.numeroRuta}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Iniciar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      bool success = await _recolectorService.iniciarRuta(ruta.id);

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Ruta iniciada'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        _abrirRuta(ruta);
      }
    }
  }

  void _abrirRuta(RutaRecoleccion ruta) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => RecolectorPuntosScreen(rutaId: ruta.id),
      ),
    );
  }

  // ==================== HELPERS ====================

  Color _getEstadoColor(String estado) {
    switch (estado) {
      case 'completada': return AppTheme.successColor;
      case 'en_proceso': return AppTheme.warningColor;
      case 'cancelada': return AppTheme.errorColor;
      default: return AppTheme.recolectorColor;
    }
  }
}
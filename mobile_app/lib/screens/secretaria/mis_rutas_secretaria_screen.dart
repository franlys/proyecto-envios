// lib/screens/secretaria/mis_rutas_secretaria_screen.dart
import 'package:flutter/material.dart';
import '../../models/ruta.dart';
import '../../services/api_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/role_colors.dart';
import '../../widgets/common/custom_card.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/loading_overlay.dart';
import 'detalle_ruta_secretaria_screen.dart';
import '../../core/theme/animations.dart';

class MisRutasSecretariaScreen extends StatefulWidget {
  const MisRutasSecretariaScreen({super.key});

  @override
  State<MisRutasSecretariaScreen> createState() => _MisRutasSecretariaScreenState();
}

class _MisRutasSecretariaScreenState extends State<MisRutasSecretariaScreen> {
  final ApiService _apiService = ApiService();
  List<Ruta> _rutas = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _cargarRutas();
  }

  Future<void> _cargarRutas() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final rutas = await _apiService.getRutasSecretaria();
      if (mounted) {
        setState(() {
          _rutas = rutas;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al cargar rutas: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return LoadingOverlay(
      isLoading: _isLoading,
      child: Column(
        children: [
          // 1. Custom Header
          _buildHeader(),

          // 2. Content
          Expanded(
            child: RefreshIndicator(
              onRefresh: _cargarRutas,
              child: _rutas.isEmpty
                  ? EmptyStates.noData(
                      title: 'Sin rutas pendientes',
                      message: 'No hay rutas activas o por liquidar en este momento.',
                      icon: Icons.assignment_turned_in_outlined,
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _rutas.length,
                      itemBuilder: (context, index) {
                        return AnimatedCard(
                          delay: Duration(milliseconds: index * 50),
                          child: _buildRutaCard(_rutas[index]),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Gestión de Rutas',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: AppTheme.secretariaColor,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.filter_list, color: AppTheme.secretariaColor),
            onPressed: () {
              // TODO: Implementar filtros
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Filtros próximamente')),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildRutaCard(Ruta ruta) {
    final bool esFinalizada = ruta.estado == 'finalizada';
    final roleColor = AppTheme.secretariaColor;
    
    return CustomCard(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => DetalleRutaSecretariaScreen(rutaId: ruta.id),
          ),
        ).then((_) => _cargarRutas());
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: roleColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(Icons.local_shipping, color: roleColor),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Ruta #${ruta.id.substring(0, 8)}',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            _formatearFecha(ruta.fechaInicio),
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              _buildEstadoChip(ruta.estado),
            ],
          ),
          const SizedBox(height: 16),
          _buildInfoRow(Icons.person, 'Repartidor', 'ID: ${ruta.repartidorId}'), // Idealmente nombre
          const SizedBox(height: 8),
          _buildInfoRow(Icons.receipt_long, 'Facturas', '${ruta.facturas.length} asignadas'),
          
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: esFinalizada
                ? ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => DetalleRutaSecretariaScreen(rutaId: ruta.id),
                        ),
                      ).then((_) => _cargarRutas());
                    },
                    icon: const Icon(Icons.verified_user, size: 18),
                    label: const Text('AUDITAR Y LIQUIDAR'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: roleColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  )
                : OutlinedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => DetalleRutaSecretariaScreen(rutaId: ruta.id),
                        ),
                      ).then((_) => _cargarRutas());
                    },
                    icon: const Icon(Icons.visibility, size: 18),
                    label: const Text('VER DETALLES'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: roleColor,
                      side: BorderSide(color: roleColor),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey[600]),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: TextStyle(
            color: Colors.grey[700],
            fontWeight: FontWeight.w500,
            fontSize: 14,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildEstadoChip(String estado) {
    Color color;
    String texto;
    IconData icon;

    switch (estado.toLowerCase()) {
      case 'finalizada':
        color = Colors.orange;
        texto = 'POR LIQUIDAR';
        icon = Icons.pending_actions;
        break;
      case 'liquidada':
        color = Colors.green;
        texto = 'LIQUIDADA';
        icon = Icons.check_circle;
        break;
      case 'en_curso':
        color = Colors.blue;
        texto = 'EN RUTA';
        icon = Icons.local_shipping;
        break;
      default:
        color = Colors.grey;
        texto = estado.toUpperCase();
        icon = Icons.info;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            texto,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }

  String _formatearFecha(DateTime? fecha) {
    if (fecha == null) return 'N/A';
    return '${fecha.day}/${fecha.month}/${fecha.year}';
  }
}

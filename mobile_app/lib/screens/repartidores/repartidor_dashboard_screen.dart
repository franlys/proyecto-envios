// lib/screens/repartidores/repartidor_dashboard_screen.dart
/// 🚚 DASHBOARD DE REPARTIDOR
/// Pantalla principal para choferes con resumen de rutas y accesos rápidos

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/api_service.dart';
import '../../models/ruta.dart';
import '../../core/theme/role_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/common/custom_card.dart';
import '../../widgets/common/loading_overlay.dart';
import '../../widgets/common/empty_state.dart';
import 'detalle_ruta_screen.dart';
import 'mis_rutas_screen.dart';

class RepartidorDashboardScreen extends StatefulWidget {
  const RepartidorDashboardScreen({super.key});

  @override
  State<RepartidorDashboardScreen> createState() => _RepartidorDashboardScreenState();
}

class _RepartidorDashboardScreenState extends State<RepartidorDashboardScreen> {
  final ApiService _apiService = ApiService();
  List<Ruta> _rutasActivas = [];
  bool _isLoading = true;
  int _rutasCompletadasHoy = 0; // Simulado por ahora, idealmente vendría del backend

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final empleadoId = authService.getCurrentUserId();

      if (empleadoId != null) {
        final rutas = await _apiService.getRutasEmpleado(empleadoId);
        
        if (mounted) {
          setState(() {
            // Filtrar solo rutas activas (pendiente o en_proceso)
            _rutasActivas = rutas.where((r) => r.estado != 'completada').toList();
            
            // Calcular completadas (simulado: rutas completadas en la lista total)
            _rutasCompletadasHoy = rutas.where((r) => r.estado == 'completada').length;
            
            _isLoading = false;
          });
        }
      } else {
        if (mounted) setState(() => _isLoading = false);
      }
    } catch (e) {
      print('ERROR al cargar dashboard repartidor: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final roleColor = RoleColors.getPrimaryColor(authService.getUserRole());

    return LoadingOverlay(
      isLoading: _isLoading,
      child: RefreshIndicator(
        onRefresh: _cargarDatos,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Header de Bienvenida
              _buildWelcomeHeader(authService, roleColor),
              
              const SizedBox(height: 24),
              
              // 2. Resumen de Estadísticas
              Row(
                children: [
                  Expanded(
                    child: StatCard(
                      title: 'Rutas Activas',
                      value: _rutasActivas.length.toString(),
                      icon: Icons.local_shipping,
                      color: roleColor,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const MisRutasScreen()),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: StatCard(
                      title: 'Completadas',
                      value: _rutasCompletadasHoy.toString(),
                      icon: Icons.check_circle,
                      color: Colors.green,
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 24),
              
              // 3. Título de Sección
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Rutas en Curso',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const MisRutasScreen()),
                      );
                    },
                    child: Text('Ver Todas', style: TextStyle(color: roleColor)),
                  ),
                ],
              ),
              
              const SizedBox(height: 8),
              
              // 4. Lista de Rutas Activas
              if (_rutasActivas.isEmpty)
                EmptyStates.noData(
                  title: 'Sin rutas activas',
                  message: 'No tienes rutas asignadas en este momento.',
                  onRefresh: _cargarDatos,
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _rutasActivas.length,
                  itemBuilder: (context, index) {
                    return _buildRutaCard(_rutasActivas[index], roleColor);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWelcomeHeader(AuthService authService, Color roleColor) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [roleColor, roleColor.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: roleColor.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: Colors.white.withOpacity(0.2),
            child: const Icon(Icons.person, size: 36, color: Colors.white),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Bienvenido de nuevo,',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                ),
                Text(
                  authService.getEmpleadoNombre() ?? 'Conductor',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRutaCard(Ruta ruta, Color roleColor) {
    return CustomCard(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => DetalleRutaScreen(rutaId: ruta.id),
          ),
        ).then((_) => _cargarDatos());
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  ruta.nombre,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getEstadoColor(ruta.estado).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  ruta.getEstadoTexto(),
                  style: TextStyle(
                    color: _getEstadoColor(ruta.estado),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.location_on, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 4),
              Text(
                '${ruta.facturasEntregadas} / ${ruta.totalFacturas} entregas',
                style: TextStyle(color: Colors.grey[700]),
              ),
              const Spacer(),
              Icon(Icons.attach_money, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 4),
              Text(
                'RD\$${ruta.getBalance().toStringAsFixed(0)}',
                style: TextStyle(
                  color: ruta.getBalance() >= 0 ? Colors.green : Colors.red,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: ruta.getProgreso() / 100,
              backgroundColor: Colors.grey[100],
              valueColor: AlwaysStoppedAnimation<Color>(roleColor),
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }

  Color _getEstadoColor(String estado) {
    switch (estado) {
      case 'pendiente': return Colors.orange;
      case 'en_proceso': return Colors.blue;
      case 'completada': return Colors.green;
      default: return Colors.grey;
    }
  }
}

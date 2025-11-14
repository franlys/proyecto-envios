import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../models/ruta.dart';
import 'detalle_ruta_screen.dart';
import 'historial_rutas_screen.dart';  // ← NUEVO

class MisRutasScreen extends StatefulWidget {
  const MisRutasScreen({super.key});

  @override
  State<MisRutasScreen> createState() => _MisRutasScreenState();
}

class _MisRutasScreenState extends State<MisRutasScreen> {
  final ApiService _apiService = ApiService();
  List<Ruta> _rutas = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _cargarRutas();
  }

  Future<void> _cargarRutas() async {
    setState(() => _isLoading = true);

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final empleadoId = authService.getCurrentUserId();

      if (empleadoId != null) {
        final rutas = await _apiService.getRutasEmpleado(empleadoId);
        setState(() {
          // ← FILTRAR: Solo rutas activas (pendiente o en_proceso)
          _rutas = rutas.where((r) => r.estado != 'completada').toList();
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      print('ERROR al cargar rutas: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _cerrarSesion() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    await authService.signOut();
  }

  // ← NUEVO: Navegar al historial
  void _verHistorial() {
    final authService = Provider.of<AuthService>(context, listen: false);
    final empleadoId = authService.getCurrentUserId();
    
    if (empleadoId != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => HistorialRutasScreen(empleadoId: empleadoId),
        ),
      );
    }
  }

  Color _getEstadoColor(String estado) {
    switch (estado) {
      case 'pendiente':
        return Colors.orange;
      case 'en_proceso':
        return Colors.blue;
      case 'completada':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final nombreEmpleado = authService.getEmpleadoNombre() ?? 'Repartidor';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis Rutas'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          // ← NUEVO: Botón de historial
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: _verHistorial,
            tooltip: 'Historial',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarRutas,
            tooltip: 'Actualizar',
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Cerrar Sesión'),
                  content: const Text('¿Estás seguro que deseas cerrar sesión?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Cancelar'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('Cerrar Sesión'),
                    ),
                  ],
                ),
              );

              if (confirm == true) {
                _cerrarSesion();
              }
            },
            tooltip: 'Cerrar Sesión',
          ),
        ],
      ),
      body: Column(
        children: [
          // Header con info del empleado
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: Colors.blue[50],
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '¡Hola, $nombreEmpleado!',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Tienes ${_rutas.length} rutas activas',  // ← CAMBIADO: "activas" en lugar de "asignadas"
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),

          // Lista de rutas
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _rutas.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.inbox_outlined,
                              size: 64,
                              color: Colors.grey[400],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No tienes rutas activas',  // ← CAMBIADO
                              style: TextStyle(
                                fontSize: 16,
                                color: Colors.grey[600],
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextButton.icon(
                              onPressed: _verHistorial,
                              icon: const Icon(Icons.history),
                              label: const Text('Ver Historial'),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _cargarRutas,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _rutas.length,
                          itemBuilder: (context, index) {
                            final ruta = _rutas[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 16),
                              child: InkWell(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => DetalleRutaScreen(ruta: ruta),
                                    ),
                                  ).then((_) => _cargarRutas());
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            ruta.nombre,
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 12,
                                              vertical: 6,
                                            ),
                                            decoration: BoxDecoration(
                                              color: _getEstadoColor(ruta.estado).withOpacity(0.2),
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                            child: Text(
                                              ruta.getEstadoTexto(),
                                              style: TextStyle(
                                                color: _getEstadoColor(ruta.estado),
                                                fontWeight: FontWeight.bold,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      Row(
                                        children: [
                                          const Icon(Icons.list_alt, size: 20),
                                          const SizedBox(width: 8),
                                          Text(
                                            '${ruta.facturasEntregadas} / ${ruta.totalFacturas} entregas',
                                            style: const TextStyle(fontSize: 14),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(4),
                                        child: LinearProgressIndicator(
                                          value: ruta.getProgreso() / 100,
                                          backgroundColor: Colors.grey[200],
                                          valueColor: AlwaysStoppedAnimation<Color>(
                                            _getEstadoColor(ruta.estado),
                                          ),
                                          minHeight: 8,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          const Icon(Icons.attach_money, size: 20),
                                          const SizedBox(width: 8),
                                          Text(
                                            'Gastos: \$${ruta.totalGastos.toStringAsFixed(2)}',
                                            style: const TextStyle(fontSize: 14),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          const Icon(Icons.account_balance_wallet, size: 20, color: Colors.blue),
                                          const SizedBox(width: 8),
                                          Text(
                                            'Asignado: \$${ruta.montoAsignado.toStringAsFixed(2)}',
                                            style: const TextStyle(fontSize: 14),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          Icon(
                                            ruta.tieneBalancePositivo() ? Icons.trending_up : Icons.trending_down,
                                            size: 20,
                                            color: ruta.tieneBalancePositivo() ? Colors.green : Colors.red,
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            ruta.getBalanceTexto(),
                                            style: TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.bold,
                                              color: ruta.tieneBalancePositivo() ? Colors.green : Colors.red,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
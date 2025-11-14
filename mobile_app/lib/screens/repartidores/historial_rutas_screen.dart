import 'package:flutter/material.dart';
import '../models/ruta.dart';
import '../services/api_service.dart';
import 'detalle_ruta_screen.dart';

class HistorialRutasScreen extends StatefulWidget {
  final String empleadoId;

  const HistorialRutasScreen({super.key, required this.empleadoId});

  @override
  State<HistorialRutasScreen> createState() => _HistorialRutasScreenState();
}

class _HistorialRutasScreenState extends State<HistorialRutasScreen> {
  final ApiService _apiService = ApiService();
  List<Ruta> _rutasCompletadas = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _cargarHistorial();
  }

  Future<void> _cargarHistorial() async {
    setState(() => _isLoading = true);

    try {
      final rutas = await _apiService.getRutasEmpleado(widget.empleadoId);
      setState(() {
        // Solo rutas completadas, ordenadas por fecha más reciente
        _rutasCompletadas = rutas
            .where((r) => r.estado == 'completada')
            .toList()
          ..sort((a, b) => (b.fechaActualizacion ?? DateTime.now())
              .compareTo(a.fechaActualizacion ?? DateTime.now()));
        _isLoading = false;
      });
    } catch (e) {
      print('Error al cargar historial: $e');
      setState(() => _isLoading = false);
    }
  }

  Color _getBalanceColor(double balance) {
    return balance >= 0 ? Colors.green : Colors.red;
  }

  String _formatearFecha(DateTime? fecha) {
    if (fecha == null) return 'Sin fecha';
    return '${fecha.day.toString().padLeft(2, '0')}/${fecha.month.toString().padLeft(2, '0')}/${fecha.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Historial de Rutas'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarHistorial,
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _rutasCompletadas.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.history,
                        size: 64,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No hay rutas completadas',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _cargarHistorial,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _rutasCompletadas.length,
                    itemBuilder: (context, index) {
                      final ruta = _rutasCompletadas[index];
                      final balance = ruta.getBalance();

                      return Card(
                        margin: const EdgeInsets.only(bottom: 16),
                        child: InkWell(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => DetalleRutaScreen(ruta: ruta),
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Nombre y estado
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
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 6,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.green.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: const Text(
                                        'Completada',
                                        style: TextStyle(
                                          color: Colors.green,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),

                                // Fecha
                                Row(
                                  children: [
                                    const Icon(Icons.calendar_today, size: 18, color: Colors.grey),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Completada: ${_formatearFecha(ruta.fechaActualizacion)}',
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: Colors.grey[600],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),

                                // Entregas
                                Row(
                                  children: [
                                    const Icon(Icons.check_circle, size: 18, color: Colors.grey),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Entregas: ${ruta.facturasEntregadas}/${ruta.totalFacturas}',
                                      style: const TextStyle(fontSize: 14),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),

                                // Porcentaje
                                Row(
                                  children: [
                                    Expanded(
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(4),
                                        child: LinearProgressIndicator(
                                          value: ruta.getProgreso() / 100,
                                          backgroundColor: Colors.grey[200],
                                          valueColor: const AlwaysStoppedAnimation<Color>(Colors.green),
                                          minHeight: 6,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '${ruta.getProgreso().toInt()}%',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),

                                // Financiero
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.grey[100],
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Column(
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text('Monto asignado:', style: TextStyle(fontSize: 13)),
                                          Text(
                                            '\$${ruta.montoAsignado.toStringAsFixed(2)}',
                                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text('Total gastos:', style: TextStyle(fontSize: 13)),
                                          Text(
                                            '\$${ruta.totalGastos.toStringAsFixed(2)}',
                                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                          ),
                                        ],
                                      ),
                                      const Divider(height: 16),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Row(
                                            children: [
                                              Icon(
                                                balance >= 0 ? Icons.trending_up : Icons.trending_down,
                                                size: 18,
                                                color: _getBalanceColor(balance),
                                              ),
                                              const SizedBox(width: 4),
                                              const Text(
                                                'Balance:',
                                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                              ),
                                            ],
                                          ),
                                          Text(
                                            balance >= 0
                                                ? '+\$${balance.toStringAsFixed(2)}'
                                                : '-\$${balance.abs().toStringAsFixed(2)}',
                                            style: TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.bold,
                                              color: _getBalanceColor(balance),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
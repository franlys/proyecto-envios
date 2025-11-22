// lib/screens/cargadores/mis_rutas_cargador_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/api_service.dart';
import '../../models/ruta.dart';
import 'checklist_carga_screen.dart';

class MisRutasCargadorScreen extends StatefulWidget {
  const MisRutasCargadorScreen({Key? key}) : super(key: key);

  @override
  State<MisRutasCargadorScreen> createState() => _MisRutasCargadorScreenState();
}

class _MisRutasCargadorScreenState extends State<MisRutasCargadorScreen> {
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
      final rutas = await _apiService.getRutasCargador().timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw Exception('La conexión tardó demasiado. Verifica tu internet.');
        },
      );

      if (!mounted) return;
      setState(() {
        // Filtrar solo rutas pendientes o en carga
        _rutas = rutas.where((r) =>
          r.estado == 'pendiente' || r.estado == 'en_carga'
        ).toList();
        _isLoading = false;
      });
    } catch (e) {
      print('Error al cargar rutas: $e');
      if (!mounted) return;
      setState(() => _isLoading = false);
      _mostrarSnackBar('Error al cargar rutas: ${e.toString()}', esError: true);
    }
  }

  Future<void> _cerrarSesion() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    await authService.signOut();
  }

  void _mostrarSnackBar(String mensaje, {bool esError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(mensaje),
        backgroundColor: esError ? Colors.red : Colors.green,
        duration: Duration(seconds: 3),
      ),
    );
  }

  Color _getEstadoColor(String estado) {
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return Colors.orange;
      case 'en_carga':
        return Colors.blue;
      case 'cargada':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final nombreCargador = authService.getEmpleadoNombre() ?? 'Cargador';

    return Scaffold(
      appBar: AppBar(
        title: Text('Mis Rutas - Carga'),
        backgroundColor: Colors.teal,
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _cargarRutas,
            tooltip: 'Actualizar',
          ),
          IconButton(
            icon: Icon(Icons.logout),
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: Text('Cerrar Sesión'),
                  content: Text('¿Estás seguro que deseas cerrar sesión?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: Text('Cancelar'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: Text('Cerrar Sesión'),
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
          // Header
          Container(
            width: double.infinity,
            padding: EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.teal, Colors.teal[700]!],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.local_shipping, color: Colors.white, size: 32),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '¡Hola, $nombreCargador!',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Tienes ${_rutas.length} ruta${_rutas.length != 1 ? "s" : ""} pendiente${_rutas.length != 1 ? "s" : ""} de carga',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.white70,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Lista de rutas
          Expanded(
            child: _isLoading
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(color: Colors.teal),
                        SizedBox(height: 16),
                        Text(
                          'Cargando rutas...',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  )
                : _rutas.isEmpty
                    ? RefreshIndicator(
                        onRefresh: _cargarRutas,
                        color: Colors.teal,
                        child: SingleChildScrollView(
                          physics: AlwaysScrollableScrollPhysics(),
                          child: Container(
                            height: MediaQuery.of(context).size.height * 0.6,
                            child: Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: EdgeInsets.all(24),
                                    decoration: BoxDecoration(
                                      color: Colors.teal.withOpacity(0.1),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(
                                      Icons.local_shipping_outlined,
                                      size: 80,
                                      color: Colors.teal,
                                    ),
                                  ),
                                  SizedBox(height: 32),
                                  Text(
                                    '¡Bienvenido, Cargador!',
                                    style: TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.grey[800],
                                    ),
                                  ),
                                  SizedBox(height: 12),
                                  Padding(
                                    padding: EdgeInsets.symmetric(horizontal: 40),
                                    child: Text(
                                      'No tienes rutas asignadas en este momento.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 16,
                                        color: Colors.grey[600],
                                      ),
                                    ),
                                  ),
                                  SizedBox(height: 8),
                                  Padding(
                                    padding: EdgeInsets.symmetric(horizontal: 40),
                                    child: Text(
                                      'Las rutas aparecerán aquí cuando te sean asignadas para cargar.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: Colors.grey[500],
                                      ),
                                    ),
                                  ),
                                  SizedBox(height: 32),
                                  ElevatedButton.icon(
                                    onPressed: _cargarRutas,
                                    icon: Icon(Icons.refresh),
                                    label: Text('Actualizar'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.teal,
                                      padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _cargarRutas,
                        child: ListView.builder(
                          padding: EdgeInsets.all(16),
                          itemCount: _rutas.length,
                          itemBuilder: (context, index) {
                            final ruta = _rutas[index];
                            return _buildRutaCard(ruta);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildRutaCard(Ruta ruta) {
    final totalItems = ruta.facturas.fold<int>(
      0,
      (sum, factura) => sum + factura.itemsTotal,
    );
    final itemsCargados = ruta.facturas.fold<int>(
      0,
      (sum, factura) => sum + factura.itemsEntregados, // Reutilizamos este campo para items cargados
    );
    final progreso = totalItems > 0 ? (itemsCargados / totalItems) * 100 : 0.0;

    return Card(
      margin: EdgeInsets.only(bottom: 16),
      elevation: 2,
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ChecklistCargaScreen(rutaId: ruta.id),
            ),
          ).then((_) => _cargarRutas());
        },
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          ruta.nombre,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Ruta #${ruta.id.substring(0, 8).toUpperCase()}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Chip(
                    label: Text(
                      ruta.getEstadoTexto(),
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                    backgroundColor: _getEstadoColor(ruta.estado),
                  ),
                ],
              ),
              SizedBox(height: 16),
              Row(
                children: [
                  Icon(Icons.inventory_2, size: 20, color: Colors.teal),
                  SizedBox(width: 8),
                  Text(
                    '$itemsCargados / $totalItems items cargados',
                    style: TextStyle(fontSize: 14),
                  ),
                ],
              ),
              SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progreso / 100,
                  minHeight: 8,
                  backgroundColor: Colors.grey[200],
                  valueColor: AlwaysStoppedAnimation<Color>(
                    progreso >= 100 ? Colors.green : Colors.teal,
                  ),
                ),
              ),
              SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.description, size: 20, color: Colors.grey[600]),
                  SizedBox(width: 8),
                  Text(
                    '${ruta.totalFacturas} factura${ruta.totalFacturas != 1 ? "s" : ""}',
                    style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                  ),
                ],
              ),
              if (ruta.cargadoresIds != null && ruta.cargadoresIds!.isNotEmpty) ...[
                SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.people, size: 20, color: Colors.grey[600]),
                    SizedBox(width: 8),
                    Text(
                      '${ruta.cargadoresIds!.length} cargador${ruta.cargadoresIds!.length != 1 ? "es" : ""}',
                      style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

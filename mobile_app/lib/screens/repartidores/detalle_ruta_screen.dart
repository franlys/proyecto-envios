import 'package:flutter/material.dart';
import '../../models/ruta.dart';
import '../../models/factura.dart';
import '../../services/api_service.dart';
import 'gastos_screen.dart';

class DetalleRutaScreen extends StatefulWidget {
  final Ruta ruta;

  const DetalleRutaScreen({super.key, required this.ruta});

  @override
  State<DetalleRutaScreen> createState() => _DetalleRutaScreenState();
}

class _DetalleRutaScreenState extends State<DetalleRutaScreen> {
  final ApiService _apiService = ApiService();
  List<Factura> _facturas = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _cargarFacturas();
  }

  Future<void> _cargarFacturas() async {
    setState(() => _isLoading = true);

    try {
      final facturas = await _apiService.getFacturasRuta(widget.ruta.id);
      setState(() {
        _facturas = facturas;
        _isLoading = false;
      });
    } catch (e) {
      print('Error al cargar facturas: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _marcarEntregada(Factura factura) async {
    final observaciones = await showDialog<String>(
      context: context,
      builder: (context) {
        final controller = TextEditingController();
        return AlertDialog(
          title: const Text('Marcar como Entregada'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Factura: ${factura.numeroFactura}'),
              Text('Cliente: ${factura.clienteNombre}'),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  labelText: 'Observaciones (opcional)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, controller.text),
              child: const Text('Confirmar'),
            ),
          ],
        );
      },
    );

    if (observaciones != null) {
      final success = await _apiService.marcarFacturaEntregada(
        factura.id,
        observaciones.isEmpty ? null : observaciones,
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Entrega marcada exitosamente'),
            backgroundColor: Colors.green,
          ),
        );
        _cargarFacturas();
      }
    }
  }

  Future<void> _marcarNoEntregada(Factura factura) async {
    final motivo = await showDialog<String>(
      context: context,
      builder: (context) {
        final controller = TextEditingController();
        return AlertDialog(
          title: const Text('Marcar como No Entregada'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Factura: ${factura.numeroFactura}'),
              Text('Cliente: ${factura.clienteNombre}'),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  labelText: 'Motivo (obligatorio)',
                  border: OutlineInputBorder(),
                  hintText: 'Cliente no encontrado, dirección incorrecta, etc.',
                ),
                maxLines: 3,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () {
                if (controller.text.isNotEmpty) {
                  Navigator.pop(context, controller.text);
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              child: const Text('Confirmar'),
            ),
          ],
        );
      },
    );

    if (motivo != null && motivo.isNotEmpty) {
      final success = await _apiService.marcarFacturaNoEntregada(
        factura.id,
        motivo,
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Marcada como no entregada'),
            backgroundColor: Colors.orange,
          ),
        );
        _cargarFacturas();
      }
    }
  }

  Color _getEstadoColor(String estado) {
    switch (estado) {
      case 'pendiente':
      case 'asignada':  // ← AGREGADO
        return Colors.orange;
      case 'entregado':
        return Colors.green;
      case 'no_entregado':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.ruta.nombre),  // ← CAMBIADO: Muestra el nombre en lugar del ID
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarFacturas,
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: Column(
        children: [
          // Información de la ruta
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: Colors.blue[50],
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      widget.ruta.getEstadoTexto(),
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: _getEstadoColor(widget.ruta.estado),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.blue,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${widget.ruta.facturasEntregadas}/${widget.ruta.totalFacturas}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: widget.ruta.getProgreso() / 100,
                    backgroundColor: Colors.grey[300],
                    valueColor: AlwaysStoppedAnimation<Color>(
                      _getEstadoColor(widget.ruta.estado),
                    ),
                    minHeight: 8,
                  ),
                ),
              ],
            ),
          ),

          // Lista de facturas
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _facturas.isEmpty
                    ? const Center(child: Text('No hay facturas en esta ruta'))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _facturas.length,
                        itemBuilder: (context, index) {
                          final factura = _facturas[index];
                          final isEntregada = factura.estado == 'entregado';
                          final isPendiente = (factura.estado == 'pendiente' || factura.estado == 'asignado');  // ← CAMBIADO

                          return Card(
                            margin: const EdgeInsets.only(bottom: 16),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Header
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              factura.numeroFactura,
                                              style: const TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            Text(
                                              factura.clienteNombre,
                                              style: const TextStyle(
                                                fontSize: 14,
                                                color: Colors.grey,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 12,
                                          vertical: 6,
                                        ),
                                        decoration: BoxDecoration(
                                          color: _getEstadoColor(factura.estado).withOpacity(0.2),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Text(
                                          factura.getEstadoTexto(),
                                          style: TextStyle(
                                            color: _getEstadoColor(factura.estado),
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const Divider(height: 24),

                                  // Información
                                  Row(
                                    children: [
                                      const Icon(Icons.location_on, size: 18, color: Colors.grey),
                                      const SizedBox(width: 8),
                                      Expanded(child: Text(factura.direccion)),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      const Icon(Icons.phone, size: 18, color: Colors.grey),
                                      const SizedBox(width: 8),
                                      Text(factura.telefono),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      const Icon(Icons.attach_money, size: 18, color: Colors.grey),
                                      const SizedBox(width: 8),
                                      Text(
                                        '\$${factura.monto.toStringAsFixed(2)}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),

                                  // Botones de acción (solo si está pendiente o asignada)
                                  if (isPendiente) ...[
                                    const SizedBox(height: 16),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: OutlinedButton.icon(
                                            onPressed: () => _marcarNoEntregada(factura),
                                            icon: const Icon(Icons.close),
                                            label: const Text('No Entregada'),
                                            style: OutlinedButton.styleFrom(
                                              foregroundColor: Colors.red,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: ElevatedButton.icon(
                                            onPressed: () => _marcarEntregada(factura),
                                            icon: const Icon(Icons.check),
                                            label: const Text('Entregada'),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: Colors.green,
                                              foregroundColor: Colors.white,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],

                                  // Observaciones (si las hay)
                                  if (factura.observaciones != null && factura.observaciones!.isNotEmpty) ...[
                                    const SizedBox(height: 12),
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Colors.grey[100],
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Icon(Icons.note, size: 18, color: Colors.grey),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              factura.observaciones!,
                                              style: const TextStyle(fontSize: 12),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => GastosScreen(ruta: widget.ruta),
            ),
          );
        },
        backgroundColor: Colors.blue,
        icon: const Icon(Icons.attach_money),
        label: const Text('Gastos'),
      ),
    );
  }
}
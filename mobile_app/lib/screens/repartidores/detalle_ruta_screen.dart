// lib/screens/repartidores/detalle_ruta_screen.dart
/// 🚚 PANTALLA DETALLE DE RUTA
/// Muestra facturas, presupuesto y permite gestionar entregas

import 'package:flutter/material.dart';
import '../../models/ruta.dart';
import '../../models/factura.dart';
import '../../services/api_service.dart';
import 'gastos_screen.dart';
import 'detalle_factura_screen.dart';

class DetalleRutaScreen extends StatefulWidget {
  final String rutaId;

  const DetalleRutaScreen({super.key, required this.rutaId});

  @override
  State<DetalleRutaScreen> createState() => _DetalleRutaScreenState();
}

class _DetalleRutaScreenState extends State<DetalleRutaScreen> {
  final ApiService _apiService = ApiService();
  Ruta? _ruta;
  bool _isLoading = true;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _cargarRuta();
  }

  // ==================== CARGAR RUTA ====================

  Future<void> _cargarRuta() async {
    setState(() => _isLoading = true);

    try {
      final ruta = await _apiService.getRutaDetalle(widget.rutaId);
      setState(() {
        _ruta = ruta;
        _isLoading = false;
      });
    } catch (e) {
      print('Error al cargar ruta: $e');
      setState(() => _isLoading = false);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al cargar ruta: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // ==================== INICIAR ENTREGAS ====================

  Future<void> _mostrarConfirmacionIniciarEntregas() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.local_shipping, color: Colors.green),
            SizedBox(width: 8),
            Text('Iniciar Entregas'),
          ],
        ),
        content: Text(
          '¿Iniciar entregas de la ruta "${_ruta?.nombre}"?\n\n'
          'Esto cambiará el estado a "En Entrega".',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text('Iniciar Entregas'),
          ),
        ],
      ),
    );

    if (confirmar == true) {
      await _iniciarEntregas();
    }
  }

  Future<void> _iniciarEntregas() async {
    setState(() => _isProcessing = true);

    try {
      final success = await _apiService.iniciarEntregas(widget.rutaId);

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🚚 Entregas iniciadas'),
            backgroundColor: Colors.green,
          ),
        );
        await _cargarRuta(); // Recargar para ver cambio de estado
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al iniciar entregas: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  // ==================== FINALIZAR RUTA ====================

  Future<void> _mostrarFormularioFinalizarRuta() async {
    final controller = TextEditingController();

    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.purple),
            SizedBox(width: 8),
            Text('Finalizar Ruta'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Confirma que has completado todas las gestiones de entrega posibles.',
              style: TextStyle(fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Notas de finalización (opcional)',
                border: OutlineInputBorder(),
                hintText: 'Ej: Todo entregado sin incidencias',
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.purple),
            child: const Text('Finalizar Ruta'),
          ),
        ],
      ),
    );

    if (confirmar == true) {
      await _finalizarRuta(controller.text);
    }
  }

  Future<void> _finalizarRuta(String? notas) async {
    setState(() => _isProcessing = true);

    try {
      final resultado = await _apiService.finalizarRuta(widget.rutaId, notas);

      if (resultado != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Ruta finalizada'),
            backgroundColor: Colors.purple,
          ),
        );

        // Volver a la pantalla anterior
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al finalizar ruta: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  // ==================== NAVEGACIÓN ====================

  void _abrirPantallaGastos() {
    if (_ruta == null) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => GastosScreen(rutaId: widget.rutaId),
      ),
    ).then((_) => _cargarRuta()); // Recargar al volver
  }

  void _abrirDetalleFactura(Factura factura) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => DetalleFacturaScreen(
          factura: factura,
          rutaId: widget.rutaId,
        ),
      ),
    ).then((_) => _cargarRuta()); // Recargar al volver
  }

  // ==================== BUILD ====================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_ruta?.nombre ?? 'Detalle de Ruta'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarRuta,
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _ruta == null
              ? const Center(child: Text('No se pudo cargar la ruta'))
              : RefreshIndicator(
                  onRefresh: _cargarRuta,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: Column(
                      children: [
                        // Cabecera con info y botones
                        _buildHeader(),

                        // Presupuesto (si existe)
                        if (_ruta!.montoAsignado > 0) _buildPresupuesto(),

                        // Progreso
                        _buildProgreso(),

                        // Lista de facturas
                        _buildListaFacturas(),
                      ],
                    ),
                  ),
                ),
    );
  }

  // ==================== WIDGETS ====================

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.blue[50],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Estado
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Chip(
                label: Text(_ruta!.getEstadoTexto()),
                backgroundColor: _getEstadoBackgroundColor(),
                labelStyle: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                '${_ruta!.facturasEntregadas}/${_ruta!.totalFacturas} facturas',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Botones de acción
          _buildBotonesAccion(),
        ],
      ),
    );
  }

  Widget _buildBotonesAccion() {
    if (_ruta!.estado.toLowerCase() == 'cargada') {
      // Puede iniciar entregas
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: _isProcessing ? null : _mostrarConfirmacionIniciarEntregas,
          icon: _isProcessing
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.play_arrow),
          label: Text(_isProcessing ? 'Iniciando...' : 'Iniciar Entregas'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.green,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 12),
          ),
        ),
      );
    } else if (_ruta!.estado.toLowerCase() == 'en_entrega') {
      // Puede registrar gastos y finalizar
      return Row(
        children: [
          Expanded(
            child: ElevatedButton.icon(
              onPressed: _abrirPantallaGastos,
              icon: const Icon(Icons.attach_money),
              label: const Text('Gastos'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.amber[700],
                foregroundColor: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: _isProcessing ? null : _mostrarFormularioFinalizarRuta,
              icon: const Icon(Icons.check_circle),
              label: const Text('Finalizar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.purple,
                foregroundColor: Colors.white,
              ),
            ),
          ),
        ],
      );
    } else {
      return const SizedBox.shrink();
    }
  }

  Widget _buildPresupuesto() {
    final balance = _ruta!.getBalance();

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.amber[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.amber[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.account_balance_wallet, color: Colors.amber),
              SizedBox(width: 8),
              Text(
                'Presupuesto (RD\$)',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildPresupuestoItem(
                'Asignado',
                'RD\$${_ruta!.montoAsignado.toStringAsFixed(0)}',
                Colors.amber[700]!,
              ),
              _buildPresupuestoItem(
                'Gastado',
                'RD\$${(_ruta!.gastosTotales > 0 ? _ruta!.gastosTotales : _ruta!.totalGastos).toStringAsFixed(0)}',
                Colors.red[700]!,
              ),
              _buildPresupuestoItem(
                'Disponible',
                'RD\$${balance.toStringAsFixed(0)}',
                balance >= 0 ? Colors.green[700]! : Colors.red[700]!,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPresupuestoItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildProgreso() {
    final progreso = _ruta!.getProgreso();

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Progreso de entregas',
                style: TextStyle(fontWeight: FontWeight.w500),
              ),
              Text(
                '${progreso.toStringAsFixed(0)}%',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: progreso / 100,
            backgroundColor: Colors.grey[300],
            valueColor: AlwaysStoppedAnimation<Color>(
              progreso == 100 ? Colors.green : Colors.blue,
            ),
            minHeight: 8,
          ),
        ],
      ),
    );
  }

  Widget _buildListaFacturas() {
    if (_ruta!.facturas.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(32),
        child: Center(
          child: Text('No hay facturas en esta ruta'),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      itemCount: _ruta!.facturas.length,
      itemBuilder: (context, index) {
        final factura = _ruta!.facturas[index];
        return _buildFacturaCard(factura);
      },
    );
  }

  Widget _buildFacturaCard(Factura factura) {
    final color = _getFacturaColor(factura.estado);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _abrirDetalleFactura(factura),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Cabecera
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      factura.codigoTracking,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Chip(
                    label: Text(factura.getEstadoTexto()),
                    backgroundColor: color.withOpacity(0.2),
                    labelStyle: TextStyle(
                      color: color,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),

              const SizedBox(height: 8),

              // Cliente
              Text(
                factura.clienteNombre,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                ),
              ),

              const SizedBox(height: 4),

              // Dirección
              Row(
                children: [
                  const Icon(Icons.location_on, size: 14, color: Colors.grey),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      factura.direccion,
                      style: const TextStyle(
                        color: Colors.grey,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),

              // Items (si existen)
              if (factura.items.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.inventory_2, size: 14, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text(
                      '${factura.itemsEntregados}/${factura.itemsTotal} items',
                      style: const TextStyle(fontSize: 12),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 100,
                      child: LinearProgressIndicator(
                        value: factura.itemsTotal > 0
                            ? factura.itemsEntregados / factura.itemsTotal
                            : 0,
                        backgroundColor: Colors.grey[300],
                        minHeight: 4,
                      ),
                    ),
                  ],
                ),
              ],

              // Indicador de acciones disponibles
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.touch_app, size: 16, color: Colors.blue[700]),
                    const SizedBox(width: 8),
                    Text(
                      'Toca para gestionar entrega, fotos y pagos',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.blue[700],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const Spacer(),
                    Icon(Icons.arrow_forward_ios, size: 12, color: Colors.blue[700]),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ==================== HELPERS ====================

  Color _getEstadoBackgroundColor() {
    switch (_ruta!.estado.toLowerCase()) {
      case 'asignada':
      case 'cargada':
        return Colors.blue;
      case 'en_entrega':
        return Colors.indigo;
      case 'finalizada':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  Color _getFacturaColor(String estado) {
    switch (estado.toLowerCase()) {
      case 'entregada':
      case 'entregado':
        return Colors.green;
      case 'no_entregada':
      case 'no_entregado':
        return Colors.red;
      case 'en_entrega':
        return Colors.indigo;
      default:
        return Colors.blue;
    }
  }
}

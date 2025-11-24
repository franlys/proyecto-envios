import 'package:flutter/material.dart';
import '../../models/ruta.dart';
import '../../models/factura.dart';
import '../../models/gasto.dart';
import '../../services/api_service.dart';
import '../repartidores/detalle_factura_screen.dart'; // Reutilizamos para ver detalle

class DetalleRutaSecretariaScreen extends StatefulWidget {
  final String rutaId;

  const DetalleRutaSecretariaScreen({super.key, required this.rutaId});

  @override
  State<DetalleRutaSecretariaScreen> createState() => _DetalleRutaSecretariaScreenState();
}

class _DetalleRutaSecretariaScreenState extends State<DetalleRutaSecretariaScreen> with SingleTickerProviderStateMixin {
  final ApiService _apiService = ApiService();
  late TabController _tabController;
  Ruta? _ruta;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _cargarDetalleRuta();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _cargarDetalleRuta() async {
    setState(() => _isLoading = true);
    try {
      final ruta = await _apiService.getRutaDetalle(widget.rutaId);
      setState(() {
        _ruta = ruta;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al cargar detalle: $e')),
        );
      }
    }
  }

  Future<void> _liquidarRuta() async {
    if (_ruta == null) return;

    final efectivoController = TextEditingController();
    final notasController = TextEditingController();

    final confirmado = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Liquidar Ruta'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Ingrese el efectivo total recibido en USD:'),
              const SizedBox(height: 8),
              TextField(
                controller: efectivoController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Efectivo Recibido (USD)',
                  prefixText: '\$ ',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: notasController,
                decoration: const InputDecoration(
                  labelText: 'Notas de Liquidación',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('CANCELAR'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, foregroundColor: Colors.white),
            child: const Text('CONFIRMAR LIQUIDACIÓN'),
          ),
        ],
      ),
    );

    if (confirmado == true) {
      final efectivo = double.tryParse(efectivoController.text) ?? 0.0;
      
      final success = await _apiService.confirmarLiquidacionRuta(
        widget.rutaId,
        efectivoRecibido: efectivo,
        notas: notasController.text,
      );

      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Ruta liquidada exitosamente')),
          );
          Navigator.pop(context); // Volver a la lista
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Error al liquidar ruta')),
          );
        }
      }
    }
  }

  double _calcularTotalCobradoUSD() {
    if (_ruta == null) return 0.0;
    return _ruta!.facturas.fold(0.0, (sum, f) {
      if (f.pago?.montoPagado != null) {
        return sum + f.pago!.montoPagado!;
      }
      return sum;
    });
  }

  double _calcularTotalGastosRD() {
    if (_ruta == null) return 0.0;
    return _ruta!.gastos.fold(0.0, (sum, g) => sum + g.monto);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_ruta != null ? 'Auditoría Ruta #${_ruta!.id.substring(0, 8)}' : 'Cargando...'),
        backgroundColor: Colors.teal,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'RESUMEN'),
            Tab(text: 'FACTURAS'),
            Tab(text: 'GASTOS'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _ruta == null
              ? const Center(child: Text('No se encontró la ruta'))
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildResumenTab(),
                    _buildFacturasTab(),
                    _buildGastosTab(),
                  ],
                ),
    );
  }

  // ==================== TABS ====================

  Widget _buildResumenTab() {
    final totalCobrado = _calcularTotalCobradoUSD();
    final totalGastos = _calcularTotalGastosRD();
    final facturasEntregadas = _ruta!.facturas.where((f) => f.itemsEntregados == f.itemsTotal).length;
    final facturasPendientes = _ruta!.facturas.length - facturasEntregadas;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildFinancialCard(
            'Total Cobrado (USD)',
            '\$${totalCobrado.toStringAsFixed(2)}',
            Icons.attach_money,
            Colors.green,
          ),
          const SizedBox(height: 16),
          _buildFinancialCard(
            'Total Gastos (RD\$)',
            'RD\$${totalGastos.toStringAsFixed(0)}',
            Icons.money_off,
            Colors.orange,
          ),
          const SizedBox(height: 24),
          const Text('Estadísticas de Entrega', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _buildStatCard('Entregadas', facturasEntregadas.toString(), Colors.blue)),
              const SizedBox(width: 16),
              Expanded(child: _buildStatCard('Pendientes', facturasPendientes.toString(), Colors.red)),
            ],
          ),
          const SizedBox(height: 32),
          if (_ruta!.estado != 'liquidada')
            ElevatedButton.icon(
              onPressed: _liquidarRuta,
              icon: const Icon(Icons.check_circle),
              label: const Text('LIQUIDAR RUTA', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFacturasTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _ruta!.facturas.length,
      itemBuilder: (context, index) {
        final factura = _ruta!.facturas[index];
        final esEntregada = factura.itemsEntregados == factura.itemsTotal;
        
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: esEntregada ? Colors.green[100] : Colors.orange[100],
              child: Icon(
                esEntregada ? Icons.check : Icons.access_time,
                color: esEntregada ? Colors.green : Colors.orange,
              ),
            ),
            title: Text('Factura #${index + 1}'), // Idealmente usar ID real
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${factura.itemsEntregados}/${factura.itemsTotal} items entregados'),
                if (factura.pago?.montoPagado != null)
                  Text(
                    'Pagado: \$${factura.pago!.montoPagado!.toStringAsFixed(2)} (${factura.pago!.metodoPago})',
                    style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
                  ),
              ],
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              // Navegar al detalle de factura (reutilizamos la pantalla de repartidor en modo solo lectura si es necesario)
              // Por ahora solo mostramos un snackbar o podríamos navegar
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => DetalleFacturaScreen(
                    factura: factura,
                    rutaId: widget.rutaId,
                    readOnly: true, // Necesitaríamos implementar este flag en DetalleFacturaScreen
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildGastosTab() {
    if (_ruta!.gastos.isEmpty) {
      return const Center(child: Text('No hay gastos registrados'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _ruta!.gastos.length,
      itemBuilder: (context, index) {
        final gasto = _ruta!.gastos[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: Text(
              gasto.getTipoIcono(),
              style: const TextStyle(fontSize: 24),
            ),
            title: Text(gasto.tipo.toUpperCase()),
            subtitle: Text(gasto.descripcion ?? 'Sin descripción'),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  gasto.getMontoFormateado(),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                if (gasto.fotoReciboUrl != null)
                  IconButton(
                    icon: const Icon(Icons.receipt),
                    onPressed: () => _mostrarFotoRecibo(gasto.fotoReciboUrl!),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ==================== WIDGETS AUXILIARES ====================

  Widget _buildFinancialCard(String title, String amount, IconData icon, Color color) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 32),
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(color: Colors.grey[600], fontSize: 14)),
                Text(amount, style: TextStyle(color: color, fontSize: 24, fontWeight: FontWeight.bold)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Text(value, style: TextStyle(color: color, fontSize: 24, fontWeight: FontWeight.bold)),
          Text(label, style: TextStyle(color: color, fontSize: 14)),
        ],
      ),
    );
  }

  void _mostrarFotoRecibo(String url) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.network(url, fit: BoxFit.cover),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('CERRAR'),
            ),
          ],
        ),
      ),
    );
  }
}

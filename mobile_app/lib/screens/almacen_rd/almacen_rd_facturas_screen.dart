library;

// lib/screens/almacen_rd/almacen_rd_facturas_screen.dart
/// 💰 PANTALLA DE GESTIÓN DE FACTURAS
/// Crear, ver y gestionar facturas en el almacén RD

import 'package:flutter/material.dart';
import '../../services/almacen_rd_service.dart';
import '../../models/almacen_rd_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';

class AlmacenRDFacturasScreen extends StatefulWidget {
  const AlmacenRDFacturasScreen({super.key});

  @override
  State<AlmacenRDFacturasScreen> createState() => _AlmacenRDFacturasScreenState();
}

class _AlmacenRDFacturasScreenState extends State<AlmacenRDFacturasScreen> {
  final AlmacenRDService _almacenService = AlmacenRDService();
  String _filtroEstado = 'todos';

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Facturas'),
            automaticallyImplyLeading: false,
            actions: [
              PopupMenuButton<String>(
                icon: const Icon(Icons.filter_list),
                onSelected: (value) => setState(() => _filtroEstado = value),
                itemBuilder: (context) => const [
                  PopupMenuItem(value: 'todos', child: Text('Todas')),
                  PopupMenuItem(value: 'pendiente', child: Text('Pendientes')),
                  PopupMenuItem(value: 'pagada', child: Text('Pagadas')),
                  PopupMenuItem(value: 'vencida', child: Text('Vencidas')),
                ],
              ),
            ],
          ),
          body: Column(
            children: [
              _buildResumenFacturacion(helper),
              Expanded(
                child: _buildFacturasList(helper),
              ),
            ],
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _mostrarCrearFactura(context),
            icon: const Icon(Icons.add),
            label: const Text('Nueva Factura'),
            backgroundColor: AppTheme.almacenRDColor,
          ),
        );
      },
    );
  }

  Widget _buildResumenFacturacion(ResponsiveHelper helper) {
    return FutureBuilder<EstadisticasAlmacenRD>(
      future: _almacenService.getEstadisticas(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const SizedBox.shrink();

        final stats = snapshot.data!;

        return Container(
          padding: helper.screenPadding,
          decoration: BoxDecoration(
            color: AppTheme.almacenRDColor.withValues(alpha: 0.1),
            border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
          ),
          child: Row(
            children: [
              Expanded(
                child: _buildMontoCard(
                  'Facturación Mensual',
                  '\$${stats.facturacionMensual.toStringAsFixed(2)}',
                  AppTheme.successColor,
                  helper,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMontoCard(
                  'Pendiente de Cobro',
                  '\$${stats.facturacionPendiente.toStringAsFixed(2)}',
                  AppTheme.warningColor,
                  helper,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMontoCard(String label, String monto, Color color, ResponsiveHelper helper) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: helper.getFontSize(12),
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            monto,
            style: TextStyle(
              fontSize: helper.getFontSize(20),
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFacturasList(ResponsiveHelper helper) {
    return StreamBuilder<List<FacturaRD>>(
      stream: _almacenService.getFacturasStream(
        filtroEstado: _filtroEstado == 'todos' ? null : _filtroEstado,
      ),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final facturas = snapshot.data ?? [];

        if (facturas.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.receipt_long, size: 80, color: Colors.grey[300]),
                const SizedBox(height: 16),
                Text(
                  'No hay facturas',
                  style: TextStyle(
                    fontSize: 18,
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
          itemCount: facturas.length,
          itemBuilder: (context, index) => _buildFacturaCard(facturas[index], helper),
        );
      },
    );
  }

  Widget _buildFacturaCard(FacturaRD factura, ResponsiveHelper helper) {
    final color = _getEstadoColor(factura);
    final vencida = factura.estaVencida();

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.2),
          child: Icon(Icons.receipt_long, color: color),
        ),
        title: Text(
          'Factura ${factura.numeroFactura}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Cliente: ${factura.clienteNombre}'),
            Text('Total: \$${factura.total.toStringAsFixed(2)}'),
            if (vencida)
              const Text(
                'VENCIDA',
                style: TextStyle(
                  color: AppTheme.errorColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            factura.getEstadoTexto(),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ),
        onTap: () => _mostrarDetalleFactura(factura),
      ),
    );
  }

  void _mostrarCrearFactura(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Crear Nueva Factura'),
        content: const Text(
          'Función de crear factura:\n\n'
          '1. Seleccionar cliente\n'
          '2. Agregar items\n'
          '3. Calcular totales\n'
          '4. Generar factura\n\n'
          'Implementar formulario completo',
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

  void _mostrarDetalleFactura(FacturaRD factura) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Factura ${factura.numeroFactura}'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Cliente: ${factura.clienteNombre}'),
              Text('Teléfono: ${factura.clienteTelefono}'),
              Text('Estado: ${factura.getEstadoTexto()}'),
              const Divider(),
              const Text('Items:', style: TextStyle(fontWeight: FontWeight.bold)),
              ...factura.items.map((item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(child: Text('${item.descripcion} (x${item.cantidad})')),
                    Text('\$${item.subtotal.toStringAsFixed(2)}'),
                  ],
                ),
              )),
              const Divider(),
              _buildMontoRow('Subtotal:', factura.subtotal),
              _buildMontoRow('Impuestos:', factura.impuestos),
              _buildMontoRow('TOTAL:', factura.total, bold: true),
            ],
          ),
        ),
        actions: [
          if (factura.estado == 'pendiente')
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _marcarComoPagada(factura);
              },
              child: const Text('Marcar Pagada'),
            ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  Widget _buildMontoRow(String label, double monto, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal),
          ),
          Text(
            '\$${monto.toStringAsFixed(2)}',
            style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal),
          ),
        ],
      ),
    );
  }

  Future<void> _marcarComoPagada(FacturaRD factura) async {
    final controller = TextEditingController();
    String metodoPago = 'efectivo';

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Registrar Pago'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Monto recibido',
                prefixText: '\$',
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: metodoPago,
              decoration: const InputDecoration(labelText: 'Método de pago'),
              items: const [
                DropdownMenuItem(value: 'efectivo', child: Text('Efectivo')),
                DropdownMenuItem(value: 'transferencia', child: Text('Transferencia')),
                DropdownMenuItem(value: 'tarjeta', child: Text('Tarjeta')),
              ],
              onChanged: (value) => metodoPago = value!,
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
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final monto = double.tryParse(controller.text) ?? 0;
      
      bool success = await _almacenService.marcarFacturaPagada(
        factura.id,
        monto,
        metodoPago,
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Factura marcada como pagada'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      }
    }
  }

  Color _getEstadoColor(FacturaRD factura) {
    if (factura.estaVencida()) return AppTheme.errorColor;
    
    switch (factura.estado) {
      case 'pagada': return AppTheme.successColor;
      case 'cancelada': return AppTheme.errorColor;
      default: return AppTheme.warningColor;
    }
  }
}
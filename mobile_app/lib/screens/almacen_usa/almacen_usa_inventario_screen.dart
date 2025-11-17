library;

// lib/screens/almacen_usa/almacen_usa_inventario_screen.dart
/// 📋 PANTALLA DE INVENTARIO CON ESCANEO
/// Registrar y gestionar items con escaneo de barcode/QR

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/almacen_usa_service.dart';
import '../../models/almacen_usa_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';

class AlmacenUSAInventarioScreen extends StatefulWidget {
  const AlmacenUSAInventarioScreen({super.key});

  @override
  State<AlmacenUSAInventarioScreen> createState() => _AlmacenUSAInventarioScreenState();
}

class _AlmacenUSAInventarioScreenState extends State<AlmacenUSAInventarioScreen> {
  final AlmacenUSAService _almacenService = AlmacenUSAService();
  final TextEditingController _searchController = TextEditingController();
  String _filtroEstado = 'todos';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final empleadoNombre = authService.getEmpleadoNombre() ?? 'Empleado';

    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Inventario'),
            automaticallyImplyLeading: false,
            actions: [
              PopupMenuButton<String>(
                icon: const Icon(Icons.filter_list),
                onSelected: (value) => setState(() => _filtroEstado = value),
                itemBuilder: (context) => const [
                  PopupMenuItem(value: 'todos', child: Text('Todos')),
                  PopupMenuItem(value: 'recibido', child: Text('Recibidos')),
                  PopupMenuItem(value: 'sin_asignar', child: Text('Sin Asignar')),
                  PopupMenuItem(value: 'en_contenedor', child: Text('En Contenedor')),
                ],
              ),
            ],
          ),
          body: Column(
            children: [
              _buildSearchBar(helper),
              Expanded(
                child: _buildItemsList(helper),
              ),
            ],
          ),
          floatingActionButton: Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              FloatingActionButton(
                heroTag: 'scan',
                onPressed: () => _escanearItem(empleadoNombre),
                backgroundColor: AppTheme.infoColor,
                child: const Icon(Icons.qr_code_scanner),
              ),
              const SizedBox(height: 12),
              FloatingActionButton.extended(
                heroTag: 'add',
                onPressed: () => _registrarItemManual(empleadoNombre),
                icon: const Icon(Icons.add),
                label: const Text('Registrar Item'),
                backgroundColor: AppTheme.almacenUSAColor,
              ),
            ],
          ),
        );
      },
    );
  }

  // ==================== BARRA DE BÚSQUEDA ====================
  Widget _buildSearchBar(ResponsiveHelper helper) {
    return Container(
      padding: helper.screenPadding,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Buscar por tracking o barcode',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              onSubmitted: (value) => _buscarItem(value),
            ),
          ),
          const SizedBox(width: 12),
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: () {
              final authService = Provider.of<AuthService>(context, listen: false);
              final empleadoNombre = authService.getEmpleadoNombre() ?? 'Empleado';
              _escanearItem(empleadoNombre);
            },
            tooltip: 'Escanear código',
            style: IconButton.styleFrom(
              backgroundColor: AppTheme.infoColor,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  // ==================== LISTA DE ITEMS ====================
  Widget _buildItemsList(ResponsiveHelper helper) {
    return StreamBuilder<List<ItemInventario>>(
      stream: _almacenService.getItemsStream(
        filtroEstado: _filtroEstado == 'todos' ? null : _filtroEstado,
      ),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(child: Text('Error: ${snapshot.error}'));
        }

        final items = snapshot.data ?? [];

        if (items.isEmpty) {
          return _buildEmptyState(helper);
        }

        return ListView.builder(
          padding: helper.screenPadding,
          itemCount: items.length,
          itemBuilder: (context, index) {
            return _buildItemCard(items[index], helper);
          },
        );
      },
    );
  }

  // ==================== CARD DE ITEM ====================
  Widget _buildItemCard(ItemInventario item, ResponsiveHelper helper) {
    final iconoCategoria = CategoriasItems.getIcono(item.categoria);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppTheme.almacenUSAColor.withValues(alpha: 0.2),
          child: Icon(iconoCategoria, color: AppTheme.almacenUSAColor),
        ),
        title: Text(
          item.descripcion,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Tracking: ${item.numeroTracking}'),
            Text('Barcode: ${item.barcode}'),
            Text('Destinatario: ${item.destinatario}'),
            if (item.contenedorId != null)
              Text('Contenedor: ${item.contenedorId}', 
                style: const TextStyle(color: AppTheme.successColor)),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('${item.peso}kg', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _getEstadoColor(item.estado).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                item.getEstadoTexto(),
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: _getEstadoColor(item.estado),
                ),
              ),
            ),
          ],
        ),
        onTap: () => _verDetalleItem(item),
      ),
    );
  }

  // ==================== EMPTY STATE ====================
  Widget _buildEmptyState(ResponsiveHelper helper) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inventory, size: 80, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text('No hay items', style: TextStyle(
            fontSize: helper.getFontSize(18), fontWeight: FontWeight.bold, 
            color: Colors.grey[600])),
          const SizedBox(height: 8),
          Text('Escanea o registra un item para empezar',
            style: TextStyle(fontSize: helper.getFontSize(14), color: Colors.grey[500])),
        ],
      ),
    );
  }

  // ==================== ACCIONES ====================

  Future<void> _escanearItem(String empleadoNombre) async {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Escanear Código'),
        content: const Text(
          'Función de escaneo:\n\n'
          '1. Instala mobile_scanner\n'
          '2. Configura permisos de cámara\n'
          '3. Escanea barcode/QR\n'
          '4. Registra o busca el item\n\n'
          'Por ahora, ingresa el código manualmente.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _registrarItemManual(empleadoNombre);
            },
            child: const Text('Ingresar Manual'),
          ),
        ],
      ),
    );
  }

  Future<void> _registrarItemManual(String empleadoNombre) async {
    final formKey = GlobalKey<FormState>();
    final trackingController = TextEditingController();
    final barcodeController = TextEditingController();
    final descripcionController = TextEditingController();
    final pesoController = TextEditingController();
    final remitenteController = TextEditingController();
    final destinatarioController = TextEditingController();
    final direccionController = TextEditingController();
    final telefonoController = TextEditingController();
    String categoria = CategoriasItems.otros;

    final resultado = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Registrar Item'),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: trackingController,
                    decoration: const InputDecoration(
                      labelText: 'Número de Tracking *',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: barcodeController,
                    decoration: const InputDecoration(
                      labelText: 'Código de Barras *',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: categoria,
                    decoration: const InputDecoration(
                      labelText: 'Categoría',
                      border: OutlineInputBorder(),
                    ),
                    items: CategoriasItems.todas.map((cat) {
                      return DropdownMenuItem(
                        value: cat,
                        child: Text(CategoriasItems.getNombre(cat)),
                      );
                    }).toList(),
                    onChanged: (value) => setState(() => categoria = value!),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: descripcionController,
                    decoration: const InputDecoration(
                      labelText: 'Descripción *',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: pesoController,
                    decoration: const InputDecoration(
                      labelText: 'Peso (kg) *',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.number,
                    validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: remitenteController,
                    decoration: const InputDecoration(
                      labelText: 'Remitente *',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: destinatarioController,
                    decoration: const InputDecoration(
                      labelText: 'Destinatario *',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: direccionController,
                    decoration: const InputDecoration(
                      labelText: 'Dirección de Entrega *',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: telefonoController,
                    decoration: const InputDecoration(
                      labelText: 'Teléfono *',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.phone,
                    validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () {
                if (formKey.currentState!.validate()) {
                  Navigator.pop(context, true);
                }
              },
              child: const Text('Registrar'),
            ),
          ],
        ),
      ),
    );

    if (resultado == true) {
      final item = ItemInventario(
        id: '',
        numeroTracking: trackingController.text,
        barcode: barcodeController.text,
        descripcion: descripcionController.text,
        categoria: categoria,
        peso: double.tryParse(pesoController.text) ?? 0,
        dimensiones: '0x0x0',
        remitente: remitenteController.text,
        destinatario: destinatarioController.text,
        direccionDestino: direccionController.text,
        telefonoDestino: telefonoController.text,
        fechaIngreso: DateTime.now(),
        estado: 'recibido',
        registradoPor: empleadoNombre,
      );

      String? id = await _almacenService.registrarItem(item);

      if (id != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Item registrado exitosamente'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      }
    }
  }

  Future<void> _buscarItem(String query) async {
    if (query.isEmpty) return;

    ItemInventario? item = await _almacenService.buscarItemPorBarcode(query);

    if (item != null && mounted) {
      _verDetalleItem(item);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('❌ Item no encontrado'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  Future<void> _verDetalleItem(ItemInventario item) async {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(item.descripcion),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildInfoRow('Tracking:', item.numeroTracking),
              _buildInfoRow('Barcode:', item.barcode),
              _buildInfoRow('Categoría:', CategoriasItems.getNombre(item.categoria)),
              _buildInfoRow('Peso:', '${item.peso} kg'),
              _buildInfoRow('Remitente:', item.remitente),
              _buildInfoRow('Destinatario:', item.destinatario),
              _buildInfoRow('Dirección:', item.direccionDestino),
              _buildInfoRow('Teléfono:', item.telefonoDestino),
              _buildInfoRow('Estado:', item.getEstadoTexto()),
              if (item.contenedorId != null)
                _buildInfoRow('Contenedor:', item.contenedorId!),
            ],
          ),
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

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  // ==================== HELPERS ====================

  Color _getEstadoColor(String estado) {
    switch (estado) {
      case 'enviado':
      case 'entregado':
        return AppTheme.successColor;
      case 'en_contenedor':
        return AppTheme.infoColor;
      default:
        return AppTheme.warningColor;
    }
  }
}
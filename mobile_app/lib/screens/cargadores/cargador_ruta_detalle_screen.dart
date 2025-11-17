// lib/screens/cargadores/cargador_ruta_detalle_screen.dart
/// 📋 PANTALLA DE DETALLE DE RUTA CON CHECKLIST
/// Checklist interactivo item por item con escaneo y validación
library;


import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/cargador_service.dart';
import '../../models/cargador_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';
import 'cargador_reporte_dano_screen.dart';

class CargadorRutaDetalleScreen extends StatefulWidget {
  final RutaCarga ruta;

  const CargadorRutaDetalleScreen({
    super.key,
    required this.ruta,
  });

  @override
  State<CargadorRutaDetalleScreen> createState() => _CargadorRutaDetalleScreenState();
}

class _CargadorRutaDetalleScreenState extends State<CargadorRutaDetalleScreen> {
  final CargadorService _cargadorService = CargadorService();
  String _filtroItems = 'todos'; // 'todos', 'pendientes', 'cargados', 'dañados'
  final TextEditingController _barcodeController = TextEditingController();

  @override
  void dispose() {
    _barcodeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final cargadorNombre = authService.getEmpleadoNombre() ?? 'Cargador';

    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: Text('Ruta ${widget.ruta.numeroRuta}'),
            actions: [
              // Filtro
              PopupMenuButton<String>(
                icon: const Icon(Icons.filter_list),
                onSelected: (value) {
                  setState(() {
                    _filtroItems = value;
                  });
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(value: 'todos', child: Text('Todos')),
                  const PopupMenuItem(value: 'pendientes', child: Text('Pendientes')),
                  const PopupMenuItem(value: 'cargados', child: Text('Cargados')),
                  const PopupMenuItem(value: 'dañados', child: Text('Dañados')),
                ],
              ),
              // Menú
              PopupMenuButton<String>(
                onSelected: (value) async {
                  if (value == 'completar') {
                    await _completarRuta();
                  } else if (value == 'cancelar') {
                    await _cancelarRuta();
                  }
                },
                itemBuilder: (context) => [
                  if (widget.ruta.estado != 'completada')
                    const PopupMenuItem(
                      value: 'completar',
                      child: Text('Marcar como Completada'),
                    ),
                  const PopupMenuItem(
                    value: 'cancelar',
                    child: Text('Cancelar Ruta'),
                  ),
                ],
              ),
            ],
          ),
          body: Column(
            children: [
              // Header con progreso
              _buildHeader(helper),

              // Barra de búsqueda por barcode
              _buildBarcodeSearch(helper),

              // Lista de items
              Expanded(
                child: _buildItemsList(cargadorNombre, helper),
              ),
            ],
          ),
          // FAB para iniciar/completar
          floatingActionButton: _buildFAB(helper),
        );
      },
    );
  }

  // ==================== HEADER CON PROGRESO ====================
  Widget _buildHeader(ResponsiveHelper helper) {
    return Container(
      padding: helper.screenPadding,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.cargadorColor,
            AppTheme.cargadorColor.withOpacity(0.8),
          ],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Estado
          Row(
            children: [
              _buildEstadoBadge(widget.ruta.estado, helper),
              const Spacer(),
              Icon(
                Icons.inventory_2,
                color: Colors.white70,
                size: helper.responsiveValue(phone: 16, tablet: 20, desktop: 24),
              ),
              const SizedBox(width: 8),
              Text(
                widget.ruta.contenedorId,
                style: TextStyle(
                  fontSize: helper.getFontSize(14),
                  color: Colors.white70,
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Progreso grande
          Text(
            'Progreso de Carga',
            style: TextStyle(
              fontSize: helper.getFontSize(14),
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: LinearProgressIndicator(
                        value: widget.ruta.progreso,
                        backgroundColor: Colors.white30,
                        valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                        minHeight: 12,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${widget.ruta.itemsCargados} de ${widget.ruta.totalItems} ítems cargados',
                      style: TextStyle(
                        fontSize: helper.getFontSize(12),
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Text(
                      '${(widget.ruta.progreso * 100).toStringAsFixed(0)}%',
                      style: TextStyle(
                        fontSize: helper.getFontSize(24),
                        fontWeight: FontWeight.bold,
                        color: AppTheme.cargadorColor,
                      ),
                    ),
                    Text(
                      'Completo',
                      style: TextStyle(
                        fontSize: helper.getFontSize(10),
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ==================== BÚSQUEDA POR BARCODE ====================
  Widget _buildBarcodeSearch(ResponsiveHelper helper) {
    return Container(
      padding: helper.screenPadding,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade300),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _barcodeController,
              decoration: InputDecoration(
                hintText: 'Escanear o buscar código de barras',
                prefixIcon: const Icon(Icons.qr_code_scanner),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
              onSubmitted: (value) => _buscarPorBarcode(value),
            ),
          ),
          const SizedBox(width: 12),
          // Botón de escaneo (simulado - necesitarías un paquete como barcode_scan)
          IconButton(
            icon: const Icon(Icons.camera_alt),
            onPressed: () {
              // TODO: Implementar escaneo real con barcode_scan
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Función de escaneo: Instalar paquete barcode_scan'),
                ),
              );
            },
            tooltip: 'Escanear con cámara',
            style: IconButton.styleFrom(
              backgroundColor: AppTheme.cargadorColor,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  // ==================== LISTA DE ITEMS ====================
  Widget _buildItemsList(String cargadorNombre, ResponsiveHelper helper) {
    // Filtrar items
    List<ItemCarga> items = widget.ruta.items;
    
    switch (_filtroItems) {
      case 'pendientes':
        items = items.where((i) => !i.cargado).toList();
        break;
      case 'cargados':
        items = items.where((i) => i.cargado).toList();
        break;
      case 'dañados':
        items = items.where((i) => i.tieneDano).toList();
        break;
    }

    if (items.isEmpty) {
      return _buildEmptyState(helper);
    }

    return ListView.builder(
      padding: helper.screenPadding,
      itemCount: items.length,
      itemBuilder: (context, index) {
        return _buildItemCard(items[index], cargadorNombre, helper);
      },
    );
  }

  // ==================== CARD DE ITEM ====================
  Widget _buildItemCard(ItemCarga item, String cargadorNombre, ResponsiveHelper helper) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: EdgeInsets.all(helper.responsiveValue(
          phone: 12,
          tablet: 16,
          desktop: 20,
        )),
        child: Row(
          children: [
            // Checkbox grande
            Transform.scale(
              scale: helper.isPhone ? 1.2 : 1.5,
              child: Checkbox(
                value: item.cargado,
                onChanged: widget.ruta.estado == 'completada' 
                    ? null
                    : (value) async {
                        if (value == true) {
                          await _marcarItemCargado(item, cargadorNombre);
                        } else {
                          await _desmarcarItem(item);
                        }
                      },
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),

            const SizedBox(width: 12),

            // Info del item
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Descripción
                  Text(
                    item.descripcion,
                    style: TextStyle(
                      fontSize: helper.getFontSize(14),
                      fontWeight: FontWeight.bold,
                      decoration: item.cargado 
                          ? TextDecoration.lineThrough 
                          : null,
                    ),
                  ),

                  const SizedBox(height: 4),

                  // Barcode
                  if (item.barcode != null)
                    Row(
                      children: [
                        Icon(
                          Icons.qr_code,
                          size: 14,
                          color: Colors.grey[600],
                        ),
                        const SizedBox(width: 4),
                        Text(
                          item.barcode!,
                          style: TextStyle(
                            fontSize: helper.getFontSize(12),
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),

                  // Peso/Volumen
                  if (item.peso != null || item.volumen != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        [
                          if (item.peso != null) '${item.peso}kg',
                          if (item.volumen != null) item.volumen,
                        ].join(' • '),
                        style: TextStyle(
                          fontSize: helper.getFontSize(11),
                          color: Colors.grey[500],
                        ),
                      ),
                    ),

                  // Estado de daño
                  if (item.tieneDano)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.errorColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.warning,
                              size: 14,
                              color: AppTheme.errorColor,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Daño reportado',
                              style: TextStyle(
                                fontSize: helper.getFontSize(11),
                                color: AppTheme.errorColor,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Botones de acción
            Column(
              children: [
                // Botón de reportar daño
                if (!item.tieneDano && widget.ruta.estado != 'completada')
                  IconButton(
                    icon: const Icon(Icons.report_problem),
                    color: AppTheme.warningColor,
                    onPressed: () => _reportarDano(item),
                    tooltip: 'Reportar daño',
                  ),

                // Indicador de cargado
                if (item.cargado)
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                      color: AppTheme.successColor,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ==================== BADGE DE ESTADO ====================
  Widget _buildEstadoBadge(String estado, ResponsiveHelper helper) {
    Color color;
    String texto;

    switch (estado) {
      case 'completada':
        color = AppTheme.successColor;
        texto = 'Completada';
        break;
      case 'en_proceso':
        color = AppTheme.warningColor;
        texto = 'En Proceso';
        break;
      case 'cancelada':
        color = AppTheme.errorColor;
        texto = 'Cancelada';
        break;
      default:
        color = AppTheme.infoColor;
        texto = 'Pendiente';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        texto,
        style: TextStyle(
          fontSize: helper.getFontSize(12),
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }

  // ==================== FAB ====================
  Widget _buildFAB(ResponsiveHelper helper) {
    if (widget.ruta.estado == 'completada') {
      return const SizedBox.shrink();
    }

    if (widget.ruta.estado == 'pendiente') {
      return FloatingActionButton.extended(
        onPressed: _iniciarRuta,
        icon: const Icon(Icons.play_arrow),
        label: const Text('Iniciar Carga'),
        backgroundColor: AppTheme.successColor,
      );
    }

    if (widget.ruta.progreso == 1.0) {
      return FloatingActionButton.extended(
        onPressed: _completarRuta,
        icon: const Icon(Icons.check),
        label: const Text('Completar'),
        backgroundColor: AppTheme.successColor,
      );
    }

    return const SizedBox.shrink();
  }

  // ==================== EMPTY STATE ====================
  Widget _buildEmptyState(ResponsiveHelper helper) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.inbox,
            size: 80,
            color: Colors.grey[300],
          ),
          const SizedBox(height: 16),
          Text(
            'No hay ítems con este filtro',
            style: TextStyle(
              fontSize: helper.getFontSize(16),
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  // ==================== ACCIONES ====================
  
  Future<void> _iniciarRuta() async {
    bool success = await _cargadorService.iniciarCarga(widget.ruta.id);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Carga iniciada'),
          backgroundColor: AppTheme.successColor,
        ),
      );
      setState(() {}); // Refrescar
    }
  }

  Future<void> _completarRuta() async {
    // Verificar que todos los ítems estén cargados
    bool todosLosCargados = widget.ruta.items.every((item) => item.cargado);
    
    if (!todosLosCargados) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('⚠️ Atención'),
          content: const Text(
            'Aún hay ítems sin cargar. ¿Estás seguro de completar la ruta?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Completar de todos modos'),
            ),
          ],
        ),
      );
      
      if (confirm != true) return;
    }

    bool success = await _cargadorService.completarCarga(widget.ruta.id);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Ruta completada'),
          backgroundColor: AppTheme.successColor,
        ),
      );
      Navigator.pop(context); // Volver a la lista
    }
  }

  Future<void> _cancelarRuta() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancelar Ruta'),
        content: const Text('¿Estás seguro de cancelar esta ruta?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('No'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sí, cancelar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      bool success = await _cargadorService.actualizarEstadoRuta(
        widget.ruta.id,
        'cancelada',
      );
      if (success && mounted) {
        Navigator.pop(context);
      }
    }
  }

  Future<void> _marcarItemCargado(ItemCarga item, String cargadorNombre) async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final cargadorId = authService.getCurrentUserId() ?? '';

    bool success = await _cargadorService.marcarItemCargado(
      widget.ruta.id,
      item.itemId,
      cargadorId,
      cargadorNombre,
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✅ ${item.descripcion} cargado'),
          duration: const Duration(seconds: 1),
        ),
      );
      setState(() {}); // Refrescar
    }
  }

  Future<void> _desmarcarItem(ItemCarga item) async {
    bool success = await _cargadorService.desmarcarItem(
      widget.ruta.id,
      item.itemId,
    );

    if (success && mounted) {
      setState(() {});
    }
  }

  Future<void> _reportarDano(ItemCarga item) async {
    final resultado = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) => CargadorReporteDanoScreen(
          rutaId: widget.ruta.id,
          item: item,
        ),
      ),
    );

    if (resultado == true && mounted) {
      setState(() {}); // Refrescar para mostrar el daño
    }
  }

  Future<void> _buscarPorBarcode(String barcode) async {
    if (barcode.isEmpty) return;

    ItemCarga? item = await _cargadorService.buscarItemPorBarcode(
      widget.ruta.id,
      barcode,
    );

    if (mounted) {
      // Encontrado - marcar como cargado
      final authService = Provider.of<AuthService>(context, listen: false);
      final cargadorNombre = authService.getEmpleadoNombre() ?? 'Cargador';
      
      await _marcarItemCargado(item!, cargadorNombre);
      _barcodeController.clear();
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('❌ Ítem no encontrado'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }
}
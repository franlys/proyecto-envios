library;

// lib/screens/almacen_usa/almacen_usa_asignacion_screen.dart
/// 🔗 PANTALLA DE ASIGNACIÓN A CONTENEDORES
/// Asignar items del inventario a contenedores abiertos

import 'package:flutter/material.dart';
import '../../services/almacen_usa_service.dart';
import '../../models/almacen_usa_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';

class AlmacenUSAAsignacionScreen extends StatefulWidget {
  const AlmacenUSAAsignacionScreen({super.key});

  @override
  State<AlmacenUSAAsignacionScreen> createState() => _AlmacenUSAAsignacionScreenState();
}

class _AlmacenUSAAsignacionScreenState extends State<AlmacenUSAAsignacionScreen> {
  final AlmacenUSAService _almacenService = AlmacenUSAService();
  ContenedorUSA? _contenedorSeleccionado;
  final Set<String> _itemsSeleccionados = {};

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Asignar a Contenedor'),
            automaticallyImplyLeading: false,
          ),
          body: Column(
            children: [
              // Selector de contenedor
              _buildContenedorSelector(helper),

              // Lista de items sin asignar
              Expanded(
                child: _buildItemsList(helper),
              ),

              // Botón de asignar
              if (_itemsSeleccionados.isNotEmpty && _contenedorSeleccionado != null)
                _buildAsignarButton(helper),
            ],
          ),
        );
      },
    );
  }

  // ==================== SELECTOR DE CONTENEDOR ====================
  Widget _buildContenedorSelector(ResponsiveHelper helper) {
    return Container(
      padding: helper.screenPadding,
      decoration: BoxDecoration(
        color: AppTheme.almacenUSAColor.withValues(alpha: 0.1),
        border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
      ),
      child: StreamBuilder<List<ContenedorUSA>>(
        stream: _almacenService.getContenedoresStream(filtroEstado: 'abierto'),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final contenedores = snapshot.data!;

          if (contenedores.isEmpty) {
            return const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'No hay contenedores abiertos.\nCrea un contenedor en la pestaña Contenedores.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            );
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Selecciona Contenedor:',
                style: TextStyle(
                  fontSize: helper.getFontSize(14),
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<ContenedorUSA>(
                initialValue: _contenedorSeleccionado,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  filled: true,
                  fillColor: Colors.white,
                ),
                hint: const Text('Seleccionar contenedor...'),
                items: contenedores.map((c) {
                  return DropdownMenuItem(
                    value: c,
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(c.numeroContenedor),
                        ),
                        Text(
                          '${c.itemsActuales}/${c.capacidadMaxima}',
                          style: TextStyle(
                            color: c.estaLleno ? AppTheme.errorColor : Colors.grey,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _contenedorSeleccionado = value;
                  });
                },
              ),
              if (_contenedorSeleccionado != null) ...[
                const SizedBox(height: 12),
                LinearProgressIndicator(
                  value: _contenedorSeleccionado!.porcentajeLlenado,
                  backgroundColor: Colors.grey[300],
                  valueColor: AlwaysStoppedAnimation<Color>(
                    _contenedorSeleccionado!.estaLleno 
                      ? AppTheme.errorColor 
                      : AppTheme.almacenUSAColor,
                  ),
                  minHeight: 8,
                ),
                const SizedBox(height: 4),
                Text(
                  '${(_contenedorSeleccionado!.porcentajeLlenado * 100).toStringAsFixed(0)}% lleno',
                  style: TextStyle(
                    fontSize: helper.getFontSize(12),
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  // ==================== LISTA DE ITEMS ====================
  Widget _buildItemsList(ResponsiveHelper helper) {
    return StreamBuilder<List<ItemInventario>>(
      stream: _almacenService.getItemsStream(filtroEstado: 'sin_asignar'),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final items = snapshot.data ?? [];

        if (items.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.check_circle_outline, size: 80, color: Colors.grey[300]),
                const SizedBox(height: 16),
                Text(
                  'No hay items sin asignar',
                  style: TextStyle(
                    fontSize: helper.getFontSize(18),
                    fontWeight: FontWeight.bold,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Todos los items han sido asignados',
                  style: TextStyle(
                    fontSize: helper.getFontSize(14),
                    color: Colors.grey[500],
                  ),
                ),
              ],
            ),
          );
        }

        return Column(
          children: [
            // Header con contador
            Container(
              padding: helper.screenPadding,
              color: Colors.grey[100],
              child: Row(
                children: [
                  Text(
                    '${items.length} items disponibles',
                    style: TextStyle(
                      fontSize: helper.getFontSize(14),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  if (_itemsSeleccionados.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.almacenUSAColor,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '${_itemsSeleccionados.length} seleccionados',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Lista
            Expanded(
              child: ListView.builder(
                padding: helper.screenPadding,
                itemCount: items.length,
                itemBuilder: (context, index) {
                  return _buildItemCard(items[index], helper);
                },
              ),
            ),
          ],
        );
      },
    );
  }

  // ==================== CARD DE ITEM ====================
  Widget _buildItemCard(ItemInventario item, ResponsiveHelper helper) {
    final isSelected = _itemsSeleccionados.contains(item.id);
    final iconoCategoria = CategoriasItems.getIcono(item.categoria);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: isSelected ? AppTheme.almacenUSAColor.withValues(alpha: 0.1) : null,
      child: CheckboxListTile(
        value: isSelected,
        onChanged: (_contenedorSeleccionado == null || 
                     _contenedorSeleccionado!.estaLleno)
            ? null
            : (value) {
                setState(() {
                  if (value == true) {
                    _itemsSeleccionados.add(item.id);
                  } else {
                    _itemsSeleccionados.remove(item.id);
                  }
                });
              },
        secondary: CircleAvatar(
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
            Text('Destinatario: ${item.destinatario}'),
            Text('Peso: ${item.peso}kg'),
          ],
        ),
      ),
    );
  }

  // ==================== BOTÓN DE ASIGNAR ====================
  Widget _buildAsignarButton(ResponsiveHelper helper) {
    return Container(
      padding: helper.screenPadding,
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: SizedBox(
          width: double.infinity,
          height: helper.responsiveValue(phone: 50, tablet: 56, desktop: 60),
          child: ElevatedButton(
            onPressed: _asignarItems,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.almacenUSAColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.add_box),
                const SizedBox(width: 12),
                Text(
                  'Asignar ${_itemsSeleccionados.length} items',
                  style: TextStyle(
                    fontSize: helper.getFontSize(16),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ==================== ACCIONES ====================

  Future<void> _asignarItems() async {
    if (_contenedorSeleccionado == null || _itemsSeleccionados.isEmpty) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar Asignación'),
        content: Text(
          '¿Asignar ${_itemsSeleccionados.length} items al contenedor '
          '${_contenedorSeleccionado!.numeroContenedor}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Asignar'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    int exitosos = 0;
    int fallidos = 0;

    for (String itemId in _itemsSeleccionados) {
      bool success = await _almacenService.agregarItemAContenedor(
        itemId,
        _contenedorSeleccionado!.id,
      );

      if (success) {
        exitosos++;
      } else {
        fallidos++;
      }
    }

    setState(() {
      _itemsSeleccionados.clear();
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            fallidos == 0
                ? '✅ $exitosos items asignados correctamente'
                : '⚠️ $exitosos exitosos, $fallidos fallidos',
          ),
          backgroundColor: fallidos == 0 ? AppTheme.successColor : AppTheme.warningColor,
        ),
      );
    }
  }
}
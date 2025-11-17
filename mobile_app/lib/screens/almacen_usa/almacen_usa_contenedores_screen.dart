library;

// lib/screens/almacen_usa/almacen_usa_contenedores_screen.dart
/// 📦 PANTALLA DE GESTIÓN DE CONTENEDORES
/// Crear, gestionar y enviar contenedores desde el almacén USA

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/almacen_usa_service.dart';
import '../../models/almacen_usa_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';

class AlmacenUSAContenedoresScreen extends StatefulWidget {
  const AlmacenUSAContenedoresScreen({super.key});

  @override
  State<AlmacenUSAContenedoresScreen> createState() => _AlmacenUSAContenedoresScreenState();
}

class _AlmacenUSAContenedoresScreenState extends State<AlmacenUSAContenedoresScreen> {
  final AlmacenUSAService _almacenService = AlmacenUSAService();
  String _filtroEstado = 'todos';

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final empleadoNombre = authService.getEmpleadoNombre() ?? 'Empleado';

    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Contenedores'),
            automaticallyImplyLeading: false,
            actions: [
              PopupMenuButton<String>(
                icon: const Icon(Icons.filter_list),
                onSelected: (value) => setState(() => _filtroEstado = value),
                itemBuilder: (context) => const [
                  PopupMenuItem(value: 'todos', child: Text('Todos')),
                  PopupMenuItem(value: 'abierto', child: Text('Abiertos')),
                  PopupMenuItem(value: 'cerrado', child: Text('Cerrados')),
                  PopupMenuItem(value: 'enviado', child: Text('Enviados')),
                ],
              ),
            ],
          ),
          body: Column(
            children: [
              _buildEstadisticas(helper),
              Expanded(
                child: _buildContenedoresList(empleadoNombre, helper),
              ),
            ],
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _mostrarCrearContenedor(empleadoNombre),
            icon: const Icon(Icons.add),
            label: const Text('Nuevo Contenedor'),
            backgroundColor: AppTheme.almacenUSAColor,
          ),
        );
      },
    );
  }

  // ==================== ESTADÍSTICAS ====================
  Widget _buildEstadisticas(ResponsiveHelper helper) {
    return FutureBuilder<EstadisticasAlmacenUSA>(
      future: _almacenService.getEstadisticas(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const SizedBox.shrink();

        final stats = snapshot.data!;

        return Container(
          padding: helper.screenPadding,
          decoration: BoxDecoration(
            color: AppTheme.almacenUSAColor.withValues(alpha: 0.1),
            border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
          ),
          child: GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: helper.isPhone ? 2 : 4,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: helper.isPhone ? 2.5 : 3.0,
            children: [
              _buildStatCard('Abiertos', stats.contenedoresAbiertos.toString(), 
                Icons.inventory, AppTheme.almacenUSAColor, helper),
              _buildStatCard('Cerrados', stats.contenedoresCerrados.toString(), 
                Icons.lock, AppTheme.warningColor, helper),
              _buildStatCard('Items', stats.itemsEnInventario.toString(), 
                Icons.archive, AppTheme.infoColor, helper),
              _buildStatCard('Sin Asignar', stats.itemsSinAsignar.toString(), 
                Icons.pending, AppTheme.errorColor, helper),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color, ResponsiveHelper helper) {
    return Container(
      padding: EdgeInsets.all(helper.responsiveValue(phone: 8, tablet: 12, desktop: 16)),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 24, color: color),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: helper.getFontSize(18), 
            fontWeight: FontWeight.bold, color: color)),
          Text(label, style: TextStyle(fontSize: helper.getFontSize(10), 
            color: Colors.grey[600]), textAlign: TextAlign.center, 
            maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }

  // ==================== LISTA DE CONTENEDORES ====================
  Widget _buildContenedoresList(String empleadoNombre, ResponsiveHelper helper) {
    return StreamBuilder<List<ContenedorUSA>>(
      stream: _almacenService.getContenedoresStream(
        filtroEstado: _filtroEstado == 'todos' ? null : _filtroEstado,
      ),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(child: Text('Error: ${snapshot.error}'));
        }

        final contenedores = snapshot.data ?? [];

        if (contenedores.isEmpty) {
          return _buildEmptyState(helper);
        }

        return ListView.builder(
          padding: helper.screenPadding,
          itemCount: contenedores.length,
          itemBuilder: (context, index) {
            return _buildContenedorCard(contenedores[index], empleadoNombre, helper);
          },
        );
      },
    );
  }

  // ==================== CARD DE CONTENEDOR ====================
  Widget _buildContenedorCard(ContenedorUSA contenedor, String empleadoNombre, ResponsiveHelper helper) {
    final color = _getEstadoColor(contenedor.estado);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: EdgeInsets.all(helper.responsiveValue(phone: 12, tablet: 16, desktop: 20)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: color.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    contenedor.numeroContenedor,
                    style: TextStyle(
                      fontSize: helper.getFontSize(12),
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ),
                const Spacer(),
                _buildEstadoBadge(contenedor.estado, helper),
              ],
            ),

            const SizedBox(height: 12),

            // Info
            Row(
              children: [
                Icon(Icons.flight_land, size: 16, color: Colors.grey[600]),
                const SizedBox(width: 8),
                Text(
                  'Destino: ${contenedor.destino.toUpperCase()}',
                  style: TextStyle(fontSize: helper.getFontSize(14), color: Colors.grey[700]),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Capacidad
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Capacidad', style: TextStyle(
                            fontSize: helper.getFontSize(12), color: Colors.grey[600])),
                          Text(
                            '${contenedor.itemsActuales} / ${contenedor.capacidadMaxima}',
                            style: TextStyle(
                              fontSize: helper.getFontSize(12),
                              fontWeight: FontWeight.bold,
                              color: contenedor.estaLleno ? AppTheme.errorColor : AppTheme.almacenUSAColor,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      LinearProgressIndicator(
                        value: contenedor.porcentajeLlenado,
                        backgroundColor: Colors.grey[200],
                        valueColor: AlwaysStoppedAnimation<Color>(
                          contenedor.estaLleno ? AppTheme.errorColor : AppTheme.almacenUSAColor,
                        ),
                        minHeight: 8,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                if (contenedor.estaLleno)
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.errorColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.warning, color: AppTheme.errorColor, size: 20),
                  ),
              ],
            ),

            const SizedBox(height: 12),

            // Peso y volumen
            Row(
              children: [
                Icon(Icons.scale, size: 14, color: Colors.grey[500]),
                const SizedBox(width: 6),
                Text(
                  '${contenedor.pesoTotal.toStringAsFixed(1)} kg',
                  style: TextStyle(fontSize: helper.getFontSize(12), color: Colors.grey[500]),
                ),
                const SizedBox(width: 16),
                Icon(Icons.straighten, size: 14, color: Colors.grey[500]),
                const SizedBox(width: 6),
                Text(
                  '${contenedor.volumenTotal.toStringAsFixed(2)} m³',
                  style: TextStyle(fontSize: helper.getFontSize(12), color: Colors.grey[500]),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Botones de acción
            _buildBotonesAccion(contenedor, empleadoNombre, helper),
          ],
        ),
      ),
    );
  }

  Widget _buildBotonesAccion(ContenedorUSA contenedor, String empleadoNombre, ResponsiveHelper helper) {
    if (contenedor.estado == 'abierto') {
      return Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => _verItems(contenedor),
              icon: const Icon(Icons.list),
              label: const Text('Ver Items'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: contenedor.itemsActuales > 0 
                ? () => _cerrarContenedor(contenedor.id, empleadoNombre) 
                : null,
              icon: const Icon(Icons.lock),
              label: const Text('Cerrar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.warningColor,
              ),
            ),
          ),
        ],
      );
    }

    if (contenedor.estado == 'cerrado') {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () => _enviarContenedor(contenedor.id),
          icon: const Icon(Icons.local_shipping),
          label: const Text('Enviar a RD'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.almacenUSAColor,
          ),
        ),
      );
    }

    // Estado enviado o recibido - solo ver items
    return OutlinedButton.icon(
      onPressed: () => _verItems(contenedor),
      icon: const Icon(Icons.list),
      label: const Text('Ver Items'),
    );
  }

  Widget _buildEstadoBadge(String estado, ResponsiveHelper helper) {
    final color = _getEstadoColor(estado);
    final texto = _getEstadoTexto(estado);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(texto, style: TextStyle(
        fontSize: helper.getFontSize(12), fontWeight: FontWeight.bold, color: color)),
    );
  }

  // ==================== EMPTY STATE ====================
  Widget _buildEmptyState(ResponsiveHelper helper) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inventory_2, size: 80, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text('No hay contenedores', style: TextStyle(
            fontSize: helper.getFontSize(18), fontWeight: FontWeight.bold, 
            color: Colors.grey[600])),
          const SizedBox(height: 8),
          Text(
            _filtroEstado == 'todos'
              ? 'Crea un nuevo contenedor para empezar'
              : 'No hay contenedores con este estado',
            style: TextStyle(fontSize: helper.getFontSize(14), color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  // ==================== ACCIONES ====================

  Future<void> _mostrarCrearContenedor(String empleadoNombre) async {
    final controller = TextEditingController();

    final numero = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Crear Contenedor'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Número de Contenedor',
            hintText: 'Ej: C001',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Crear'),
          ),
        ],
      ),
    );

    if (numero != null && numero.trim().isNotEmpty) {
      String? id = await _almacenService.crearContenedor(numero.trim(), empleadoNombre);

      if (id != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Contenedor creado exitosamente'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      }
    }
  }

  Future<void> _cerrarContenedor(String contenedorId, String empleadoNombre) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cerrar Contenedor'),
        content: const Text(
          '¿Cerrar este contenedor?\n\n'
          'No podrás agregar más ítems después de cerrarlo.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      bool success = await _almacenService.cerrarContenedor(contenedorId, empleadoNombre);

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Contenedor cerrado'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      }
    }
  }

  Future<void> _enviarContenedor(String contenedorId) async {
    final navieraController = TextEditingController();
    final trackingController = TextEditingController();

    final resultado = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Enviar Contenedor'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: navieraController,
              decoration: const InputDecoration(
                labelText: 'Naviera',
                hintText: 'Ej: Maersk',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: trackingController,
              decoration: const InputDecoration(
                labelText: 'Número de Tracking',
                hintText: 'Ej: TRK123456',
                border: OutlineInputBorder(),
              ),
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
              Navigator.pop(context, {
                'naviera': navieraController.text,
                'tracking': trackingController.text,
              });
            },
            child: const Text('Enviar'),
          ),
        ],
      ),
    );

    if (resultado != null && resultado['naviera']!.isNotEmpty) {
      bool success = await _almacenService.enviarContenedor(
        contenedorId,
        resultado['naviera']!,
        resultado['tracking']!,
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Contenedor enviado'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      }
    }
  }

  Future<void> _verItems(ContenedorUSA contenedor) async {
    final items = await _almacenService.getItemsDeContenedor(contenedor.id);

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Items - ${contenedor.numeroContenedor}'),
        content: SizedBox(
          width: double.maxFinite,
          child: items.isEmpty
            ? const Padding(
                padding: EdgeInsets.all(20),
                child: Text('No hay items en este contenedor'),
              )
            : ListView.builder(
                shrinkWrap: true,
                itemCount: items.length,
                itemBuilder: (context, index) {
                  final item = items[index];
                  return ListTile(
                    leading: const Icon(Icons.inventory),
                    title: Text(item.descripcion),
                    subtitle: Text('Tracking: ${item.numeroTracking}'),
                    trailing: Text('${item.peso}kg'),
                  );
                },
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

  // ==================== HELPERS ====================

  Color _getEstadoColor(String estado) {
    switch (estado) {
      case 'enviado':
      case 'recibido':
        return AppTheme.successColor;
      case 'cerrado':
        return AppTheme.warningColor;
      default:
        return AppTheme.almacenUSAColor;
    }
  }

  String _getEstadoTexto(String estado) {
    switch (estado) {
      case 'cerrado': return 'Cerrado';
      case 'enviado': return 'Enviado';
      case 'recibido': return 'Recibido';
      default: return 'Abierto';
    }
  }
}
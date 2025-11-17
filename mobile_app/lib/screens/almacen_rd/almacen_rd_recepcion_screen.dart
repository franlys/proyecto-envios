library;

// lib/screens/almacen_rd/almacen_rd_recepcion_screen.dart
/// 📦 PANTALLA DE RECEPCIÓN DE CONTENEDORES
/// Gestión de contenedores recibidos en el almacén RD

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/almacen_rd_service.dart';
import '../../models/almacen_rd_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';

class AlmacenRDRecepcionScreen extends StatefulWidget {
  const AlmacenRDRecepcionScreen({super.key});

  @override
  State<AlmacenRDRecepcionScreen> createState() => _AlmacenRDRecepcionScreenState();
}

class _AlmacenRDRecepcionScreenState extends State<AlmacenRDRecepcionScreen> {
  final AlmacenRDService _almacenService = AlmacenRDService();
  String _filtroEstado = 'todos';

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final almacenId = authService.getCurrentUserId() ?? '';
    final empleadoNombre = authService.getEmpleadoNombre() ?? 'Empleado';

    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Recepción de Contenedores'),
            automaticallyImplyLeading: false,
            actions: [
              PopupMenuButton<String>(
                icon: const Icon(Icons.filter_list),
                onSelected: (value) {
                  setState(() {
                    _filtroEstado = value;
                  });
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(value: 'todos', child: Text('Todos')),
                  const PopupMenuItem(value: 'en_transito', child: Text('En Tránsito')),
                  const PopupMenuItem(value: 'recibido', child: Text('Recibidos')),
                  const PopupMenuItem(value: 'procesado', child: Text('Procesados')),
                ],
              ),
            ],
          ),
          body: Column(
            children: [
              // Estadísticas
              _buildEstadisticas(helper),

              // Lista de contenedores
              Expanded(
                child: _buildContenedoresList(almacenId, empleadoNombre, helper),
              ),
            ],
          ),
        );
      },
    );
  }

  // ==================== ESTADÍSTICAS ====================
  Widget _buildEstadisticas(ResponsiveHelper helper) {
    return FutureBuilder<EstadisticasAlmacenRD>(
      future: _almacenService.getEstadisticas(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const SizedBox.shrink();
        }

        final stats = snapshot.data!;

        return Container(
          padding: helper.screenPadding,
          decoration: BoxDecoration(
            color: AppTheme.almacenRDColor.withValues(alpha: 0.1),
            border: Border(
              bottom: BorderSide(color: Colors.grey.shade300),
            ),
          ),
          child: GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: helper.isPhone ? 2 : 4,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: helper.isPhone ? 2.5 : 3.0,
            children: [
              _buildStatCard(
                'Recibidos',
                stats.contenedoresRecibidos.toString(),
                Icons.inbox,
                AppTheme.almacenRDColor,
                helper,
              ),
              _buildStatCard(
                'En Proceso',
                stats.contenedoresEnProceso.toString(),
                Icons.pending,
                AppTheme.warningColor,
                helper,
              ),
              _buildStatCard(
                'Rutas Activas',
                stats.rutasActivas.toString(),
                Icons.local_shipping,
                AppTheme.infoColor,
                helper,
              ),
              _buildStatCard(
                'Entregas Hoy',
                stats.entregasCompletadasHoy.toString(),
                Icons.check_circle,
                AppTheme.successColor,
                helper,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color,
    ResponsiveHelper helper,
  ) {
    return Container(
      padding: EdgeInsets.all(helper.responsiveValue(
        phone: 8,
        tablet: 12,
        desktop: 16,
      )),
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
          Text(
            value,
            style: TextStyle(
              fontSize: helper.getFontSize(18),
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: helper.getFontSize(10),
              color: Colors.grey[600],
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // ==================== LISTA DE CONTENEDORES ====================
  Widget _buildContenedoresList(
    String almacenId,
    String empleadoNombre,
    ResponsiveHelper helper,
  ) {
    return StreamBuilder<List<ContenedorRecibido>>(
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
            return _buildContenedorCard(
              contenedores[index],
              almacenId,
              empleadoNombre,
              helper,
            );
          },
        );
      },
    );
  }

  // ==================== CARD DE CONTENEDOR ====================
  Widget _buildContenedorCard(
    ContenedorRecibido contenedor,
    String almacenId,
    String empleadoNombre,
    ResponsiveHelper helper,
  ) {
    final color = _getEstadoColor(contenedor.estado);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: EdgeInsets.all(helper.responsiveValue(
          phone: 12,
          tablet: 16,
          desktop: 20,
        )),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
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
                Icon(Icons.flight_takeoff, size: 16, color: Colors.grey[600]),
                const SizedBox(width: 8),
                Text(
                  'Procedencia: ${contenedor.procedencia.toUpperCase()}',
                  style: TextStyle(
                    fontSize: helper.getFontSize(14),
                    color: Colors.grey[700],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Fechas
            Row(
              children: [
                Icon(Icons.calendar_today, size: 14, color: Colors.grey[500]),
                const SizedBox(width: 6),
                Text(
                  'Enviado: ${_formatFecha(contenedor.fechaEnvio)}',
                  style: TextStyle(
                    fontSize: helper.getFontSize(12),
                    color: Colors.grey[500],
                  ),
                ),
                const SizedBox(width: 16),
                if (contenedor.fechaRecepcion != null) ...[
                  Icon(Icons.inbox, size: 14, color: Colors.grey[500]),
                  const SizedBox(width: 6),
                  Text(
                    'Recibido: ${_formatFecha(contenedor.fechaRecepcion!)}',
                    style: TextStyle(
                      fontSize: helper.getFontSize(12),
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ],
            ),

            const SizedBox(height: 12),

            // Progreso
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Procesamiento',
                      style: TextStyle(
                        fontSize: helper.getFontSize(12),
                        color: Colors.grey[600],
                      ),
                    ),
                    Text(
                      '${contenedor.itemsProcesados} / ${contenedor.totalItems}',
                      style: TextStyle(
                        fontSize: helper.getFontSize(12),
                        fontWeight: FontWeight.bold,
                        color: AppTheme.almacenRDColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                LinearProgressIndicator(
                  value: contenedor.progresoProcesamiento,
                  backgroundColor: Colors.grey[200],
                  valueColor: AlwaysStoppedAnimation<Color>(
                    contenedor.progresoProcesamiento == 1.0
                        ? AppTheme.successColor
                        : AppTheme.almacenRDColor,
                  ),
                  minHeight: 8,
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Botones de acción
            if (contenedor.estado == 'en_transito')
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _recibirContenedor(
                    contenedor.id,
                    empleadoNombre,
                    almacenId,
                  ),
                  icon: const Icon(Icons.inbox),
                  label: const Text('Marcar como Recibido'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.successColor,
                  ),
                ),
              ),

            if (contenedor.estado == 'recibido')
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _agregarNota(contenedor.id),
                      icon: const Icon(Icons.note_add),
                      label: const Text('Agregar Nota'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _marcarProcesado(contenedor.id),
                      icon: const Icon(Icons.done_all),
                      label: const Text('Procesado'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.almacenRDColor,
                      ),
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
    final color = _getEstadoColor(estado);
    final texto = _getEstadoTexto(estado);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
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

  // ==================== EMPTY STATE ====================
  Widget _buildEmptyState(ResponsiveHelper helper) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.inventory_2,
            size: 80,
            color: Colors.grey[300],
          ),
          const SizedBox(height: 16),
          Text(
            'No hay contenedores',
            style: TextStyle(
              fontSize: helper.getFontSize(18),
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _filtroEstado == 'todos'
                ? 'No se han registrado contenedores'
                : 'No hay contenedores con este estado',
            style: TextStyle(
              fontSize: helper.getFontSize(14),
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  // ==================== ACCIONES ====================
  
  Future<void> _recibirContenedor(
    String contenedorId,
    String empleadoNombre,
    String almacenId,
  ) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Recibir Contenedor'),
        content: const Text(
          '¿Confirmar recepción de este contenedor?\n\n'
          'Esto registrará la fecha y hora de recepción.',
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
      bool success = await _almacenService.recibirContenedor(
        contenedorId,
        empleadoNombre,
        almacenId,
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Contenedor recibido correctamente'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      }
    }
  }

  Future<void> _marcarProcesado(String contenedorId) async {
    bool success = await _almacenService.marcarContenedorProcesado(contenedorId);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Contenedor marcado como procesado'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    }
  }

  Future<void> _agregarNota(String contenedorId) async {
    final controller = TextEditingController();

    final nota = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Agregar Nota'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'Escribe una nota...',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );

    if (nota != null && nota.trim().isNotEmpty) {
      bool success = await _almacenService.agregarNotaContenedor(
        contenedorId,
        nota.trim(),
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Nota agregada'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      }
    }
  }

  // ==================== HELPERS ====================
  
  Color _getEstadoColor(String estado) {
    switch (estado) {
      case 'distribuido':
      case 'procesado':
        return AppTheme.successColor;
      case 'recibido':
        return AppTheme.warningColor;
      default:
        return AppTheme.infoColor;
    }
  }

  String _getEstadoTexto(String estado) {
    switch (estado) {
      case 'recibido':
        return 'Recibido';
      case 'procesado':
        return 'Procesado';
      case 'distribuido':
        return 'Distribuido';
      default:
        return 'En Tránsito';
    }
  }

  String _formatFecha(DateTime fecha) {
    return '${fecha.day}/${fecha.month}/${fecha.year}';
  }
}
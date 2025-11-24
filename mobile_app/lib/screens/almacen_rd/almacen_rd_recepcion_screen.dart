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
  Widget _buildContenedoresList(String almacenId, String empleadoNombre, ResponsiveHelper helper) {
    return StreamBuilder<List<ContenedorRecibido>>(
      stream: _almacenService.getContenedoresStream(
        filtroEstado: _filtroEstado == 'todos' ? null : _filtroEstado,
      ),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, size: 60, color: Colors.red[300]),
                const SizedBox(height: 16),
                Text(
                  'Error al cargar contenedores',
                  style: TextStyle(fontSize: helper.getFontSize(16), color: Colors.red),
                ),
              ],
            ),
          );
        }

        final contenedores = snapshot.data ?? [];

        if (contenedores.isEmpty) {
          return RefreshIndicator(
            onRefresh: () async => setState(() {}),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SizedBox(
                height: MediaQuery.of(context).size.height * 0.5,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.inventory_2_outlined, size: 80, color: Colors.grey[300]),
                      const SizedBox(height: 24),
                      Text(
                        '¡Bienvenido al Almacén RD!',
                        style: TextStyle(
                          fontSize: helper.getFontSize(20),
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[700],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'No hay contenedores disponibles en este momento.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: helper.getFontSize(16),
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Los contenedores aparecerán aquí cuando sean enviados desde USA.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: helper.getFontSize(14),
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async => setState(() {}),
          child: ListView.builder(
            padding: helper.screenPadding,
            itemCount: contenedores.length,
            itemBuilder: (context, index) {
              return _buildContenedorCard(contenedores[index], almacenId, empleadoNombre, helper);
            },
          ),
        );
      },
    );
  }

  // ==================== CARD DE CONTENEDOR ====================
  Widget _buildContenedorCard(ContenedorRecibido contenedor, String almacenId, String empleadoNombre, ResponsiveHelper helper) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: _getEstadoColor(contenedor.estado).withValues(alpha: 0.2),
          child: Icon(Icons.inventory_2, color: _getEstadoColor(contenedor.estado)),
        ),
        title: Text(
          contenedor.numeroContenedor,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Estado: ${_getEstadoTexto(contenedor.estado)}'),
            const SizedBox(height: 4),
            Text('Fecha Envío: ${_formatFecha(contenedor.fechaEnvio)}'),
            if (contenedor.fechaRecepcion != null)
              Text('Recibido: ${_formatFecha(contenedor.fechaRecepcion!)}',
                style: const TextStyle(fontWeight: FontWeight.w500)),
          ],
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildInfoRow('Procedencia:', contenedor.procedencia),
                _buildInfoRow('Items Total:', contenedor.itemsTotal.toString()),
                _buildInfoRow('Items Procesados:', contenedor.itemsProcesados.toString()),
                if (contenedor.recibioPor != null)
                  _buildInfoRow('Recibido por:', contenedor.recibioPor!),
                const SizedBox(height: 8),
                LinearProgressIndicator(
                  value: contenedor.progresoProcesamiento,
                  backgroundColor: Colors.grey[300],
                  valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.almacenRDColor),
                ),
                const SizedBox(height: 4),
                Text(
                  'Progreso: ${(contenedor.progresoProcesamiento * 100).toStringAsFixed(0)}%',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    if (contenedor.estado == 'en_transito') ...[
                      ElevatedButton.icon(
                        onPressed: () => _recibirContenedor(contenedor, almacenId, empleadoNombre),
                        icon: const Icon(Icons.check),
                        label: const Text('Recibir'),
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.successColor),
                      ),
                    ],
                    if (contenedor.estado == 'recibido') ...[
                      ElevatedButton.icon(
                        onPressed: () => _procesarContenedor(contenedor),
                        icon: const Icon(Icons.settings),
                        label: const Text('Procesar'),
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.warningColor),
                      ),
                    ],
                    OutlinedButton.icon(
                      onPressed: () => _verDetallesContenedor(contenedor),
                      icon: const Icon(Icons.info_outline),
                      label: const Text('Detalles'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(value, style: TextStyle(color: Colors.grey[700])),
        ],
      ),
    );
  }

  // ==================== ACCIONES ====================

  Future<void> _recibirContenedor(ContenedorRecibido contenedor, String almacenId, String empleadoNombre) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Recibir Contenedor'),
        content: Text('¿Confirmar recepción del contenedor ${contenedor.numeroContenedor}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.successColor),
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await _almacenService.recibirContenedor(contenedor.id, empleadoNombre, almacenId);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('✅ Contenedor recibido exitosamente')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.errorColor),
          );
        }
      }
    }
  }

  Future<void> _procesarContenedor(ContenedorRecibido contenedor) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Procesar Contenedor'),
        content: Text('¿Marcar contenedor ${contenedor.numeroContenedor} como procesado?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Procesar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await _almacenService.marcarContenedorProcesado(contenedor.id);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('✅ Contenedor marcado como procesado')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.errorColor),
          );
        }
      }
    }
  }

  void _verDetallesContenedor(ContenedorRecibido contenedor) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Detalles - ${contenedor.numeroContenedor}'),
        content: SizedBox(
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDetailRow('Número:', contenedor.numeroContenedor),
                _buildDetailRow('Estado:', _getEstadoTexto(contenedor.estado)),
                _buildDetailRow('Procedencia:', contenedor.procedencia),
                _buildDetailRow('Fecha Envío:', _formatFecha(contenedor.fechaEnvio)),
                if (contenedor.fechaRecepcion != null)
                  _buildDetailRow('Fecha Recepción:', _formatFecha(contenedor.fechaRecepcion!)),
                _buildDetailRow('Items Total:', contenedor.itemsTotal.toString()),
                _buildDetailRow('Items Procesados:', contenedor.itemsProcesados.toString()),
                if (contenedor.recibioPor != null)
                  _buildDetailRow('Recibido por:', contenedor.recibioPor!),
                const SizedBox(height: 16),
                const Text('Progreso de Procesamiento:', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                LinearProgressIndicator(
                  value: contenedor.progresoProcesamiento,
                  backgroundColor: Colors.grey[300],
                  valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.almacenRDColor),
                ),
                const SizedBox(height: 4),
                Text('${(contenedor.progresoProcesamiento * 100).toStringAsFixed(0)}% completado'),
                if (contenedor.notas != null && contenedor.notas!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Text('Notas:', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  ...contenedor.notas!.map((nota) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text('• $nota', style: TextStyle(color: Colors.grey[700])),
                  )),
                ],
              ],
            ),
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

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  // ==================== HELPERS ====================

  Color _getEstadoColor(String estado) {
    switch (estado) {
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
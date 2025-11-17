library;

// lib/screens/admin/admin_config_screen.dart
/// ⚙️ PANTALLA DE CONFIGURACIÓN Y REPORTES
/// Sistema de configuración y generación de reportes (Super Admin)

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/admin_service.dart';
import '../../models/admin_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';

class AdminConfigScreen extends StatefulWidget {
  const AdminConfigScreen({super.key});

  @override
  State<AdminConfigScreen> createState() => _AdminConfigScreenState();
}

class _AdminConfigScreenState extends State<AdminConfigScreen>
    with SingleTickerProviderStateMixin {
  final AdminService _adminService = AdminService();
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Sistema'),
            automaticallyImplyLeading: false,
            bottom: TabBar(
              controller: _tabController,
              tabs: const [
                Tab(icon: Icon(Icons.settings), text: 'Config'),
                Tab(icon: Icon(Icons.assessment), text: 'Reportes'),
                Tab(icon: Icon(Icons.notifications), text: 'Alertas'),
              ],
            ),
          ),
          body: TabBarView(
            controller: _tabController,
            children: [
              _buildConfigTab(helper),
              _buildReportesTab(helper),
              _buildAlertasTab(helper),
            ],
          ),
        );
      },
    );
  }

  // ==================== TAB DE CONFIGURACIÓN ====================
  Widget _buildConfigTab(ResponsiveHelper helper) {
    return FutureBuilder<List<ConfiguracionSistema>>(
      future: _adminService.getConfiguraciones(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final configs = snapshot.data ?? [];

        if (configs.isEmpty) {
          return const Center(child: Text('No hay configuraciones'));
        }

        return ListView.builder(
          padding: helper.screenPadding,
          itemCount: configs.length,
          itemBuilder: (context, index) => _buildConfigCard(configs[index]),
        );
      },
    );
  }

  Widget _buildConfigCard(ConfiguracionSistema config) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: const Icon(Icons.settings),
        title: Text(config.clave, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(config.descripcion),
            Text('Valor: ${config.valor}', style: const TextStyle(
              fontSize: 12, color: AppTheme.adminColor)),
          ],
        ),
        trailing: const Icon(Icons.edit),
        onTap: () => _editarConfiguracion(config),
      ),
    );
  }

  Future<void> _editarConfiguracion(ConfiguracionSistema config) async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final empleadoNombre = authService.getEmpleadoNombre() ?? 'Admin';

    final controller = TextEditingController(text: config.valor.toString());

    final nuevoValor = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Editar ${config.clave}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(config.descripcion),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Nuevo valor',
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
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );

    if (nuevoValor != null) {
      await _adminService.actualizarConfiguracion(
        config.id,
        nuevoValor,
        empleadoNombre,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Configuración actualizada'),
            backgroundColor: AppTheme.successColor),
        );
        setState(() {});
      }
    }
  }

  // ==================== TAB DE REPORTES ====================
  Widget _buildReportesTab(ResponsiveHelper helper) {
    return Padding(
      padding: helper.screenPadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Generar Reportes', style: TextStyle(
            fontSize: helper.getFontSize(18), fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _buildReporteOption('Reporte Financiero', Icons.attach_money,
            'Ingresos, gastos y utilidades por período'),
          _buildReporteOption('Reporte Operativo', Icons.analytics,
            'Envíos, rutas y contenedores'),
          _buildReporteOption('Reporte de Clientes', Icons.people,
            'Clientes activos, nuevos y saldos'),
          _buildReporteOption('Reporte de Usuarios', Icons.admin_panel_settings,
            'Actividad y rendimiento por rol'),
        ],
      ),
    );
  }

  Widget _buildReporteOption(String titulo, IconData icon, String descripcion) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Icon(icon, color: AppTheme.adminColor),
        title: Text(titulo),
        subtitle: Text(descripcion, style: const TextStyle(fontSize: 12)),
        trailing: const Icon(Icons.arrow_forward),
        onTap: () => _generarReporte(titulo),
      ),
    );
  }

  void _generarReporte(String tipo) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Generar $tipo'),
        content: const Text(
          'Funcionalidad de generación de reportes:\n\n'
          '1. Seleccionar período\n'
          '2. Elegir formato (PDF/Excel)\n'
          '3. Generar y descargar\n\n'
          'Implementar con librerías de PDF/Excel',
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

  // ==================== TAB DE ALERTAS ====================
  Widget _buildAlertasTab(ResponsiveHelper helper) {
    return StreamBuilder<List<AlertaSistema>>(
      stream: _adminService.getAlertasStream(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final alertas = snapshot.data ?? [];

        if (alertas.isEmpty) {
          return const Center(child: Text('No hay alertas'));
        }

        return ListView.builder(
          padding: helper.screenPadding,
          itemCount: alertas.length,
          itemBuilder: (context, index) => _buildAlertaCard(alertas[index]),
        );
      },
    );
  }

  Widget _buildAlertaCard(AlertaSistema alerta) {
    final color = _getAlertaColor(alerta.tipo);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: alerta.leida ? null : color.withValues(alpha: 0.05),
      child: ListTile(
        leading: Icon(_getAlertaIcon(alerta.tipo), color: color),
        title: Text(alerta.titulo, style: TextStyle(
          fontWeight: alerta.leida ? FontWeight.normal : FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(alerta.mensaje),
            Text(_formatFecha(alerta.fecha), style: const TextStyle(fontSize: 11)),
          ],
        ),
        trailing: alerta.leida
          ? null
          : IconButton(
              icon: const Icon(Icons.check, color: AppTheme.successColor),
              onPressed: () => _marcarAlertaLeida(alerta.id),
            ),
      ),
    );
  }

  Future<void> _marcarAlertaLeida(String alertaId) async {
    await _adminService.marcarAlertaLeida(alertaId);
  }

  Color _getAlertaColor(String tipo) {
    switch (tipo) {
      case 'error': return AppTheme.errorColor;
      case 'warning': return AppTheme.warningColor;
      case 'success': return AppTheme.successColor;
      default: return AppTheme.infoColor;
    }
  }

  IconData _getAlertaIcon(String tipo) {
    switch (tipo) {
      case 'error': return Icons.error;
      case 'warning': return Icons.warning;
      case 'success': return Icons.check_circle;
      default: return Icons.info;
    }
  }

  String _formatFecha(DateTime fecha) {
    return '${fecha.day}/${fecha.month}/${fecha.year} ${fecha.hour}:${fecha.minute.toString().padLeft(2, '0')}';
  }
}
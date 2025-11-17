library;

// lib/screens/admin/admin_dashboard_screen.dart
/// 👔 PANTALLA DE DASHBOARD ADMIN
/// Vista ejecutiva con KPIs y métricas globales

import 'package:flutter/material.dart';
import '../../services/admin_service.dart';
import '../../models/admin_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final AdminService _adminService = AdminService();

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Dashboard Ejecutivo'),
            automaticallyImplyLeading: false,
          ),
          body: RefreshIndicator(
            onRefresh: () async => setState(() {}),
            child: SingleChildScrollView(
              padding: helper.screenPadding,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildEstadisticasGlobales(helper),
                  const SizedBox(height: 24),
                  _buildResumenFinanciero(helper),
                  const SizedBox(height: 24),
                  _buildMetricasPorRol(helper),
                  const SizedBox(height: 24),
                  _buildActividadReciente(helper),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildEstadisticasGlobales(ResponsiveHelper helper) {
    return FutureBuilder<EstadisticasGlobales>(
      future: _adminService.getEstadisticasGlobales(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        final stats = snapshot.data!;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Vista General', style: TextStyle(
              fontSize: helper.getFontSize(18), fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: helper.isPhone ? 2 : 4,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: helper.isPhone ? 1.5 : 2.0,
              children: [
                _buildStatCard('Usuarios', stats.totalUsuarios.toString(),
                  Icons.people, AppTheme.adminColor, helper),
                _buildStatCard('Clientes', stats.totalClientes.toString(),
                  Icons.person, AppTheme.secretariaColor, helper),
                _buildStatCard('Envíos Activos', stats.enviosEnProceso.toString(),
                  Icons.local_shipping, AppTheme.infoColor, helper),
                _buildStatCard('Contenedores', stats.contenedoresEnTransito.toString(),
                  Icons.inventory, AppTheme.warningColor, helper),
                _buildStatCard('Rutas Activas', stats.rutasActivas.toString(),
                  Icons.route, AppTheme.recolectorColor, helper),
                _buildStatCard('Tickets', stats.ticketsAbiertos.toString(),
                  Icons.support_agent, AppTheme.errorColor, helper),
                _buildStatCard('Ingresos Mes', '\$${(stats.ingresosMensuales / 1000).toStringAsFixed(1)}K',
                  Icons.attach_money, AppTheme.successColor, helper),
                _buildStatCard('Ingresos Año', '\$${(stats.ingresosAnuales / 1000).toStringAsFixed(1)}K',
                  Icons.trending_up, AppTheme.adminColor, helper),
              ],
            ),
          ],
        );
      },
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color, ResponsiveHelper helper) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 28, color: color),
            const SizedBox(height: 6),
            Text(value, style: TextStyle(fontSize: helper.getFontSize(20),
              fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(fontSize: helper.getFontSize(10),
              color: Colors.grey[600]), textAlign: TextAlign.center, maxLines: 2),
          ],
        ),
      ),
    );
  }

  Widget _buildResumenFinanciero(ResponsiveHelper helper) {
    return FutureBuilder<ResumenFinancieroAdmin>(
      future: _adminService.getResumenFinanciero(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const SizedBox.shrink();

        final resumen = snapshot.data!;

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Resumen Financiero', style: TextStyle(
                  fontSize: helper.getFontSize(16), fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                _buildMontoRow('Hoy:', resumen.ingresosDiarios, AppTheme.successColor),
                _buildMontoRow('Semana:', resumen.ingresosSemanales, AppTheme.infoColor),
                _buildMontoRow('Mes:', resumen.ingresosMensuales, AppTheme.adminColor),
                _buildMontoRow('Año:', resumen.ingresosAnuales, AppTheme.warningColor),
                const Divider(),
                _buildMontoRow('Por Cobrar:', resumen.cuentasPorCobrar, AppTheme.errorColor),
                _buildMontoRow('Utilidad:', resumen.utilidadNeta, AppTheme.successColor),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMontoRow(String label, double monto, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 14)),
          Text('\$${monto.toStringAsFixed(2)}',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _buildMetricasPorRol(ResponsiveHelper helper) {
    return FutureBuilder<List<MetricasPorRol>>(
      future: _adminService.getMetricasPorRol(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const SizedBox.shrink();

        final metricas = snapshot.data!;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Usuarios por Rol', style: TextStyle(
              fontSize: helper.getFontSize(16), fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ...metricas.map((m) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: const Icon(Icons.people),
                title: Text(_getRolNombre(m.rol)),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('${m.activos} activos', style: const TextStyle(
                      color: AppTheme.successColor, fontSize: 12)),
                    const SizedBox(width: 8),
                    Text('${m.inactivos} inactivos', style: const TextStyle(
                      color: AppTheme.errorColor, fontSize: 12)),
                  ],
                ),
              ),
            )),
          ],
        );
      },
    );
  }

  Widget _buildActividadReciente(ResponsiveHelper helper) {
    return FutureBuilder<List<ActividadSistema>>(
      future: _adminService.getActividadesRecientes(limit: 10),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const SizedBox.shrink();

        final actividades = snapshot.data!;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Actividad Reciente', style: TextStyle(
              fontSize: helper.getFontSize(16), fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ...actividades.take(5).map((a) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: Icon(_getActividadIcon(a.tipo)),
                title: Text(a.descripcion, style: const TextStyle(fontSize: 13)),
                subtitle: Text('${a.usuarioNombre} - ${_formatFecha(a.fecha)}',
                  style: const TextStyle(fontSize: 11)),
              ),
            )),
          ],
        );
      },
    );
  }

  String _getRolNombre(String rol) {
    switch (rol) {
      case 'superAdmin': return 'Super Admin';
      case 'admin': return 'Admin General';
      case 'secretaria': return 'Secretaria';
      case 'almacenUSA': return 'Almacén USA';
      case 'almacenRD': return 'Almacén RD';
      case 'cargador': return 'Cargador';
      case 'recolector': return 'Recolector';
      case 'repartidor': return 'Repartidor';
      default: return rol;
    }
  }

  IconData _getActividadIcon(String tipo) {
    switch (tipo) {
      case 'login': return Icons.login;
      case 'logout': return Icons.logout;
      case 'create': return Icons.add_circle;
      case 'update': return Icons.edit;
      case 'delete': return Icons.delete;
      default: return Icons.info;
    }
  }

  String _formatFecha(DateTime fecha) {
    return '${fecha.day}/${fecha.month} ${fecha.hour}:${fecha.minute.toString().padLeft(2, '0')}';
  }
}
// lib/screens/secretaria/secretaria_dashboard_screen.dart
/// 💼 PANTALLA DE DASHBOARD SECRETARIA
/// Vista general con estadísticas y actividades
library;


import 'package:flutter/material.dart';
import '../../services/secretaria_service.dart';
import '../../models/secretaria_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';

class SecretariaDashboardScreen extends StatefulWidget {
  const SecretariaDashboardScreen({super.key});

  @override
  State<SecretariaDashboardScreen> createState() => _SecretariaDashboardScreenState();
}

class _SecretariaDashboardScreenState extends State<SecretariaDashboardScreen> {
  final SecretariaService _secretariaService = SecretariaService();

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Dashboard'),
            automaticallyImplyLeading: false,
          ),
          body: RefreshIndicator(
            onRefresh: () async => setState(() {}),
            child: SingleChildScrollView(
              padding: helper.screenPadding,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildEstadisticas(helper),
                  const SizedBox(height: 24),
                  _buildResumenFinanciero(helper),
                  const SizedBox(height: 24),
                  _buildAccesosRapidos(helper),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ==================== ESTADÍSTICAS ====================
  Widget _buildEstadisticas(ResponsiveHelper helper) {
    return FutureBuilder<EstadisticasSecretaria>(
      future: _secretariaService.getEstadisticas(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError || !snapshot.hasData) {
          return _buildEmptyState(helper);
        }

        final stats = snapshot.data!;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Resumen Operativo', style: TextStyle(
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
                _buildStatCard('Clientes Activos', stats.clientesActivos.toString(),
                  Icons.people, AppTheme.secretariaColor, helper),
                _buildStatCard('Tickets Abiertos', stats.ticketsAbiertos.toString(),
                  Icons.support_agent, AppTheme.warningColor, helper),
                _buildStatCard('Facturas Pendientes', stats.facturaspendientes.toString(),
                  Icons.receipt, AppTheme.errorColor, helper),
                _buildStatCard('Pagos Hoy', stats.pagosHoy.toString(),
                  Icons.payment, AppTheme.successColor, helper),
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
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(value, style: TextStyle(
              fontSize: helper.getFontSize(24), fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: helper.getFontSize(12),
              color: Colors.grey[600]), textAlign: TextAlign.center, maxLines: 2),
          ],
        ),
      ),
    );
  }

  // ==================== RESUMEN FINANCIERO ====================
  Widget _buildResumenFinanciero(ResponsiveHelper helper) {
    return FutureBuilder<ResumenFinanciero>(
      future: _secretariaService.getResumenFinanciero(),
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
                _buildMontoRow('Esta Semana:', resumen.ingresosSemanales, AppTheme.infoColor),
                _buildMontoRow('Este Mes:', resumen.ingresosMensuales, AppTheme.secretariaColor),
                const Divider(),
                _buildMontoRow('Por Cobrar:', resumen.cuentasPorCobrar, AppTheme.warningColor),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMontoRow(String label, double monto, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 14)),
          Text('\$${monto.toStringAsFixed(2)}',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  // ==================== ACCESOS RÁPIDOS ====================
  Widget _buildAccesosRapidos(ResponsiveHelper helper) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Accesos Rápidos', style: TextStyle(
          fontSize: helper.getFontSize(18), fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: helper.isPhone ? 2 : 4,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.5,
          children: [
            _buildAccesoCard('Nuevo Cliente', Icons.person_add, AppTheme.successColor, () {}),
            _buildAccesoCard('Registrar Pago', Icons.payment, AppTheme.infoColor, () {}),
            _buildAccesoCard('Nuevo Ticket', Icons.support_agent, AppTheme.warningColor, () {}),
            _buildAccesoCard('Ver Facturas', Icons.receipt, AppTheme.errorColor, () {}),
          ],
        ),
      ],
    );
  }

  Widget _buildAccesoCard(String label, IconData icon, Color color, VoidCallback onTap) {
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(label, textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }

  // ==================== ESTADO VACÍO ====================
  Widget _buildEmptyState(ResponsiveHelper helper) {
    return Center(
      child: Padding(
        padding: helper.screenPadding,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.dashboard_outlined,
              size: 80,
              color: Colors.grey[300],
            ),
            const SizedBox(height: 24),
            Text(
              '¡Bienvenido/a!',
              style: TextStyle(
                fontSize: helper.getFontSize(24),
                fontWeight: FontWeight.bold,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Aún no hay datos disponibles.\nComienza a registrar clientes y operaciones.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: helper.getFontSize(16),
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 32),
            Icon(
              Icons.arrow_downward,
              size: 40,
              color: AppTheme.secretariaColor.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 8),
            Text(
              'Usa los accesos rápidos para empezar',
              style: TextStyle(
                fontSize: helper.getFontSize(14),
                color: AppTheme.secretariaColor,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
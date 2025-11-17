// lib/screens/recolector/recolector_puntos_screen.dart
/// 📍 PANTALLA DE PUNTOS DE RECOLECCIÓN
/// Gestionar puntos de recolección de una ruta específica
library;

import 'package:flutter/material.dart';
import '../../services/recolector_service.dart';
import '../../models/recolector_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';

class RecolectorPuntosScreen extends StatefulWidget {
  final String rutaId;

  const RecolectorPuntosScreen({
    super.key,
    required this.rutaId,
  });

  @override
  State<RecolectorPuntosScreen> createState() => _RecolectorPuntosScreenState();
}

class _RecolectorPuntosScreenState extends State<RecolectorPuntosScreen> {
  final RecolectorService _recolectorService = RecolectorService();
  RutaRecoleccion? _ruta;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _cargarRuta();
  }

  Future<void> _cargarRuta() async {
    try {
      final rutaData = await _recolectorService.getRuta(widget.rutaId);
      if (rutaData != null && mounted) {
        setState(() {
          _ruta = RutaRecoleccion.fromMap(rutaData);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Puntos de Recolección'),
          ),
          body: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _ruta == null
                  ? const Center(child: Text('Ruta no encontrada'))
                  : Column(
                      children: [
                        _buildHeader(_ruta!, helper),
                        Expanded(
                          child: _buildPuntosList(_ruta!, helper),
                        ),
                        if (_ruta!.progresoRecoleccion == 1.0 && _ruta!.estado != 'completada')
                          _buildCompletarButton(_ruta!, helper),
                      ],
                    ),
        );
      },
    );
  }

  // ==================== HEADER ====================
  Widget _buildHeader(RutaRecoleccion ruta, ResponsiveHelper helper) {
    return Container(
      padding: helper.screenPadding,
      decoration: BoxDecoration(
        color: AppTheme.recolectorColor.withOpacity(0.1),
        border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Ruta ${ruta.numeroRuta}',
            style: TextStyle(
              fontSize: helper.getFontSize(20),
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.location_city, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 8),
              Text(
                ZonasRecoleccion.getNombre(ruta.zona),
                style: TextStyle(fontSize: helper.getFontSize(14)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: ruta.progresoRecoleccion,
            backgroundColor: Colors.grey[200],
            valueColor: AlwaysStoppedAnimation<Color>(
              ruta.progresoRecoleccion == 1.0 
                ? AppTheme.successColor 
                : AppTheme.recolectorColor,
            ),
            minHeight: 8,
          ),
          const SizedBox(height: 4),
          Text(
            '${ruta.puntosCompletados} de ${ruta.totalPuntos} puntos completados',
            style: TextStyle(fontSize: helper.getFontSize(12), color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  // ==================== LISTA DE PUNTOS ====================
  Widget _buildPuntosList(RutaRecoleccion ruta, ResponsiveHelper helper) {
    return ListView.builder(
      padding: helper.screenPadding,
      itemCount: ruta.puntos.length,
      itemBuilder: (context, index) {
        return _buildPuntoCard(ruta, index, ruta.puntos[index], helper);
      },
    );
  }

  // ==================== CARD DE PUNTO ====================
  Widget _buildPuntoCard(RutaRecoleccion ruta, int index, PuntoRecoleccion punto, ResponsiveHelper helper) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: punto.recolectado ? AppTheme.successColor.withOpacity(0.05) : null,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: punto.recolectado 
            ? AppTheme.successColor.withOpacity(0.2)
            : AppTheme.recolectorColor.withOpacity(0.2),
          child: Icon(
            punto.recolectado ? Icons.check_circle : Icons.location_on,
            color: punto.recolectado ? AppTheme.successColor : AppTheme.recolectorColor,
          ),
        ),
        title: Text(
          punto.clienteNombre,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(punto.direccion),
            Text('Tel: ${punto.clienteTelefono}'),
            Text('Paquetes: ${punto.cantidadPaquetes}'),
            if (punto.motivoNoRecoleccion != null)
              Text(
                'No recolectado: ${punto.motivoNoRecoleccion}',
                style: const TextStyle(color: AppTheme.errorColor),
              ),
          ],
        ),
        trailing: punto.recolectado 
          ? null 
          : IconButton(
              icon: const Icon(Icons.check),
              onPressed: () => _mostrarRecolectar(ruta, index, punto),
              color: AppTheme.successColor,
            ),
        onTap: () => _verDetallePunto(punto),
      ),
    );
  }

  // ==================== BOTÓN COMPLETAR RUTA ====================
  Widget _buildCompletarButton(RutaRecoleccion ruta, ResponsiveHelper helper) {
    return Container(
      padding: helper.screenPadding,
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: SizedBox(
          width: double.infinity,
          height: helper.responsiveValue(phone: 50, tablet: 56, desktop: 60),
          child: ElevatedButton.icon(
            onPressed: () => _completarRuta(ruta),
            icon: const Icon(Icons.done_all),
            label: const Text('Completar Ruta'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.successColor,
            ),
          ),
        ),
      ),
    );
  }

  // ==================== ACCIONES ====================

  Future<void> _mostrarRecolectar(RutaRecoleccion ruta, int index, PuntoRecoleccion punto) async {
    final formKey = GlobalKey<FormState>();
    final observacionesController = TextEditingController();

    final resultado = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Recolectar - ${punto.clienteNombre}'),
        content: SingleChildScrollView(
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('${punto.cantidadPaquetes} paquetes'),
                const SizedBox(height: 16),
                TextFormField(
                  controller: observacionesController,
                  decoration: const InputDecoration(
                    labelText: 'Observaciones (opcional)',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, 'no_recolectado'),
            child: const Text('No Recolectado'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, 'recolectado'),
            child: const Text('Recolectado'),
          ),
        ],
      ),
    );

    if (resultado == 'recolectado') {
      bool success = await _recolectorService.marcarPuntoRecolectado(
        rutaId: ruta.id,
        puntoId: punto.id,
        paquetesRecolectados: punto.cantidadPaquetes,
        observaciones: observacionesController.text.trim().isNotEmpty 
          ? observacionesController.text.trim() 
          : null,
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Punto recolectado'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        await _cargarRuta(); // Recargar
      }
    } else if (resultado == 'no_recolectado') {
      await _mostrarMotivoNoRecoleccion(ruta, index, punto);
    }
  }

  Future<void> _mostrarMotivoNoRecoleccion(RutaRecoleccion ruta, int index, PuntoRecoleccion punto) async {
    String? motivo = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Motivo No Recolección'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('Cliente ausente'),
              onTap: () => Navigator.pop(context, 'Cliente ausente'),
            ),
            ListTile(
              title: const Text('Dirección incorrecta'),
              onTap: () => Navigator.pop(context, 'Dirección incorrecta'),
            ),
            ListTile(
              title: const Text('Paquetes no listos'),
              onTap: () => Navigator.pop(context, 'Paquetes no listos'),
            ),
            ListTile(
              title: const Text('Otro'),
              onTap: () => Navigator.pop(context, 'Otro'),
            ),
          ],
        ),
      ),
    );

    if (motivo != null) {
      bool success = await _recolectorService.marcarPuntoNoRecolectado(
        rutaId: ruta.id,
        puntoId: punto.id,
        motivo: motivo,
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Registrado como no recolectado'),
            backgroundColor: AppTheme.warningColor,
          ),
        );
        await _cargarRuta(); // Recargar
      }
    }
  }

  Future<void> _completarRuta(RutaRecoleccion ruta) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Completar Ruta'),
        content: const Text('¿Marcar esta ruta como completada?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Completar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      bool success = await _recolectorService.completarRuta(ruta.id);

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Ruta completada'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        Navigator.pop(context);
      }
    }
  }

  void _verDetallePunto(PuntoRecoleccion punto) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(punto.clienteNombre),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildInfoRow('Dirección:', punto.getDireccionCompleta()),
              _buildInfoRow('Teléfono:', punto.clienteTelefono),
              _buildInfoRow('Paquetes:', punto.cantidadPaquetes.toString()),
              if (punto.referencia != null)
                _buildInfoRow('Referencia:', punto.referencia!),
              if (punto.observaciones != null)
                _buildInfoRow('Observaciones:', punto.observaciones!),
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
}
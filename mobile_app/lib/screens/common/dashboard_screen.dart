// lib/screens/common/dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final rol = authService.getRoleName() ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        automaticallyImplyLeading: false,
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.blue.shade50,
              Colors.white,
            ],
          ),
        ),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade100,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.dashboard,
                    size: 80,
                    color: Colors.blue,
                  ),
                ),
                const SizedBox(height: 32),
                Text(
                  '¡Bienvenido/a!',
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  authService.getEmpleadoNombre() ?? "Usuario",
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w500,
                    color: Colors.grey[700],
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.blue.withValues(alpha: 0.1),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _getRolIcon(rol),
                        size: 20,
                        color: Colors.blue,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        rol,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.blue,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 48),
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        Icon(
                          Icons.info_outline,
                          size: 48,
                          color: Colors.blue.shade300,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _getRolMessage(rol),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 15,
                            color: Colors.grey[700],
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Usa el menú de navegación para comenzar',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[500],
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  IconData _getRolIcon(String rol) {
    switch (rol.toLowerCase()) {
      case 'super admin':
      case 'admin':
        return Icons.admin_panel_settings;
      case 'secretaria':
        return Icons.person;
      case 'almacén usa':
        return Icons.inventory_2;
      case 'almacén rd':
        return Icons.warehouse;
      case 'cargador':
        return Icons.local_shipping;
      case 'recolector':
        return Icons.route;
      case 'repartidor':
        return Icons.delivery_dining;
      default:
        return Icons.person;
    }
  }

  String _getRolMessage(String rol) {
    switch (rol.toLowerCase()) {
      case 'super admin':
      case 'admin':
        return 'Tienes acceso completo al sistema.\nGestiona usuarios, monitorea operaciones y visualiza reportes.';
      case 'secretaria':
        return 'Gestiona clientes, registra pagos y atiende tickets de soporte.';
      case 'almacén usa':
        return 'Administra contenedores y el inventario en Estados Unidos.';
      case 'almacén rd':
        return 'Recibe contenedores y gestiona el inventario en República Dominicana.';
      case 'cargador':
        return 'Carga vehículos y verifica los items de cada ruta.';
      case 'recolector':
        return 'Recolecta paquetes en puntos designados según tu ruta asignada.';
      case 'repartidor':
        return 'Entrega paquetes a los clientes y gestiona tus rutas diarias.';
      default:
        return 'Explora las opciones disponibles en el menú de navegación.';
    }
  }
}
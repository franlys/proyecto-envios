// lib/screens/secretaria/secretaria_dashboard_screen.dart
/// 👩‍💼 DASHBOARD DE SECRETARIA
/// Pantalla principal para gestión de rutas y clientes

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../core/theme/role_colors.dart';
import '../../widgets/common/custom_card.dart';
import '../../widgets/common/stat_card.dart';
import 'mis_rutas_secretaria_screen.dart';

class SecretariaDashboardScreen extends StatelessWidget {
  const SecretariaDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final roleColor = RoleColors.getPrimaryColor(authService.getUserRole());

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Header de Bienvenida
          _buildWelcomeHeader(authService, roleColor),
          
          const SizedBox(height: 24),
          
          // 2. Accesos Rápidos
          Text(
            'Gestión Rápida',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          
          Row(
            children: [
              Expanded(
                child: CustomCard(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const MisRutasSecretariaScreen()),
                    );
                  },
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.map, size: 40, color: roleColor),
                      const SizedBox(height: 12),
                      const Text(
                        'Gestionar Rutas',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Asignar y monitorear',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: CustomCard(
                  onTap: () {
                    // TODO: Navegar a gestión de clientes
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Gestión de Clientes próximamente')),
                    );
                  },
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.people, size: 40, color: Colors.orange),
                      const SizedBox(height: 12),
                      const Text(
                        'Clientes',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Directorio y contacto',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // 3. Resumen (Placeholder por ahora)
          Text(
            'Resumen del Día',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          StatCard(
            title: 'Rutas Activas',
            value: '5', // TODO: Conectar con API real
            icon: Icons.local_shipping,
            color: Colors.blue,
          ),
        ],
      ),
    );
  }

  Widget _buildWelcomeHeader(AuthService authService, Color roleColor) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [roleColor, roleColor.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: roleColor.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: Colors.white.withOpacity(0.2),
            child: const Icon(Icons.person, size: 36, color: Colors.white),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Hola,',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                ),
                Text(
                  authService.getEmpleadoNombre() ?? 'Secretaria',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// lib/navigation/main_scaffold.dart
/// 🏗️ SCAFFOLD PRINCIPAL DE LA APLICACIÓN
/// Contiene la navegación y estructura principal según el rol del usuario
library;


import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../core/responsive/responsive.dart';
import 'role_navigator.dart';

class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final userRole = authService.getUserRole();
    
    // Obtener pantallas según el rol
    final screens = RoleNavigator.getScreensForRole(userRole ?? '');
    final drawerItems = RoleNavigator.getDrawerItems(userRole ?? '');

    return ResponsiveBuilder(
      builder: (context, helper) {
        // Verificar si hay pantallas para mostrar
        if (screens.isEmpty) {
          return Scaffold(
            appBar: AppBar(title: const Text('Error')),
            body: const Center(
              child: Text('No hay pantallas configuradas para este rol'),
            ),
          );
        }

        // DESKTOP/TABLET - Navigation Rail
        if (helper.isTablet || helper.isDesktop) {
          return Scaffold(
            body: Row(
              children: [
                // Navigation Rail
                NavigationRail(
                  selectedIndex: _currentIndex,
                  onDestinationSelected: (index) {
                    setState(() => _currentIndex = index);
                  },
                  labelType: NavigationRailLabelType.all,
                  leading: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Column(
                      children: [
                        const CircleAvatar(
                          radius: 24,
                          child: Icon(Icons.person, size: 28),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          authService.getEmpleadoNombre() ?? 'Usuario',
                          style: const TextStyle(fontSize: 12),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  trailing: Expanded(
                    child: Align(
                      alignment: Alignment.bottomCenter,
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: IconButton(
                          icon: const Icon(Icons.logout),
                          onPressed: () => _logout(context, authService),
                          tooltip: 'Cerrar Sesión',
                        ),
                      ),
                    ),
                  ),
                  destinations: screens.map((item) {
                    return NavigationRailDestination(
                      icon: Icon(item.icon),
                      label: Text(item.label),
                    );
                  }).toList(),
                ),
                
                // Divider vertical
                const VerticalDivider(thickness: 1, width: 1),
                
                // Contenido principal
                Expanded(
                  child: screens[_currentIndex].screen,
                ),
              ],
            ),
          );
        }

        // MOBILE - Bottom Navigation
        return Scaffold(
          appBar: AppBar(
            title: Text(screens[_currentIndex].label),
            actions: [
              IconButton(
                icon: const Icon(Icons.logout),
                onPressed: () => _logout(context, authService),
                tooltip: 'Cerrar Sesión',
              ),
            ],
          ),
          drawer: _buildDrawer(context, authService, drawerItems),
          body: screens[_currentIndex].screen,
          bottomNavigationBar: BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) {
              setState(() => _currentIndex = index);
            },
            type: BottomNavigationBarType.fixed,
            items: screens.map((item) {
              return BottomNavigationBarItem(
                icon: Icon(item.icon),
                label: item.label,
              );
            }).toList(),
          ),
        );
      },
    );
  }

  // ==================== DRAWER ====================
  Widget _buildDrawer(
    BuildContext context,
    AuthService authService,
    List<DrawerItem> drawerItems,
  ) {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          // Header del drawer
          DrawerHeader(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Theme.of(context).primaryColor,
                  Theme.of(context).primaryColor.withOpacity(0.7),
                ],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const CircleAvatar(
                  radius: 32,
                  child: Icon(Icons.person, size: 36),
                ),
                const SizedBox(height: 12),
                Text(
                  authService.getEmpleadoNombre() ?? 'Usuario',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  authService.getRoleName() ?? '',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),

          // Items del drawer
          ...drawerItems.map((item) {
            return ListTile(
              leading: Icon(item.icon),
              title: Text(item.title),
              onTap: () {
                Navigator.pop(context); // Cerrar drawer
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => item.screen),
                );
              },
            );
          }),

          const Divider(),

          // Cerrar sesión
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Cerrar Sesión', style: TextStyle(color: Colors.red)),
            onTap: () {
              Navigator.pop(context);
              _logout(context, authService);
            },
          ),
        ],
      ),
    );
  }

  // ==================== LOGOUT ====================
  Future<void> _logout(BuildContext context, AuthService authService) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cerrar Sesión'),
        content: const Text('¿Estás seguro que deseas cerrar sesión?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Cerrar Sesión'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await authService.logout();
      // La navegación se maneja automáticamente por el AuthWrapper
    }
  }
}
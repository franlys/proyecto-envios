// lib/navigation/role_navigator.dart
library;

/// 🧭 NAVEGADOR POR ROL
/// Define las pantallas que ve cada rol del sistema

import 'package:flutter/material.dart';
// 💡 FIX: La importación de 'cargador_checklist_screen.dart' falla porque el archivo no existe.
// import 'package:mobile_app/screens/cargadores/cargador_checklist_screen.dart';

// 💡 FIX: Esta importación es incorrecta. Está importando 'CargadorService' y no la pantalla.
// Debes renombrar tu archivo de servicio a 'cargador_service.dart' y asegurarte
// de que este import apunte al *archivo de la pantalla* (Widget).
// import 'package:mobile_app/screens/cargadores/cargador_rutas_screen.dart';

import '../models/app_roles.dart';

// ==================== SCREENS COMUNES ====================
import '../screens/common/dashboard_screen.dart';
import '../screens/common/profile_screen.dart';
import '../screens/common/settings_screen.dart';
import '../screens/common/help_screen.dart';

// ==================== SCREENS DE CARGADOR ====================
// (Importaciones comentadas arriba)

// ==================== SCREENS DE ALMACÉN RD ====================
import '../screens/almacen_rd/almacen_rd_recepcion_screen.dart';
import '../screens/almacen_rd/almacen_rd_rutas_screen.dart';
import '../screens/almacen_rd/almacen_rd_facturas_screen.dart';

// ==================== SCREENS DE ALMACÉN USA ====================
import '../screens/almacen_usa/almacen_usa_inventario_screen.dart';
import '../screens/almacen_usa/almacen_usa_asignacion_screen.dart';
// 💡 FIX: Importación añadida para la pantalla de contenedores
import '../screens/almacen_usa/almacen_usa_contenedores_screen.dart';


// ==================== SCREENS DE RECOLECTOR ====================
import '../screens/recolector/recolector_rutas_screen.dart';
import '../screens/recolector/recolector_puntos_screen.dart';
import '../screens/recolector/recolector_historial_screen.dart';

// ==================== SCREENS DE SECRETARIA ====================
import '../screens/secretarias/secretaria_dashboard_screen.dart';
import '../screens/secretarias/secretaria_clientes_screen.dart';
import '../screens/secretarias/secretaria_operaciones_screen.dart';

// ==================== SCREENS DE ADMIN ====================
import '../screens/admin/admin_dashboard_screen.dart';
import '../screens/admin/admin_usuarios_screen.dart';
import '../screens/admin/admin_config_screen.dart';

// ==================== MODELO DE NAVEGACIÓN ====================
class BottomNavItem {
  final IconData icon;
  final String label;
  final Widget screen;

  BottomNavItem({
    required this.icon,
    required this.label,
    required this.screen,
  });
}

// ==================== NAVEGADOR PRINCIPAL ====================
class RoleNavigator {
  /// Retorna las pantallas según el rol del usuario
  static List<BottomNavItem> getScreensForRole(String role) {
    switch (role) {
      // ==================== SUPER ADMIN ====================
      case AppRoles.superAdmin:
        return [
          BottomNavItem(
            icon: Icons.dashboard,
            label: 'Dashboard',
            screen: const AdminDashboardScreen(),
          ),
          BottomNavItem(
            icon: Icons.people,
            label: 'Usuarios',
            screen: const AdminUsuariosScreen(),
          ),
          BottomNavItem(
            icon: Icons.admin_panel_settings,
            label: 'Sistema',
            screen: const AdminConfigScreen(),
          ),
        ];

      // ==================== ADMIN GENERAL ====================
      case AppRoles.admin:
        return [
          BottomNavItem(
            icon: Icons.dashboard,
            label: 'Dashboard',
            screen: const AdminDashboardScreen(),
          ),
          BottomNavItem(
            icon: Icons.people,
            label: 'Usuarios',
            screen: const AdminUsuariosScreen(),
          ),
          BottomNavItem(
            icon: Icons.settings,
            label: 'Sistema',
            screen: const AdminConfigScreen(),
          ),
        ];

      // ==================== SECRETARIA ====================
      case AppRoles.secretaria:
        return [
          BottomNavItem(
            icon: Icons.dashboard,
            label: 'Dashboard',
            screen: const SecretariaDashboardScreen(),
          ),
          BottomNavItem(
            icon: Icons.people,
            label: 'Clientes',
            screen: const SecretariaClientesScreen(),
          ),
          BottomNavItem(
            icon: Icons.payment,
            label: 'Operaciones',
            screen: const SecretariaOperacionesScreen(),
          ),
        ];

      // ==================== ALMACÉN USA ====================
      case AppRoles.almacenUSA:
        return [
          BottomNavItem(
            icon: Icons.inventory,
            label: 'Contenedores',
            // 💡 FIX: Apuntando a la pantalla correcta
            screen: const AlmacenUSAContenedoresScreen(),
          ),
          
          BottomNavItem(
            icon: Icons.inventory_2,
            label: 'Inventario',
            screen: const AlmacenUSAInventarioScreen(),
          ),
          BottomNavItem(
            icon: Icons.assignment,
            label: 'Asignación',
            screen: const AlmacenUSAAsignacionScreen(),
          ),
        ];

      // ==================== CARGADOR ====================
      case AppRoles.cargador:
        // 💡 FIX: Comentado temporalmente. Debes arreglar el conflicto de nombres
        // (cargador_rutas_screen.dart) y crear el archivo (cargador_checklist_screen.dart)
        // para que esto funcione.
        return [
          // BottomNavItem(
          //   icon: Icons.route,
          //   label: 'Rutas',
          //   screen: const CargadorRutasScreen(), // <- Causa error por conflicto de nombres
          // ),
          // BottomNavItem(
          //   icon: Icons.checklist,
          //   label: 'Checklist',
          //   screen: const CargadorChecklistScreen(), // <- Causa error, archivo no existe
          // ),
        ];

      // ==================== ALMACÉN RD ====================
      case AppRoles.almacenRD:
        return [
          BottomNavItem(
            icon: Icons.move_to_inbox,
            label: 'Recepción',
            screen: const AlmacenRDRecepcionScreen(),
          ),
          BottomNavItem(
            icon: Icons.local_shipping,
            label: 'Rutas',
            screen: const AlmacenRDRutasScreen(),
          ),
          BottomNavItem(
            icon: Icons.receipt,
            label: 'Facturas',
            screen: const AlmacenRDFacturasScreen(),
          ),
        ];

      // ==================== RECOLECTOR ====================
      case AppRoles.recolector:
        return [
          BottomNavItem(
            icon: Icons.route,
            label: 'Rutas',
            screen: const RecolectorRutasScreen(),
          ),
          // 💡 FIX: Comentado. 'RecolectorPuntosScreen' es una pantalla de detalle
          // y no debe estar en la barra principal, ya que requiere un 'rutaId'.
          // BottomNavItem(
          //   icon: Icons.location_on,
          //   label: 'Puntos',
          //   screen: const RecolectorPuntosScreen(rutaId: '',),
          // ),
          BottomNavItem(
            icon: Icons.history,
            label: 'Historial',
            screen: const RecolectorHistorialScreen(),
          ),
        ];

      // ==================== REPARTIDOR ====================
      case AppRoles.repartidor:
        return [
          BottomNavItem(
            icon: Icons.dashboard,
            label: 'Dashboard',
            screen: const DashboardScreen(),
          ),
          BottomNavItem(
            icon: Icons.local_shipping,
            label: 'Rutas',
            screen: const DashboardScreen(),
          ),
          BottomNavItem(
            icon: Icons.person,
            label: 'Perfil',
            screen: const ProfileScreen(),
          ),
        ];

      // ==================== DEFAULT ====================
      default:
        return [
          BottomNavItem(
            icon: Icons.dashboard,
            label: 'Dashboard',
            screen: const DashboardScreen(),
          ),
          BottomNavItem(
            icon: Icons.person,
            label: 'Perfil',
            screen: const ProfileScreen(),
          ),
          BottomNavItem(
            icon: Icons.settings,
            label: 'Configuración',
            screen: const SettingsScreen(),
          ),
          BottomNavItem(
            icon: Icons.help,
            label: 'Ayuda',
            screen: const HelpScreen(),
          ),
        ];
    }
  }

  /// Retorna pantallas del drawer (menú lateral)
  static List<DrawerItem> getDrawerItems(String role) {
    List<DrawerItem> items = [];

    // Items comunes para todos
    items.add(DrawerItem(
      icon: Icons.person,
      title: 'Mi Perfil',
      screen: const ProfileScreen(),
    ));

    items.add(DrawerItem(
      icon: Icons.settings,
      title: 'Configuración',
      screen: const SettingsScreen(),
    ));

    items.add(DrawerItem(
      icon: Icons.help,
      title: 'Ayuda',
      screen: const HelpScreen(),
    ));

    // Items específicos por rol
    if (role == AppRoles.superAdmin || role == AppRoles.admin) {
      items.insert(0, DrawerItem(
        icon: Icons.analytics,
        title: 'Reportes',
        screen: const DashboardScreen(),
      ));
    }

    return items;
  }
}

// 💡 FIX: Se eliminó la clase 'stub' (falsa) de AlmacenUsaContenedoresScreen
// class AlmacenUsaContenedoresScreen {
//   const AlmacenUsaContenedoresScreen();
// }

// ==================== MODELO DE DRAWER ====================
class DrawerItem {
  final IconData icon;
  final String title;
  final Widget screen;

  DrawerItem({
    required this.icon,
    required this.title,
    required this.screen,
  });
}
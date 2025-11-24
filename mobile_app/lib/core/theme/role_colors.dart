// lib/core/theme/role_colors.dart
/// 🎨 SISTEMA DE COLORES POR ROL
/// Define colores únicos y profesionales para cada rol del sistema

import 'package:flutter/material.dart';

class RoleColors {
  // Prevenir instanciación
  RoleColors._();

  // ==================== COLORES PRIMARIOS POR ROL ====================
  
  /// Admin - Indigo (Autoridad y control)
  static const Color admin = Color(0xFF3F51B5);
  static const Color adminLight = Color(0xFF757DE8);
  static const Color adminDark = Color(0xFF002984);
  
  /// Secretaria - Teal (Organización y eficiencia)
  static const Color secretaria = Color(0xFF009688);
  static const Color secretariaLight = Color(0xFF52C7B8);
  static const Color secretariaDark = Color(0xFF00675B);
  
  /// Repartidor - Blue (Movimiento y entrega)
  static const Color repartidor = Color(0xFF2196F3);
  static const Color repartidorLight = Color(0xFF6EC6FF);
  static const Color repartidorDark = Color(0xFF0069C0);
  
  /// Cargador - Orange (Energía y acción)
  static const Color cargador = Color(0xFFFF9800);
  static const Color cargadorLight = Color(0xFFFFC947);
  static const Color cargadorDark = Color(0xFFC66900);
  
  /// Almacén RD - Purple (Gestión y almacenamiento)
  static const Color almacenRD = Color(0xFF9C27B0);
  static const Color almacenRDLight = Color(0xFFD05CE3);
  static const Color almacenRDDark = Color(0xFF6A0080);
  
  /// Almacén USA - Deep Purple (Internacional)
  static const Color almacenUSA = Color(0xFF673AB7);
  static const Color almacenUSALight = Color(0xFF9A67EA);
  static const Color almacenUSADark = Color(0xFF320B86);

  // ==================== OBTENER COLOR POR ROL ====================
  
  /// Obtiene el color primario según el rol
  static Color getPrimaryColor(String? role) {
    if (role == null) return admin;
    
    switch (role.toLowerCase()) {
      case 'admin':
      case 'administrador':
        return admin;
      case 'secretaria':
        return secretaria;
      case 'repartidor':
        return repartidor;
      case 'cargador':
        return cargador;
      case 'almacen_rd':
      case 'almacenrd':
        return almacenRD;
      case 'almacen_usa':
      case 'almacenusa':
        return almacenUSA;
      default:
        return admin;
    }
  }

  /// Obtiene el color claro según el rol
  static Color getLightColor(String? role) {
    if (role == null) return adminLight;
    
    switch (role.toLowerCase()) {
      case 'admin':
      case 'administrador':
        return adminLight;
      case 'secretaria':
        return secretariaLight;
      case 'repartidor':
        return repartidorLight;
      case 'cargador':
        return cargadorLight;
      case 'almacen_rd':
      case 'almacenrd':
        return almacenRDLight;
      case 'almacen_usa':
      case 'almacenusa':
        return almacenUSALight;
      default:
        return adminLight;
    }
  }

  /// Obtiene el color oscuro según el rol
  static Color getDarkColor(String? role) {
    if (role == null) return adminDark;
    
    switch (role.toLowerCase()) {
      case 'admin':
      case 'administrador':
        return adminDark;
      case 'secretaria':
        return secretariaDark;
      case 'repartidor':
        return repartidorDark;
      case 'cargador':
        return cargadorDark;
      case 'almacen_rd':
      case 'almacenrd':
        return almacenRDDark;
      case 'almacen_usa':
      case 'almacenusa':
        return almacenUSADark;
      default:
        return adminDark;
    }
  }

  /// Obtiene un color con opacidad para fondos
  static Color getBackgroundColor(String? role, {double opacity = 0.1}) {
    return getPrimaryColor(role).withOpacity(opacity);
  }

  /// Obtiene el nombre legible del rol
  static String getRoleName(String? role) {
    if (role == null) return 'Usuario';
    
    switch (role.toLowerCase()) {
      case 'admin':
      case 'administrador':
        return 'Administrador';
      case 'secretaria':
        return 'Secretaria';
      case 'repartidor':
        return 'Repartidor';
      case 'cargador':
        return 'Cargador';
      case 'almacen_rd':
      case 'almacenrd':
        return 'Almacén RD';
      case 'almacen_usa':
      case 'almacenusa':
        return 'Almacén USA';
      default:
        return 'Usuario';
    }
  }

  /// Obtiene el icono representativo del rol
  static IconData getRoleIcon(String? role) {
    if (role == null) return Icons.person;
    
    switch (role.toLowerCase()) {
      case 'admin':
      case 'administrador':
        return Icons.admin_panel_settings;
      case 'secretaria':
        return Icons.assignment;
      case 'repartidor':
        return Icons.delivery_dining;
      case 'cargador':
        return Icons.inventory_2;
      case 'almacen_rd':
      case 'almacenrd':
        return Icons.warehouse;
      case 'almacen_usa':
      case 'almacenusa':
        return Icons.store;
      default:
        return Icons.person;
    }
  }
}

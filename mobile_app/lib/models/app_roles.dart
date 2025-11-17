// lib/models/app_roles.dart
/// 👤 DEFINICIÓN DE ROLES DEL SISTEMA
/// Constantes y utilidades para manejo de roles
library;


class AppRoles {
  // ==================== ROLES DISPONIBLES ====================
  static const String superAdmin = 'superAdmin';
  static const String admin = 'admin';
  static const String secretaria = 'secretaria';
  static const String almacenUSA = 'almacenUSA';
  static const String cargador = 'cargador';
  static const String almacenRD = 'almacenRD';
  static const String recolector = 'recolector';
  static const String repartidor = 'repartidor';

  // ==================== LISTA DE TODOS LOS ROLES ====================
  static const List<String> allRoles = [
    superAdmin,
    admin,
    secretaria,
    almacenUSA,
    cargador,
    almacenRD,
    recolector,
    repartidor,
  ];

  // ==================== OBTENER NOMBRE LEGIBLE ====================
  static String getRoleName(String role) {
    switch (role) {
      case superAdmin:
        return 'Super Admin';
      case admin:
        return 'Admin General';
      case secretaria:
        return 'Secretaria';
      case almacenUSA:
        return 'Almacén USA';
      case cargador:
        return 'Cargador';
      case almacenRD:
        return 'Almacén RD';
      case recolector:
        return 'Recolector';
      case repartidor:
        return 'Repartidor';
      default:
        return 'Usuario';
    }
  }

  // ==================== VERIFICAR SI ES ADMIN ====================
  static bool isAdmin(String? role) {
    return role == superAdmin || role == admin;
  }

  // ==================== VERIFICAR PERMISOS ====================
  static bool canAccessAdmin(String? role) {
    return role == superAdmin || role == admin;
  }

  static bool canAccessCargadores(String? role) {
    return isAdmin(role) || role == cargador;
  }

  static bool canAccessAlmacenUSA(String? role) {
    return isAdmin(role) || role == almacenUSA;
  }

  static bool canAccessAlmacenRD(String? role) {
    return isAdmin(role) || role == almacenRD;
  }

  static bool canAccessSecretarias(String? role) {
    return isAdmin(role) || role == secretaria;
  }

  static bool canAccessRepartidores(String? role) {
    return isAdmin(role) || role == repartidor;
  }

  static bool canAccessRecolectores(String? role) {
    return isAdmin(role) || role == recolector;
  }
}
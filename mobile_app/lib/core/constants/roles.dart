// lib/core/constants/roles.dart
/// 🎯 CONSTANTES DE ROLES DEL SISTEMA
/// Define todos los roles disponibles y sus permisos
library;


class AppRoles {
  // ==================== ROLES DISPONIBLES ====================
  static const String superAdmin = 'super_admin';
  static const String adminGeneral = 'admin_general';
  static const String recolector = 'recolector';
  static const String almacenUSA = 'almacen_eeuu';
  static const String almacenRD = 'almacen_rd';
  static const String secretaria = 'secretaria';
  static const String cargador = 'cargador';
  static const String repartidor = 'repartidor';

  // Lista de todos los roles
  static const List<String> allRoles = [
    superAdmin,
    adminGeneral,
    recolector,
    almacenUSA,
    almacenRD,
    secretaria,
    cargador,
    repartidor,
  ];

  // ==================== NOMBRES LEGIBLES ====================
  static String getRoleName(String rol) {
    switch (rol) {
      case superAdmin:
        return 'Super Admin';
      case adminGeneral:
        return 'Administrador General';
      case recolector:
        return 'Recolector';
      case almacenUSA:
        return 'Almacén USA';
      case almacenRD:
        return 'Almacén RD';
      case secretaria:
        return 'Secretaria';
      case cargador:
        return 'Cargador';
      case repartidor:
        return 'Repartidor';
      default:
        return 'Usuario';
    }
  }

  // ==================== ICONOS POR ROL ====================
  static String getRoleIcon(String rol) {
    switch (rol) {
      case superAdmin:
        return '👑';
      case adminGeneral:
        return '👔';
      case recolector:
        return '📦';
      case almacenUSA:
        return '🇺🇸';
      case almacenRD:
        return '🇩🇴';
      case secretaria:
        return '📝';
      case cargador:
        return '🚛';
      case repartidor:
        return '🚚';
      default:
        return '👤';
    }
  }

  // ==================== PERMISOS ====================
  static bool canAccessRutas(String rol) {
    return [
      superAdmin,
      adminGeneral,
      secretaria,
      cargador,
      repartidor,
      almacenRD,
    ].contains(rol);
  }

  static bool canAccessRecolecciones(String rol) {
    return [
      superAdmin,
      adminGeneral,
      recolector,
      almacenUSA,
    ].contains(rol);
  }

  static bool canAccessAlmacenUSA(String rol) {
    return [
      superAdmin,
      adminGeneral,
      almacenUSA,
    ].contains(rol);
  }

  static bool canAccessAlmacenRD(String rol) {
    return [
      superAdmin,
      adminGeneral,
      almacenRD,
    ].contains(rol);
  }

  static bool canAccessSecretarias(String rol) {
    return [
      superAdmin,
      adminGeneral,
      secretaria,
    ].contains(rol);
  }

  static bool canAccessCargadores(String rol) {
    return [
      superAdmin,
      adminGeneral,
      cargador,
    ].contains(rol);
  }

  static bool canAccessRepartidores(String rol) {
    return [
      superAdmin,
      adminGeneral,
      repartidor,
    ].contains(rol);
  }

  static bool canAccessAdmin(String rol) {
    return [
      superAdmin,
      adminGeneral,
    ].contains(rol);
  }

  static bool isAdmin(String rol) {
    return [superAdmin, adminGeneral].contains(rol);
  }
}
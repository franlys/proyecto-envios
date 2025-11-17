// lib/core/theme/app_theme.dart
/// 🎨 TEMA DE LA APLICACIÓN
/// Define colores, tipografía y estilos globales
library;


import 'package:flutter/material.dart';

class AppTheme {
  // ==================== COLORES PRINCIPALES ====================
  static const Color primaryColor = Color(0xFF2196F3); // Azul
  static const Color secondaryColor = Color(0xFF4CAF50); // Verde
  static const Color accentColor = Color(0xFFFF9800); // Naranja
  static const Color errorColor = Color(0xFFF44336); // Rojo
  static const Color successColor = Color(0xFF4CAF50); // Verde
  static const Color warningColor = Color(0xFFFF9800); // Naranja
  static const Color infoColor = Color(0xFF2196F3); // Azul

  // ==================== COLORES POR ROL ====================
  // ✅ AÑADIDOS: Colores específicos para cada rol
  static const Color adminColor = Color(0xFF9C27B0); // Púrpura
  static const Color secretariaColor = Color(0xFFE91E63); // Rosa
  static const Color almacenUSAColor = Color(0xFF3F51B5); // Índigo
  static const Color almacenRDColor = Color(0xFF009688); // Teal
  static const Color cargadorColor = Color(0xFFFF5722); // Naranja profundo
  static const Color recolectorColor = Color(0xFF795548); // Marrón
  static const Color repartidorColor = Color(0xFF607D8B); // Gris azulado

  // ==================== COLORES DE FONDO ====================
  static const Color backgroundColor = Color(0xFFF5F5F5);
  static const Color surfaceColor = Colors.white;
  static const Color cardColor = Colors.white;

  // ==================== COLORES DE TEXTO ====================
  static const Color textPrimaryColor = Color(0xFF212121);
  static const Color textSecondaryColor = Color(0xFF757575);
  static const Color textDisabledColor = Color(0xFFBDBDBD);

  // ==================== TEMA CLARO ====================
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: primaryColor,
      colorScheme: const ColorScheme.light(
        primary: primaryColor,
        secondary: secondaryColor,
        error: errorColor,
        surface: surfaceColor,
      ),

      // AppBar
      appBarTheme: const AppBarTheme(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        elevation: 2,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
        iconTheme: IconThemeData(color: Colors.white),
      ),

      // Card
      cardTheme: CardThemeData(
        color: cardColor,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      ),

      // Elevated Button
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          elevation: 2,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // Text Button
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primaryColor,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // Outlined Button
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryColor,
          side: const BorderSide(color: primaryColor),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),

      // Input Decoration
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.grey[100],
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: primaryColor, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: errorColor),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),

      // Floating Action Button
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: secondaryColor,
        foregroundColor: Colors.white,
        elevation: 4,
      ),

      // Bottom Navigation Bar
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: primaryColor,
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontSize: 12),
      ),

      // Navigation Rail
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: Colors.white,
        selectedIconTheme: const IconThemeData(
          color: primaryColor,
          size: 24,
        ),
        unselectedIconTheme: IconThemeData(
          color: Colors.grey[600],
          size: 24,
        ),
        selectedLabelTextStyle: const TextStyle(
          color: primaryColor,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelTextStyle: TextStyle(
          color: Colors.grey[600],
          fontSize: 14,
        ),
      ),

      // Drawer
      drawerTheme: const DrawerThemeData(
        backgroundColor: Colors.white,
        elevation: 16,
      ),

      // Divider
      dividerTheme: DividerThemeData(
        color: Colors.grey[300],
        thickness: 1,
        space: 1,
      ),

      // Icon
      iconTheme: const IconThemeData(
        color: textSecondaryColor,
        size: 24,
      ),

      // Text Theme
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: textPrimaryColor,
        ),
        displayMedium: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.bold,
          color: textPrimaryColor,
        ),
        displaySmall: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
          color: textPrimaryColor,
        ),
        headlineLarge: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: textPrimaryColor,
        ),
        headlineMedium: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: textPrimaryColor,
        ),
        headlineSmall: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: textPrimaryColor,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          color: textPrimaryColor,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          color: textPrimaryColor,
        ),
        bodySmall: TextStyle(
          fontSize: 12,
          color: textSecondaryColor,
        ),
        labelLarge: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: textPrimaryColor,
        ),
      ),
    );
  }

  // ==================== TEMA OSCURO ====================
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: primaryColor,
      colorScheme: const ColorScheme.dark(
        primary: primaryColor,
        secondary: secondaryColor,
        error: errorColor,
        surface: Color(0xFF1E1E1E),
      ),

      // AppBar
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF1E1E1E),
        foregroundColor: Colors.white,
        elevation: 2,
        centerTitle: false,
      ),

      // Card
      cardTheme: CardThemeData(
        color: const Color(0xFF1E1E1E),
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),

      // Bottom Navigation Bar
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Color(0xFF1E1E1E),
        selectedItemColor: primaryColor,
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
      ),
    );
  }

  // ==================== COLORES POR ESTADO ====================
  static Color getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completado':
      case 'entregado':
      case 'activo':
      case 'pagado':
        return successColor;
      
      case 'pendiente':
      case 'en_proceso':
      case 'asignado':
        return warningColor;
      
      case 'cancelado':
      case 'rechazado':
      case 'vencido':
        return errorColor;
      
      default:
        return infoColor;
    }
  }

  // ==================== ICONOS POR ESTADO ====================
  static IconData getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'completado':
      case 'entregado':
        return Icons.check_circle;
      
      case 'pendiente':
        return Icons.schedule;
      
      case 'en_proceso':
        return Icons.sync;
      
      case 'cancelado':
        return Icons.cancel;
      
      default:
        return Icons.info;
    }
  }

  // ==================== COLOR POR ROL ====================
  static Color getRoleColor(String role) {
    switch (role) {
      case 'superAdmin':
      case 'admin':
        return adminColor;
      case 'secretaria':
        return secretariaColor;
      case 'almacenUSA':
        return almacenUSAColor;
      case 'almacenRD':
        return almacenRDColor;
      case 'cargador':
        return cargadorColor;
      case 'recolector':
        return recolectorColor;
      case 'repartidor':
        return repartidorColor;
      default:
        return primaryColor;
    }
  }
}
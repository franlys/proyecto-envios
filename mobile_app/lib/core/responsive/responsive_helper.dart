import 'package:flutter/material.dart';

class ResponsiveHelper {
  final BuildContext context;
  
  ResponsiveHelper(this.context);
  
  // Dimensiones de pantalla
  double get width => MediaQuery.of(context).size.width;
  double get height => MediaQuery.of(context).size.height;
  
  // Detectores de dispositivo
  bool get isPhone => width < 600;
  bool get isTablet => width >= 600 && width < 1024;
  bool get isDesktop => width >= 1024;
  
  // Padding responsive
  EdgeInsets get screenPadding {
    if (isPhone) return const EdgeInsets.all(16.0);
    if (isTablet) return const EdgeInsets.all(24.0);
    return const EdgeInsets.all(32.0);
  }
  
  // Tamaño de fuente responsive
  double getFontSize(double baseSize) {
    if (isPhone) return baseSize;
    if (isTablet) return baseSize * 1.2;
    return baseSize * 1.4;
  }
  
  // Valores responsive genéricos
  T responsiveValue<T>({
    required T phone,
    T? tablet,
    T? desktop,
  }) {
    if (isDesktop && desktop != null) return desktop;
    if (isTablet && tablet != null) return tablet;
    return phone;
  }
  
  // Utilidades adicionales
  int get gridColumns {
    if (isPhone) return 1;
    if (isTablet) return 2;
    return 3;
  }
  
  double get spacing {
    if (isPhone) return 8.0;
    if (isTablet) return 12.0;
    return 16.0;
  }
  
  double get cardElevation {
    if (isPhone) return 2.0;
    if (isTablet) return 4.0;
    return 6.0;
  }
  
  double get iconSize {
    if (isPhone) return 24.0;
    if (isTablet) return 28.0;
    return 32.0;
  }
  
  double get buttonHeight {
    if (isPhone) return 48.0;
    if (isTablet) return 52.0;
    return 56.0;
  }
  
  double get appBarHeight {
    if (isPhone) return 56.0;
    if (isTablet) return 64.0;
    return 72.0;
  }
  
  // Radio de bordes responsive
  double get borderRadius {
    if (isPhone) return 8.0;
    if (isTablet) return 12.0;
    return 16.0;
  }
  
  // Márgenes responsive
  EdgeInsets get cardMargin {
    if (isPhone) return const EdgeInsets.symmetric(horizontal: 16, vertical: 8);
    if (isTablet) return const EdgeInsets.symmetric(horizontal: 24, vertical: 12);
    return const EdgeInsets.symmetric(horizontal: 32, vertical: 16);
  }
  
  // Ancho máximo de contenido
  double get maxContentWidth {
    if (isPhone) return double.infinity;
    if (isTablet) return 800;
    return 1200;
  }
}
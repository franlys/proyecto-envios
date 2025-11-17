// lib/core/responsive/responsive.dart
/// 📱 UTILIDADES RESPONSIVE
/// Maneja la adaptación de la UI a diferentes tamaños de pantalla
library;

import 'package:flutter/material.dart';

class ResponsiveBuilder extends StatelessWidget {
  final Widget Function(BuildContext context, ResponsiveHelper helper) builder;

  const ResponsiveBuilder({
    super.key,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final helper = ResponsiveHelper(
          context: context,
          width: constraints.maxWidth,
          height: constraints.maxHeight,
        );
        return builder(context, helper);
      },
    );
  }
}

class ResponsiveHelper {
  final BuildContext context;
  final double width;
  final double height;

  ResponsiveHelper({
    required this.context,
    required this.width,
    required this.height,
  });

  // ==================== BREAKPOINTS ====================
  static const double mobileMaxWidth = 600;
  static const double tabletMaxWidth = 900;
  static const double desktopMaxWidth = 1200;

  // ==================== TIPO DE DISPOSITIVO ====================
  bool get isMobile => width < mobileMaxWidth;
  bool get isTablet => width >= mobileMaxWidth && width < tabletMaxWidth;
  bool get isDesktop => width >= tabletMaxWidth;
  
  // Alias para isPhone (igual a isMobile)
  bool get isPhone => isMobile;

  // ==================== ORIENTACIÓN ====================
  bool get isPortrait => height > width;
  bool get isLandscape => width > height;

  // ==================== TAMAÑO DE PANTALLA ====================
  Size get screenSize => MediaQuery.of(context).size;
  double get screenWidth => screenSize.width;
  double get screenHeight => screenSize.height;

  // ==================== PADDING DE PANTALLA ====================
  EdgeInsets get screenPadding {
    if (isMobile) return const EdgeInsets.all(16);
    if (isTablet) return const EdgeInsets.all(24);
    return const EdgeInsets.all(32);
  }

  // ==================== SPACING ADAPTATIVO ====================
  double spacing({
    double mobile = 8,
    double tablet = 12,
    double desktop = 16,
  }) {
    if (isMobile) return mobile;
    if (isTablet) return tablet;
    return desktop;
  }

  // ==================== FONT SIZE ADAPTATIVO ====================
  double fontSize({
    double mobile = 14,
    double tablet = 16,
    double desktop = 18,
  }) {
    if (isMobile) return mobile;
    if (isTablet) return tablet;
    return desktop;
  }

  // ==================== GET FONT SIZE (simplificado) ====================
  double getFontSize(double baseSize) {
    if (isMobile) return baseSize;
    if (isTablet) return baseSize * 1.1;
    return baseSize * 1.2;
  }

  // ==================== PADDING ADAPTATIVO ====================
  EdgeInsets padding({
    EdgeInsets? mobile,
    EdgeInsets? tablet,
    EdgeInsets? desktop,
  }) {
    if (isMobile) return mobile ?? const EdgeInsets.all(8);
    if (isTablet) return tablet ?? const EdgeInsets.all(12);
    return desktop ?? const EdgeInsets.all(16);
  }

  // ==================== COLUMNAS EN GRID ====================
  int gridColumns({
    int mobile = 1,
    int tablet = 2,
    int desktop = 3,
  }) {
    if (isMobile) return mobile;
    if (isTablet) return tablet;
    return desktop;
  }

  // ==================== PORCENTAJE DE ANCHO ====================
  double widthPercent(double percent) {
    return width * (percent / 100);
  }

  // ==================== PORCENTAJE DE ALTO ====================
  double heightPercent(double percent) {
    return height * (percent / 100);
  }

  // ==================== VALOR RESPONSIVO ====================
  T value<T>({
    required T mobile,
    T? tablet,
    T? desktop,
  }) {
    if (isMobile) return mobile;
    if (isTablet) return tablet ?? mobile;
    return desktop ?? tablet ?? mobile;
  }

  // ==================== VALOR RESPONSIVO (alias) ====================
  double responsiveValue({
    required double phone,
    required double tablet,
    required double desktop,
  }) {
    if (isMobile) return phone;
    if (isTablet) return tablet;
    return desktop;
  }
}

// ==================== EXTENSION METHODS ====================
extension ResponsiveContext on BuildContext {
  ResponsiveHelper get responsive {
    final size = MediaQuery.of(this).size;
    return ResponsiveHelper(
      context: this,
      width: size.width,
      height: size.height,
    );
  }

  bool get isMobile => responsive.isMobile;
  bool get isTablet => responsive.isTablet;
  bool get isDesktop => responsive.isDesktop;
}
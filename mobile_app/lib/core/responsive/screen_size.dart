// lib/core/responsive/screen_size.dart
/// 📐 TAMAÑOS Y PROPIEDADES RESPONSIVE
/// Calcula tamaños basados en el tipo de pantalla
library;


import 'package:flutter/material.dart';

class ScreenSize {
  final BuildContext context;
  final ScreenType type;
  final double width;
  final double height;

  ScreenSize(this.context)
      : width = MediaQuery.of(context).size.width,
        height = MediaQuery.of(context).size.height,
        type = _calculateScreenType(MediaQuery.of(context).size.width);

  static ScreenType _calculateScreenType(double width) {
    if (width < 600) return ScreenType.phone;
    if (width < 1024) return ScreenType.tablet;
    return ScreenType.desktop;
  }

  // ==================== GETTERS DE TIPO ====================

  bool get isPhone => type == ScreenType.phone;
  bool get isTablet => type == ScreenType.tablet;
  bool get isDesktop => type == ScreenType.desktop;

  // ==================== PADDING Y MARGINS ====================

  double get padding {
    switch (type) {
      case ScreenType.phone:
        return 16.0;
      case ScreenType.tablet:
        return 24.0;
      case ScreenType.desktop:
        return 32.0;
    }
  }

  double get margin {
    switch (type) {
      case ScreenType.phone:
        return 12.0;
      case ScreenType.tablet:
        return 16.0;
      case ScreenType.desktop:
        return 20.0;
    }
  }

  EdgeInsets get screenPadding {
    return EdgeInsets.all(padding);
  }

  // ==================== BORDER RADIUS ====================

  double get borderRadius {
    switch (type) {
      case ScreenType.phone:
        return 8.0;
      case ScreenType.tablet:
        return 12.0;
      case ScreenType.desktop:
        return 16.0;
    }
  }

  // ==================== TAMAÑOS DE FUENTE ====================

  double get titleFontSize {
    switch (type) {
      case ScreenType.phone:
        return 24.0;
      case ScreenType.tablet:
        return 28.0;
      case ScreenType.desktop:
        return 32.0;
    }
  }

  double get subtitleFontSize {
    switch (type) {
      case ScreenType.phone:
        return 18.0;
      case ScreenType.tablet:
        return 20.0;
      case ScreenType.desktop:
        return 22.0;
    }
  }

  double get bodyFontSize {
    switch (type) {
      case ScreenType.phone:
        return 14.0;
      case ScreenType.tablet:
        return 16.0;
      case ScreenType.desktop:
        return 18.0;
    }
  }

  double get captionFontSize {
    switch (type) {
      case ScreenType.phone:
        return 12.0;
      case ScreenType.tablet:
        return 13.0;
      case ScreenType.desktop:
        return 14.0;
    }
  }

  // ==================== TAMAÑOS DE ICONOS ====================

  double get iconSize {
    switch (type) {
      case ScreenType.phone:
        return 24.0;
      case ScreenType.tablet:
        return 28.0;
      case ScreenType.desktop:
        return 32.0;
    }
  }

  double get largeIconSize {
    switch (type) {
      case ScreenType.phone:
        return 48.0;
      case ScreenType.tablet:
        return 56.0;
      case ScreenType.desktop:
        return 64.0;
    }
  }

  // ==================== ALTURAS DE COMPONENTES ====================

  double get buttonHeight {
    switch (type) {
      case ScreenType.phone:
        return 48.0;
      case ScreenType.tablet:
        return 56.0;
      case ScreenType.desktop:
        return 60.0;
    }
  }

  double get appBarHeight {
    switch (type) {
      case ScreenType.phone:
        return 56.0;
      case ScreenType.tablet:
        return 64.0;
      case ScreenType.desktop:
        return 72.0;
    }
  }

  double get cardHeight {
    switch (type) {
      case ScreenType.phone:
        return 120.0;
      case ScreenType.tablet:
        return 140.0;
      case ScreenType.desktop:
        return 160.0;
    }
  }

  // ==================== GRID Y COLUMNAS ====================

  int get gridColumns {
    switch (type) {
      case ScreenType.phone:
        return 2;
      case ScreenType.tablet:
        return 3;
      case ScreenType.desktop:
        return 4;
    }
  }

  double get gridSpacing {
    switch (type) {
      case ScreenType.phone:
        return 12.0;
      case ScreenType.tablet:
        return 16.0;
      case ScreenType.desktop:
        return 20.0;
    }
  }

  // ==================== ASPECT RATIOS ====================

  double get cardAspectRatio {
    switch (type) {
      case ScreenType.phone:
        return 1.5;
      case ScreenType.tablet:
        return 1.8;
      case ScreenType.desktop:
        return 2.0;
    }
  }

  // ==================== ANCHOS MÁXIMOS ====================

  double get maxContentWidth {
    switch (type) {
      case ScreenType.phone:
        return double.infinity;
      case ScreenType.tablet:
        return 800.0;
      case ScreenType.desktop:
        return 1200.0;
    }
  }

  // ==================== MÉTODO HELPER ====================

  T responsiveValue<T>({
    required T phone,
    required T tablet,
    required T desktop,
  }) {
    switch (type) {
      case ScreenType.phone:
        return phone;
      case ScreenType.tablet:
        return tablet;
      case ScreenType.desktop:
        return desktop;
    }
  }
}

// ==================== ENUM DE TIPOS DE PANTALLA ====================

enum ScreenType {
  phone,
  tablet,
  desktop,
}
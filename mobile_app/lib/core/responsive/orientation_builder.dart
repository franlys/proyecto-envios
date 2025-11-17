// lib/core/responsive/orientation_builder.dart
/// 🔄 ORIENTATION BUILDER
/// Maneja cambios de orientación y reconstruye widgets automáticamente
library;


import 'package:flutter/material.dart';

// ==================== ORIENTATION HANDLER ====================

class OrientationHandler extends StatelessWidget {
  final Widget Function(BuildContext context, Orientation orientation) builder;

  const OrientationHandler({
    super.key,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) {
    return OrientationBuilder(
      builder: (context, orientation) {
        return builder(context, orientation);
      },
    );
  }
}

// ==================== RESPONSIVE ORIENTATION ====================

class ResponsiveOrientation extends StatelessWidget {
  final Widget portrait;
  final Widget? landscape;

  const ResponsiveOrientation({
    super.key,
    required this.portrait,
    this.landscape,
  });

  @override
  Widget build(BuildContext context) {
    return OrientationBuilder(
      builder: (context, orientation) {
        if (orientation == Orientation.landscape && landscape != null) {
          return landscape!;
        }
        return portrait;
      },
    );
  }
}

// ==================== ADAPTIVE LAYOUT ====================

/// Widget que se adapta según el dispositivo y la orientación
class AdaptiveLayout extends StatelessWidget {
  // Layouts para teléfono
  final Widget? phonePortrait;
  final Widget? phoneLandscape;
  
  // Layouts para tablet
  final Widget? tabletPortrait;
  final Widget? tabletLandscape;
  
  // Layout por defecto
  final Widget defaultLayout;

  const AdaptiveLayout({
    super.key,
    this.phonePortrait,
    this.phoneLandscape,
    this.tabletPortrait,
    this.tabletLandscape,
    required this.defaultLayout,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = constraints.maxHeight;
        final isPortrait = height > width;
        final isTablet = width >= 768;

        // Tablet Landscape
        if (isTablet && !isPortrait && tabletLandscape != null) {
          return tabletLandscape!;
        }
        
        // Tablet Portrait
        if (isTablet && isPortrait && tabletPortrait != null) {
          return tabletPortrait!;
        }
        
        // Phone Landscape
        if (!isTablet && !isPortrait && phoneLandscape != null) {
          return phoneLandscape!;
        }
        
        // Phone Portrait
        if (!isTablet && isPortrait && phonePortrait != null) {
          return phonePortrait!;
        }

        // Default
        return defaultLayout;
      },
    );
  }
}

// ==================== ORIENTATION INFO ====================

class OrientationInfo {
  final BuildContext context;

  OrientationInfo(this.context);

  bool get isPortrait {
    final size = MediaQuery.of(context).size;
    return size.height > size.width;
  }

  bool get isLandscape => !isPortrait;

  Orientation get orientation {
    return isPortrait ? Orientation.portrait : Orientation.landscape;
  }

  /// Retorna un valor según la orientación
  T orientationValue<T>({
    required T portrait,
    required T landscape,
  }) {
    return isPortrait ? portrait : landscape;
  }

  /// Padding adaptativo según orientación
  EdgeInsets get padding {
    return isPortrait 
        ? const EdgeInsets.all(16)
        : const EdgeInsets.symmetric(horizontal: 32, vertical: 16);
  }

  /// Número de columnas según orientación
  int columns({
    int portraitColumns = 1,
    int landscapeColumns = 2,
  }) {
    return isPortrait ? portraitColumns : landscapeColumns;
  }

  /// Spacing adaptativo según orientación
  double get spacing {
    return isPortrait ? 16 : 24;
  }
}

// ==================== EXTENSION ====================

extension OrientationExtension on BuildContext {
  OrientationInfo get orientationInfo => OrientationInfo(this);
  
  bool get isPortrait => orientationInfo.isPortrait;
  bool get isLandscape => orientationInfo.isLandscape;
}

// ==================== SAFE ORIENTATION BUILDER ====================

/// Builder que previene errores durante cambios de orientación
class SafeOrientationBuilder extends StatefulWidget {
  final Widget Function(BuildContext context, Orientation orientation) builder;

  const SafeOrientationBuilder({
    super.key,
    required this.builder,
  });

  @override
  State<SafeOrientationBuilder> createState() => _SafeOrientationBuilderState();
}

class _SafeOrientationBuilderState extends State<SafeOrientationBuilder> {
  Orientation? _lastOrientation;

  @override
  Widget build(BuildContext context) {
    return OrientationBuilder(
      builder: (context, orientation) {
        // Prevenir rebuilds innecesarios
        if (_lastOrientation == orientation) {
          return widget.builder(context, orientation);
        }

        _lastOrientation = orientation;

        // Pequeño delay para permitir que MediaQuery se actualice
        return FutureBuilder(
          future: Future.delayed(const Duration(milliseconds: 50)),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.done) {
              return widget.builder(context, orientation);
            }
            return widget.builder(context, orientation);
          },
        );
      },
    );
  }
}
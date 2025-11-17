// lib/core/helpers/color_helper.dart
import 'package:flutter/material.dart';

/// 🎨 Helper para trabajar con colores
/// Reemplaza el método deprecado `withOpacity`
extension ColorHelper on Color {
  /// Crea un color con opacidad usando el método moderno
  /// Reemplaza a: color.withOpacity(0.5)
  /// Usar: color.withOpacityValue(0.5)
  Color withOpacityValue(double opacity) {
    return withValues(alpha: opacity);
  }

  /// Aligera el color
  Color lighten([double amount = 0.1]) {
    assert(amount >= 0 && amount <= 1);
    final hsl = HSLColor.fromColor(this);
    final lightness = (hsl.lightness + amount).clamp(0.0, 1.0);
    return hsl.withLightness(lightness).toColor();
  }

  /// Oscurece el color
  Color darken([double amount = 0.1]) {
    assert(amount >= 0 && amount <= 1);
    final hsl = HSLColor.fromColor(this);
    final lightness = (hsl.lightness - amount).clamp(0.0, 1.0);
    return hsl.withLightness(lightness).toColor();
  }
}

// ==================== GUÍA DE USO ====================
/*

❌ ANTES (deprecado):
Color color = Colors.blue.withOpacity(0.5);

✅ DESPUÉS (correcto):
import 'package:mobile_app/core/helpers/color_helper.dart';

Color color = Colors.blue.withOpacityValue(0.5);

// O directamente sin el helper:
Color color = Colors.blue.withValues(alpha: 0.5);

EJEMPLOS DE USO:
- Colors.blue.withOpacityValue(0.3)
- Theme.of(context).primaryColor.withOpacityValue(0.5)
- Colors.red.lighten(0.2)
- Colors.green.darken(0.1)

*/
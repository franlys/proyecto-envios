// lib/widgets/common/empty_state.dart
/// 📭 EMPTY STATE
/// Widget para mostrar estados vacíos con ilustración

import 'package:flutter/material.dart';
import '../../core/theme/text_styles.dart';

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final String? actionText;
  final VoidCallback? onAction;
  final Color? color;

  const EmptyState({
    Key? key,
    required this.icon,
    required this.title,
    required this.message,
    this.actionText,
    this.onAction,
    this.color,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final emptyColor = color ?? theme.primaryColor;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icono
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: emptyColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 64,
                color: emptyColor.withOpacity(0.6),
              ),
            ),
            const SizedBox(height: 24),
            
            // Título
            Text(
              title,
              style: AppTextStyles.h4.copyWith(
                color: Colors.grey[800],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            
            // Mensaje
            Text(
              message,
              style: AppTextStyles.bodyMedium.copyWith(
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
            
            // Acción opcional
            if (actionText != null && onAction != null) ...[
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.add),
                label: Text(actionText!),
                style: ElevatedButton.styleFrom(
                  backgroundColor: emptyColor,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Estados vacíos predefinidos
class EmptyStates {
  static Widget noData({
    String title = 'Sin datos',
    String message = 'No hay información para mostrar',
    VoidCallback? onRefresh,
  }) {
    return EmptyState(
      icon: Icons.inbox,
      title: title,
      message: message,
      actionText: onRefresh != null ? 'Actualizar' : null,
      onAction: onRefresh,
    );
  }

  static Widget noResults({
    String title = 'Sin resultados',
    String message = 'No se encontraron resultados para tu búsqueda',
  }) {
    return EmptyState(
      icon: Icons.search_off,
      title: title,
      message: message,
    );
  }

  static Widget error({
    String title = 'Error',
    String message = 'Ocurrió un error al cargar los datos',
    VoidCallback? onRetry,
  }) {
    return EmptyState(
      icon: Icons.error_outline,
      title: title,
      message: message,
      actionText: onRetry != null ? 'Reintentar' : null,
      onAction: onRetry,
      color: Colors.red,
    );
  }

  static Widget noConnection({
    VoidCallback? onRetry,
  }) {
    return EmptyState(
      icon: Icons.wifi_off,
      title: 'Sin conexión',
      message: 'Verifica tu conexión a internet e intenta nuevamente',
      actionText: onRetry != null ? 'Reintentar' : null,
      onAction: onRetry,
      color: Colors.orange,
    );
  }
}

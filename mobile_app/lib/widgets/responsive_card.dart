library;

// lib/widgets/responsive_card.dart
/// 📇 CARD RESPONSIVE
/// Widget de card que se adapta automáticamente al tamaño de pantalla

import 'package:flutter/material.dart';
import '../core/responsive/screen_size.dart';

class ResponsiveCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final double? elevation;
  final VoidCallback? onTap;
  final BorderRadius? borderRadius;
  final Border? border;

  const ResponsiveCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.color,
    this.elevation,
    this.onTap,
    this.borderRadius,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    final screen = ScreenSize(context);

    // Padding adaptativo
    final cardPadding = padding ?? EdgeInsets.all(screen.padding);

    // Margin adaptativo
    final cardMargin = margin ?? EdgeInsets.symmetric(
      horizontal: screen.margin,
      vertical: screen.margin / 2,
    );

    // Border radius adaptativo
    final cardBorderRadius = borderRadius ?? BorderRadius.circular(screen.borderRadius);

    // Elevation adaptativo
    final cardElevation = elevation ?? (screen.isPhone ? 2 : 4);

    final cardWidget = Card(
      elevation: cardElevation,
      color: color,
      margin: cardMargin,
      shape: RoundedRectangleBorder(
        borderRadius: cardBorderRadius,
        side: border != null 
            ? border!.top 
            : BorderSide.none,
      ),
      child: Padding(
        padding: cardPadding,
        child: child,
      ),
    );

    // Si tiene onTap, envolver en InkWell
    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: cardBorderRadius,
        child: cardWidget,
      );
    }

    return cardWidget;
  }
}

// ==================== CARD CON HEADER ====================

class ResponsiveCardWithHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final Color? headerColor;
  final VoidCallback? onTap;

  const ResponsiveCardWithHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
    required this.child,
    this.padding,
    this.margin,
    this.color,
    this.headerColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final screen = ScreenSize(context);

    return ResponsiveCard(
      padding: EdgeInsets.zero,
      margin: margin,
      color: color,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: EdgeInsets.all(screen.padding),
            decoration: BoxDecoration(
              color: headerColor ?? Theme.of(context).primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(screen.borderRadius),
                topRight: Radius.circular(screen.borderRadius),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: screen.subtitleFontSize,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          subtitle!,
                          style: TextStyle(
                            fontSize: screen.captionFontSize,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (trailing != null) trailing!,
              ],
            ),
          ),
          // Content
          Padding(
            padding: padding ?? EdgeInsets.all(screen.padding),
            child: child,
          ),
        ],
      ),
    );
  }
}

// ==================== CARD DE ESTADÍSTICA ====================

class StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color? color;
  final VoidCallback? onTap;

  const StatCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final screen = ScreenSize(context);
    final cardColor = color ?? Theme.of(context).primaryColor;

    return ResponsiveCard(
      onTap: onTap,
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(screen.padding * 0.75),
            decoration: BoxDecoration(
              color: cardColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(screen.borderRadius),
            ),
            child: Icon(
              icon,
              color: cardColor,
              size: screen.iconSize * 1.5,
            ),
          ),
          SizedBox(width: screen.padding),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: screen.captionFontSize,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: screen.subtitleFontSize,
                    fontWeight: FontWeight.bold,
                    color: cardColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ==================== CARD DE ACCIÓN ====================

class ActionCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData icon;
  final Color? color;
  final VoidCallback onTap;

  const ActionCard({
    super.key,
    required this.title,
    this.subtitle,
    required this.icon,
    this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final screen = ScreenSize(context);
    final cardColor = color ?? Theme.of(context).primaryColor;

    return ResponsiveCard(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: EdgeInsets.all(screen.padding),
            decoration: BoxDecoration(
              color: cardColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: cardColor,
              size: screen.iconSize * 2,
            ),
          ),
          SizedBox(height: screen.padding),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: screen.bodyFontSize,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle!,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: screen.captionFontSize,
                color: Colors.grey[600],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ==================== CARD DE LISTA ====================

class ListCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? leading;
  final Widget? trailing;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;

  const ListCard({
    super.key,
    required this.title,
    this.subtitle,
    this.leading,
    this.trailing,
    this.onTap,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final screen = ScreenSize(context);

    return ResponsiveCard(
      padding: padding ?? EdgeInsets.all(screen.padding),
      onTap: onTap,
      child: Row(
        children: [
          if (leading != null) ...[
            leading!,
            SizedBox(width: screen.padding),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: screen.bodyFontSize,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    subtitle!,
                    style: TextStyle(
                      fontSize: screen.captionFontSize,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[
            SizedBox(width: screen.padding),
            trailing!,
          ],
        ],
      ),
    );
  }
}
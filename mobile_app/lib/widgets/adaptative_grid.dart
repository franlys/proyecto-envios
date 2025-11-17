library;

// lib/widgets/adaptive_grid.dart
/// 🎛️ GRID ADAPTATIVO
/// Widget de grid que ajusta automáticamente el número de columnas según el dispositivo

import 'package:flutter/material.dart';
import '../core/responsive/responsive.dart';
import '../core/responsive/screen_size.dart';

class AdaptiveGrid extends StatelessWidget {
  final List<Widget> children;
  final int? phoneColumns;
  final int? tabletPortraitColumns;
  final int? tabletLandscapeColumns;
  final int? desktopColumns;
  final double spacing;
  final double runSpacing;
  final EdgeInsetsGeometry? padding;

  const AdaptiveGrid({
    super.key,
    required this.children,
    this.phoneColumns,
    this.tabletPortraitColumns,
    this.tabletLandscapeColumns,
    this.desktopColumns,
    this.spacing = 16,
    this.runSpacing = 16,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, helper) {
        // Determinar número de columnas según el dispositivo
        int columns;
        if (helper.isDesktop) {
          columns = desktopColumns ?? 4;
        } else if (helper.isTablet) {
          if (helper.isLandscape) {
            columns = tabletLandscapeColumns ?? 3;
          } else {
            columns = tabletPortraitColumns ?? 2;
          }
        } else {
          // Phone
          if (helper.isLandscape) {
            columns = phoneColumns ?? 2;
          } else {
            columns = phoneColumns ?? 1;
          }
        }

        return Padding(
          padding: padding ?? helper.screenPadding,
          child: GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: columns,
              crossAxisSpacing: spacing,
              mainAxisSpacing: runSpacing,
              childAspectRatio: 1.2,
            ),
            itemCount: children.length,
            itemBuilder: (context, index) => children[index],
          ),
        );
      },
    );
  }
}

// ==================== ADAPTIVE GRID VIEW (Scrollable) ====================

class AdaptiveGridView extends StatelessWidget {
  final List<Widget> children;
  final int? phoneColumns;
  final int? tabletPortraitColumns;
  final int? tabletLandscapeColumns;
  final int? desktopColumns;
  final double spacing;
  final double runSpacing;
  final EdgeInsetsGeometry? padding;
  final double childAspectRatio;
  final ScrollPhysics? physics;

  const AdaptiveGridView({
    super.key,
    required this.children,
    this.phoneColumns,
    this.tabletPortraitColumns,
    this.tabletLandscapeColumns,
    this.desktopColumns,
    this.spacing = 16,
    this.runSpacing = 16,
    this.padding,
    this.childAspectRatio = 1.2,
    this.physics,
  });

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, helper) {
        int columns;
        if (helper.isDesktop) {
          columns = desktopColumns ?? 4;
        } else if (helper.isTablet) {
          columns = helper.isLandscape 
              ? (tabletLandscapeColumns ?? 3)
              : (tabletPortraitColumns ?? 2);
        } else {
          columns = helper.isLandscape 
              ? (phoneColumns ?? 2)
              : (phoneColumns ?? 1);
        }

        return GridView.builder(
          padding: padding ?? helper.screenPadding,
          physics: physics,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            crossAxisSpacing: spacing,
            mainAxisSpacing: runSpacing,
            childAspectRatio: childAspectRatio,
          ),
          itemCount: children.length,
          itemBuilder: (context, index) => children[index],
        );
      },
    );
  }
}

// ==================== ADAPTIVE WRAP ====================

class AdaptiveWrap extends StatelessWidget {
  final List<Widget> children;
  final double spacing;
  final double runSpacing;
  final EdgeInsetsGeometry? padding;
  final WrapAlignment alignment;
  final WrapCrossAlignment crossAxisAlignment;

  const AdaptiveWrap({
    super.key,
    required this.children,
    this.spacing = 8,
    this.runSpacing = 8,
    this.padding,
    this.alignment = WrapAlignment.start,
    this.crossAxisAlignment = WrapCrossAlignment.start,
  });

  @override
  Widget build(BuildContext context) {
    final screen = ScreenSize(context);

    return Padding(
      padding: padding ?? EdgeInsets.all(screen.padding),
      child: Wrap(
        spacing: spacing,
        runSpacing: runSpacing,
        alignment: alignment,
        crossAxisAlignment: crossAxisAlignment,
        children: children,
      ),
    );
  }
}

// ==================== ADAPTIVE COLUMNS ====================

class AdaptiveColumns extends StatelessWidget {
  final List<Widget> children;
  final int? phoneColumns;
  final int? tabletColumns;
  final int? desktopColumns;
  final double spacing;
  final EdgeInsetsGeometry? padding;

  const AdaptiveColumns({
    super.key,
    required this.children,
    this.phoneColumns,
    this.tabletColumns,
    this.desktopColumns,
    this.spacing = 16,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, helper) {
        int columns;
        if (helper.isDesktop) {
          columns = desktopColumns ?? 3;
        } else if (helper.isTablet) {
          columns = tabletColumns ?? 2;
        } else {
          columns = phoneColumns ?? 1;
        }

        // Dividir children en columnas
        List<List<Widget>> columnChildren = List.generate(
          columns,
          (index) => [],
        );

        for (int i = 0; i < children.length; i++) {
          columnChildren[i % columns].add(children[i]);
        }

        return Padding(
          padding: padding ?? helper.screenPadding,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: List.generate(
              columns,
              (columnIndex) => Expanded(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: spacing / 2),
                  child: Column(
                    children: columnChildren[columnIndex],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

// ==================== STAGGERED GRID ====================

class AdaptiveStaggeredGrid extends StatelessWidget {
  final List<Widget> children;
  final double spacing;
  final EdgeInsetsGeometry? padding;

  const AdaptiveStaggeredGrid({
    super.key,
    required this.children,
    this.spacing = 16,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final screen = ScreenSize(context);
    final columns = screen.gridColumns;

    // Dividir children en columnas
    List<List<Widget>> columnChildren = List.generate(columns, (index) => []);

    for (int i = 0; i < children.length; i++) {
      columnChildren[i % columns].add(children[i]);
    }

    return Padding(
      padding: padding ?? EdgeInsets.all(screen.padding),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: List.generate(
          columns,
          (columnIndex) => Expanded(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: spacing / 2),
              child: Column(
                children: columnChildren[columnIndex]
                    .map((child) => Padding(
                          padding: EdgeInsets.only(bottom: spacing),
                          child: child,
                        ))
                    .toList(),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ==================== GRID CON AUTO-LAYOUT ====================

class AutoLayoutGrid extends StatelessWidget {
  final List<Widget> children;
  final double minItemWidth;
  final double spacing;
  final double runSpacing;
  final EdgeInsetsGeometry? padding;

  const AutoLayoutGrid({
    super.key,
    required this.children,
    this.minItemWidth = 200,
    this.spacing = 16,
    this.runSpacing = 16,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, helper) {
        // Calcular número de columnas basado en el ancho mínimo del item
        final availableWidth = helper.width - (helper.screenPadding.horizontal);
        final columns = (availableWidth / (minItemWidth + spacing)).floor().clamp(1, 6);

        return Padding(
          padding: padding ?? helper.screenPadding,
          child: GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: columns,
              crossAxisSpacing: spacing,
              mainAxisSpacing: runSpacing,
              childAspectRatio: 1.2,
            ),
            itemCount: children.length,
            itemBuilder: (context, index) => children[index],
          ),
        );
      },
    );
  }
}
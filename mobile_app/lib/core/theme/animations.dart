// lib/core/theme/animations.dart
/// 🎬 SISTEMA DE ANIMACIONES SUTILES
/// Define animaciones consistentes y profesionales

import 'package:flutter/material.dart';

class AppAnimations {
  // Prevenir instanciación
  AppAnimations._();

  // ==================== DURACIONES ====================
  
  static const Duration fast = Duration(milliseconds: 200);
  static const Duration normal = Duration(milliseconds: 300);
  static const Duration slow = Duration(milliseconds: 500);

  // ==================== CURVES ====================
  
  static const Curve defaultCurve = Curves.easeInOut;
  static const Curve bounceCurve = Curves.elasticOut;
  static const Curve smoothCurve = Curves.easeOutCubic;

  // ==================== PAGE TRANSITIONS ====================
  
  /// Transición de página con slide desde la derecha
  static Route<T> slideTransition<T>(Widget page) {
    return PageRouteBuilder<T>(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        const begin = Offset(1.0, 0.0);
        const end = Offset.zero;
        const curve = Curves.easeInOut;

        var tween = Tween(begin: begin, end: end).chain(
          CurveTween(curve: curve),
        );

        return SlideTransition(
          position: animation.drive(tween),
          child: child,
        );
      },
      transitionDuration: normal,
    );
  }

  /// Transición de página con fade
  static Route<T> fadeTransition<T>(Widget page) {
    return PageRouteBuilder<T>(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
      transitionDuration: fast,
    );
  }

  /// Transición de página con scale
  static Route<T> scaleTransition<T>(Widget page) {
    return PageRouteBuilder<T>(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        const curve = Curves.easeOutCubic;
        var tween = Tween(begin: 0.9, end: 1.0).chain(
          CurveTween(curve: curve),
        );

        return ScaleTransition(
          scale: animation.drive(tween),
          child: FadeTransition(
            opacity: animation,
            child: child,
          ),
        );
      },
      transitionDuration: normal,
    );
  }

  // ==================== WIDGET ANIMATIONS ====================
  
  /// Animación de entrada con fade y slide
  static Widget fadeInSlide({
    required Widget child,
    Duration? duration,
    Offset? offset,
  }) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: duration ?? normal,
      curve: defaultCurve,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(
            offset: Offset(
              (offset?.dx ?? 0) * (1 - value),
              (offset?.dy ?? 20) * (1 - value),
            ),
            child: child,
          ),
        );
      },
      child: child,
    );
  }

  /// Animación de escala al tocar
  static Widget scaleOnTap({
    required Widget child,
    required VoidCallback onTap,
    double scale = 0.95,
  }) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 1.0, end: 1.0),
      duration: fast,
      builder: (context, value, child) {
        return Transform.scale(
          scale: value,
          child: GestureDetector(
            onTapDown: (_) {
              // Trigger scale down animation
            },
            onTapUp: (_) {
              onTap();
            },
            onTapCancel: () {
              // Trigger scale up animation
            },
            child: child,
          ),
        );
      },
      child: child,
    );
  }

  /// Shimmer loading effect
  static Widget shimmer({
    required Widget child,
    Color? baseColor,
    Color? highlightColor,
  }) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: -2.0, end: 2.0),
      duration: const Duration(milliseconds: 1500),
      curve: Curves.easeInOut,
      builder: (context, value, child) {
        return ShaderMask(
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                baseColor ?? Colors.grey[300]!,
                highlightColor ?? Colors.grey[100]!,
                baseColor ?? Colors.grey[300]!,
              ],
              stops: [
                (value - 1).clamp(0.0, 1.0),
                value.clamp(0.0, 1.0),
                (value + 1).clamp(0.0, 1.0),
              ],
            ).createShader(bounds);
          },
          child: child,
        );
      },
      child: child,
      onEnd: () {
        // Loop animation
      },
    );
  }
}

// ==================== ANIMATED WIDGETS ====================

/// Card con animación de entrada
class AnimatedCard extends StatelessWidget {
  final Widget child;
  final Duration? delay;
  final Duration? duration;

  const AnimatedCard({
    Key? key,
    required this.child,
    this.delay,
    this.duration,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: duration ?? AppAnimations.normal,
      curve: AppAnimations.smoothCurve,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(
            offset: Offset(0, 20 * (1 - value)),
            child: child,
          ),
        );
      },
      child: child,
    );
  }
}

/// Lista con animación escalonada
class StaggeredList extends StatelessWidget {
  final List<Widget> children;
  final Duration staggerDelay;
  final Axis scrollDirection;

  const StaggeredList({
    Key? key,
    required this.children,
    this.staggerDelay = const Duration(milliseconds: 50),
    this.scrollDirection = Axis.vertical,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      scrollDirection: scrollDirection,
      itemCount: children.length,
      itemBuilder: (context, index) {
        return TweenAnimationBuilder<double>(
          tween: Tween(begin: 0.0, end: 1.0),
          duration: AppAnimations.normal + (staggerDelay * index),
          curve: AppAnimations.smoothCurve,
          builder: (context, value, child) {
            return Opacity(
              opacity: value,
              child: Transform.translate(
                offset: Offset(
                  scrollDirection == Axis.horizontal ? 20 * (1 - value) : 0,
                  scrollDirection == Axis.vertical ? 20 * (1 - value) : 0,
                ),
                child: child,
              ),
            );
          },
          child: children[index],
        );
      },
    );
  }
}

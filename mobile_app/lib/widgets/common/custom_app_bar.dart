// lib/widgets/common/custom_app_bar.dart
/// 📱 CUSTOM APP BAR
/// AppBar reutilizable con color dinámico por rol

import 'package:flutter/material.dart';
import '../../core/theme/role_colors.dart';

class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final String? userRole;
  final List<Widget>? actions;
  final Widget? leading;
  final bool automaticallyImplyLeading;
  final PreferredSizeWidget? bottom;

  const CustomAppBar({
    Key? key,
    required this.title,
    this.userRole,
    this.actions,
    this.leading,
    this.automaticallyImplyLeading = true,
    this.bottom,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final roleColor = RoleColors.getPrimaryColor(userRole);

    return AppBar(
      title: Text(title),
      backgroundColor: roleColor,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
      leading: leading,
      automaticallyImplyLeading: automaticallyImplyLeading,
      actions: actions,
      bottom: bottom,
    );
  }

  @override
  Size get preferredSize => Size.fromHeight(
        kToolbarHeight + (bottom?.preferredSize.height ?? 0),
      );
}

/// AppBar con gradiente
class GradientAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final String? userRole;
  final List<Widget>? actions;
  final Widget? leading;
  final bool automaticallyImplyLeading;

  const GradientAppBar({
    Key? key,
    required this.title,
    this.userRole,
    this.actions,
    this.leading,
    this.automaticallyImplyLeading = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final roleColor = RoleColors.getPrimaryColor(userRole);
    final darkColor = RoleColors.getDarkColor(userRole);

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [roleColor, darkColor],
        ),
      ),
      child: AppBar(
        title: Text(title),
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        leading: leading,
        automaticallyImplyLeading: automaticallyImplyLeading,
        actions: actions,
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

// lib/screens/common/login_screen.dart
/// 🔐 PANTALLA DE LOGIN MULTI-ROL
/// Login responsive que funciona en todos los dispositivos
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../core/responsive/responsive.dart';
import '../../core/responsive/screen_size.dart';
import '../../core/theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    // Validar formulario
    if (!_formKey.currentState!.validate()) {
      return;
    }

    // Quitar foco del teclado
    FocusScope.of(context).unfocus();

    setState(() => _isLoading = true);

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      
      print('🔄 Iniciando proceso de login...');
      
      // Intentar login
      bool success = await authService.signIn(
        _emailController.text.trim(),
        _passwordController.text,
      );

      if (!mounted) return;

      if (success) {
        print('✅ Login exitoso - AuthWrapper se encargará de la navegación');
        
        // Mostrar mensaje de éxito
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    '¡Bienvenido ${authService.getEmpleadoNombre()}!',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 2),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
        
        // El AuthWrapper en main.dart manejará la navegación automáticamente
      } else {
        // No debería llegar aquí, pero por si acaso
        _showErrorSnackBar('No se pudo completar el inicio de sesión');
      }
      
    } catch (e) {
      if (!mounted) return;
      
      // Extraer mensaje de error limpio
      String errorMessage = e.toString().replaceAll('Exception: ', '');
      
      print('❌ Error en login: $errorMessage');
      
      _showErrorSnackBar(errorMessage);
      
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.red.shade600,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 5),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        action: SnackBarAction(
          label: 'Cerrar',
          textColor: Colors.white,
          onPressed: () {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screen = ScreenSize(context);

    return Scaffold(
      backgroundColor: AppTheme.primaryColor.withOpacity(0.05),
      body: ResponsiveBuilder(
        builder: (context, helper) {
          return SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: EdgeInsets.all(screen.padding),
                child: Container(
                  constraints: BoxConstraints(
                    maxWidth: helper.responsiveValue(
                      phone: double.infinity,
                      tablet: 500,
                      desktop: 600,
                    ),
                  ),
                  child: Card(
                    elevation: helper.isPhone ? 0 : 8,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(screen.borderRadius),
                    ),
                    child: Padding(
                      padding: EdgeInsets.all(
                        helper.responsiveValue(
                          phone: 24,
                          tablet: 32,
                          desktop: 40,
                        ),
                      ),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Logo/Icono
                            _buildLogo(helper),

                            SizedBox(height: helper.responsiveValue(
                              phone: 24,
                              tablet: 32,
                              desktop: 40,
                            )),

                            // Título
                            _buildTitle(helper),

                            SizedBox(height: helper.responsiveValue(
                              phone: 32,
                              tablet: 40,
                              desktop: 48,
                            )),

                            // Campo de email
                            _buildEmailField(screen),

                            SizedBox(height: screen.padding),

                            // Campo de contraseña
                            _buildPasswordField(screen),

                            SizedBox(height: helper.responsiveValue(
                              phone: 24,
                              tablet: 32,
                              desktop: 40,
                            )),

                            // Botón de login
                            _buildLoginButton(screen),

                            SizedBox(height: helper.responsiveValue(
                              phone: 16,
                              tablet: 20,
                              desktop: 24,
                            )),

                            // Info adicional
                            _buildFooter(screen),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // ==================== LOGO ====================
  Widget _buildLogo(ResponsiveHelper helper) {
    final size = helper.responsiveValue(
      phone: 80.0,
      tablet: 100.0,
      desktop: 120.0,
    );

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppTheme.primaryColor,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Icon(
        Icons.local_shipping,
        size: size * 0.5,
        color: Colors.white,
      ),
    );
  }

  // ==================== TÍTULO ====================
  Widget _buildTitle(ResponsiveHelper helper) {
    return Column(
      children: [
        Text(
          'Sistema de Envíos',
          style: TextStyle(
            fontSize: helper.getFontSize(24),
            fontWeight: FontWeight.bold,
            color: AppTheme.primaryColor,
          ),
          textAlign: TextAlign.center,
        ),
        SizedBox(height: helper.responsiveValue(
          phone: 8,
          tablet: 12,
          desktop: 16,
        )),
        Text(
          'Inicia sesión para continuar',
          style: TextStyle(
            fontSize: helper.getFontSize(14),
            color: Colors.grey[600],
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  // ==================== CAMPO EMAIL ====================
  Widget _buildEmailField(ScreenSize screen) {
    return TextFormField(
      controller: _emailController,
      keyboardType: TextInputType.emailAddress,
      enabled: !_isLoading,
      autocorrect: false,
      textInputAction: TextInputAction.next,
      decoration: InputDecoration(
        labelText: 'Correo electrónico',
        hintText: 'usuario@ejemplo.com',
        prefixIcon: const Icon(Icons.email),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(screen.borderRadius),
        ),
        filled: true,
        fillColor: _isLoading ? Colors.grey.shade100 : null,
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Por favor ingresa tu correo electrónico';
        }
        if (!value.contains('@') || !value.contains('.')) {
          return 'Ingresa un correo válido (ejemplo@dominio.com)';
        }
        return null;
      },
    );
  }

  // ==================== CAMPO CONTRASEÑA ====================
  Widget _buildPasswordField(ScreenSize screen) {
    return TextFormField(
      controller: _passwordController,
      obscureText: _obscurePassword,
      enabled: !_isLoading,
      textInputAction: TextInputAction.done,
      decoration: InputDecoration(
        labelText: 'Contraseña',
        hintText: '••••••••',
        prefixIcon: const Icon(Icons.lock),
        suffixIcon: IconButton(
          icon: Icon(
            _obscurePassword ? Icons.visibility_off : Icons.visibility,
          ),
          onPressed: _isLoading ? null : () {
            setState(() {
              _obscurePassword = !_obscurePassword;
            });
          },
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(screen.borderRadius),
        ),
        filled: true,
        fillColor: _isLoading ? Colors.grey.shade100 : null,
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Por favor ingresa tu contraseña';
        }
        if (value.length < 6) {
          return 'La contraseña debe tener al menos 6 caracteres';
        }
        return null;
      },
      onFieldSubmitted: (_) => _isLoading ? null : _login(),
    );
  }

  // ==================== BOTÓN LOGIN ====================
  Widget _buildLoginButton(ScreenSize screen) {
    return SizedBox(
      width: double.infinity,
      height: screen.buttonHeight,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _login,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          foregroundColor: Colors.white,
          disabledBackgroundColor: Colors.grey.shade300,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(screen.borderRadius),
          ),
          elevation: _isLoading ? 0 : 2,
        ),
        child: _isLoading
            ? Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2.5,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Text(
                    'Iniciando sesión...',
                    style: TextStyle(
                      fontSize: screen.bodyFontSize,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.login, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Iniciar Sesión',
                    style: TextStyle(
                      fontSize: screen.bodyFontSize,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  // ==================== FOOTER ====================
  Widget _buildFooter(ScreenSize screen) {
    return Column(
      children: [
        // Info sobre roles
        Container(
          padding: EdgeInsets.all(screen.padding),
          decoration: BoxDecoration(
            color: AppTheme.infoColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(screen.borderRadius),
            border: Border.all(
              color: AppTheme.infoColor.withOpacity(0.3),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              Icon(
                Icons.info_outline,
                color: AppTheme.infoColor,
                size: screen.iconSize,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Acceso para todos los roles del sistema',
                  style: TextStyle(
                    fontSize: screen.captionFontSize,
                    color: AppTheme.infoColor,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Versión
        Text(
          'Versión 1.0.0',
          style: TextStyle(
            fontSize: screen.captionFontSize,
            color: Colors.grey[500],
          ),
        ),
      ],
    );
  }
}
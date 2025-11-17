// lib/main.dart
/// 🚀 ENTRADA PRINCIPAL DE LA APLICACIÓN
/// Sistema de envíos multi-rol con navegación adaptativa
library;


import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';

// Services
import 'services/auth_service.dart';

// Core
import 'core/theme/app_theme.dart';

// Screens y Navigation
import 'screens/auth/login_screen.dart';
import 'navigation/main_scaffold.dart';

// Configuración de Firebase
class FirebaseConfig {
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyCbm3BkHU0T5Kx7Ju4wUv__KS2HszPpdCA',
    appId: '1:743244010565:android:a889be517d5fc28020ff2c',
    messagingSenderId: '743244010565',
    projectId: 'embarques-7ad6e',
    storageBucket: 'embarques-7ad6e.firebasestorage.app',
  );
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inicializar Firebase con configuración
  await Firebase.initializeApp(
    options: FirebaseConfig.android,
  );
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
      ],
      child: MaterialApp(
        title: 'Sistema de Logística',
        debugShowCheckedModeBanner: false,
        
        // Temas
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.light,
        
        // Pantalla inicial
        home: const AuthWrapper(),
      ),
    );
  }
}

// ==================== AUTH WRAPPER ====================
/// Maneja el estado de autenticación y redirige según corresponda

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    
    return StreamBuilder(
      stream: authService.authStateChanges,
      builder: (context, snapshot) {
        // Mostrando loading mientras se verifica el estado
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }
        
        // Si está autenticado
        if (snapshot.hasData && authService.currentUser != null) {
          final rol = authService.getUserRole();
          
          // Verificar que tenga un rol válido
          if (rol != null && rol.isNotEmpty) {
            // ✅ CORRECTO: Usar MainScaffold (es un widget)
            return const MainScaffold();
          } else {
            // Rol inválido o no asignado
            return _buildErrorScreen(
              context,
              'Rol no asignado',
              'Tu cuenta no tiene un rol válido. Contacta al administrador.',
              authService,
            );
          }
        }
        
        // No está autenticado - mostrar login
        return const LoginScreen();
      },
    );
  }

  // ==================== ERROR SCREEN ====================
  Widget _buildErrorScreen(
    BuildContext context,
    String title,
    String message,
    AuthService authService,
  ) {
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => authService.logout(),
            tooltip: 'Cerrar Sesión',
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                size: 64,
                color: Colors.red,
              ),
              const SizedBox(height: 24),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                message,
                style: const TextStyle(
                  fontSize: 16,
                  color: Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: () => authService.logout(),
                icon: const Icon(Icons.logout),
                label: const Text('Cerrar Sesión'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 16,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
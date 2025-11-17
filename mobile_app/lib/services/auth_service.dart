// lib/services/auth_service.dart
/// 🔐 SERVICIO DE AUTENTICACIÓN
/// Maneja login, logout y estado del usuario
library;

import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/app_roles.dart';

class AuthService with ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Usuario actual
  User? get currentUser => _auth.currentUser;

  // Stream de cambios de autenticación
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // Datos del usuario en Firestore
  Map<String, dynamic>? _userData;

  // Constructor: Escuchar cambios de autenticación
  AuthService() {
    _auth.authStateChanges().listen((User? user) {
      if (user != null) {
        _loadUserData(user.uid);
      } else {
        _userData = null;
        notifyListeners();
      }
    });
  }

  // ==================== SIGN IN ====================
  Future<bool> signIn(String email, String password) async {
    try {
      print('🔄 Intentando login con: $email');
      
      UserCredential userCredential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      print('✅ Autenticación exitosa en Firebase Auth');

      // Cargar datos del usuario desde Firestore
      if (userCredential.user != null) {
        await _loadUserData(userCredential.user!.uid);
      }

      notifyListeners();
      print('✅ Login completado exitosamente');
      return true;
      
    } on FirebaseAuthException catch (e) {
      print('❌ Error de autenticación: ${e.code} - ${e.message}');
      
      // Mensajes de error en español
      String errorMessage;
      switch (e.code) {
        case 'user-not-found':
          errorMessage = 'No existe una cuenta con este correo electrónico';
          break;
        case 'wrong-password':
          errorMessage = 'Contraseña incorrecta';
          break;
        case 'invalid-email':
          errorMessage = 'El formato del correo electrónico es inválido';
          break;
        case 'user-disabled':
          errorMessage = 'Esta cuenta ha sido deshabilitada';
          break;
        case 'invalid-credential':
          errorMessage = 'Credenciales inválidas. Verifica tu correo y contraseña';
          break;
        case 'too-many-requests':
          errorMessage = 'Demasiados intentos fallidos. Intenta más tarde';
          break;
        case 'network-request-failed':
          errorMessage = 'Error de conexión. Verifica tu internet';
          break;
        default:
          errorMessage = 'Error al iniciar sesión: ${e.message ?? e.code}';
      }
      
      throw Exception(errorMessage);
      
    } catch (e) {
      print('❌ Error inesperado en signIn: $e');
      throw Exception('Error inesperado al iniciar sesión. Intenta de nuevo.');
    }
  }

  // ==================== SIGN OUT ====================
  Future<void> signOut() async {
    try {
      await _auth.signOut();
      _userData = null;
      notifyListeners();
      print('✅ Sesión cerrada correctamente');
    } catch (e) {
      print('❌ Error en signOut: $e');
      throw Exception('Error al cerrar sesión');
    }
  }

  // ==================== CARGAR DATOS DEL USUARIO ====================
  Future<void> _loadUserData(String uid) async {
    try {
      print('🔄 Cargando datos del usuario desde Firestore...');
      
      // Intentar cargar desde 'usuarios'
      DocumentSnapshot doc = await _firestore
          .collection('usuarios')
          .doc(uid)
          .get();

      if (doc.exists) {
        _userData = doc.data() as Map<String, dynamic>?;
        print('✅ Datos cargados desde Firestore:');
        print('   - Nombre: ${_userData?['nombre']}');
        print('   - Email: ${_userData?['email']}');
        print('   - Rol: ${_userData?['rol']}');
        print('   - Activo: ${_userData?['activo']}');
      } else {
        // Si no existe en Firestore, crear documento básico
        print('⚠️ No existe documento en Firestore, creando uno nuevo...');
        
        final email = currentUser?.email ?? 'sin-email';
        final nombre = email.split('@')[0];
        
        _userData = {
          'email': email,
          'nombre': nombre,
          'rol': 'usuario',
          'activo': true,
          'uid': uid,
        };
        
        // Crear documento en Firestore
        await _firestore.collection('usuarios').doc(uid).set({
          'email': email,
          'nombre': nombre,
          'rol': 'usuario',
          'activo': true,
          'fechaCreacion': FieldValue.serverTimestamp(),
        });
        
        print('✅ Documento creado en Firestore con rol "usuario"');
      }
      
      notifyListeners();
      
    } catch (e) {
      print('❌ Error al cargar datos de usuario: $e');
      
      // Crear datos básicos de fallback
      final email = currentUser?.email ?? 'sin-email';
      _userData = {
        'email': email,
        'nombre': email.split('@')[0],
        'rol': 'usuario',
        'activo': true,
        'uid': uid,
      };
      
      notifyListeners();
    }
  }

  // ==================== RECARGAR DATOS ====================
  Future<void> reloadUserData() async {
    if (currentUser != null) {
      await _loadUserData(currentUser!.uid);
    }
  }

  // ==================== GETTERS DE USUARIO ====================
  
  String? getCurrentUserId() => currentUser?.uid;
  
  String? getUid() => currentUser?.uid;
  
  String? getEmail() => currentUser?.email;
  
  String? getUserRole() {
    return _userData?['rol'] as String? ?? 'usuario';
  }
  
  String? getRoleName() {
    final rol = getUserRole();
    return rol != null ? AppRoles.getRoleName(rol) : 'Usuario';
  }
  
  String? getEmpleadoNombre() {
    return _userData?['nombre'] as String? ?? 
           currentUser?.email?.split('@')[0] ?? 
           'Usuario';
  }
  
  bool get isLoggedIn => currentUser != null;
  
  bool get isAdmin => AppRoles.isAdmin(getUserRole());
  
  bool get isEmpleadoActivo {
    return _userData?['activo'] as bool? ?? true;
  }
  
  Map<String, dynamic>? get userData => _userData;
  
  Map<String, dynamic>? getEmpleadoData() => _userData;

  // ==================== VERIFICAR ROLES ====================
  
  bool hasRole(String role) {
    return getUserRole() == role;
  }

  bool hasAnyRole(List<String> roles) {
    final userRole = getUserRole();
    return userRole != null && roles.contains(userRole);
  }

  // ==================== INFORMACIÓN ADICIONAL ====================
  
  String? getTelefono() => _userData?['telefono'] as String?;
  
  String? getDireccion() => _userData?['direccion'] as String?;
  
  DateTime? getFechaCreacion() {
    final timestamp = _userData?['fechaCreacion'] as Timestamp?;
    return timestamp?.toDate();
  }

  // ==================== ACTUALIZAR PERFIL ====================
  
  Future<bool> updateProfile({
    String? nombre,
    String? telefono,
  }) async {
    try {
      if (currentUser == null) return false;

      Map<String, dynamic> updates = {};
      if (nombre != null) updates['nombre'] = nombre;
      if (telefono != null) updates['telefono'] = telefono;
      updates['updatedAt'] = FieldValue.serverTimestamp();

      await _firestore
          .collection('usuarios')
          .doc(currentUser!.uid)
          .update(updates);

      await _loadUserData(currentUser!.uid);
      return true;
      
    } catch (e) {
      print('❌ Error al actualizar perfil: $e');
      return false;
    }
  }

  // ==================== CAMBIAR CONTRASEÑA ====================
  
  Future<bool> changePassword(String currentPassword, String newPassword) async {
    try {
      if (currentUser == null) return false;

      final credential = EmailAuthProvider.credential(
        email: currentUser!.email!,
        password: currentPassword,
      );

      await currentUser!.reauthenticateWithCredential(credential);
      await currentUser!.updatePassword(newPassword);
      
      print('✅ Contraseña actualizada');
      return true;
      
    } catch (e) {
      print('❌ Error al cambiar contraseña: $e');
      return false;
    }
  }

  // ==================== RESET PASSWORD ====================
  
  Future<void> resetPassword(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email);
      print('✅ Email de recuperación enviado a: $email');
    } catch (e) {
      print('❌ Error al enviar email de reset: $e');
      throw Exception('Error al enviar email de recuperación');
    }
  }

  // ==================== REGISTRO ====================
  
  Future<bool> register({
    required String email,
    required String password,
    required String nombre,
    String rol = 'usuario',
  }) async {
    try {
      print('🔄 Registrando nuevo usuario...');
      
      UserCredential userCredential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      await _firestore
          .collection('usuarios')
          .doc(userCredential.user!.uid)
          .set({
        'nombre': nombre,
        'email': email,
        'rol': rol,
        'activo': true,
        'fechaCreacion': FieldValue.serverTimestamp(),
      });

      await _loadUserData(userCredential.user!.uid);
      
      print('✅ Usuario registrado exitosamente');
      return true;
      
    } catch (e) {
      print('❌ Error en registro: $e');
      return false;
    }
  }

  // ==================== ALIAS DE COMPATIBILIDAD ====================
  
  Future<bool> login(String email, String password) async {
    return await signIn(email, password);
  }
  
  Future<void> logout() async {
    await signOut();
  }
}
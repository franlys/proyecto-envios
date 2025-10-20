import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class AuthService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  User? get currentUser => _auth.currentUser;
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  String? _userRole;
  String? get userRole => _userRole;

  Map<String, dynamic>? _userData;
  Map<String, dynamic>? get userData => _userData;

  // Login con email y contraseña
  Future<bool> signIn(String email, String password) async {
    try {
      UserCredential result = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (result.user != null) {
        // Obtener datos del usuario desde Firestore
        await _loadUserData(result.user!.uid);
        
        // Verificar que sea un empleado (repartidor)
        if (_userRole == 'empleado') {
          notifyListeners();
          return true;
        } else {
          // Si no es empleado, cerrar sesión
          await signOut();
          throw Exception('Solo los repartidores pueden acceder a esta aplicación');
        }
      }
      return false;
    } catch (e) {
      print('Error en signIn: $e');
      rethrow;
    }
  }

  // Cargar datos del usuario desde Firestore
  Future<void> _loadUserData(String uid) async {
    try {
      DocumentSnapshot userDoc = await _firestore
          .collection('usuarios')
          .doc(uid)
          .get();

      if (userDoc.exists) {
        _userData = userDoc.data() as Map<String, dynamic>?;
        _userRole = _userData?['rol'];
      }
    } catch (e) {
      print('Error al cargar datos del usuario: $e');
    }
  }

  // Cerrar sesión
  Future<void> signOut() async {
    await _auth.signOut();
    _userRole = null;
    _userData = null;
    notifyListeners();
  }

  // Verificar si el usuario está autenticado
  bool isAuthenticated() {
    return currentUser != null && _userRole == 'empleado';
  }

  // Obtener ID del usuario actual
  String? getCurrentUserId() {
    return currentUser?.uid;
  }

  // Obtener email del usuario actual
  String? getCurrentUserEmail() {
    return currentUser?.email;
  }

  // Obtener nombre del empleado
  String? getEmpleadoNombre() {
    return _userData?['nombre'];
  }
}
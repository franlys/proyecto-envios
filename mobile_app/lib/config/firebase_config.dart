import 'package:firebase_core/firebase_core.dart';

class FirebaseConfig {
  static const String apiUrl = 'http://localhost:3000/api';
  
  // Configuración de Firebase para Android
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyCbm3BkHU0T5Kx7Ju4wUv__KS2HszPpdCA',
    appId: '1:743244010565:android:a889be517d5fc28020ff2c',
    messagingSenderId: '743244010565',
    projectId: 'embarques-7ad6e',
    storageBucket: 'embarques-7ad6e.firebasestorage.app',
  );
  
  // Inicializar Firebase
  static Future<void> initialize() async {
    await Firebase.initializeApp(
      options: android,
    );
  }
}
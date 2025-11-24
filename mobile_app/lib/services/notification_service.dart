import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;

  Future<void> init() async {
    if (_isInitialized) return;

    // 1. Solicitar permisos
    await _requestPermissions();

    // 2. Configurar notificaciones locales
    await _initLocalNotifications();

    // 3. Configurar listeners de Firebase
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);
    
    // 4. Obtener token inicial
    final token = await getToken();
    print('🔥 FCM Token: $token');

    _isInitialized = true;
    print('🔔 NotificationService inicializado');
  }

  Future<void> _requestPermissions() async {
    NotificationSettings settings = await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    print('🔔 Permisos de notificación: ${settings.authorizationStatus}');
  }

  Future<void> _initLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (details) {
        // Manejar tap en notificación local
        print('🔔 Notificación local tocada: ${details.payload}');
      },
    );
  }

  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    print('🔔 Mensaje en primer plano: ${message.notification?.title}');
    
    RemoteNotification? notification = message.notification;
    AndroidNotification? android = message.notification?.android;

    if (notification != null && android != null) {
      await _localNotifications.show(
        notification.hashCode,
        notification.title,
        notification.body,
        const NotificationDetails(
          android: AndroidNotificationDetails(
            'high_importance_channel',
            'Notificaciones Importantes',
            channelDescription: 'Canal para notificaciones importantes',
            importance: Importance.max,
            priority: Priority.high,
            icon: '@mipmap/ic_launcher',
          ),
          iOS: DarwinNotificationDetails(),
        ),
        payload: message.data.toString(),
      );
    }
  }

  void _handleMessageOpenedApp(RemoteMessage message) {
    print('🔔 Aplicación abierta desde notificación: ${message.data}');
    // Aquí se puede navegar a una pantalla específica
  }

  Future<String?> getToken() async {
    return await _firebaseMessaging.getToken();
  }

  // Handler para background (debe ser estático o top-level)
  static Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
    print("🔔 Mensaje en segundo plano: ${message.messageId}");
  }
}

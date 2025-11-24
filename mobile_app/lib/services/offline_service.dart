import 'dart:convert';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

class OfflineService {
  static final OfflineService _instance = OfflineService._internal();
  factory OfflineService() => _instance;
  OfflineService._internal();

  // Cajas de Hive (Tablas)
  late Box _rutasBox;
  late Box _facturasBox;
  late Box _gastosBox;
  late Box _pendingActionsBox;
  late Box _configBox;

  bool _isInitialized = false;

  // Getters
  bool get isInitialized => _isInitialized;

  /// Inicializar Hive y abrir cajas
  Future<void> init() async {
    if (_isInitialized) return;

    await Hive.initFlutter();

    _rutasBox = await Hive.openBox('rutas_cache');
    _facturasBox = await Hive.openBox('facturas_cache');
    _gastosBox = await Hive.openBox('gastos_cache');
    _pendingActionsBox = await Hive.openBox('pending_actions');
    _configBox = await Hive.openBox('config');

    _isInitialized = true;
    print('📦 OfflineService inicializado');
  }

  /// Verificar conectividad
  Future<bool> hasConnection() async {
    final connectivityResult = await (Connectivity().checkConnectivity());
    return connectivityResult != ConnectivityResult.none;
  }

  /// Stream de cambios de conexión
  Stream<bool> get connectionStream {
    return Connectivity().onConnectivityChanged.map((result) {
      return result != ConnectivityResult.none;
    });
  }

  // ==================== CACHÉ DE DATOS ====================

  /// Guardar datos en caché
  Future<void> cacheData(String boxName, String key, dynamic data) async {
    Box box;
    switch (boxName) {
      case 'rutas':
        box = _rutasBox;
        break;
      case 'facturas':
        box = _facturasBox;
        break;
      case 'gastos':
        box = _gastosBox;
        break;
      default:
        box = _configBox;
    }
    
    // Guardamos como JSON string si es un Map o List, o directo si es primitivo
    if (data is Map || data is List) {
      await box.put(key, jsonEncode(data));
    } else {
      await box.put(key, data);
    }
  }

  /// Obtener datos de caché
  dynamic getCachedData(String boxName, String key) {
    Box box;
    switch (boxName) {
      case 'rutas':
        box = _rutasBox;
        break;
      case 'facturas':
        box = _facturasBox;
        break;
      case 'gastos':
        box = _gastosBox;
        break;
      default:
        box = _configBox;
    }

    final data = box.get(key);
    if (data is String) {
      try {
        return jsonDecode(data);
      } catch (e) {
        return data;
      }
    }
    return data;
  }

  /// Limpiar caché específica
  Future<void> clearCache(String boxName) async {
    switch (boxName) {
      case 'rutas':
        await _rutasBox.clear();
        break;
      case 'facturas':
        await _facturasBox.clear();
        break;
      case 'gastos':
        await _gastosBox.clear();
        break;
    }
  }

  // ==================== COLA DE ACCIONES PENDIENTES ====================

  /// Agregar acción a la cola de sincronización
  Future<void> addPendingAction(String type, String endpoint, Map<String, dynamic> payload) async {
    final action = {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'type': type, // 'POST', 'PUT', 'DELETE'
      'endpoint': endpoint,
      'payload': payload,
      'timestamp': DateTime.now().toIso8601String(),
      'attempts': 0,
    };

    await _pendingActionsBox.add(jsonEncode(action));
    print('📥 Acción guardada offline: $type $endpoint');
  }

  /// Obtener todas las acciones pendientes
  List<Map<String, dynamic>> getPendingActions() {
    final List<Map<String, dynamic>> actions = [];
    for (var i = 0; i < _pendingActionsBox.length; i++) {
      final actionStr = _pendingActionsBox.getAt(i);
      if (actionStr != null) {
        actions.add(jsonDecode(actionStr));
      }
    }
    return actions;
  }

  /// Eliminar acción de la cola (después de sync exitoso)
  Future<void> removePendingAction(int index) async {
    await _pendingActionsBox.deleteAt(index);
  }

  /// Limpiar toda la cola
  Future<void> clearPendingActions() async {
    await _pendingActionsBox.clear();
  }
}

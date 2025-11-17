// lib/services/admin_service.dart
/// 👔 SERVICIO DE ADMINISTRACIÓN
/// Maneja todas las operaciones de Firestore para los administradores
library;


import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/admin_models.dart';

class AdminService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // ==================== USUARIOS ====================
  
  /// Stream de usuarios
  Stream<List<UsuarioSistema>> getUsuariosStream({String? filtroRol}) {
    Query query = _firestore
        .collection('usuarios')
        .orderBy('fechaCreacion', descending: true);

    if (filtroRol != null && filtroRol != 'todos') {
      query = query.where('rol', isEqualTo: filtroRol);
    }

    return query.snapshots().map((snapshot) {
      return snapshot.docs
          .map((doc) => UsuarioSistema.fromFirestore(doc))
          .toList();
    });
  }

  /// Crear usuario
  Future<String?> crearUsuario(UsuarioSistema usuario) async {
    try {
      DocumentReference docRef = await _firestore
          .collection('usuarios')
          .add(usuario.toMap());

      print('✅ Usuario creado: ${docRef.id}');
      return docRef.id;
    } catch (e) {
      print('❌ Error al crear usuario: $e');
      return null;
    }
  }

  /// Actualizar usuario
  Future<bool> actualizarUsuario(String usuarioId, UsuarioSistema usuario) async {
    try {
      await _firestore
          .collection('usuarios')
          .doc(usuarioId)
          .update(usuario.toMap());

      print('✅ Usuario actualizado: $usuarioId');
      return true;
    } catch (e) {
      print('❌ Error al actualizar usuario: $e');
      return false;
    }
  }

  /// Activar/Desactivar usuario
  Future<bool> toggleUsuarioActivo(String usuarioId, bool activo) async {
    try {
      await _firestore.collection('usuarios').doc(usuarioId).update({
        'activo': activo,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      print('✅ Usuario ${activo ? "activado" : "desactivado"}: $usuarioId');
      return true;
    } catch (e) {
      print('❌ Error al cambiar estado de usuario: $e');
      return false;
    }
  }

  // ==================== ESTADÍSTICAS ====================
  
  /// Obtener estadísticas globales
  Future<EstadisticasGlobales> getEstadisticasGlobales() async {
    try {
      DateTime hoy = DateTime.now();
      DateTime inicioMes = DateTime(hoy.year, hoy.month, 1);
      DateTime inicioAnio = DateTime(hoy.year, 1, 1);

      // Usuarios
      QuerySnapshot usuariosSnapshot = await _firestore
          .collection('usuarios')
          .get();

      int totalUsuarios = usuariosSnapshot.docs.length;
      int usuariosActivos = usuariosSnapshot.docs
          .where((doc) => (doc.data() as Map)['activo'] == true)
          .length;

      // Clientes
      QuerySnapshot clientesSnapshot = await _firestore
          .collection('clientes')
          .get();

      int totalClientes = clientesSnapshot.docs.length;
      int clientesActivos = clientesSnapshot.docs
          .where((doc) => (doc.data() as Map)['estado'] == 'activo')
          .length;

      // Rutas y contenedores
      QuerySnapshot rutasSnapshot = await _firestore
          .collection('rutas_distribucion')
          .where('estado', whereIn: ['asignada', 'en_proceso'])
          .get();

      QuerySnapshot contenedoresSnapshot = await _firestore
          .collection('contenedores')
          .where('estado', isEqualTo: 'enviado')
          .get();

      // Tickets
      QuerySnapshot ticketsSnapshot = await _firestore
          .collection('tickets_soporte')
          .where('estado', whereIn: ['abierto', 'en_proceso'])
          .get();

      // Ingresos mensuales
      QuerySnapshot pagosMesSnapshot = await _firestore
          .collection('pagos')
          .where('fechaPago', isGreaterThanOrEqualTo: Timestamp.fromDate(inicioMes))
          .where('estado', isEqualTo: 'confirmado')
          .get();

      double ingresosMensuales = pagosMesSnapshot.docs.fold<double>(0.0, (sum, doc) {
        return sum + ((doc.data() as Map)['monto']?.toDouble() ?? 0.0);
      });

      // Ingresos anuales
      QuerySnapshot pagosAnioSnapshot = await _firestore
          .collection('pagos')
          .where('fechaPago', isGreaterThanOrEqualTo: Timestamp.fromDate(inicioAnio))
          .where('estado', isEqualTo: 'confirmado')
          .get();

      double ingresosAnuales = pagosAnioSnapshot.docs.fold<double>(0.0, (sum, doc) {
        return sum + ((doc.data() as Map)['monto']?.toDouble() ?? 0.0);
      });

      return EstadisticasGlobales(
        totalUsuarios: totalUsuarios,
        usuariosActivos: usuariosActivos,
        totalClientes: totalClientes,
        clientesActivos: clientesActivos,
        enviosEnProceso: rutasSnapshot.docs.length,
        enviosCompletados: 0,
        contenedoresEnTransito: contenedoresSnapshot.docs.length,
        rutasActivas: rutasSnapshot.docs.length,
        ingresosMensuales: ingresosMensuales,
        ingresosAnuales: ingresosAnuales,
        ticketsAbiertos: ticketsSnapshot.docs.length,
        ticketsPendientes: ticketsSnapshot.docs.length,
      );
    } catch (e) {
      print('❌ Error al obtener estadísticas globales: $e');
      return EstadisticasGlobales(
        totalUsuarios: 0,
        usuariosActivos: 0,
        totalClientes: 0,
        clientesActivos: 0,
        enviosEnProceso: 0,
        enviosCompletados: 0,
        contenedoresEnTransito: 0,
        rutasActivas: 0,
        ingresosMensuales: 0.0,
        ingresosAnuales: 0.0,
        ticketsAbiertos: 0,
        ticketsPendientes: 0,
      );
    }
  }

  /// Obtener métricas por rol
  Future<List<MetricasPorRol>> getMetricasPorRol() async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('usuarios')
          .get();

      Map<String, List<UsuarioSistema>> usuariosPorRol = {};
      
      for (var doc in snapshot.docs) {
        UsuarioSistema usuario = UsuarioSistema.fromFirestore(doc);
        if (!usuariosPorRol.containsKey(usuario.rol)) {
          usuariosPorRol[usuario.rol] = [];
        }
        usuariosPorRol[usuario.rol]!.add(usuario);
      }

      return usuariosPorRol.entries.map((entry) {
        int activos = entry.value.where((u) => u.activo).length;
        int inactivos = entry.value.length - activos;

        return MetricasPorRol(
          rol: entry.key,
          totalUsuarios: entry.value.length,
          activos: activos,
          inactivos: inactivos,
        );
      }).toList();
    } catch (e) {
      print('❌ Error al obtener métricas por rol: $e');
      return [];
    }
  }

  /// Obtener resumen financiero
  Future<ResumenFinancieroAdmin> getResumenFinanciero() async {
    try {
      DateTime hoy = DateTime.now();
      DateTime inicioHoy = DateTime(hoy.year, hoy.month, hoy.day);
      DateTime inicioSemana = hoy.subtract(Duration(days: hoy.weekday - 1));
      DateTime inicioMes = DateTime(hoy.year, hoy.month, 1);
      DateTime inicioAnio = DateTime(hoy.year, 1, 1);

      double ingresosDiarios = await _calcularIngresosPeriodo(inicioHoy, null);
      double ingresosSemanales = await _calcularIngresosPeriodo(inicioSemana, null);
      double ingresosMensuales = await _calcularIngresosPeriodo(inicioMes, null);
      double ingresosAnuales = await _calcularIngresosPeriodo(inicioAnio, null);

      QuerySnapshot clientesSnapshot = await _firestore
          .collection('clientes')
          .where('estado', isEqualTo: 'activo')
          .get();

      double cuentasPorCobrar = clientesSnapshot.docs.fold<double>(0.0, (sum, doc) {
        return sum + ((doc.data() as Map)['saldoPendiente']?.toDouble() ?? 0.0);
      });

      QuerySnapshot facturasSnapshot = await _firestore
          .collection('facturas')
          .where('estado', isEqualTo: 'pendiente')
          .get();

      int facturasPendientes = facturasSnapshot.docs.length;

      int facturasVencidas = facturasSnapshot.docs.where((doc) {
        var data = doc.data() as Map;
        if (data['fechaVencimiento'] != null) {
          DateTime vencimiento = (data['fechaVencimiento'] as Timestamp).toDate();
          return vencimiento.isBefore(hoy);
        }
        return false;
      }).length;

      return ResumenFinancieroAdmin(
        ingresosDiarios: ingresosDiarios,
        ingresosSemanales: ingresosSemanales,
        ingresosMensuales: ingresosMensuales,
        ingresosAnuales: ingresosAnuales,
        cuentasPorCobrar: cuentasPorCobrar,
        gastosOperativos: 0.0,
        utilidadNeta: ingresosAnuales,
        facturasPendientes: facturasPendientes,
        facturasVencidas: facturasVencidas,
      );
    } catch (e) {
      print('❌ Error al obtener resumen financiero: $e');
      return ResumenFinancieroAdmin(
        ingresosDiarios: 0.0,
        ingresosSemanales: 0.0,
        ingresosMensuales: 0.0,
        ingresosAnuales: 0.0,
        cuentasPorCobrar: 0.0,
        gastosOperativos: 0.0,
        utilidadNeta: 0.0,
        facturasPendientes: 0,
        facturasVencidas: 0,
      );
    }
  }

  Future<double> _calcularIngresosPeriodo(DateTime inicio, DateTime? fin) async {
    try {
      Query query = _firestore
          .collection('pagos')
          .where('fechaPago', isGreaterThanOrEqualTo: Timestamp.fromDate(inicio))
          .where('estado', isEqualTo: 'confirmado');

      if (fin != null) {
        query = query.where('fechaPago', isLessThanOrEqualTo: Timestamp.fromDate(fin));
      }

      QuerySnapshot snapshot = await query.get();

      return snapshot.docs.fold<double>(0.0, (sum, doc) {
        return sum + ((doc.data() as Map)['monto']?.toDouble() ?? 0.0);
      });
    } catch (e) {
      print('❌ Error al calcular ingresos: $e');
      return 0.0;
    }
  }

  // ==================== ACTIVIDAD ====================
  
  /// Registrar actividad
  Future<bool> registrarActividad(ActividadSistema actividad) async {
    try {
      await _firestore
          .collection('actividades_sistema')
          .add(actividad.toMap());

      return true;
    } catch (e) {
      print('❌ Error al registrar actividad: $e');
      return false;
    }
  }

  /// Obtener actividades recientes
  Future<List<ActividadSistema>> getActividadesRecientes({int limit = 50}) async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('actividades_sistema')
          .orderBy('fecha', descending: true)
          .limit(limit)
          .get();

      return snapshot.docs
          .map((doc) => ActividadSistema.fromFirestore(doc))
          .toList();
    } catch (e) {
      print('❌ Error al obtener actividades: $e');
      return [];
    }
  }

  // ==================== ALERTAS ====================
  
  /// Stream de alertas
  Stream<List<AlertaSistema>> getAlertasStream() {
    return _firestore
        .collection('alertas_sistema')
        .orderBy('fecha', descending: true)
        .limit(20)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => AlertaSistema.fromFirestore(doc))
          .toList();
    });
  }

  /// Marcar alerta como leída
  Future<bool> marcarAlertaLeida(String alertaId) async {
    try {
      await _firestore.collection('alertas_sistema').doc(alertaId).update({
        'leida': true,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      return true;
    } catch (e) {
      print('❌ Error al marcar alerta: $e');
      return false;
    }
  }

  // ==================== CONFIGURACIÓN ====================
  
  /// Obtener configuraciones
  Future<List<ConfiguracionSistema>> getConfiguraciones() async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('configuracion_sistema')
          .get();

      return snapshot.docs
          .map((doc) => ConfiguracionSistema.fromFirestore(doc))
          .toList();
    } catch (e) {
      print('❌ Error al obtener configuraciones: $e');
      return [];
    }
  }

  /// Actualizar configuración
  Future<bool> actualizarConfiguracion(
    String configId,
    dynamic nuevoValor,
    String modificadoPor,
  ) async {
    try {
      await _firestore.collection('configuracion_sistema').doc(configId).update({
        'valor': nuevoValor,
        'ultimaModificacion': FieldValue.serverTimestamp(),
        'modificadoPor': modificadoPor,
      });

      return true;
    } catch (e) {
      print('❌ Error al actualizar configuración: $e');
      return false;
    }
  }
}
// ==============================================================================
// 🔐 SISTEMA DE ROLES Y PERMISOS - ProLogix
// ==============================================================================

/**
 * Roles del sistema con jerarquía de permisos
 */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',      // Tú - acceso total al sistema multi-tenant
  PROPIETARIO: 'propietario',      // Dueño de la empresa - solo dashboards y reportes
  ADMIN_GENERAL: 'admin_general',  // Gerente operativo - gestión diaria (NO finanzas)
  SECRETARIA: 'secretaria',        // Gestión de recolecciones y embarques
  CARGADOR: 'cargador',            // Panel de carga
  REPARTIDOR: 'repartidor'         // Panel de entregas
};

/**
 * Filosofía del Propietario:
 * - Es el INVERSIONISTA/DUEÑO de la empresa
 * - Solo quiere VER métricas, KPIs y reportes financieros
 * - NO gestiona operaciones diarias (eso es trabajo del admin_general)
 * - Pantallas: Dashboard empresarial + Finanzas (solo lectura)
 */

/**
 * Permisos por módulo
 * Formato: { modulo: [roles_permitidos] }
 */
export const PERMISOS_MODULOS = {
  // 📊 Dashboards
  dashboard: [ROLES.SUPER_ADMIN, ROLES.PROPIETARIO, ROLES.ADMIN_GENERAL, ROLES.SECRETARIA],

  // 💼 FINANZAS (SOLO PROPIETARIO Y SUPER_ADMIN)
  finanzas: [ROLES.SUPER_ADMIN, ROLES.PROPIETARIO],

  // 📦 Operaciones (NO para propietario - él solo ve métricas)
  recolecciones: [ROLES.SUPER_ADMIN, ROLES.ADMIN_GENERAL, ROLES.SECRETARIA],
  embarques: [ROLES.SUPER_ADMIN, ROLES.ADMIN_GENERAL, ROLES.SECRETARIA],
  almacenUSA: [ROLES.SUPER_ADMIN, ROLES.ADMIN_GENERAL, ROLES.SECRETARIA],
  almacenRD: [ROLES.SUPER_ADMIN, ROLES.ADMIN_GENERAL, ROLES.SECRETARIA],

  // 🚛 Logística
  rutas: [ROLES.SUPER_ADMIN, ROLES.ADMIN_GENERAL],
  panelRepartidores: [ROLES.SUPER_ADMIN, ROLES.ADMIN_GENERAL, ROLES.REPARTIDOR],
  panelCargadores: [ROLES.SUPER_ADMIN, ROLES.ADMIN_GENERAL, ROLES.CARGADOR],
  panelSecretarias: [ROLES.SUPER_ADMIN, ROLES.ADMIN_GENERAL, ROLES.SECRETARIA],

  // ⚙️ Configuración
  noEntregadas: [ROLES.SUPER_ADMIN, ROLES.ADMIN_GENERAL],
  facturasClientesPendientes: [ROLES.SUPER_ADMIN, ROLES.ADMIN_GENERAL, ROLES.SECRETARIA]
};

/**
 * Verificar si un rol tiene acceso a un módulo
 * @param {string} userRole - Rol del usuario
 * @param {string} modulo - Nombre del módulo
 * @returns {boolean}
 */
export const tieneAcceso = (userRole, modulo) => {
  const rolesPermitidos = PERMISOS_MODULOS[modulo];
  if (!rolesPermitidos) return false;
  return rolesPermitidos.includes(userRole);
};

/**
 * Verificar si un rol es propietario
 * @param {string} userRole - Rol del usuario
 * @returns {boolean}
 */
export const esPropietario = (userRole) => {
  return userRole === ROLES.PROPIETARIO;
};

/**
 * Verificar si un rol es super admin
 * @param {string} userRole - Rol del usuario
 * @returns {boolean}
 */
export const esSuperAdmin = (userRole) => {
  return userRole === ROLES.SUPER_ADMIN;
};

/**
 * Verificar si un rol puede ver finanzas
 * @param {string} userRole - Rol del usuario
 * @returns {boolean}
 */
export const puedeVerFinanzas = (userRole) => {
  return tieneAcceso(userRole, 'finanzas');
};

/**
 * Obtener nombre amigable del rol
 * @param {string} role - Rol del usuario
 * @returns {string}
 */
export const getNombreRol = (role) => {
  const nombres = {
    [ROLES.SUPER_ADMIN]: 'Super Administrador',
    [ROLES.PROPIETARIO]: 'Propietario',
    [ROLES.ADMIN_GENERAL]: 'Administrador General',
    [ROLES.SECRETARIA]: 'Secretaria',
    [ROLES.CARGADOR]: 'Cargador',
    [ROLES.REPARTIDOR]: 'Repartidor'
  };
  return nombres[role] || 'Usuario';
};

/**
 * Menú de navegación por rol
 * Propietario: Solo ve dashboards de alto nivel (métricas empresariales)
 * Admin General: Gestiona operaciones diarias
 */
export const getMenuPorRol = (role) => {
  const menus = {
    [ROLES.SUPER_ADMIN]: [
      { path: '/dashboard', label: 'Dashboard', icon: '📊' },
      { path: '/finanzas/dashboard', label: 'Finanzas', icon: '💼' },
      { path: '/recolecciones', label: 'Recolecciones', icon: '📦' },
      { path: '/embarques', label: 'Embarques', icon: '🚢' },
      { path: '/almacen-usa', label: 'Almacén USA', icon: '🏬' },
      { path: '/almacen-rd', label: 'Almacén RD', icon: '🏭' },
      { path: '/panel-secretarias', label: 'Panel Secretarias', icon: '👩‍💼' },
      { path: '/panel-cargadores', label: 'Panel Cargadores', icon: '📋' },
      { path: '/panel-repartidores', label: 'Panel Repartidores', icon: '🚚' },
      { path: '/rutas', label: 'Rutas', icon: '🗺️' },
      { path: '/no-entregadas', label: 'No Entregadas', icon: '⚠️' },
      { path: '/facturas-clientes-pendientes', label: 'Facturas Pendientes', icon: '📄' }
    ],

    // 💼 PROPIETARIO: Solo métricas y finanzas (sin operaciones)
    [ROLES.PROPIETARIO]: [
      { path: '/dashboard', label: 'Dashboard Empresarial', icon: '📊' },
      { path: '/finanzas/dashboard', label: 'Finanzas', icon: '💼' }
    ],

    // 👨‍💼 ADMIN GENERAL: Operaciones completas (sin finanzas)
    [ROLES.ADMIN_GENERAL]: [
      { path: '/dashboard', label: 'Dashboard', icon: '📊' },
      { path: '/recolecciones', label: 'Recolecciones', icon: '📦' },
      { path: '/embarques', label: 'Embarques', icon: '🚢' },
      { path: '/almacen-usa', label: 'Almacén USA', icon: '🏬' },
      { path: '/almacen-rd', label: 'Almacén RD', icon: '🏭' },
      { path: '/panel-secretarias', label: 'Panel Secretarias', icon: '👩‍💼' },
      { path: '/panel-cargadores', label: 'Panel Cargadores', icon: '📋' },
      { path: '/panel-repartidores', label: 'Panel Repartidores', icon: '🚚' },
      { path: '/rutas', label: 'Rutas', icon: '🗺️' },
      { path: '/no-entregadas', label: 'No Entregadas', icon: '⚠️' },
      { path: '/facturas-clientes-pendientes', label: 'Facturas Pendientes', icon: '📄' }
    ],

    [ROLES.SECRETARIA]: [
      { path: '/dashboard', label: 'Dashboard', icon: '📊' },
      { path: '/panel-secretarias', label: 'Mi Panel', icon: '👩‍💼' },
      { path: '/recolecciones', label: 'Recolecciones', icon: '📦' },
      { path: '/embarques', label: 'Embarques', icon: '🚢' },
      { path: '/almacen-usa', label: 'Almacén USA', icon: '🏬' },
      { path: '/almacen-rd', label: 'Almacén RD', icon: '🏭' },
      { path: '/facturas-clientes-pendientes', label: 'Facturas Pendientes', icon: '📄' }
    ],

    [ROLES.CARGADOR]: [
      { path: '/panel-cargadores', label: 'Mi Panel', icon: '📋' }
    ],

    [ROLES.REPARTIDOR]: [
      { path: '/panel-repartidores', label: 'Mis Entregas', icon: '🚚' }
    ]
  };

  return menus[role] || [];
};

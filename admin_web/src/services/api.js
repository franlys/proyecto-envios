// admin_web/src/services/api.js
// ✅ SERVICIO API COMPLETO CON INTERCEPTORES Y SECTORES

import axios from 'axios';
import { auth } from './firebase';

// ========================================
// CONFIGURACIÓN BASE DE AXIOS
// ========================================
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ========================================
// INTERCEPTOR DE REQUEST
// Agrega el token de autenticación a TODAS las peticiones
// ========================================
api.interceptors.request.use(
  async (config) => {
    try {
      let token = localStorage.getItem('token');
      const user = auth.currentUser;
      
      if (user) {
        if (token) {
          try {
            const payloadBase64 = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payloadBase64));
            
            const now = Math.floor(Date.now() / 1000);
            const timeUntilExpiration = decodedPayload.exp - now;
            
            if (timeUntilExpiration < 300) {
              console.log('⚠️ Token próximo a expirar, renovando automáticamente...');
              const newToken = await user.getIdToken(true);
              localStorage.setItem('token', newToken);
              token = newToken;
              console.log('✅ Token renovado exitosamente');
            }
          } catch (decodeError) {
            console.warn('⚠️ Error decodificando token, renovando por seguridad...', decodeError);
            const newToken = await user.getIdToken(true);
            localStorage.setItem('token', newToken);
            token = newToken;
          }
        } else {
          console.log('⚠️ No hay token en localStorage, obteniendo nuevo token...');
          token = await user.getIdToken(true);
          localStorage.setItem('token', token);
        }
        
        config.headers.Authorization = `Bearer ${token}`;
        
        if (import.meta.env.DEV) {
          console.log(`✅ Token agregado: ${config.method.toUpperCase()} ${config.url}`);
        }
      } else {
        console.warn('⚠️ No hay usuario autenticado en Firebase');
      }
    } catch (error) {
      console.error('❌ Error en interceptor de request:', error);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Error configurando request:', error);
    return Promise.reject(error);
  }
);

// ========================================
// INTERCEPTOR DE RESPONSE
// Maneja errores y renueva tokens automáticamente
// ========================================
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const user = auth.currentUser;
        
        if (user) {
          console.log('🔄 Error 401 detectado, renovando token...');
          
          const newToken = await user.getIdToken(true);
          localStorage.setItem('token', newToken);
          
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          console.log('✅ Token renovado, reintentando petición original...');
          
          return api(originalRequest);
        } else {
          console.log('❌ No hay usuario autenticado, redirigiendo al login...');
          localStorage.removeItem('token');
          
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          
          return Promise.reject(error);
        }
      } catch (refreshError) {
        console.error('❌ Error renovando token:', refreshError);
        
        localStorage.removeItem('token');
        
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    if (error.response) {
      const { status, data } = error.response;
      
      console.error('❌ Error del servidor:', {
        status,
        url: error.config?.url,
        method: error.config?.method,
        data
      });

      switch (status) {
        case 400:
          console.error('❌ Bad Request - Datos inválidos o incompletos');
          break;
        case 403:
          console.error('❌ Acceso denegado - Permisos insuficientes');
          break;
        case 404:
          console.error('❌ Recurso no encontrado');
          break;
        case 500:
          console.error('❌ Error interno del servidor');
          break;
        case 503:
          console.error('❌ Servicio no disponible temporalmente');
          break;
      }
    } else if (error.request) {
      console.error('❌ Error de red - Sin respuesta del servidor:', error.message);
      error.message = 'Error de conexión. Verifica tu conexión a internet.';
    } else {
      console.error('❌ Error configurando petición:', error.message);
    }

    return Promise.reject(error);
  }
);

// ========================================
// FUNCIONES HELPER BÁSICAS
// ========================================

export const apiGet = async (url, config = {}) => {
  try {
    const response = await api.get(url, config);
    return response.data;
  } catch (error) {
    console.error(`❌ GET ${url} falló:`, error.response?.data || error.message);
    throw error;
  }
};

export const apiPost = async (url, data, config = {}) => {
  try {
    if (import.meta.env.DEV) {
      console.log(`📤 POST ${url}:`, data);
    }
    
    const response = await api.post(url, data, config);
    
    if (import.meta.env.DEV) {
      console.log(`✅ POST ${url} exitoso:`, response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error(`❌ POST ${url} falló:`, error.response?.data || error.message);
    throw error;
  }
};

export const apiPut = async (url, data, config = {}) => {
  try {
    if (import.meta.env.DEV) {
      console.log(`📤 PUT ${url}:`, data);
    }
    
    const response = await api.put(url, data, config);
    
    if (import.meta.env.DEV) {
      console.log(`✅ PUT ${url} exitoso:`, response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error(`❌ PUT ${url} falló:`, error.response?.data || error.message);
    throw error;
  }
};

export const apiPatch = async (url, data, config = {}) => {
  try {
    if (import.meta.env.DEV) {
      console.log(`📤 PATCH ${url}:`, data);
    }
    
    const response = await api.patch(url, data, config);
    
    if (import.meta.env.DEV) {
      console.log(`✅ PATCH ${url} exitoso:`, response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error(`❌ PATCH ${url} falló:`, error.response?.data || error.message);
    throw error;
  }
};

export const apiDelete = async (url, config = {}) => {
  try {
    const response = await api.delete(url, config);
    
    if (import.meta.env.DEV) {
      console.log(`✅ DELETE ${url} exitoso:`, response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error(`❌ DELETE ${url} falló:`, error.response?.data || error.message);
    throw error;
  }
};

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================

export const isAuthenticated = () => {
  return !!auth.currentUser && !!localStorage.getItem('token');
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const forceRefreshToken = async () => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }
    
    console.log('🔄 Forzando renovación de token...');
    const newToken = await user.getIdToken(true);
    localStorage.setItem('token', newToken);
    console.log('✅ Token renovado forzadamente');
    
    return newToken;
  } catch (error) {
    console.error('❌ Error forzando renovación de token:', error);
    throw error;
  }
};

export const clearToken = () => {
  localStorage.removeItem('token');
  console.log('🗑️ Token eliminado del localStorage');
};

// ========================================
// 🗺️ API DE SECTORES (NUEVO)
// ========================================

/**
 * Obtener catálogo completo de sectores por zona
 */
export const obtenerCatalogoSectores = async () => {
  try {
    const response = await apiGet('/sectores/catalogo');
    return response;
  } catch (error) {
    console.error('❌ Error obteniendo catálogo de sectores:', error);
    throw error;
  }
};

/**
 * Obtener sectores de una zona específica
 * @param {string} zona - Capital, Cibao, Este, Sur, Local
 */
export const obtenerSectoresPorZona = async (zona) => {
  try {
    const response = await apiGet(`/sectores/por-zona/${zona}`);
    return response;
  } catch (error) {
    console.error(`❌ Error obteniendo sectores de ${zona}:`, error);
    throw error;
  }
};

/**
 * Obtener estadísticas de recolecciones por sector
 * @param {string} zona - Opcional, filtrar por zona específica
 */
export const obtenerEstadisticasSectores = async (zona = null) => {
  try {
    const url = zona ? `/sectores/estadisticas?zona=${zona}` : '/sectores/estadisticas';
    const response = await apiGet(url);
    return response;
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de sectores:', error);
    throw error;
  }
};

/**
 * Optimizar ruta basada en sectores
 * @param {string} zona - Zona de la ruta
 * @param {Array<string>} facturasIds - IDs de las facturas a incluir
 */
export const optimizarRutaPorSectores = async (zona, facturasIds) => {
  try {
    const response = await apiPost('/sectores/optimizar-ruta', {
      zona,
      facturasIds
    });
    return response;
  } catch (error) {
    console.error('❌ Error optimizando ruta:', error);
    throw error;
  }
};

/**
 * Obtener sugerencias de sectores para crear rutas eficientes
 * @param {string} zona - Zona para buscar sugerencias
 */
export const obtenerSugerenciasSectores = async (zona) => {
  try {
    const response = await apiGet(`/sectores/sugerir?zona=${zona}`);
    return response;
  } catch (error) {
    console.error(`❌ Error obteniendo sugerencias para ${zona}:`, error);
    throw error;
  }
};

// ========================================
// 🇩🇴 API ALMACÉN RD - ACTUALIZADA
// ========================================

/**
 * Asignar factura a ruta (ahora puede recibir sector)
 * @param {string} facturaId - ID de la factura
 * @param {object} data - { rutaId, sector? }
 */
export const asignarFacturaARuta = async (facturaId, data) => {
  try {
    const response = await apiPost(`/almacen-rd/facturas/${facturaId}/asignar-ruta`, data);
    return response;
  } catch (error) {
    console.error('❌ Error asignando factura a ruta:', error);
    throw error;
  }
};

/**
 * Crear ruta optimizada con sectores
 * @param {object} data - Datos de la ruta incluyendo zona y sectores
 */
export const crearRutaOptimizada = async (data) => {
  try {
    // Primero optimizar
    const optimizacion = await optimizarRutaPorSectores(data.zona, data.facturasIds);
    
    // Luego crear la ruta con los datos optimizados
    const response = await apiPost('/rutas', {
      ...data,
      facturasIds: optimizacion.data.rutaOptimizada,
      sectoresIncluidos: optimizacion.data.sectoresIncluidos,
      estadisticas: optimizacion.data.estadisticas
    });
    
    return response;
  } catch (error) {
    console.error('❌ Error creando ruta optimizada:', error);
    throw error;
  }
};

// Exportación por defecto
export default api;
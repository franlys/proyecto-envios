// admin_web/src/services/api.js
import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ✅ CORRECCIÓN: Interceptor de request - agregar token a todas las peticiones
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      // ✅ CORRECCIÓN: Verificar si el token está próximo a expirar
      try {
        const user = auth.currentUser;
        
        if (user) {
          // Decodificar el token para verificar expiración
          const payloadBase64 = token.split('.')[1];
          const decodedPayload = JSON.parse(atob(payloadBase64));
          
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiration = decodedPayload.exp - now;
          
          // Si el token expira en menos de 5 minutos, renovarlo antes de la petición
          if (timeUntilExpiration < 300) {
            console.log('⚠️ Token próximo a expirar, renovando antes de la petición...');
            const newToken = await user.getIdToken(true);
            localStorage.setItem('token', newToken);
            config.headers.Authorization = `Bearer ${newToken}`;
          } else {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error verificando token:', error);
        // Si hay error, usar el token actual de todas formas
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ CORRECCIÓN: Interceptor de response - manejar errores 401 y renovar tokens
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // ✅ CORRECCIÓN: Si recibimos un 401 y no hemos reintentado, renovar token y reintentar
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const user = auth.currentUser;
        
        if (user) {
          console.log('🔄 Error 401 detectado, renovando token...');
          
          // Forzar renovación del token
          const newToken = await user.getIdToken(true);
          localStorage.setItem('token', newToken);
          
          // Actualizar el header de la petición original
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          // Reintentar la petición original con el nuevo token
          return api(originalRequest);
        } else {
          // Si no hay usuario, redirigir al login
          console.log('❌ No hay usuario autenticado, redirigiendo al login...');
          localStorage.removeItem('token');
          window.location.href = '/login';
          return Promise.reject(error);
        }
      } catch (refreshError) {
        console.error('❌ Error renovando token:', refreshError);
        // Si falla la renovación, cerrar sesión
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // ✅ CORRECCIÓN: Manejo mejorado de otros errores
    if (error.response) {
      // El servidor respondió con un código de error
      console.error('❌ Error del servidor:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config.url
      });

      // Errores específicos
      if (error.response.status === 403) {
        console.error('❌ Acceso denegado - Permisos insuficientes');
      } else if (error.response.status === 404) {
        console.error('❌ Recurso no encontrado');
      } else if (error.response.status === 500) {
        console.error('❌ Error interno del servidor');
      }
    } else if (error.request) {
      // La petición fue hecha pero no hubo respuesta
      console.error('❌ Error de red - Sin respuesta del servidor:', error.message);
      error.message = 'Error de conexión. Verifica tu internet.';
    } else {
      // Algo pasó al configurar la petición
      console.error('❌ Error configurando petición:', error.message);
    }

    return Promise.reject(error);
  }
);

// ✅ CORRECCIÓN: Funciones helper para facilitar peticiones con manejo de errores
export const apiGet = async (url, config = {}) => {
  try {
    const response = await api.get(url, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const apiPost = async (url, data, config = {}) => {
  try {
    const response = await api.post(url, data, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const apiPut = async (url, data, config = {}) => {
  try {
    const response = await api.put(url, data, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const apiDelete = async (url, config = {}) => {
  try {
    const response = await api.delete(url, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;
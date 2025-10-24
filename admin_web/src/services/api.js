// admin_web/src/services/api.js
import axios from 'axios';
import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL + '/api'
});

// Interceptor para agregar autenticación a todas las peticiones
api.interceptors.request.use(
  async (config) => {
    // OPCIÓN 1: Token de localStorage (si existe - compatibilidad con código viejo)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // OPCIÓN 2: Usuario de Firebase (nuevo sistema)
    const user = auth.currentUser;
    if (user) {
      // Enviar el UID en el header que espera el backend
      config.headers['X-User-Id'] = user.uid;
      
      // También podemos obtener el token de Firebase
      try {
        const firebaseToken = await user.getIdToken();
        config.headers['X-Firebase-Token'] = firebaseToken;
      } catch (error) {
        console.error('Error obteniendo token de Firebase:', error);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el token expiró o no está autorizado
    if (error.response?.status === 401) {
      console.error('Error 401: No autorizado');
      // Solo limpiar localStorage si existía token viejo
      if (localStorage.getItem('token')) {
        localStorage.removeItem('token');
      }
      // NO redirigir automáticamente porque Firebase maneja su propia sesión
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
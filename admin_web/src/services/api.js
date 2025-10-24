// admin_web/src/services/api.js
import axios from 'axios';
import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar el UID del usuario autenticado
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      // Agregar el UID en el header
      config.headers['X-User-Id'] = user.uid;
      
      // También podemos agregar el token si lo necesitamos
      const token = await user.getIdToken();
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('No autorizado - Token inválido o expirado');
      // Aquí podrías redirigir al login
    }
    return Promise.reject(error);
  }
);

export default api;
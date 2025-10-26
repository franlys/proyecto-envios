// admin_web/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '../services/firebase';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ CORRECCIÓN: Función para verificar si el token está expirado
  const isTokenExpired = (token) => {
    if (!token) return true;
    
    try {
      // Decodificar el token JWT (formato: header.payload.signature)
      const payloadBase64 = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payloadBase64));
      
      // Verificar expiración (exp está en segundos)
      const now = Math.floor(Date.now() / 1000);
      return decodedPayload.exp < now;
    } catch (error) {
      console.error('Error verificando expiración del token:', error);
      return true; // Si hay error al decodificar, considerar como expirado
    }
  };

  // ✅ CORRECCIÓN: Función para renovar el token automáticamente
  const refreshToken = async (firebaseUser) => {
    try {
      const newToken = await firebaseUser.getIdToken(true); // true = force refresh
      localStorage.setItem('token', newToken);
      console.log('✅ Token renovado exitosamente');
      return newToken;
    } catch (error) {
      console.error('❌ Error renovando token:', error);
      throw error;
    }
  };

  // ✅ CORRECCIÓN: Verificar token periódicamente y renovar si está próximo a expirar
  useEffect(() => {
    const checkTokenExpiration = async () => {
      const token = localStorage.getItem('token');
      
      if (!token || !user) return;

      try {
        // Decodificar el token para obtener la fecha de expiración
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64));
        
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiration = decodedPayload.exp - now;
        
        // Si el token expira en menos de 5 minutos, renovarlo
        if (timeUntilExpiration < 300) { // 300 segundos = 5 minutos
          console.log('⚠️ Token próximo a expirar, renovando...');
          await refreshToken(user);
        }
      } catch (error) {
        console.error('Error verificando expiración:', error);
      }
    };

    // Verificar cada 4 minutos
    const intervalId = setInterval(checkTokenExpiration, 4 * 60 * 1000);

    // Verificar inmediatamente al montar
    checkTokenExpiration();

    return () => clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          // Obtener token
          const token = localStorage.getItem('token');
          
          // ✅ CORRECCIÓN: Verificar si el token existe y no está expirado
          if (!token || isTokenExpired(token)) {
            console.log('⚠️ Token expirado o no existe, obteniendo nuevo token...');
            const newToken = await firebaseUser.getIdToken(true);
            localStorage.setItem('token', newToken);
          }
          
          // Obtener datos del perfil
          const response = await api.get('/auth/profile');
          setUserData(response.data);
          
        } catch (error) {
          console.error('❌ Error obteniendo perfil:', error);
          
          // Si el error es de autenticación, hacer logout
          if (error.response && error.response.status === 401) {
            console.log('⚠️ Token inválido, cerrando sesión...');
            await logout();
          }
        }
      } else {
        setUser(null);
        setUserData(null);
        localStorage.removeItem('token');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Obtener y guardar token inmediatamente
      const token = await result.user.getIdToken();
      localStorage.setItem('token', token);
      
      console.log('✅ Login exitoso, token guardado');
      
      return result;
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
      localStorage.removeItem('token');
      console.log('✅ Logout exitoso');
    } catch (error) {
      console.error('❌ Error en logout:', error);
      throw error;
    }
  };

  // ✅ CORRECCIÓN: Exponer función para forzar renovación de token
  const forceRefreshToken = async () => {
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }
    return await refreshToken(user);
  };

  const value = {
    user,
    userData,
    login,
    logout,
    loading,
    forceRefreshToken, // ✅ Nueva función exportada
    isTokenExpired      // ✅ Nueva función exportada
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
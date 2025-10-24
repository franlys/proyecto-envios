// admin_web/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          // Obtener y guardar token de Firebase
          const token = await firebaseUser.getIdToken();
          localStorage.setItem('token', token);
          
          // Obtener datos del usuario DIRECTAMENTE de Firestore
          const userDocRef = doc(db, 'usuarios', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Normalizar el rol (admin → admin_general para compatibilidad)
            const rolNormalizado = data.rol === 'admin' ? 'admin_general' : data.rol;
            
            // Obtener datos de la compañía si existe
            let companyData = null;
            if (data.companyId) {
              const companyDocRef = doc(db, 'companies', data.companyId);
              const companyDoc = await getDoc(companyDocRef);
              if (companyDoc.exists()) {
                companyData = {
                  id: data.companyId,
                  nombre: companyDoc.data().nombre,
                  plan: companyDoc.data().plan || 'basic'
                };
              }
            }
            
            setUserData({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              nombre: data.nombre || firebaseUser.displayName,
              rol: rolNormalizado,
              companyId: data.companyId || null,
              company: companyData,
              activo: data.activo !== false,
              telefono: data.telefono || null,
              direccion: data.direccion || null
            });
            
            console.log('✅ Usuario cargado:', {
              nombre: data.nombre,
              rol: rolNormalizado,
              company: companyData?.nombre
            });
          } else {
            console.error('❌ Usuario no encontrado en Firestore');
            setUserData(null);
          }
        } catch (error) {
          console.error('❌ Error obteniendo datos del usuario:', error);
          setUserData(null);
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
    } catch (error) {
      console.error('❌ Error en logout:', error);
      throw error;
    }
  };

  const value = {
    user,
    userData,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
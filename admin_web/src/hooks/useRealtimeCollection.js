// Hook reutilizable para escuchar colecciones de Firestore en tiempo real
// con aislamiento automático por companyId
import { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

/**
 * Hook para escuchar una colección de Firestore en tiempo real
 * @param {string} collectionName - Nombre de la colección
 * @param {Array} additionalFilters - Filtros adicionales [[campo, operador, valor]]
 * @param {Array} orderByFields - Campos para ordenar [[campo, dirección]]
 * @param {Object} options - Opciones adicionales
 * @returns {Object} { data, loading, error }
 */
export const useRealtimeCollection = (
  collectionName,
  additionalFilters = [],
  orderByFields = [],
  options = {}
) => {
  const { userData } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  // ✅ FIX CRÍTICO: Estabilizar filtros y orderBy para evitar loops infinitos
  // Usamos useRef para mantener versiones estables de los arrays
  const prevFiltersRef = useRef();
  const prevOrderByRef = useRef();

  // Comparar contenido serializado en lugar de referencias
  const filtersChanged = JSON.stringify(additionalFilters) !== JSON.stringify(prevFiltersRef.current);
  const orderByChanged = JSON.stringify(orderByFields) !== JSON.stringify(prevOrderByRef.current);

  // Solo actualizar si el contenido realmente cambió
  if (filtersChanged) prevFiltersRef.current = additionalFilters;
  if (orderByChanged) prevOrderByRef.current = orderByFields;

  const companyId = userData?.companyId;

  useEffect(() => {
    // Si no hay userData o no tiene companyId, no hacer nada
    if (!companyId) {
      setLoading(false);
      return;
    }

    const setupListener = async () => {
      try {
        setLoading(true);
        setError(null);

        // Construir la query base
        const collectionRef = collection(db, collectionName);
        let q = query(collectionRef);

        // CRÍTICO: Siempre filtrar por companyId para aislar datos
        q = query(q, where('companyId', '==', companyId));

        // Aplicar filtros adicionales (usar las referencias estables)
        if (prevFiltersRef.current) {
          prevFiltersRef.current.forEach(([field, operator, value]) => {
            q = query(q, where(field, operator, value));
          });
        }

        // Aplicar ordenamiento (usar las referencias estables)
        if (prevOrderByRef.current) {
          prevOrderByRef.current.forEach(([field, direction = 'asc']) => {
            q = query(q, orderBy(field, direction));
          });
        }

        console.log(`🔄 Configurando listener para ${collectionName} con ${prevFiltersRef.current?.length || 0} filtros`);

        // Configurar el listener de tiempo real
        unsubscribeRef.current = onSnapshot(
          q,
          (snapshot) => {
            const documents = [];
            snapshot.forEach((doc) => {
              documents.push({
                id: doc.id,
                ...doc.data()
              });
            });

            console.log(`✅ ${collectionName} actualizado: ${documents.length} documentos`);
            setData(documents);
            setLoading(false);

            if (options.onUpdate) {
              options.onUpdate(documents);
            }
          },
          (err) => {
            console.error(`❌ Error en listener de ${collectionName}:`, err);
            setError(err.message);
            setLoading(false);

            if (options.onError) {
              options.onError(err);
            }
          }
        );
      } catch (err) {
        console.error(`❌ Error configurando listener de ${collectionName}:`, err);
        setError(err.message);
        setLoading(false);
      }
    };

    setupListener();

    // Cleanup: Desuscribirse cuando el componente se desmonte
    return () => {
      if (unsubscribeRef.current) {
        console.log(`🔌 Desconectando listener de ${collectionName}`);
        unsubscribeRef.current();
      }
    };
  }, [collectionName, companyId, filtersChanged, orderByChanged]);

  return { data, loading, error };
};

/**
 * Hook especializado para monitorear rutas activas en tiempo real
 */
export const useRealtimeRutasActivas = () => {
  return useRealtimeCollection(
    'rutas',
    [['estado', 'in', ['asignada', 'cargada', 'carga_finalizada', 'en_carga', 'en_entrega']]]
  );
};

/**
 * Hook especializado para monitorear rutas en carga
 */
export const useRealtimeRutasEnCarga = () => {
  return useRealtimeCollection(
    'rutas',
    [['estado', 'in', ['en_carga', 'cargada', 'carga_finalizada']]]
  );
};

/**
 * Hook especializado para monitorear rutas en entrega
 */
export const useRealtimeRutasEnEntrega = () => {
  return useRealtimeCollection(
    'rutas',
    [['estado', '==', 'en_entrega']]
  );
};

/**
 * Hook especializado para monitorear usuarios activos
 */
export const useRealtimeUsuarios = (rolFiltro = null) => {
  const filters = [['activo', '==', true]];
  if (rolFiltro) {
    filters.push(['rol', '==', rolFiltro]);
  }

  return useRealtimeCollection('usuarios', filters);
};

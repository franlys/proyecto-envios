/**
 * Hooks de Tiempo Real Optimizados para Firebase
 *
 * Características:
 * - Granularidad por vista específica
 * - Indicadores visuales de cambios
 * - Optimistic UI
 * - Detección de cambios incrementales
 * - Notificaciones de nuevos datos
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../services/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

/**
 * Hook base mejorado con detección de cambios y notificaciones
 */
export const useRealtimeCollectionOptimized = (
  collectionName,
  additionalFilters = [],
  orderByFields = [],
  options = {}
) => {
  const { userData } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasNewData, setHasNewData] = useState(false);
  const unsubscribeRef = useRef(null);
  const previousDataRef = useRef([]);
  const isFirstLoadRef = useRef(true);

  const {
    enableNotifications = false,
    notificationMessage = 'Nuevos datos disponibles',
    onNewData = null,
    maxItems = null // Para limitar cantidad de docs y reducir lecturas
  } = options;

  useEffect(() => {
    if (!userData || !userData.companyId) {
      setLoading(false);
      return;
    }

    const setupListener = async () => {
      try {
        setLoading(true);
        setError(null);

        const collectionRef = collection(db, collectionName);
        let q = query(collectionRef);

        // CRÍTICO: Siempre filtrar por companyId
        q = query(q, where('companyId', '==', userData.companyId));

        // Aplicar filtros adicionales
        additionalFilters.forEach(([field, operator, value]) => {
          q = query(q, where(field, operator, value));
        });

        // Aplicar ordenamiento
        orderByFields.forEach(([field, direction = 'asc']) => {
          q = query(q, orderBy(field, direction));
        });

        // Limitar resultados si se especifica (optimización)
        if (maxItems) {
          q = query(q, limit(maxItems));
        }

        // Configurar listener con detección de cambios
        unsubscribeRef.current = onSnapshot(
          q,
          (snapshot) => {
            const documents = [];
            const changes = {
              added: [],
              modified: [],
              removed: []
            };

            // Detectar cambios específicos
            snapshot.docChanges().forEach((change) => {
              const docData = { id: change.doc.id, ...change.doc.data() };

              if (change.type === 'added') {
                changes.added.push(docData);
              } else if (change.type === 'modified') {
                changes.modified.push(docData);
              } else if (change.type === 'removed') {
                changes.removed.push(docData);
              }
            });

            // Construir lista completa
            snapshot.forEach((doc) => {
              documents.push({
                id: doc.id,
                ...doc.data()
              });
            });

            // Detectar nuevos documentos (solo después de la carga inicial)
            if (!isFirstLoadRef.current && changes.added.length > 0) {
              setHasNewData(true);

              if (enableNotifications) {
                toast.info(notificationMessage, {
                  duration: 3000,
                  action: {
                    label: 'Ver',
                    onClick: () => setHasNewData(false)
                  }
                });
              }

              if (onNewData) {
                onNewData(changes.added);
              }
            }

            setData(documents);
            setLoading(false);
            previousDataRef.current = documents;

            if (isFirstLoadRef.current) {
              isFirstLoadRef.current = false;
            }

            // Callback de actualización con información de cambios
            if (options.onUpdate) {
              options.onUpdate(documents, changes);
            }
          },
          (err) => {
            console.error(`Error en listener de ${collectionName}:`, err);
            setError(err.message);
            setLoading(false);

            if (options.onError) {
              options.onError(err);
            }
          }
        );
      } catch (err) {
        console.error(`Error configurando listener de ${collectionName}:`, err);
        setError(err.message);
        setLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [collectionName, userData, JSON.stringify(additionalFilters), JSON.stringify(orderByFields)]);

  const clearNewDataIndicator = useCallback(() => {
    setHasNewData(false);
  }, []);

  return { data, loading, error, hasNewData, clearNewDataIndicator };
};

// ============================================================================
// HOOKS GRANULARES POR ROL Y VISTA ESPECÍFICA
// ============================================================================

/**
 * Hook para Repartidores - Solo MIS rutas activas
 */
export const useMisRutasActivas = () => {
  const { userData } = useAuth();

  return useRealtimeCollectionOptimized(
    'rutas',
    [
      ['repartidorId', '==', userData?.uid || ''],
      ['estado', 'in', ['asignada', 'cargada', 'carga_finalizada', 'en_entrega']]
    ],
    [['fechaCreacion', 'desc']],
    {
      enableNotifications: true,
      notificationMessage: '📦 Nueva ruta asignada',
      maxItems: 20 // Limitar a 20 rutas activas
    }
  );
};

/**
 * Hook para Cargadores - Solo MIS rutas pendientes de carga
 */
export const useMisRutasPendientesCarga = () => {
  const { userData } = useAuth();

  return useRealtimeCollectionOptimized(
    'rutas',
    [
      ['cargadorId', '==', userData?.uid || ''],
      ['estado', 'in', ['asignada', 'en_carga']]
    ],
    [['fechaAsignacion', 'desc']],
    {
      enableNotifications: true,
      notificationMessage: '📋 Nueva ruta para cargar',
      maxItems: 15
    }
  );
};

/**
 * Hook para Admin - Solo rutas en estados activos (no completadas/canceladas)
 */
export const useRutasActivasAdmin = () => {
  return useRealtimeCollectionOptimized(
    'rutas',
    [['estado', 'in', ['asignada', 'en_carga', 'cargada', 'en_entrega']]],
    [['fechaCreacion', 'desc']],
    {
      enableNotifications: true,
      notificationMessage: '🔄 Cambios en rutas activas',
      maxItems: 50 // Admin puede ver más
    }
  );
};

/**
 * Hook para Cargadores en tiempo real - Solo los que están trabajando HOY
 */
export const useCargadoresActivos = () => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return useRealtimeCollectionOptimized(
    'rutas',
    [
      ['estado', 'in', ['en_carga', 'cargada']],
      ['fechaInicioCarga', '>=', hoy.toISOString()]
    ],
    [['fechaInicioCarga', 'desc']],
    {
      maxItems: 30
    }
  );
};

/**
 * Hook para Repartidores en ruta HOY
 */
export const useRepartidoresEnRuta = () => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return useRealtimeCollectionOptimized(
    'rutas',
    [
      ['estado', '==', 'en_entrega'],
      ['fechaInicioEntrega', '>=', hoy.toISOString()]
    ],
    [['fechaInicioEntrega', 'desc']],
    {
      maxItems: 40
    }
  );
};

/**
 * Hook para una ruta específica (detalle)
 */
export const useRutaDetalle = (rutaId) => {
  const { userData } = useAuth();
  const [rutaData, setRutaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!rutaId || !userData) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'rutas', rutaId);

    unsubscribeRef.current = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();

          // Verificar companyId para seguridad
          if (data.companyId === userData.companyId) {
            setRutaData({ id: docSnap.id, ...data });
          } else {
            setError('Acceso denegado');
          }
        } else {
          setError('Ruta no encontrada');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error en listener de ruta:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [rutaId, userData]);

  return { rutaData, loading, error };
};

// ============================================================================
// OPTIMISTIC UI - Actualización inmediata con rollback
// ============================================================================

/**
 * Hook para acciones con Optimistic UI
 */
export const useOptimisticAction = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const executeWithOptimism = useCallback(async ({
    optimisticUpdate, // Función que actualiza el estado local inmediatamente
    serverAction,     // Función async que hace la actualización real
    rollback,         // Función para revertir si falla
    successMessage = 'Acción completada',
    errorMessage = 'Error en la operación'
  }) => {
    try {
      setIsProcessing(true);

      // 1. Actualización optimista inmediata
      optimisticUpdate();

      // 2. Ejecutar acción en servidor
      await serverAction();

      // 3. Mostrar éxito
      toast.success(successMessage);

      return { success: true };
    } catch (error) {
      // 4. Si falla, revertir cambio optimista
      if (rollback) {
        rollback();
      }

      console.error('Error en acción optimista:', error);
      toast.error(errorMessage);

      return { success: false, error };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { executeWithOptimism, isProcessing };
};

/**
 * Helper para actualización optimista de items en array
 */
export const useOptimisticArray = (initialData = []) => {
  const [data, setData] = useState(initialData);
  const [pendingActions, setPendingActions] = useState(new Map());

  const optimisticAdd = useCallback((item, tempId) => {
    setData(prev => [{ ...item, id: tempId, _optimistic: true }, ...prev]);
    return tempId;
  }, []);

  const optimisticUpdate = useCallback((itemId, updates) => {
    setData(prev => prev.map(item =>
      item.id === itemId ? { ...item, ...updates, _optimistic: true } : item
    ));
  }, []);

  const optimisticRemove = useCallback((itemId) => {
    setData(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const confirmAction = useCallback((tempId, realId = null) => {
    setData(prev => prev.map(item => {
      if (item.id === tempId) {
        const { _optimistic, ...rest } = item;
        return realId ? { ...rest, id: realId } : rest;
      }
      return item;
    }));
  }, []);

  const rollbackAction = useCallback((tempId) => {
    setData(prev => prev.filter(item => item.id !== tempId));
  }, []);

  return {
    data,
    setData,
    optimisticAdd,
    optimisticUpdate,
    optimisticRemove,
    confirmAction,
    rollbackAction
  };
};

// ============================================================================
// HELPERS ÚTILES
// ============================================================================

/**
 * Hook para debouncing (búsquedas, filtros)
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook para detectar cambios en datos (útil para indicadores visuales)
 */
export const useDataChangeDetector = (data) => {
  const [hasChanges, setHasChanges] = useState(false);
  const previousDataRef = useRef(data);

  useEffect(() => {
    if (JSON.stringify(data) !== JSON.stringify(previousDataRef.current)) {
      setHasChanges(true);
      previousDataRef.current = data;

      // Auto-limpiar después de 3 segundos
      const timer = setTimeout(() => setHasChanges(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [data]);

  return hasChanges;
};

export default {
  useRealtimeCollectionOptimized,
  useMisRutasActivas,
  useMisRutasPendientesCarga,
  useRutasActivasAdmin,
  useCargadoresActivos,
  useRepartidoresEnRuta,
  useRutaDetalle,
  useOptimisticAction,
  useOptimisticArray,
  useDebounce,
  useDataChangeDetector
};

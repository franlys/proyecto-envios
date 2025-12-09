// Hook para enviar heartbeat automático al servidor
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/**
 * Hook que envía automáticamente señales de "heartbeat" al servidor
 * para indicar que el usuario está activo
 *
 * @param {number} intervalMs - Intervalo en milisegundos (por defecto 90 segundos)
 */
export const useHeartbeat = (intervalMs = 90000) => { // 90 segundos = 1.5 minutos
  const { userData } = useAuth();
  const intervalRef = useRef(null);

  useEffect(() => {
    // Solo enviar heartbeat si el usuario está autenticado
    if (!userData) {
      return;
    }

    const sendHeartbeat = async () => {
      try {
        await api.post('/auth/heartbeat');
        console.log('💓 Heartbeat enviado');
      } catch (error) {
        console.error('❌ Error enviando heartbeat:', error.message);
      }
    };

    // Enviar heartbeat inicial inmediatamente
    sendHeartbeat();

    // Configurar intervalo para enviar heartbeat periódicamente
    intervalRef.current = setInterval(sendHeartbeat, intervalMs);

    // Cleanup: Limpiar intervalo cuando el componente se desmonte
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('🔌 Heartbeat detenido');
      }
    };
  }, [userData, intervalMs]);
};

export default useHeartbeat;

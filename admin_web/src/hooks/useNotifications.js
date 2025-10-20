// admin_web/src/hooks/useNotifications.js
import { useState, useCallback, useEffect } from 'react';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [currentToast, setCurrentToast] = useState(null);

  // Limpiar notificaciones de más de 24 horas
  useEffect(() => {
    const cleanOldNotifications = () => {
      const now = new Date();
      setNotifications(prev => 
        prev.filter(notif => {
          const diff = (now - notif.timestamp) / 1000; // segundos
          return diff < 86400; // 24 horas
        })
      );
    };

    // Limpiar cada 5 minutos
    const interval = setInterval(cleanOldNotifications, 5 * 60 * 1000);
    
    // Limpiar al inicio también
    cleanOldNotifications();

    return () => clearInterval(interval);
  }, []);

  // Cargar notificaciones existentes (primera carga)
  const loadExistingNotifications = useCallback((existingNotifs) => {
    setNotifications(existingNotifs);
  }, []);

  // Agregar nueva notificación (con popup y sonido)
  const addNotification = useCallback((notification) => {
    setNotifications(prev => {
      // Evitar duplicados
      const exists = prev.find(n => n.id === notification.id);
      if (exists) {
        // Si existe, actualizar
        return prev.map(n => n.id === notification.id ? notification : n);
      }
      
      // Si no existe, agregar y reproducir sonido
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSyBzvLZiTYIG2m98OScTgwNUrDn77ZnFwc3kdfw2YM0CxqB5ObycSoHBQBRQB8AAEAfAAABAAgA');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('No se pudo reproducir sonido:', e));
      } catch (error) {
        console.log('Error al reproducir sonido:', error);
      }
      
      return [notification, ...prev];
    });
    
    setCurrentToast(notification);
    
    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
      setCurrentToast(null);
    }, 5000);
  }, []);

  // Marcar como leída
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, leida: true } : notif
      )
    );
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, leida: true }))
    );
  }, []);

  // Cerrar toast
  const closeToast = useCallback(() => {
    setCurrentToast(null);
  }, []);

  // Toggle panel
  const togglePanel = useCallback(() => {
    setShowPanel(prev => !prev);
  }, []);

  // Contar no leídas
  const unreadCount = notifications.filter(n => !n.leida).length;

  return {
    notifications,
    showPanel,
    currentToast,
    unreadCount,
    addNotification,
    loadExistingNotifications,
    markAsRead,
    markAllAsRead,
    closeToast,
    togglePanel,
    setShowPanel
  };
};
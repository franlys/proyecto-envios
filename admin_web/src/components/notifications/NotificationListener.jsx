import { useEffect, useState } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

const NotificationListener = ({ onNewNotification, onLoadExisting }) => {
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // Solo iniciar listener si hay usuario autenticado
    if (!user) return;

    // Validación de companyId para roles no super_admin
    if (user.rol !== 'super_admin' && !user.companyId) {
      console.warn('⚠️ Usuario sin companyId, listener no iniciado');
      return;
    }

    console.log('🔥 NotificationListener iniciado para usuario:', user.rol);

    const facturasRef = collection(db, 'facturas');
    let q;

    if (user.rol === 'super_admin') {
      q = query(
        facturasRef,
        where('estado', '==', 'no_entregado'),
        orderBy('updatedAt', 'desc'),
        limit(50)
      );
    } else {
      q = query(
        facturasRef,
        where('companyId', '==', user.companyId),
        where('estado', '==', 'no_entregado'),
        orderBy('updatedAt', 'desc'),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📡 Listener activado - cambios detectados:', snapshot.docChanges().length);

      if (isFirstLoad) {
        // Primera carga: cargar todas como LEÍDAS (sin popup)
        const existingNotifications = [];

        snapshot.docs.forEach((doc) => {
          const factura = { id: doc.id, ...doc.data() };

          let facturaUpdatedAt;
          if (factura.updatedAt?.toDate) {
            facturaUpdatedAt = factura.updatedAt.toDate();
          } else if (factura.updatedAt instanceof Date) {
            facturaUpdatedAt = factura.updatedAt;
          } else if (typeof factura.updatedAt === 'string') {
            facturaUpdatedAt = new Date(factura.updatedAt);
          } else {
            facturaUpdatedAt = new Date();
          }

          const diffSeconds = (new Date() - facturaUpdatedAt) / 1000;

          // Solo cargar facturas de las últimas 24 horas
          if (diffSeconds < 43200) {
            existingNotifications.push({
              id: factura.id,
              tipo: 'factura_no_entregada',
              titulo: `Factura No Entregada: ${factura.numeroFactura}`,
              mensaje: `${factura.cliente} - Motivo: ${factura.motivoNoEntrega || 'Sin especificar'}`,
              factura: factura,
              timestamp: facturaUpdatedAt,
              leida: true // Marcar como leída
            });
          }
        });

        console.log('📋 Cargando', existingNotifications.length, 'notificaciones existentes como LEÍDAS');
        onLoadExisting(existingNotifications);

        setTimeout(() => {
          setIsFirstLoad(false);
          console.log('✨ Ahora escuchando cambios NUEVOS');
        }, 1000);

      } else {
        // Cambios después de la primera carga: notificar normalmente
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const factura = { id: change.doc.id, ...change.doc.data() };

            let facturaUpdatedAt;
            if (factura.updatedAt?.toDate) {
              facturaUpdatedAt = factura.updatedAt.toDate();
            } else if (factura.updatedAt instanceof Date) {
              facturaUpdatedAt = factura.updatedAt;
            } else if (typeof factura.updatedAt === 'string') {
              facturaUpdatedAt = new Date(factura.updatedAt);
            } else {
              facturaUpdatedAt = new Date();
            }

            const diffSeconds = (new Date() - facturaUpdatedAt) / 1000;

            if (diffSeconds < 30) { // Solo notificar cambios muy recientes
              console.log('✅ Nueva notificación!');
              const notification = {
                id: factura.id,
                tipo: 'factura_no_entregada',
                titulo: `Factura No Entregada: ${factura.numeroFactura}`,
                mensaje: `${factura.cliente} - Motivo: ${factura.motivoNoEntrega || 'Sin especificar'}`,
                factura: factura,
                timestamp: new Date(),
                leida: false
              };

              onNewNotification(notification);
            }
          }
        });
      }
    }, (error) => {
      console.error('❌ Error en listener:', error);
    });

    return () => {
      console.log('🔌 Listener desconectado');
      unsubscribe();
    };
  }, [isFirstLoad, onNewNotification, onLoadExisting, user]);

  return null;
};

export default NotificationListener;
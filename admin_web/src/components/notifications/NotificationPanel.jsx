// admin_web/src/components/notifications/NotificationPanel.jsx
import { useState } from 'react';

const NotificationPanel = ({ notifications, onClose, onMarkAsRead, onViewDetails }) => {
  const [filter, setFilter] = useState('all'); // all, unread, read

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.leida;
    if (filter === 'read') return notif.leida;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.leida).length;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Notificaciones</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-red-200 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {unreadCount > 0 && (
          <div className="bg-red-500 text-white text-sm px-3 py-1 rounded-full inline-block">
            {unreadCount} sin leer
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="border-b border-gray-200 p-2 bg-gray-50">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'all' 
                ? 'bg-red-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Todas ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'unread' 
                ? 'bg-red-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            No leídas ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'read' 
                ? 'bg-red-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Leídas
          </button>
        </div>
      </div>

      {/* Lista de Notificaciones */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-lg font-medium">No hay notificaciones</p>
            <p className="text-sm mt-1">
              {filter === 'unread' ? 'Todas leídas' : 'Aquí aparecerán las alertas'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`border-b border-gray-200 p-4 hover:bg-gray-50 transition ${
                !notif.leida ? 'bg-red-50' : 'bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 p-2 rounded-full ${
                  !notif.leida ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  <svg className={`w-5 h-5 ${
                    !notif.leida ? 'text-red-600' : 'text-gray-400'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>

                <div className="flex-1">
                  <h3 className={`font-medium ${
                    !notif.leida ? 'text-gray-900' : 'text-gray-600'
                  }`}>
                    {notif.titulo}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{notif.mensaje}</p>
                  
                  {notif.factura && (
                    <div className="mt-2 text-xs text-gray-500">
                      <p>Ruta: {notif.factura.rutaNombre || 'Sin asignar'}</p>
                      <p>Repartidor: {notif.factura.repartidorNombre || 'N/A'}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => onViewDetails(notif.factura)}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                    >
                      Ver Detalles
                    </button>
                    
                    {!notif.leida && (
                      <button
                        onClick={() => onMarkAsRead(notif.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Marcar como leída
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    {notif.timestamp?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
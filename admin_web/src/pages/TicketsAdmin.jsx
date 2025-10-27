// admin_web/src/pages/TicketsAdmin.jsx
import { useState, useEffect } from 'react';
import { MessageSquare, Clock, CheckCircle, Send, User, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const TicketsAdmin = () => {
  const { userData } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');

  useEffect(() => {
    if (userData?.rol === 'super_admin') {
      fetchTickets();
    }
  }, [userData]);

  // ✅ CORREGIDO: Aplicando la Regla de Oro
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tickets/all');
      
      // ✅ CORRECCIÓN: Validar success y acceder a response.data.data
      if (response.data.success) {
        setTickets(response.data.data || []);
      } else {
        throw new Error(response.data.error || 'Error al cargar tickets');
      }
    } catch (error) {
      console.error('Error cargando tickets:', error);
      setTickets([]);
      alert('Error al cargar tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (ticketId) => {
    if (!respuesta.trim()) {
      alert('❌ Escribe una respuesta');
      return;
    }

    try {
      const response = await api.patch(`/tickets/${ticketId}/respond`, { respuesta });
      
      if (response.data.success) {
        alert('✅ Ticket respondido exitosamente');
        setRespuesta('');
        setSelectedTicket(null);
        fetchTickets();
      }
    } catch (error) {
      console.error('Error respondiendo ticket:', error);
      alert('❌ Error al responder ticket');
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filterEstado === 'all') return true;
    return ticket.estado === filterEstado;
  });

  const ticketsAbiertos = tickets.filter(t => t.estado === 'abierto').length;
  const ticketsRespondidos = tickets.filter(t => t.estado === 'respondido').length;
  const ticketsCerrados = tickets.filter(t => t.estado === 'cerrado').length;

  if (userData?.rol !== 'super_admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">⛔ No tienes permisos para ver esta página</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gestión de Tickets</h1>
        <p className="text-gray-600 dark:text-gray-400">Administra todas las solicitudes de ayuda</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{tickets.length}</p>
            </div>
            <MessageSquare className="text-blue-500 dark:text-blue-400" size={32} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Abiertos</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{ticketsAbiertos}</p>
            </div>
            <Clock className="text-yellow-500 dark:text-yellow-400" size={32} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Respondidos</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{ticketsRespondidos}</p>
            </div>
            <MessageSquare className="text-blue-500 dark:text-blue-400" size={32} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cerrados</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{ticketsCerrados}</p>
            </div>
            <CheckCircle className="text-gray-500 dark:text-gray-400" size={32} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterEstado('all')}
            className={`px-4 py-2 rounded-lg transition ${
              filterEstado === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Todos ({tickets.length})
          </button>
          <button
            onClick={() => setFilterEstado('abierto')}
            className={`px-4 py-2 rounded-lg transition ${
              filterEstado === 'abierto' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Abiertos ({ticketsAbiertos})
          </button>
          <button
            onClick={() => setFilterEstado('respondido')}
            className={`px-4 py-2 rounded-lg transition ${
              filterEstado === 'respondido' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Respondidos ({ticketsRespondidos})
          </button>
          <button
            onClick={() => setFilterEstado('cerrado')}
            className={`px-4 py-2 rounded-lg transition ${
              filterEstado === 'cerrado' 
                ? 'bg-gray-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Cerrados ({ticketsCerrados})
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            No hay tickets en esta categoría
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTickets.map(ticket => (
              <div key={ticket.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{ticket.asunto}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        ticket.estado === 'abierto' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                        ticket.estado === 'respondido' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        {ticket.estado}
                      </span>
                      <span className={`text-xs font-medium ${
                        ticket.prioridad === 'alta' ? 'text-red-600 dark:text-red-400' :
                        ticket.prioridad === 'media' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        Prioridad {ticket.prioridad}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{ticket.mensaje}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        {ticket.usuarioNombre}
                      </span>
                      <span>{ticket.usuarioEmail}</span>
                      <span>📅 {new Date(ticket.createdAt).toLocaleString()}</span>
                      <span>📂 {ticket.categoria}</span>
                    </div>
                  </div>
                </div>

                {ticket.respuesta && (
                  <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400 p-4 rounded mb-3">
                    <p className="text-sm font-medium text-green-900 dark:text-green-200 mb-1">
                      Tu respuesta:
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-300">{ticket.respuesta}</p>
                  </div>
                )}

                {ticket.estado === 'abierto' && (
                  <div className="mt-4 pt-4 border-t dark:border-gray-700">
                    {selectedTicket === ticket.id ? (
                      <div>
                        <textarea
                          value={respuesta}
                          onChange={(e) => setRespuesta(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="Escribe tu respuesta..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedTicket(null);
                              setRespuesta('');
                            }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleRespond(ticket.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                          >
                            <Send size={16} />
                            Enviar Respuesta
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedTicket(ticket.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <MessageSquare size={16} />
                        Responder
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsAdmin;
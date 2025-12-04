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
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
          <p className="text-rose-800 dark:text-rose-200">⛔ No tienes permisos para ver esta página</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gestión de Tickets</h1>
        <p className="text-slate-600 dark:text-slate-400">Administra todas las solicitudes de ayuda</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Tickets</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{tickets.length}</p>
            </div>
            <MessageSquare className="text-indigo-500 dark:text-indigo-400" size={32} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Abiertos</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{ticketsAbiertos}</p>
            </div>
            <Clock className="text-amber-500 dark:text-amber-400" size={32} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Respondidos</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{ticketsRespondidos}</p>
            </div>
            <MessageSquare className="text-indigo-500 dark:text-indigo-400" size={32} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Cerrados</p>
              <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{ticketsCerrados}</p>
            </div>
            <CheckCircle className="text-slate-500 dark:text-slate-400" size={32} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterEstado('all')}
            className={`px-4 py-2 rounded-lg transition ${
              filterEstado === 'all' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Todos ({tickets.length})
          </button>
          <button
            onClick={() => setFilterEstado('abierto')}
            className={`px-4 py-2 rounded-lg transition ${
              filterEstado === 'abierto' 
                ? 'bg-amber-600 text-white' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Abiertos ({ticketsAbiertos})
          </button>
          <button
            onClick={() => setFilterEstado('respondido')}
            className={`px-4 py-2 rounded-lg transition ${
              filterEstado === 'respondido' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Respondidos ({ticketsRespondidos})
          </button>
          <button
            onClick={() => setFilterEstado('cerrado')}
            className={`px-4 py-2 rounded-lg transition ${
              filterEstado === 'cerrado' 
                ? 'bg-slate-600 text-white' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Cerrados ({ticketsCerrados})
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            No hay tickets en esta categoría
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredTickets.map(ticket => (
              <div key={ticket.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{ticket.asunto}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        ticket.estado === 'abierto' ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200' :
                        ticket.estado === 'respondido' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' :
                        'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                      }`}>
                        {ticket.estado}
                      </span>
                      <span className={`text-xs font-medium ${
                        ticket.prioridad === 'alta' ? 'text-rose-600 dark:text-rose-400' :
                        ticket.prioridad === 'media' ? 'text-amber-600 dark:text-amber-400' :
                        'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        Prioridad {ticket.prioridad}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{ticket.mensaje}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
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
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 dark:border-emerald-400 p-4 rounded mb-3">
                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200 mb-1">
                      Tu respuesta:
                    </p>
                    <p className="text-sm text-emerald-800 dark:text-emerald-300">{ticket.respuesta}</p>
                  </div>
                )}

                {ticket.estado === 'abierto' && (
                  <div className="mt-4 pt-4 border-t dark:border-slate-700">
                    {selectedTicket === ticket.id ? (
                      <div>
                        <textarea
                          value={respuesta}
                          onChange={(e) => setRespuesta(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                          placeholder="Escribe tu respuesta..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedTicket(null);
                              setRespuesta('');
                            }}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleRespond(ticket.id)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                          >
                            <Send size={16} />
                            Enviar Respuesta
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedTicket(ticket.id)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
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
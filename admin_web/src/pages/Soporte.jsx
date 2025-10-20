// admin_web/src/pages/Soporte.jsx
import { useState, useEffect } from 'react';
import { HelpCircle, MessageSquare, Clock, CheckCircle, XCircle, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Soporte = () => {
  const { userData } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    asunto: '',
    mensaje: '',
    prioridad: 'media',
    categoria: 'general'
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tickets/my-tickets');
      if (response.data.success) {
        setTickets(response.data.tickets);
      }
    } catch (error) {
      console.error('Error cargando tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post('/tickets', formData);
      
      if (response.data.success) {
        alert('✅ Ticket creado exitosamente. Te responderemos pronto.');
        setShowCreateModal(false);
        setFormData({
          asunto: '',
          mensaje: '',
          prioridad: 'media',
          categoria: 'general'
        });
        fetchTickets();
      }
    } catch (error) {
      console.error('Error creando ticket:', error);
      alert('❌ Error al crear ticket');
    }
  };

  const handleCloseTicket = async (ticketId) => {
    if (!confirm('¿Cerrar este ticket?')) return;

    try {
      const response = await api.patch(`/tickets/${ticketId}/close`);
      
      if (response.data.success) {
        alert('✅ Ticket cerrado');
        fetchTickets();
      }
    } catch (error) {
      console.error('Error cerrando ticket:', error);
      alert('❌ Error al cerrar ticket');
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'abierto': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Abierto' },
      'respondido': { color: 'bg-blue-100 text-blue-800', icon: MessageSquare, label: 'Respondido' },
      'cerrado': { color: 'bg-gray-100 text-gray-800', icon: CheckCircle, label: 'Cerrado' }
    };
    return badges[estado] || badges.abierto;
  };

  const getPrioridadColor = (prioridad) => {
    const colors = {
      'baja': 'text-green-600',
      'media': 'text-yellow-600',
      'alta': 'text-red-600'
    };
    return colors[prioridad] || colors.media;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Centro de Ayuda</h1>
          <p className="text-gray-600">Solicita ayuda o revisa tus tickets anteriores</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <HelpCircle size={20} />
          Nueva Solicitud
        </button>
      </div>

      {/* Quick Help */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
          <div className="text-3xl mb-3">📚</div>
          <h3 className="font-semibold text-gray-800 mb-2">Documentación</h3>
          <p className="text-sm text-gray-600">Guías y tutoriales del sistema</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
          <div className="text-3xl mb-3">💬</div>
          <h3 className="font-semibold text-gray-800 mb-2">Preguntas Frecuentes</h3>
          <p className="text-sm text-gray-600">Respuestas a dudas comunes</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
          <div className="text-3xl mb-3">📧</div>
          <h3 className="font-semibold text-gray-800 mb-2">Contacto Directo</h3>
          <p className="text-sm text-gray-600">soporte@sistemaenvios.com</p>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Mis Solicitudes</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <HelpCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No tienes solicitudes de ayuda</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Crear primera solicitud
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {tickets.map(ticket => {
              const estadoBadge = getEstadoBadge(ticket.estado);
              const EstadoIcon = estadoBadge.icon;

              return (
                <div key={ticket.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{ticket.asunto}</h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${estadoBadge.color} flex items-center gap-1`}>
                          <EstadoIcon size={12} />
                          {estadoBadge.label}
                        </span>
                        <span className={`text-xs font-medium ${getPrioridadColor(ticket.prioridad)}`}>
                          Prioridad {ticket.prioridad}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{ticket.mensaje}</p>

                      {ticket.respuesta && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                          <p className="text-sm font-medium text-blue-900 mb-1">
                            Respuesta de {ticket.respuestaPor}
                          </p>
                          <p className="text-sm text-blue-800">{ticket.respuesta}</p>
                          <p className="text-xs text-blue-600 mt-2">
                            {ticket.respuestaAt ? new Date(ticket.respuestaAt).toLocaleString() : ''}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>📅 {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        <span>📂 {ticket.categoria}</span>
                      </div>
                    </div>

                    {ticket.estado !== 'cerrado' && (
                      <button
                        onClick={() => handleCloseTicket(ticket.id)}
                        className="ml-4 p-2 text-gray-400 hover:text-red-600 transition"
                        title="Cerrar ticket"
                      >
                        <XCircle size={20} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Crear Ticket */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Nueva Solicitud de Ayuda</h2>

            <form onSubmit={handleCreateTicket}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asunto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.asunto}
                    onChange={(e) => setFormData({...formData, asunto: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe brevemente tu problema"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría
                    </label>
                    <select
                      value={formData.categoria}
                      onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">General</option>
                      <option value="tecnico">Problema Técnico</option>
                      <option value="facturacion">Facturación</option>
                      <option value="cuenta">Mi Cuenta</option>
                      <option value="funcionalidad">Nueva Funcionalidad</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prioridad
                    </label>
                    <select
                      value={formData.prioridad}
                      onChange={(e) => setFormData({...formData, prioridad: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción detallada *
                  </label>
                  <textarea
                    required
                    value={formData.mensaje}
                    onChange={(e) => setFormData({...formData, mensaje: e.target.value})}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe tu problema con el mayor detalle posible..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  Enviar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Soporte;
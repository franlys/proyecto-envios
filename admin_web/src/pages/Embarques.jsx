import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, FileText, Package, Calendar, MapPin } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Embarques = () => {
  const { userData } = useAuth();
  const [embarques, setEmbarques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmbarque, setEditingEmbarque] = useState(null);
  const [formData, setFormData] = useState({
    codigoTracking: '',
    origen: '',
    destino: '',
    fechaRecogida: '',
    fechaEntrega: '',
    estado: 'pendiente',
    descripcion: '',
    peso: '',
    dimensiones: ''
  });

  useEffect(() => {
    loadEmbarques();
  }, []);

  const loadEmbarques = async () => {
    try {
      setLoading(true);
      const response = await api.get('/embarques');
      console.log('📦 Embarques cargados:', response.data);
      
      const embarquesData = response.data.embarques || response.data || [];
      setEmbarques(Array.isArray(embarquesData) ? embarquesData : []);
    } catch (error) {
      console.error('❌ Error cargando embarques:', error);
      setEmbarques([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...formData,
        companyId: userData.companyId
      };

      if (editingEmbarque) {
        await api.put(`/embarques/${editingEmbarque._id}`, dataToSend);
      } else {
        await api.post('/embarques', dataToSend);
      }

      loadEmbarques();
      handleCloseModal();
    } catch (error) {
      console.error('Error guardando embarque:', error);
      alert('Error al guardar embarque: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este embarque?')) {
      try {
        await api.delete(`/embarques/${id}`);
        loadEmbarques();
      } catch (error) {
        console.error('Error eliminando embarque:', error);
        alert('Error al eliminar embarque');
      }
    }
  };

  const handleEdit = (embarque) => {
    setEditingEmbarque(embarque);
    setFormData({
      codigoTracking: embarque.codigoTracking || '',
      origen: embarque.origen || '',
      destino: embarque.destino || '',
      fechaRecogida: embarque.fechaRecogida?.split('T')[0] || '',
      fechaEntrega: embarque.fechaEntrega?.split('T')[0] || '',
      estado: embarque.estado || 'pendiente',
      descripcion: embarque.descripcion || '',
      peso: embarque.peso || '',
      dimensiones: embarque.dimensiones || ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEmbarque(null);
    setFormData({
      codigoTracking: '',
      origen: '',
      destino: '',
      fechaRecogida: '',
      fechaEntrega: '',
      estado: 'pendiente',
      descripcion: '',
      peso: '',
      dimensiones: ''
    });
  };

  const filteredEmbarques = embarques.filter(embarque =>
    embarque.codigoTracking?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    embarque.origen?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    embarque.destino?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEstadoBadge = (estado) => {
    const badges = {
      pendiente: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      en_proceso: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      entregado: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      cancelado: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
    };
    return badges[estado] || badges.pendiente;
  };

  const getEstadoTexto = (estado) => {
    const textos = {
      pendiente: 'Pendiente',
      en_proceso: 'En Proceso',
      entregado: 'Entregado',
      cancelado: 'Cancelado'
    };
    return textos[estado] || estado;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Embarques</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gestión de envíos y tracking</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Nuevo Embarque
        </button>
      </div>

      {/* Búsqueda */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por código, origen o destino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabla de embarques */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Package size={16} />
                    Código Tracking
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    Origen / Destino
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    Fechas
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Detalles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEmbarques.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No hay embarques registrados
                  </td>
                </tr>
              ) : (
                filteredEmbarques.map((embarque) => (
                  <tr key={embarque._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {embarque.codigoTracking}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <div className="font-medium">Origen: {embarque.origen}</div>
                        <div className="text-gray-500 dark:text-gray-400">Destino: {embarque.destino}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <div>Recogida: {new Date(embarque.fechaRecogida).toLocaleDateString()}</div>
                        {embarque.fechaEntrega && (
                          <div className="text-gray-500 dark:text-gray-400">
                            Entrega: {new Date(embarque.fechaEntrega).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(embarque.estado)}`}>
                        {getEstadoTexto(embarque.estado)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {embarque.peso && <div>Peso: {embarque.peso} kg</div>}
                        {embarque.dimensiones && (
                          <div className="text-gray-500 dark:text-gray-400">{embarque.dimensiones}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(embarque)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(embarque._id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                {editingEmbarque ? 'Editar Embarque' : 'Nuevo Embarque'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Código de Tracking *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.codigoTracking}
                      onChange={(e) => setFormData({...formData, codigoTracking: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Estado *
                    </label>
                    <select
                      required
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_proceso">En Proceso</option>
                      <option value="entregado">Entregado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Origen *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.origen}
                      onChange={(e) => setFormData({...formData, origen: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Destino *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.destino}
                      onChange={(e) => setFormData({...formData, destino: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fecha de Recogida *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.fechaRecogida}
                      onChange={(e) => setFormData({...formData, fechaRecogida: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fecha de Entrega Estimada
                    </label>
                    <input
                      type="date"
                      value={formData.fechaEntrega}
                      onChange={(e) => setFormData({...formData, fechaEntrega: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.peso}
                      onChange={(e) => setFormData({...formData, peso: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Dimensiones
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 50x40x30 cm"
                      value={formData.dimensiones}
                      onChange={(e) => setFormData({...formData, dimensiones: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descripción
                  </label>
                  <textarea
                    rows="3"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Detalles adicionales del embarque..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingEmbarque ? 'Actualizar' : 'Crear'} Embarque
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Embarques;
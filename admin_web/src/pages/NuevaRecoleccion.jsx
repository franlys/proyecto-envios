// admin_web/src/pages/NuevaRecoleccion.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, User, MapPin, Phone, Mail, DollarSign, Weight, FileText } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const NuevaRecoleccion = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    // Información del remitente
    remitente_nombre: '',
    remitente_telefono: '',
    remitente_email: '',
    direccion_recoleccion: '',
    
    // Información del destinatario
    destinatario_nombre: '',
    destinatario_telefono: '',
    destinatario_direccion: '',
    destinatario_ciudad: '',
    
    // Información del paquete
    descripcion: '',
    peso: '',
    peso_unidad: 'lb',
    valor_declarado: '',
    
    // Información de pago
    metodo_pago: 'efectivo',
    monto_cobrar: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      // Preparar datos para enviar
      const recoleccionData = {
        recolector_id: userData.uid,
        recolector_nombre: userData.nombre,
        ubicacion: null, // Se puede agregar geolocalización más adelante
        descripcion: formData.descripcion,
        peso: parseFloat(formData.peso) || 0,
        peso_unidad: formData.peso_unidad,
        valor_declarado: parseFloat(formData.valor_declarado) || 0,
        remitente: {
          nombre: formData.remitente_nombre,
          telefono: formData.remitente_telefono,
          email: formData.remitente_email,
          direccion: formData.direccion_recoleccion
        },
        destinatario: {
          nombre: formData.destinatario_nombre,
          telefono: formData.destinatario_telefono,
          direccion: formData.destinatario_direccion,
          ciudad: formData.destinatario_ciudad
        },
        pago: {
          metodo: formData.metodo_pago,
          monto: parseFloat(formData.monto_cobrar) || 0
        }
      };

      const response = await api.post('/recolecciones', recoleccionData);

      if (response.data.success) {
        // Mostrar mensaje de éxito
        alert('✅ Recolección creada exitosamente!\nTracking: ' + response.data.data.tracking_numero);
        
        // Redirigir a la lista de recolecciones
        navigate('/recolecciones');
      }

    } catch (err) {
      console.error('Error creando recolección:', err);
      setError(err.response?.data?.error || 'Error al crear la recolección');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/recolecciones')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft size={20} />
          Volver a Recolecciones
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900">Nueva Recolección</h1>
        <p className="text-gray-600 mt-1">
          Registra una nueva recolección en el sistema
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información del Remitente */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Información del Remitente</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                name="remitente_nombre"
                value={formData.remitente_nombre}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nombre del remitente"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono *
              </label>
              <input
                type="tel"
                name="remitente_telefono"
                value={formData.remitente_telefono}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(305) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="remitente_email"
                value={formData.remitente_email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="email@ejemplo.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección de Recolección *
              </label>
              <input
                type="text"
                name="direccion_recoleccion"
                value={formData.direccion_recoleccion}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Calle, número, ciudad, estado, código postal"
              />
            </div>
          </div>
        </div>

        {/* Información del Destinatario */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="text-green-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Información del Destinatario</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                name="destinatario_nombre"
                value={formData.destinatario_nombre}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nombre del destinatario"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono *
              </label>
              <input
                type="tel"
                name="destinatario_telefono"
                value={formData.destinatario_telefono}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(809) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ciudad *
              </label>
              <input
                type="text"
                name="destinatario_ciudad"
                value={formData.destinatario_ciudad}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Santo Domingo"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección de Entrega *
              </label>
              <input
                type="text"
                name="destinatario_direccion"
                value={formData.destinatario_direccion}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Calle, número, sector"
              />
            </div>
          </div>
        </div>

        {/* Información del Paquete */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="text-purple-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Información del Paquete</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción del Contenido *
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe el contenido del paquete..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Peso *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="peso"
                  value={formData.peso}
                  onChange={handleChange}
                  required
                  step="0.1"
                  min="0"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.0"
                />
                <select
                  name="peso_unidad"
                  value={formData.peso_unidad}
                  onChange={handleChange}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="lb">lb</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Declarado (USD) *
              </label>
              <input
                type="number"
                name="valor_declarado"
                value={formData.valor_declarado}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Información de Pago */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="text-yellow-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Información de Pago</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago *
              </label>
              <select
                name="metodo_pago"
                value={formData.metodo_pago}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="zelle">Zelle</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto a Cobrar (USD)
              </label>
              <input
                type="number"
                name="monto_cobrar"
                value={formData.monto_cobrar}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Creando...
              </>
            ) : (
              <>
                <Package size={20} />
                Crear Recolección
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/recolecciones')}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default NuevaRecoleccion;
// admin_web/src/pages/NuevaRecoleccion.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  DollarSign, 
  Weight,
  FileText,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import api from '../services/api';

export default function NuevaRecoleccion() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    // Remitente (quien envía desde USA)
    remitente: {
      nombre: '',
      telefono: '',
      email: '',
      direccion: '',
      ciudad: '',
      estado: '',
      zip_code: ''
    },
    // Destinatario (quien recibe en RD)
    destinatario: {
      nombre: '',
      telefono: '',
      direccion: '',
      ciudad: '',
      sector: '',
      referencia: ''
    },
    // Paquete
    peso: '',
    peso_unidad: 'lb',
    valor_declarado: '',
    descripcion: '',
    // Pago
    metodo_pago: 'efectivo',
    monto_pagado: '',
    observaciones: ''
  });

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validarFormulario = () => {
    // Validar remitente
    if (!formData.remitente.nombre || !formData.remitente.telefono || !formData.remitente.ciudad) {
      setError('Por favor completa los datos del remitente');
      return false;
    }

    // Validar destinatario
    if (!formData.destinatario.nombre || !formData.destinatario.telefono || !formData.destinatario.ciudad) {
      setError('Por favor completa los datos del destinatario');
      return false;
    }

    // Validar paquete
    if (!formData.peso || parseFloat(formData.peso) <= 0) {
      setError('Por favor ingresa el peso del paquete');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Preparar datos para el backend
      const recoleccionData = {
        recolector_id: userData.uid,
        recolector_nombre: userData.nombre,
        remitente: formData.remitente,
        destinatario: formData.destinatario,
        peso: parseFloat(formData.peso),
        peso_unidad: formData.peso_unidad,
        valor_declarado: formData.valor_declarado ? parseFloat(formData.valor_declarado) : 0,
        descripcion: formData.descripcion,
        pago: {
          metodo: formData.metodo_pago,
          monto: formData.monto_pagado ? parseFloat(formData.monto_pagado) : 0,
          status: formData.monto_pagado ? 'pagado' : 'pendiente'
        },
        observaciones: formData.observaciones,
        fecha_recoleccion: new Date().toISOString()
      };

      const response = await api.post('/recolecciones', recoleccionData);

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/recolecciones');
        }, 2000);
      }
    } catch (err) {
      console.error('Error creando recolección:', err);
      setError(err.response?.data?.error || 'Error al crear la recolección');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/recolecciones');
  };

  // Mensaje de éxito
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Recolección Creada!</h2>
          <p className="text-gray-600 mb-4">
            La recolección se ha registrado exitosamente
          </p>
          <p className="text-sm text-gray-500">
            Redirigiendo...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver a Recolecciones
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            Nueva Recolección
          </h1>
          <p className="text-gray-600 mt-2">
            Registra una nueva recolección en Estados Unidos
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección: Remitente */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-600" />
              Datos del Remitente (USA)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.remitente.nombre}
                  onChange={(e) => handleInputChange('remitente', 'nombre', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.remitente.telefono}
                  onChange={(e) => handleInputChange('remitente', 'telefono', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.remitente.email}
                  onChange={(e) => handleInputChange('remitente', 'email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ciudad *
                </label>
                <input
                  type="text"
                  required
                  value={formData.remitente.ciudad}
                  onChange={(e) => handleInputChange('remitente', 'ciudad', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Miami"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <input
                  type="text"
                  value={formData.remitente.estado}
                  onChange={(e) => handleInputChange('remitente', 'estado', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="FL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.remitente.zip_code}
                  onChange={(e) => handleInputChange('remitente', 'zip_code', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="33101"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.remitente.direccion}
                  onChange={(e) => handleInputChange('remitente', 'direccion', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123 Main Street"
                />
              </div>
            </div>
          </div>

          {/* Sección: Destinatario */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Datos del Destinatario (República Dominicana)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.destinatario.nombre}
                  onChange={(e) => handleInputChange('destinatario', 'nombre', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="María García"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.destinatario.telefono}
                  onChange={(e) => handleInputChange('destinatario', 'telefono', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(809) 555-1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ciudad *
                </label>
                <input
                  type="text"
                  required
                  value={formData.destinatario.ciudad}
                  onChange={(e) => handleInputChange('destinatario', 'ciudad', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Santo Domingo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sector
                </label>
                <input
                  type="text"
                  value={formData.destinatario.sector}
                  onChange={(e) => handleInputChange('destinatario', 'sector', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Naco"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.destinatario.direccion}
                  onChange={(e) => handleInputChange('destinatario', 'direccion', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Calle Principal #123"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Referencia
                </label>
                <input
                  type="text"
                  value={formData.destinatario.referencia}
                  onChange={(e) => handleInputChange('destinatario', 'referencia', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Al lado del colmado"
                />
              </div>
            </div>
          </div>

          {/* Sección: Paquete */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-600" />
              Información del Paquete
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peso *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.peso}
                    onChange={(e) => handleInputChange(null, 'peso', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.0"
                  />
                  <select
                    value={formData.peso_unidad}
                    onChange={(e) => handleInputChange(null, 'peso_unidad', e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="lb">lb</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Declarado (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor_declarado}
                  onChange={(e) => handleInputChange(null, 'valor_declarado', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción del Contenido
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => handleInputChange(null, 'descripcion', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ropa, zapatos, artículos personales..."
                />
              </div>
            </div>
          </div>

          {/* Sección: Pago */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-600" />
              Información de Pago
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pago
                </label>
                <select
                  value={formData.metodo_pago}
                  onChange={(e) => handleInputChange(null, 'metodo_pago', e.target.value)}
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
                  Monto Pagado (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.monto_pagado}
                  onChange={(e) => handleInputChange(null, 'monto_pagado', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => handleInputChange(null, 'observaciones', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Guardar Recolección
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
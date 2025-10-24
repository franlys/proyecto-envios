// admin_web/src/pages/Recolecciones.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Recolecciones() {
  const { userData } = useAuth();
  const [recolecciones, setRecolecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [recoleccionSeleccionada, setRecoleccionSeleccionada] = useState(null);

  useEffect(() => {
    cargarRecolecciones();
  }, [filtroStatus]);

  const cargarRecolecciones = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroStatus) params.append('status', filtroStatus);
      params.append('limit', '100');

      const response = await fetch(`${API_URL}/api/recolecciones?${params}`);
      const data = await response.json();

      if (data.success) {
        setRecolecciones(data.data);
      } else {
        setError('Error al cargar recolecciones');
      }
    } catch (err) {
      setError('Error de conexión: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Recolectado': 'bg-blue-100 text-blue-800',
      'En almacén EE.UU.': 'bg-purple-100 text-purple-800',
      'En contenedor': 'bg-indigo-100 text-indigo-800',
      'En tránsito': 'bg-yellow-100 text-yellow-800',
      'En almacén RD': 'bg-orange-100 text-orange-800',
      'Confirmado': 'bg-green-100 text-green-800',
      'En ruta': 'bg-cyan-100 text-cyan-800',
      'Entregado': 'bg-emerald-100 text-emerald-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (mostrarFormulario) {
    return (
      <NuevaRecoleccion
        onClose={() => {
          setMostrarFormulario(false);
          cargarRecolecciones();
        }}
        userData={userData}
      />
    );
  }

  if (recoleccionSeleccionada) {
    return (
      <DetalleRecoleccion
        tracking={recoleccionSeleccionada}
        onClose={() => {
          setRecoleccionSeleccionada(null);
          cargarRecolecciones();
        }}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recolecciones</h1>
          <p className="text-gray-600 mt-1">Gestión de recolecciones en EE.UU.</p>
        </div>
        <button
          onClick={() => setMostrarFormulario(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all"
        >
          + Nueva Recolección
        </button>
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium text-gray-700">Filtrar por status:</label>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            <option value="Recolectado">Recolectado</option>
            <option value="En almacén EE.UU.">En almacén EE.UU.</option>
            <option value="En contenedor">En contenedor</option>
            <option value="En tránsito">En tránsito</option>
            <option value="En almacén RD">En almacén RD</option>
            <option value="Confirmado">Confirmado</option>
            <option value="En ruta">En ruta</option>
            <option value="Entregado">Entregado</option>
          </select>
          <span className="text-sm text-gray-600">
            {recolecciones.length} recolecciones encontradas
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tracking
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Remitente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Destinatario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pago
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {recolecciones.map((rec) => (
              <tr key={rec.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-blue-600">
                    {rec.tracking_numero}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatearFecha(rec.fecha_recoleccion)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{rec.remitente.nombre}</div>
                  <div className="text-sm text-gray-500">{rec.remitente.ciudad}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{rec.destinatario.nombre}</div>
                  <div className="text-sm text-gray-500">{rec.destinatario.ciudad}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(rec.status)}`}>
                    {rec.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">${rec.pago.monto}</div>
                  <div className="text-sm text-gray-500">{rec.pago.status}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => setRecoleccionSeleccionada(rec.tracking_numero)}
                    className="text-blue-600 hover:text-blue-900 font-medium"
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {recolecciones.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No hay recolecciones registradas</p>
            <button
              onClick={() => setMostrarFormulario(true)}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              Crear la primera recolección
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NuevaRecoleccion({ onClose, userData }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [trackingCreado, setTrackingCreado] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [formData, setFormData] = useState({
    recolector_id: userData?.uid || '',
    recolector_nombre: userData?.nombre || '',
    descripcion: '',
    peso: '',
    peso_unidad: 'lb',
    valor_declarado: '',
    remitente_nombre: '',
    remitente_direccion: '',
    remitente_ciudad: '',
    remitente_estado: '',
    remitente_zip: '',
    remitente_telefono: '',
    remitente_email: '',
    destinatario_nombre: '',
    destinatario_ciudad: '',
    destinatario_sector: '',
    destinatario_telefono: '',
    destinatario_telefono_alt: '',
    destinatario_direccion: '',
    pago_status: 'Pagado en origen',
    pago_momento: 'recoleccion',
    pago_metodo: 'Efectivo',
    pago_monto: '',
    pago_moneda: 'USD'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFotosChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      setError('Máximo 5 fotos permitidas');
      return;
    }

    setFotos(files);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };

  const eliminarFoto = (index) => {
    const newFotos = fotos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFotos(newFotos);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const recoleccionData = {
        recolector_id: formData.recolector_id,
        recolector_nombre: formData.recolector_nombre,
        descripcion: formData.descripcion,
        peso: parseFloat(formData.peso) || null,
        peso_unidad: formData.peso_unidad,
        valor_declarado: parseFloat(formData.valor_declarado) || 0,
        remitente: {
          nombre: formData.remitente_nombre,
          direccion: formData.remitente_direccion,
          ciudad: formData.remitente_ciudad,
          estado: formData.remitente_estado,
          zip: formData.remitente_zip,
          telefono: formData.remitente_telefono,
          email: formData.remitente_email
        },
        destinatario: {
          nombre: formData.destinatario_nombre,
          ciudad: formData.destinatario_ciudad,
          sector: formData.destinatario_sector,
          telefono: formData.destinatario_telefono,
          telefono_alt: formData.destinatario_telefono_alt,
          direccion_completa: formData.destinatario_direccion
        },
        pago: {
          status: formData.pago_status,
          momento_pago: formData.pago_momento,
          metodo: formData.pago_metodo,
          monto: parseFloat(formData.pago_monto) || 0,
          moneda: formData.pago_moneda
        }
      };

      const response = await fetch(`${API_URL}/api/recolecciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recoleccionData)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al crear recolección');
      }

      const tracking = data.data.tracking_numero;
      setTrackingCreado(tracking);

      if (fotos.length > 0) {
        const formDataFotos = new FormData();
        fotos.forEach(foto => {
          formDataFotos.append('fotos', foto);
        });

        const fotosResponse = await fetch(`${API_URL}/api/recolecciones/${tracking}/fotos`, {
          method: 'POST',
          body: formDataFotos
        });

        const fotosData = await fotosResponse.json();
        
        if (!fotosData.success) {
          console.error('Error subiendo fotos:', fotosData.error);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6">
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            ¡Recolección creada exitosamente!
          </h2>
          <p className="text-green-700 text-lg mb-4">
            Número de tracking: <span className="font-bold">{trackingCreado}</span>
          </p>
          <p className="text-green-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-h-screen overflow-y-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nueva Recolección</h1>
          <p className="text-gray-600 mt-1">Complete todos los datos del paquete</p>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">📸 Fotos del Paquete</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subir fotos (máximo 5)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFotosChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          {previews.length > 0 && (
            <div className="grid grid-cols-5 gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative">
                  <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => eliminarFoto(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">📦 Información del Paquete</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción del contenido</label>
              <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ej: Caja con ropa, zapatos y accesorios" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Peso</label>
              <div className="flex gap-2">
                <input type="number" name="peso" value={formData.peso} onChange={handleInputChange} step="0.1" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="25" />
                <select name="peso_unidad" value={formData.peso_unidad} onChange={handleInputChange} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="lb">lb</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor declarado (USD)</label>
              <input type="number" name="valor_declarado" value={formData.valor_declarado} onChange={handleInputChange} step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="150.00" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">👤 Remitente (EE.UU.)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre completo *</label>
              <input type="text" name="remitente_nombre" value={formData.remitente_nombre} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Juan Pérez" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Dirección *</label>
              <input type="text" name="remitente_direccion" value={formData.remitente_direccion} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="123 Main St, Apt 5B" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad *</label>
              <input type="text" name="remitente_ciudad" value={formData.remitente_ciudad} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="New York" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado *</label>
              <input type="text" name="remitente_estado" value={formData.remitente_estado} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="NY" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code *</label>
              <input type="text" name="remitente_zip" value={formData.remitente_zip} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="10001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono *</label>
              <input type="tel" name="remitente_telefono" value={formData.remitente_telefono} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="+1-555-0123" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" name="remitente_email" value={formData.remitente_email} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="juan@email.com" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">👤 Destinatario (República Dominicana)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre completo *</label>
              <input type="text" name="destinatario_nombre" value={formData.destinatario_nombre} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="María López" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad *</label>
              <input type="text" name="destinatario_ciudad" value={formData.destinatario_ciudad} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Santo Domingo" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sector</label>
              <input type="text" name="destinatario_sector" value={formData.destinatario_sector} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Los Mina" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono *</label>
              <input type="tel" name="destinatario_telefono" value={formData.destinatario_telefono} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="809-555-0456" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono alternativo</label>
              <input type="tel" name="destinatario_telefono_alt" value={formData.destinatario_telefono_alt} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="829-555-0789" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Dirección completa *</label>
              <textarea name="destinatario_direccion" value={formData.destinatario_direccion} onChange={handleInputChange} required rows="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Calle 5 #12, Los Mina, Santo Domingo Este" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">💰 Información de Pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado del pago *</label>
              <select name="pago_status" value={formData.pago_status} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="Pagado en origen">Pagado en origen</option>
                <option value="Pagado en almacén">Pagado en almacén</option>
                <option value="Por cobrar destino">Por cobrar en destino</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago</label>
              <select name="pago_metodo" value={formData.pago_metodo} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="Efectivo">Efectivo</option>
                <option value="Zelle">Zelle</option>
                <option value="Card">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monto (USD) *</label>
              <input type="number" name="pago_monto" value={formData.pago_monto} onChange={handleInputChange} required step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="45.00" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium" disabled={loading}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Creando...' : 'Crear Recolección'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DetalleRecoleccion({ tracking, onClose }) {
  const [recoleccion, setRecoleccion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarDetalle();
  }, [tracking]);

  const cargarDetalle = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/recolecciones/${tracking}`);
      const data = await response.json();

      if (data.success) {
        setRecoleccion(data.data);
      } else {
        setError('Error al cargar detalle');
      }
    } catch (err) {
      setError('Error de conexión: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !recoleccion) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Recolección no encontrada'}
        </div>
        <button onClick={onClose} className="mt-4 text-blue-600 hover:text-blue-800">
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-h-screen overflow-y-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <button onClick={onClose} className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Recolección {recoleccion.tracking_numero}
          </h1>
          <p className="text-gray-600 mt-1">
            Creada el {formatearFecha(recoleccion.fecha_recoleccion)}
          </p>
        </div>
        <div className="text-right">
          <span className={`px-4 py-2 rounded-lg font-semibold ${recoleccion.status === 'Entregado' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
            {recoleccion.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recoleccion.paquete.fotos && recoleccion.paquete.fotos.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">📸 Fotos del Paquete</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recoleccion.paquete.fotos.map((foto, index) => (
                <a key={index} href={foto} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={foto} alt={`Foto ${index + 1}`} className="w-full h-32 object-cover rounded-lg hover:opacity-75 transition-opacity cursor-pointer" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">📦 Información del Paquete</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600">Descripción:</span>
              <p className="font-medium">{recoleccion.paquete.descripcion || 'No especificada'}</p>
            </div>
            {recoleccion.paquete.peso && (
              <div>
                <span className="text-sm text-gray-600">Peso:</span>
                <p className="font-medium">{recoleccion.paquete.peso} {recoleccion.paquete.peso_unidad}</p>
              </div>
            )}
            <div>
              <span className="text-sm text-gray-600">Valor declarado:</span>
              <p className="font-medium">${recoleccion.paquete.valor_declarado}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">👤 Remitente</h3>
          <div className="space-y-2">
            <p className="font-medium text-lg">{recoleccion.remitente.nombre}</p>
            <p className="text-gray-600">{recoleccion.remitente.direccion}</p>
            <p className="text-gray-600">{recoleccion.remitente.ciudad}, {recoleccion.remitente.estado} {recoleccion.remitente.zip}</p>
            <p className="text-gray-600">📞 {recoleccion.remitente.telefono}</p>
            {recoleccion.remitente.email && (
              <p className="text-gray-600">✉️ {recoleccion.remitente.email}</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">👤 Destinatario</h3>
          <div className="space-y-2">
            <p className="font-medium text-lg">{recoleccion.destinatario.nombre}</p>
            <p className="text-gray-600">{recoleccion.destinatario.direccion_completa}</p>
            <p className="text-gray-600">
              {recoleccion.destinatario.ciudad}
              {recoleccion.destinatario.sector && `, ${recoleccion.destinatario.sector}`}
            </p>
            <p className="text-gray-600">📞 {recoleccion.destinatario.telefono}</p>
            {recoleccion.destinatario.telefono_alt && (
              <p className="text-gray-600">📞 Alt: {recoleccion.destinatario.telefono_alt}</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">💰 Información de Pago</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600">Estado:</span>
              <p className="font-medium">{recoleccion.pago.status}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Método:</span>
              <p className="font-medium">{recoleccion.pago.metodo || 'No especificado'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Monto:</span>
              <p className="font-medium text-lg text-green-600">
                ${recoleccion.pago.monto} {recoleccion.pago.moneda}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">📋 Historial de Estados</h3>
          <div className="space-y-3">
            {recoleccion.historial && recoleccion.historial.length > 0 ? (
              recoleccion.historial.map((evento, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{evento.accion}</p>
                        <p className="text-sm text-gray-600">Por: {evento.usuario}</p>
                        {evento.notas && (
                          <p className="text-sm text-gray-500 mt-1">{evento.notas}</p>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatearFecha(evento.fecha)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No hay historial disponible</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
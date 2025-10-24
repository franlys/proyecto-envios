// admin_web/src/pages/NuevaRecoleccion.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Package, 
  User, 
  MapPin, 
  DollarSign,
  Camera,
  Upload,
  X,
  Check,
  AlertCircle,
  Phone,
  Mail,
  Weight,
  FileText
} from 'lucide-react';
import api from '../services/api';

export default function NuevaRecoleccion() {
  const navigate = useNavigate();
  const { userData } = useAuth();

  // Estados del formulario
  const [paso, setPaso] = useState(1); // 1: Remitente, 2: Destinatario, 3: Paquete, 4: Fotos, 5: Pago, 6: Preview
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Datos del formulario
  const [formData, setFormData] = useState({
    // Remitente
    remitente: {
      nombre: '',
      direccion: '',
      ciudad: '',
      estado: '',
      zip: '',
      telefono: '',
      email: ''
    },
    // Destinatario
    destinatario: {
      nombre: '',
      ciudad: '',
      sector: '',
      telefono: '',
      telefono_alt: '',
      direccion_completa: ''
    },
    // Paquete
    descripcion: '',
    peso: '',
    peso_unidad: 'lb',
    valor_declarado: '',
    // Pago
    pago: {
      status: 'Pagado',
      momento_pago: 'origen',
      metodo: '',
      monto: '',
      moneda: 'USD'
    }
  });

  // Fotos
  const [fotos, setFotos] = useState([]);
  const [fotosPreview, setFotosPreview] = useState([]);

  // Ubicación GPS
  const [ubicacion, setUbicacion] = useState(null);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

  // Manejar cambios en inputs
  const handleChange = (seccion, campo, valor) => {
    if (seccion === 'paquete') {
      setFormData(prev => ({
        ...prev,
        [campo]: valor
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [seccion]: {
          ...prev[seccion],
          [campo]: valor
        }
      }));
    }
  };

  // Obtener ubicación GPS
  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    setObteniendoUbicacion(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUbicacion({
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
          precision: position.coords.accuracy
        });
        setObteniendoUbicacion(false);
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        alert('No se pudo obtener la ubicación');
        setObteniendoUbicacion(false);
      }
    );
  };

  // Manejar selección de fotos
  const handleFotosChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (fotos.length + files.length > 5) {
      alert('Máximo 5 fotos permitidas');
      return;
    }

    // Guardar archivos
    setFotos(prev => [...prev, ...files]);

    // Crear previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotosPreview(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Eliminar foto
  const eliminarFoto = (index) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
    setFotosPreview(prev => prev.filter((_, i) => i !== index));
  };

  // Validar paso actual
  const validarPaso = (pasoActual) => {
    switch (pasoActual) {
      case 1: // Remitente
        if (!formData.remitente.nombre || !formData.remitente.direccion || 
            !formData.remitente.ciudad || !formData.remitente.telefono) {
          setError('Por favor completa todos los campos obligatorios del remitente');
          return false;
        }
        break;
      case 2: // Destinatario
        if (!formData.destinatario.nombre || !formData.destinatario.ciudad || 
            !formData.destinatario.telefono || !formData.destinatario.direccion_completa) {
          setError('Por favor completa todos los campos obligatorios del destinatario');
          return false;
        }
        break;
      case 3: // Paquete
        if (!formData.descripcion) {
          setError('Por favor agrega una descripción del paquete');
          return false;
        }
        break;
      case 4: // Fotos
        if (fotos.length === 0) {
          setError('Por favor sube al menos una foto del paquete');
          return false;
        }
        break;
      case 5: // Pago
        if (!formData.pago.status || !formData.pago.momento_pago) {
          setError('Por favor completa la información de pago');
          return false;
        }
        break;
    }
    setError(null);
    return true;
  };

  // Siguiente paso
  const siguientePaso = () => {
    if (validarPaso(paso)) {
      setPaso(paso + 1);
      window.scrollTo(0, 0);
    }
  };

  // Paso anterior
  const pasoAnterior = () => {
    setPaso(paso - 1);
    setError(null);
    window.scrollTo(0, 0);
  };

  // Enviar formulario
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Paso 1: Crear recolección
      const recoleccionData = {
        recolector_id: userData.uid,
        recolector_nombre: userData.nombre,
        ubicacion: ubicacion,
        descripcion: formData.descripcion,
        peso: parseFloat(formData.peso) || null,
        peso_unidad: formData.peso_unidad,
        valor_declarado: parseFloat(formData.valor_declarado) || 0,
        remitente: formData.remitente,
        destinatario: formData.destinatario,
        pago: {
          ...formData.pago,
          monto: parseFloat(formData.pago.monto) || 0
        }
      };

      const response = await api.post('/recolecciones', recoleccionData);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al crear recolección');
      }

      const trackingNumero = response.data.data.id;

      // Paso 2: Subir fotos
      if (fotos.length > 0) {
        const formDataFotos = new FormData();
        fotos.forEach(foto => {
          formDataFotos.append('fotos', foto);
        });

        await api.post(`/recolecciones/${trackingNumero}/fotos`, formDataFotos, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      setSuccess(`¡Recolección creada exitosamente! Tracking: ${trackingNumero}`);
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/recolecciones');
      }, 2000);

    } catch (err) {
      console.error('Error creando recolección:', err);
      setError(err.response?.data?.error || err.message || 'Error al crear recolección');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar contenido según el paso
  const renderPaso = () => {
    switch (paso) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Información del Remitente</h2>
                <p className="text-gray-600">Quien envía el paquete desde EE.UU.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.remitente.nombre}
                  onChange={(e) => handleChange('remitente', 'nombre', e.target.value)}
                  placeholder="Ej: John Smith"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.remitente.direccion}
                  onChange={(e) => handleChange('remitente', 'direccion', e.target.value)}
                  placeholder="Ej: 123 Main Street"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ciudad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.remitente.ciudad}
                  onChange={(e) => handleChange('remitente', 'ciudad', e.target.value)}
                  placeholder="Ej: Miami"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <input
                  type="text"
                  value={formData.remitente.estado}
                  onChange={(e) => handleChange('remitente', 'estado', e.target.value)}
                  placeholder="Ej: FL"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código Postal (ZIP)
                </label>
                <input
                  type="text"
                  value={formData.remitente.zip}
                  onChange={(e) => handleChange('remitente', 'zip', e.target.value)}
                  placeholder="Ej: 33101"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.remitente.telefono}
                    onChange={(e) => handleChange('remitente', 'telefono', e.target.value)}
                    placeholder="Ej: +1 305 123 4567"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.remitente.email}
                    onChange={(e) => handleChange('remitente', 'email', e.target.value)}
                    placeholder="Ej: john@example.com"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-100 p-3 rounded-full">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Información del Destinatario</h2>
                <p className="text-gray-600">Quien recibe el paquete en República Dominicana</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.destinatario.nombre}
                  onChange={(e) => handleChange('destinatario', 'nombre', e.target.value)}
                  placeholder="Ej: María Rodríguez"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ciudad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.destinatario.ciudad}
                  onChange={(e) => handleChange('destinatario', 'ciudad', e.target.value)}
                  placeholder="Ej: Santo Domingo"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sector
                </label>
                <input
                  type="text"
                  value={formData.destinatario.sector}
                  onChange={(e) => handleChange('destinatario', 'sector', e.target.value)}
                  placeholder="Ej: Los Prados"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.destinatario.telefono}
                    onChange={(e) => handleChange('destinatario', 'telefono', e.target.value)}
                    placeholder="Ej: 809-123-4567"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono Alternativo
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.destinatario.telefono_alt}
                    onChange={(e) => handleChange('destinatario', 'telefono_alt', e.target.value)}
                    placeholder="Ej: 829-987-6543"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección Completa <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.destinatario.direccion_completa}
                  onChange={(e) => handleChange('destinatario', 'direccion_completa', e.target.value)}
                  placeholder="Ej: Calle Principal #45, Los Prados, Santo Domingo"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  required
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-green-100 p-3 rounded-full">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Información del Paquete</h2>
                <p className="text-gray-600">Detalles del contenido y características</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción del Contenido <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => handleChange('paquete', 'descripcion', e.target.value)}
                    placeholder="Ej: Ropa, zapatos, artículos personales..."
                    rows={4}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peso
                </label>
                <div className="relative">
                  <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.1"
                    value={formData.peso}
                    onChange={(e) => handleChange('paquete', 'peso', e.target.value)}
                    placeholder="0.0"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidad de Peso
                </label>
                <select
                  value={formData.peso_unidad}
                  onChange={(e) => handleChange('paquete', 'peso_unidad', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="lb">Libras (lb)</option>
                  <option value="kg">Kilogramos (kg)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Declarado (USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_declarado}
                    onChange={(e) => handleChange('paquete', 'valor_declarado', e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Valor aproximado del contenido para fines de seguro
                </p>
              </div>

              {/* Ubicación GPS */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ubicación GPS (Opcional)
                </label>
                {!ubicacion ? (
                  <button
                    type="button"
                    onClick={obtenerUbicacion}
                    disabled={obteniendoUbicacion}
                    className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-full md:w-auto disabled:bg-gray-100"
                  >
                    <MapPin className="w-5 h-5" />
                    {obteniendoUbicacion ? 'Obteniendo ubicación...' : 'Obtener mi ubicación actual'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-800">
                      Ubicación obtenida: {ubicacion.latitud.toFixed(6)}, {ubicacion.longitud.toFixed(6)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setUbicacion(null)}
                      className="ml-auto text-green-600 hover:text-green-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-100 p-3 rounded-full">
                <Camera className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Fotos del Paquete</h2>
                <p className="text-gray-600">Sube fotos del paquete (mínimo 1, máximo 5)</p>
              </div>
            </div>

            {/* Input de fotos */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-500 transition-colors">
              <input
                type="file"
                id="fotos-input"
                accept="image/*"
                multiple
                onChange={handleFotosChange}
                className="hidden"
              />
              <label
                htmlFor="fotos-input"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="bg-orange-100 p-4 rounded-full">
                  <Upload className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    Click para subir fotos
                  </p>
                  <p className="text-sm text-gray-600">
                    o arrastra y suelta aquí
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, WEBP (máx. 5MB cada una)
                </p>
              </label>
            </div>

            {/* Preview de fotos */}
            {fotosPreview.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {fotosPreview.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => eliminarFoto(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {fotos.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  {fotos.length} foto{fotos.length !== 1 ? 's' : ''} seleccionada{fotos.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Información de Pago</h2>
                <p className="text-gray-600">Detalles sobre el estado del pago del envío</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado del Pago <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.pago.status}
                  onChange={(e) => handleChange('pago', 'status', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="Pagado">Pagado</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Pago contra entrega">Pago contra entrega</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Momento del Pago <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.pago.momento_pago}
                  onChange={(e) => handleChange('pago', 'momento_pago', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="origen">Pagado en origen (EE.UU.)</option>
                  <option value="destino">Pago contra entrega (RD)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pago
                </label>
                <select
                  value={formData.pago.metodo}
                  onChange={(e) => handleChange('pago', 'metodo', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Seleccionar método</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia bancaria</option>
                  <option value="Tarjeta">Tarjeta de crédito/débito</option>
                  <option value="Zelle">Zelle</option>
                  <option value="PayPal">PayPal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto (USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.pago.monto}
                    onChange={(e) => handleChange('pago', 'monto', e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-teal-100 p-3 rounded-full">
                <Eye className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Resumen de la Recolección</h2>
                <p className="text-gray-600">Verifica que toda la información sea correcta</p>
              </div>
            </div>

            {/* Remitente */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Remitente
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Nombre:</p>
                  <p className="font-semibold text-gray-900">{formData.remitente.nombre}</p>
                </div>
                <div>
                  <p className="text-gray-600">Teléfono:</p>
                  <p className="font-semibold text-gray-900">{formData.remitente.telefono}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600">Dirección:</p>
                  <p className="font-semibold text-gray-900">
                    {formData.remitente.direccion}, {formData.remitente.ciudad}, {formData.remitente.estado} {formData.remitente.zip}
                  </p>
                </div>
              </div>
            </div>

            {/* Destinatario */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                Destinatario
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Nombre:</p>
                  <p className="font-semibold text-gray-900">{formData.destinatario.nombre}</p>
                </div>
                <div>
                  <p className="text-gray-600">Teléfono:</p>
                  <p className="font-semibold text-gray-900">{formData.destinatario.telefono}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600">Dirección:</p>
                  <p className="font-semibold text-gray-900">{formData.destinatario.direccion_completa}</p>
                </div>
              </div>
            </div>

            {/* Paquete */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                Paquete
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Descripción:</p>
                  <p className="font-semibold text-gray-900">{formData.descripcion}</p>
                </div>
                {formData.peso && (
                  <div>
                    <p className="text-gray-600">Peso:</p>
                    <p className="font-semibold text-gray-900">{formData.peso} {formData.peso_unidad}</p>
                  </div>
                )}
                {formData.valor_declarado && (
                  <div>
                    <p className="text-gray-600">Valor declarado:</p>
                    <p className="font-semibold text-gray-900">${formData.valor_declarado} USD</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-600">Fotos:</p>
                  <p className="font-semibold text-gray-900">{fotos.length} foto{fotos.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Pago */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                Pago
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Estado:</p>
                  <p className="font-semibold text-gray-900">{formData.pago.status}</p>
                </div>
                <div>
                  <p className="text-gray-600">Momento:</p>
                  <p className="font-semibold text-gray-900">
                    {formData.pago.momento_pago === 'origen' ? 'Pagado en origen' : 'Pago contra entrega'}
                  </p>
                </div>
                {formData.pago.metodo && (
                  <div>
                    <p className="text-gray-600">Método:</p>
                    <p className="font-semibold text-gray-900">{formData.pago.metodo}</p>
                  </div>
                )}
                {formData.pago.monto && (
                  <div>
                    <p className="text-gray-600">Monto:</p>
                    <p className="font-semibold text-gray-900">${formData.pago.monto} USD</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/recolecciones')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver a Recolecciones
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Nueva Recolección</h1>
          <p className="text-gray-600 mt-2">Completa los siguientes pasos para registrar una nueva recolección</p>
        </div>

        {/* Indicador de pasos */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Remitente' },
              { num: 2, label: 'Destinatario' },
              { num: 3, label: 'Paquete' },
              { num: 4, label: 'Fotos' },
              { num: 5, label: 'Pago' },
              { num: 6, label: 'Resumen' }
            ].map((p, index) => (
              <div key={p.num} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full font-semibold
                  ${paso >= p.num 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {paso > p.num ? <Check className="w-5 h-5" /> : p.num}
                </div>
                <span className={`
                  ml-2 text-sm font-medium
                  ${paso >= p.num ? 'text-gray-900' : 'text-gray-500'}
                `}>
                  {p.label}
                </span>
                {index < 5 && (
                  <div className={`
                    w-8 h-1 mx-4
                    ${paso > p.num ? 'bg-blue-600' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contenido del paso */}
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          {renderPaso()}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 mb-6">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Botones de navegación */}
        <div className="flex gap-4">
          {paso > 1 && (
            <button
              onClick={pasoAnterior}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Anterior
            </button>
          )}
          {paso < 6 ? (
            <button
              onClick={siguientePaso}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creando Recolección...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Crear Recolección
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
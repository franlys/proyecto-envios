// admin_web/src/pages/NuevaRecoleccion.jsx
// ✅ INTEGRACIÓN COMPLETA CON SELECTOR DE SECTOR DINÁMICO Y SUBIDA DE FOTOS OPTIMIZADA

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ModuloFacturacion from '../components/ModuloFacturacion';
import { ArrowLeft, Package, MapPin, Plus, Trash2, Upload, X, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateImageVariants, variantBlobToFile } from '../utils/thumbnailGenerator';

// ✅ CATÁLOGO DE SECTORES POR ZONA
const SECTORES_POR_ZONA = {
  'Capital': [
    'Gazcue', 'Piantini', 'Naco', 'Bella Vista', 'Zona Colonial',
    'Cristo Rey', 'Los Mina', 'Ensanche Ozama', 'Villa Mella',
    'Los Tres Brazos', 'San Isidro', 'Boca Chica'
  ],
  'Cibao': [
    'Santiago Centro', 'Los Jardines Metropolitanos', 'Gurabo', 'Tamboril',
    'La Vega Centro', 'Moca', 'San Francisco de Macorís', 'Mao'
  ],
  'Este': [
    'San Pedro Centro', 'La Romana Centro', 'Bávaro', 'Punta Cana',
    'Higüey Centro', 'El Seibo', 'Hato Mayor'
  ],
  'Sur': [
    'Azua Centro', 'Barahona Centro', 'San Juan Centro',
    'San Cristóbal', 'Bajos de Haina', 'Neiba'
  ],
  'Local': [
    'Baní Centro', 'Zona Rural Norte', 'Zona Rural Sur',
    'Matanzas', 'Sabana Buey'
  ]
};

const NuevaRecoleccion = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();

  // Estados del remitente
  const [remitente, setRemitente] = useState('');
  const [remitenteEmail, setRemitenteEmail] = useState('');
  const [remitenteTelefono, setRemitenteTelefono] = useState('');
  const [remitenteDireccion, setRemitenteDireccion] = useState('');

  // Estados del destinatario
  const [destinatario, setDestinatario] = useState('');
  const [destinatarioEmail, setDestinatarioEmail] = useState('');
  const [destinatarioTelefono, setDestinatarioTelefono] = useState('');
  const [destinatarioDireccion, setDestinatarioDireccion] = useState('');

  // ✅ Estados de zona y sector
  const [zona, setZona] = useState('');
  const [sector, setSector] = useState('');
  const [sectoresDisponibles, setSectoresDisponibles] = useState([]);

  const [notas, setNotas] = useState('');
  const [items, setItems] = useState([{ id: 1, producto: '', cantidad: 1, precio: 0 }]);
  const [fotos, setFotos] = useState([]);
  const [fotoPreviews, setFotoPreviews] = useState([]);

  const [facturacion, setFacturacion] = useState({
    subtotal: 0,
    impuestos: 0,
    total: 0,
    estadoPago: 'pendiente_pago',
    metodoPago: '',
    montoPagado: 0,
    saldoPendiente: 0,
    notas: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Actualizar sectores cuando cambia la zona
  useEffect(() => {
    if (zona) {
      const sectores = SECTORES_POR_ZONA[zona] || [];
      setSectoresDisponibles(sectores);
      // Reset sector si cambia la zona
      if (sector && !sectores.includes(sector)) {
        setSector('');
      }
    } else {
      setSectoresDisponibles([]);
      setSector('');
    }
  }, [zona]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), producto: '', cantidad: 1, precio: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      toast.warning('Debe haber al menos un item.');
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    if (fotos.length + files.length > 10) {
      toast.warning('Puedes subir un máximo de 10 fotos.');
      return;
    }

    setFotos(prevFotos => [...prevFotos, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreviews(prevPreviews => [...prevPreviews, reader.result]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = null;
  };

  const handleRemovePhoto = (index) => {
    setFotos(fotos.filter((_, i) => i !== index));
    setFotoPreviews(previews => previews.filter((_, i) => i !== index));
  };

  // ✅ LÓGICA DE SUBIDA DE ARCHIVOS (Firebase) CON THUMBNAILS
  const subirArchivosAFirebase = async (archivos) => {
    const urls = [];
    if (!archivos || archivos.length === 0) return urls;

    // Usamos un ID temporal o timestamp para la carpeta
    const idReferencia = `temp_${Date.now()}`;

    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];

      try {
        // Mostrar indicador si tarda más de 500ms
        const timeoutId = setTimeout(() => {
          toast.loading(`Procesando imagen ${i + 1}/${archivos.length}...`, { id: `process-${i}` });
        }, 500);

        // Generar thumbnail (200px) y preview (1024px)
        const variants = await generateImageVariants(archivo, {
          onProgress: (progress) => {
            if (progress.stage === 'thumbnail') {
              toast.loading(`Generando thumbnail ${i + 1}...`, { id: `process-${i}` });
            } else if (progress.stage === 'preview') {
              toast.loading(`Generando preview ${i + 1}...`, { id: `process-${i}` });
            }
          }
        });

        clearTimeout(timeoutId);
        toast.dismiss(`process-${i}`);

        // Paths en Storage
        const baseNombre = `recolecciones/${idReferencia}/${Date.now()}_${i}`;

        // Subir thumbnail (200px)
        const thumbnailFile = variantBlobToFile(variants.thumbnail.blob, archivo.name, 'thumb');
        const thumbnailPath = `${baseNombre}_thumb.jpg`;
        const thumbnailRef = ref(storage, thumbnailPath);
        await uploadBytes(thumbnailRef, thumbnailFile);
        const thumbnailUrl = await getDownloadURL(thumbnailRef);

        // Subir preview (1024px)
        const previewFile = variantBlobToFile(variants.preview.blob, archivo.name, 'preview');
        const previewPath = `${baseNombre}_preview.jpg`;
        const previewRef = ref(storage, previewPath);
        await uploadBytes(previewRef, previewFile);
        const previewUrl = await getDownloadURL(previewRef);

        // Guardar ambas URLs
        urls.push({
          thumbnail: thumbnailUrl,
          preview: previewUrl,
          metadata: variants.metadata
        });

      } catch (error) {
        console.error(`Error procesando archivo ${archivo.name}:`, error);
        toast.error(`Error al procesar ${archivo.name}`);
      }
    }
    return urls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // ✅ VALIDACIONES
    if (!remitente || !remitenteTelefono || !remitenteDireccion) {
      toast.error('Los datos del remitente son obligatorios.');
      return;
    }

    if (!destinatario || !destinatarioTelefono || !destinatarioDireccion || !zona) {
      toast.error('Los datos del destinatario y zona son obligatorios.');
      return;
    }

    // ✅ VALIDAR SECTOR (opcional pero recomendado)
    if (!sector) {
      const confirmar = confirm('No has seleccionado un sector. ¿Deseas continuar sin especificar el sector?');
      if (!confirmar) return;
    }

    if (items.length === 0 || items.some(item => !item.producto.trim())) {
      toast.error('Debes agregar al menos un item con descripción.');
      return;
    }

    // Validar cantidades
    if (items.some(item => !item.cantidad || parseInt(item.cantidad) < 1)) {
      toast.error('Todos los items deben tener una cantidad válida (mínimo 1).');
      return;
    }

    setIsSubmitting(true);

    try {
      const itemsLimpios = items.map(item => ({
        producto: item.producto.trim(),
        cantidad: parseInt(item.cantidad) || 1,
        precio: parseFloat(item.precio) || 0
      }));

      // 1. Subir fotos primero (si hay)
      let fotosUrls = [];
      if (fotos.length > 0) {
        fotosUrls = await subirArchivosAFirebase(fotos);
        if (fotosUrls.length === 0) {
          toast.warning('No se pudieron subir las fotos, pero se creará la recolección.');
        }
      }

      // ✅ INCLUIR SECTOR EN EL PAYLOAD
      const recoleccionData = {
        remitenteNombre: remitente.trim(),
        remitenteEmail: remitenteEmail.trim(),
        remitenteTelefono: remitenteTelefono.trim(),
        remitenteDireccion: remitenteDireccion.trim(),

        destinatarioNombre: destinatario.trim(),
        destinatarioEmail: destinatarioEmail.trim(),
        destinatarioTelefono: destinatarioTelefono.trim(),
        destinatarioDireccion: destinatarioDireccion.trim(),
        destinatarioZona: zona,
        destinatarioSector: sector || null,

        items: itemsLimpios,

        subtotal: parseFloat(facturacion.subtotal) || 0,
        itbis: parseFloat(facturacion.impuestos) || 0,
        total: parseFloat(facturacion.total) || 0,
        estadoPago: facturacion.estadoPago || 'pendiente',
        metodoPago: facturacion.metodoPago || '',
        montoPagado: parseFloat(facturacion.montoPagado) || 0,

        notas: notas.trim(),
        tipoServicio: 'standard',
        fotos: fotosUrls // ✅ Enviamos las URLs procesadas
      };

      console.log('📤 Enviando recolección:', recoleccionData);

      const response = await api.post('/recolecciones', recoleccionData);

      if (response.data.success) {
        const codigoTracking = response.data.data?.codigoTracking || 'N/A';
        toast.success(`✅ Recolección creada: ${codigoTracking}`);
        navigate('/recolecciones');
      } else {
        setError(response.data.message || 'Error desconocido al crear la recolección.');
      }
    } catch (err) {
      console.error('❌ Error completo:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Error de conexión.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 xs:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl xs:text-3xl font-bold text-gray-800 dark:text-white">
          Crear Nueva Recolección
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition"
        >
          <ArrowLeft size={20} />
          Volver
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* REMITENTE */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 border-green-500">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Package size={24} className="text-green-600" />
            Datos de Quien Envía (Remitente) *
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={remitente}
                onChange={(e) => setRemitente(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Juan Pérez"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Teléfono *
              </label>
              <input
                type="tel"
                value={remitenteTelefono}
                onChange={(e) => setRemitenteTelefono(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="(809) 123-4567"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email (Opcional)
              </label>
              <input
                type="email"
                value={remitenteEmail}
                onChange={(e) => setRemitenteEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="remitente@ejemplo.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dirección de Recogida *
              </label>
              <input
                type="text"
                value={remitenteDireccion}
                onChange={(e) => setRemitenteDireccion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Calle, Número, Sector, Ciudad..."
                required
              />
            </div>
          </div>
        </div>

        {/* DESTINATARIO */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 border-blue-500">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin size={24} className="text-blue-600" />
            Datos de Quien Recibe (Destinatario) *
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="María López"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Teléfono *
              </label>
              <input
                type="tel"
                value={destinatarioTelefono}
                onChange={(e) => setDestinatarioTelefono(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="(809) 987-6543"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email (Opcional)
              </label>
              <input
                type="email"
                value={destinatarioEmail}
                onChange={(e) => setDestinatarioEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="destinatario@ejemplo.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dirección de Entrega *
              </label>
              <input
                type="text"
                value={destinatarioDireccion}
                onChange={(e) => setDestinatarioDireccion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Calle, Número, Sector, Ciudad..."
                required
              />
            </div>

            {/* ✅ ZONA Y SECTOR - DEPENDIENTES */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Zona de Entrega *
              </label>
              <select
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Seleccionar Zona --</option>
                <option value="Capital">🏙️ Capital (Santo Domingo)</option>
                <option value="Cibao">⛰️ Cibao (Santiago)</option>
                <option value="Este">🏖️ Este (San Pedro, La Romana)</option>
                <option value="Sur">🌊 Sur (Azua, Barahona)</option>
                <option value="Local">🏘️ Local (Baní)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sector {sectoresDisponibles.length > 0 && '(Recomendado)'}
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!zona}
              >
                <option value="">-- Seleccionar Sector --</option>
                {sectoresDisponibles.map(s => (
                  <option key={s} value={s}>📍 {s}</option>
                ))}
              </select>
              {!zona && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Selecciona una zona primero
                </p>
              )}
              {zona && sectoresDisponibles.length > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  💡 Especificar el sector ayuda a optimizar las rutas de entrega
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ITEMS */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Items Recolectados *
          </h2>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={`Descripción del item ${index + 1}`}
                    value={item.producto}
                    onChange={(e) => handleItemChange(index, 'producto', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-center ${!item.cantidad ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                      }`}
                    title="Cantidad"
                    placeholder="Cant."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  disabled={items.length <= 1}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50 hover:bg-red-700 transition"
                  title="Eliminar item"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <Plus size={18} /> Agregar Otro Item
          </button>
        </div>

        {/* MÓDULO DE FACTURACIÓN */}
        <ModuloFacturacion
          items={items}
          onItemsChange={setItems}
          facturacion={facturacion}
          onFacturacionChange={setFacturacion}
          readOnly={false}
          mostrarPagos={true}
        />

        {/* FOTOS */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Fotos de Recolección
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              (Opcional)
            </span>
          </h2>

          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload size={32} className="text-gray-500 dark:text-gray-400 mb-2" />
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Click para tomar foto o subir</span> desde galería
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                📸 En móviles abre la cámara directamente • Máximo 10 fotos
              </p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {fotoPreviews.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {fotoPreviews.length} foto(s) seleccionada(s)
              </p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {fotoPreviews.map((previewUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={previewUrl}
                      alt={`Vista previa ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                      title="Eliminar foto"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* NOTAS */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Notas Adicionales
          </h2>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Notas internas, detalles de pago, instrucciones especiales..."
            rows="3"
          />
        </div>

        {/* ERROR */}
        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Guardando Recolección...
            </>
          ) : (
            <>
              <Package size={20} />
              Crear Recolección
            </>
          )}
        </button>

      </form>
    </div>
  );
};

export default NuevaRecoleccion;
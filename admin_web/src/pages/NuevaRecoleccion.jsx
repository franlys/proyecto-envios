// admin_web/src/pages/NuevaRecoleccion.jsx
// ✅ INTEGRACIÓN COMPLETA CON SELECTOR DE SECTOR DINÁMICO, SUBIDA DE FOTOS OPTIMIZADA Y MODO OFFLINE

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ModuloFacturacion from '../components/ModuloFacturacion';
import { ArrowLeft, Package, MapPin, Plus, Trash2, Upload, X, AlertCircle, Loader, Printer, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import LabelPrinter from '../components/common/LabelPrinter';
import { processImageForUpload } from '../utils/simpleImageProcessor';
import { useOfflineSync } from '../hooks/useOfflineSync';

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
  const location = useLocation();
  const { userData } = useAuth();

  // ✅ Hook para sincronización offline
  const {
    isOnline,
    savePendingAction
  } = useOfflineSync();

  // ✅ Obtener solicitud prellenada si viene del flujo de "Iniciar"
  const solicitudPrellenada = location.state?.solicitud;

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
  const [solicitudId, setSolicitudId] = useState(null); // ✅ Guardar ID de solicitud para marcarla como completada

  // ✅ Estados para impresión de etiquetas
  const [labelsToPrint, setLabelsToPrint] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printTimeoutRef = useRef(null);

  // ✅ Pre-llenar datos si viene una solicitud asignada
  useEffect(() => {
    if (solicitudPrellenada) {
      console.log('📦 Prellenando datos de solicitud:', solicitudPrellenada);

      // Guardar ID de solicitud
      setSolicitudId(solicitudPrellenada.id);

      // Llenar datos del remitente (cliente de la solicitud)
      setRemitente(solicitudPrellenada.cliente?.nombre || '');
      setRemitenteTelefono(solicitudPrellenada.cliente?.telefono || '');
      setRemitenteEmail(solicitudPrellenada.cliente?.email || '');
      setRemitenteDireccion(solicitudPrellenada.ubicacion?.direccion || solicitudPrellenada.cliente?.direccion || '');

      // Llenar zona y sector si existen
      if (solicitudPrellenada.ubicacion?.sector) {
        setSector(solicitudPrellenada.ubicacion.sector);
      }

      // Llenar notas
      if (solicitudPrellenada.notas) {
        setNotas(solicitudPrellenada.notas);
      }

      // Llenar items si existen
      if (solicitudPrellenada.items && solicitudPrellenada.items.length > 0) {
        setItems(solicitudPrellenada.items.map((item, index) => ({
          id: index + 1,
          producto: item.descripcion || item.producto || '',
          cantidad: item.cantidad || 1,
          precio: item.precio || 0
        })));
      }

      // ✅ NUEVO: Pre-llenar fotos del cliente si existen
      if (solicitudPrellenada.fotos && solicitudPrellenada.fotos.length > 0) {
        console.log('📸 Prellenando fotos del cliente:', solicitudPrellenada.fotos.length);

        // Guardar las URLs directamente en fotoPreviews para visualización
        // Marcar estas fotos como prellenadas usando un prefijo especial
        const fotosCliente = solicitudPrellenada.fotos.map(url => `PRELLENADA::${url}`);
        setFotoPreviews(fotosCliente);

        toast.info(`${solicitudPrellenada.fotos.length} foto(s) del cliente cargadas`);
      }

      toast.success('Datos de la solicitud cargados. Completa la información del destinatario.');
    }
  }, [solicitudPrellenada]);

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

  // ✅ Función para generar etiquetas para impresión
  const generarEtiquetas = (recoleccionData) => {
    const labels = [];
    const tracking = recoleccionData.codigoTracking;
    const recipientName = destinatario;
    const fecha = new Date().toLocaleDateString('es-DO');

    recoleccionData.items.forEach((item, itemIndex) => {
      const cantidad = parseInt(item.cantidad) || 1;

      for (let unitIndex = 0; unitIndex < cantidad; unitIndex++) {
        const uniqueCode = `${tracking}-${itemIndex + 1}-${unitIndex + 1}`;

        labels.push({
          uniqueCode,
          tracking,
          itemDesc: item.producto || item.descripcion || 'Item',
          itemIndex,
          unitIndex,
          totalUnits: cantidad,
          recipientName,
          date: fecha
        });
      }
    });

    return labels;
  };

  // ✅ Función para imprimir etiquetas (modo estándar)
  const handlePrintLabels = () => {
    if (labelsToPrint.length === 0) {
      toast.warning('No hay etiquetas para imprimir');
      return;
    }

    // Esperar un momento para que el DOM se actualice
    printTimeoutRef.current = setTimeout(() => {
      try {
        window.print();
        toast.success(`Imprimiendo ${labelsToPrint.length} etiqueta(s)`);
      } catch (error) {
        console.error('Error al imprimir:', error);
        toast.error('Error al abrir el diálogo de impresión');
      }
    }, 100);
  };

  // ✅ Función para descargar etiquetas como PDF
  const handleDownloadLabels = () => {
    if (labelsToPrint.length === 0) {
      toast.warning('No hay etiquetas para descargar');
      return;
    }

    toast.info('Descarga de PDF estará disponible próximamente. Por ahora usa "Imprimir" y selecciona "Guardar como PDF"');
  };

  // ✅ Cleanup del timeout al desmontar
  useEffect(() => {
    return () => {
      if (printTimeoutRef.current) {
        clearTimeout(printTimeoutRef.current);
      }
    };
  }, []);

  // ✅ LÓGICA DE SUBIDA DE ARCHIVOS (Firebase) CON CONVERSIÓN A JPEG
  // Convierte todas las imágenes a JPEG para compatibilidad con WhatsApp y web
  const subirArchivosAFirebase = async (archivos) => {
    const urls = [];
    if (!archivos || archivos.length === 0) return urls;

    // Usamos un ID temporal o timestamp para la carpeta
    const idReferencia = `temp_${Date.now()}`;

    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];

      try {
        toast.loading(`Procesando imagen ${i + 1}/${archivos.length}...`, { id: `upload-${i}` });

        // Procesar imagen (convertir a JPEG si es necesario)
        const imagenProcesada = await processImageForUpload(archivo);

        toast.loading(`Subiendo imagen ${i + 1}/${archivos.length}...`, { id: `upload-${i}` });

        // Paths en Storage (siempre .jpg)
        const nombreBase = archivo.name.replace(/\.[^/.]+$/, '');
        const nombreArchivo = `recolecciones/${idReferencia}/${Date.now()}_${i}_${nombreBase}.jpg`;

        // Subir imagen procesada
        const archivoRef = ref(storage, nombreArchivo);
        await uploadBytes(archivoRef, imagenProcesada);
        const url = await getDownloadURL(archivoRef);

        // Guardar URL
        urls.push({
          url: url,
          thumbnail: url, // Misma URL para retrocompatibilidad
          preview: url,   // Misma URL para retrocompatibilidad
          fileName: `${nombreBase}.jpg`,
          size: imagenProcesada.size
        });

        toast.success(`Imagen ${i + 1} subida`, { id: `upload-${i}` });

      } catch (error) {
        console.error(`Error subiendo archivo ${archivo.name}:`, error);
        toast.error(`Error al subir ${archivo.name}: ${error.message}`, { id: `upload-${i}` });

        // No lanzar error, continuar con las siguientes imágenes
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

      // 1. Subir fotos primero (si hay nuevas) y combinar con fotos prellenadas
      let fotosUrls = [];

      // Incluir fotos prellenadas del cliente (ya son URLs)
      const fotosPrellenadas = fotoPreviews
        .filter(preview => preview.startsWith('PRELLENADA::'))
        .map(preview => preview.replace('PRELLENADA::', ''));

      if (fotosPrellenadas.length > 0) {
        console.log(`📸 Incluyendo ${fotosPrellenadas.length} foto(s) del cliente`);
        fotosUrls = [...fotosPrellenadas];
      }

      // Subir fotos nuevas del recolector (si hay)
      if (fotos.length > 0) {
        try {
          // ⚡ TIMEOUT: Si tarda más de 10 segundos, continuar sin fotos
          const nuevasFotosUrls = await Promise.race([
            subirArchivosAFirebase(fotos),
            new Promise((resolve) => setTimeout(() => {
              console.warn('⏱️ Timeout subiendo fotos, continuando sin ellas');
              toast.warning('⏱️ Subida de fotos lenta. Se guardarán sin fotos.');
              resolve([]);
            }, 10000)) // 10 segundos máximo
          ]);

          if (nuevasFotosUrls.length === 0) {
            toast.warning('No se pudieron subir las fotos nuevas, pero la recolección se guardará.');
          } else {
            fotosUrls = [...fotosUrls, ...nuevasFotosUrls];
          }
        } catch (error) {
          console.error('❌ Error subiendo fotos:', error);
          toast.warning('Error subiendo fotos, continuando sin ellas.');
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

      // ✅ MODO OFFLINE: Guardar acción pendiente si no hay conexión
      if (!isOnline) {
        console.log('📴 Modo offline: Guardando recolección para sincronizar después');

        const pendingActionId = savePendingAction({
          type: 'CREATE_RECOLECCION',
          payload: recoleccionData,
          solicitudId: solicitudId
        });

        if (pendingActionId) {
          toast.success('📴 Recolección guardada offline', {
            description: 'Se enviará automáticamente cuando haya conexión'
          });

          // Navegar de vuelta a recolecciones después de 2 segundos
          setTimeout(() => {
            navigate('/recolecciones');
          }, 2000);

          return;
        } else {
          throw new Error('No se pudo guardar la recolección offline');
        }
      }

      const response = await api.post('/recolecciones', recoleccionData);

      if (response.data.success) {
        const codigoTracking = response.data.data?.codigoTracking || 'N/A';
        const recoleccionCompleta = response.data.data;

        // ✅ Si viene de una solicitud asignada, marcarla como completada
        if (solicitudId) {
          try {
            await api.put(`/solicitudes/${solicitudId}/completar`, {
              codigoRecoleccion: recoleccionCompleta?.id || null
            });
            console.log(`✅ Solicitud ${solicitudId} marcada como completada`);
          } catch (error) {
            console.error('⚠️ Error marcando solicitud como completada:', error);
            // No bloqueamos el flujo si falla esto
          }
        }

        toast.success(`✅ Recolección creada: ${codigoTracking}`);

        // ✅ Generar etiquetas para impresión
        const labels = generarEtiquetas({
          ...recoleccionCompleta,
          codigoTracking,
          items: itemsLimpios
        });

        setLabelsToPrint(labels);
        setShowPrintModal(true);

        // Opcionalmente, imprimir automáticamente después de 2 segundos
        // setTimeout(() => {
        //   handlePrintLabels();
        //   setTimeout(() => navigate('/recolecciones'), 1000);
        // }, 2000);
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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl xs:text-3xl font-bold text-slate-800 dark:text-white">
            Crear Nueva Recolección
          </h1>
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
              <WifiOff size={16} />
              <span>Offline</span>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition"
        >
          <ArrowLeft size={20} />
          Volver
        </button>
      </div>

      {!isOnline && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Modo Offline Activo</p>
            <p>La recolección se guardará localmente y se enviará automáticamente cuando recuperes la conexión.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* REMITENTE */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border-l-4 border-emerald-500">
          <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
            <Package size={24} className="text-emerald-600" />
            Datos de Quien Envía (Remitente) *
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={remitente}
                onChange={(e) => setRemitente(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="Juan Pérez"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Teléfono *
              </label>
              <input
                type="tel"
                value={remitenteTelefono}
                onChange={(e) => setRemitenteTelefono(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="(809) 123-4567"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email (Opcional)
              </label>
              <input
                type="email"
                value={remitenteEmail}
                onChange={(e) => setRemitenteEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="remitente@ejemplo.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Dirección de Recogida *
              </label>
              <input
                type="text"
                value={remitenteDireccion}
                onChange={(e) => setRemitenteDireccion(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="Calle, Número, Sector, Ciudad..."
                required
              />
            </div>
          </div>
        </div>

        {/* DESTINATARIO */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border-l-4 border-indigo-500">
          <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin size={24} className="text-indigo-600" />
            Datos de Quien Recibe (Destinatario) *
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="María López"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Teléfono *
              </label>
              <input
                type="tel"
                value={destinatarioTelefono}
                onChange={(e) => setDestinatarioTelefono(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="(809) 987-6543"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email (Opcional)
              </label>
              <input
                type="email"
                value={destinatarioEmail}
                onChange={(e) => setDestinatarioEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="destinatario@ejemplo.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Dirección de Entrega *
              </label>
              <input
                type="text"
                value={destinatarioDireccion}
                onChange={(e) => setDestinatarioDireccion(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Calle, Número, Sector, Ciudad..."
                required
              />
            </div>

            {/* ✅ ZONA Y SECTOR - DEPENDIENTES */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Zona de Entrega *
              </label>
              <select
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Sector {sectoresDisponibles.length > 0 && '(Recomendado)'}
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                disabled={!zona}
              >
                <option value="">-- Seleccionar Sector --</option>
                {sectoresDisponibles.map(s => (
                  <option key={s} value={s}>📍 {s}</option>
                ))}
              </select>
              {!zona && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Selecciona una zona primero
                </p>
              )}
              {zona && sectoresDisponibles.length > 0 && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                  💡 Especificar el sector ayuda a optimizar las rutas de entrega
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ITEMS */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
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
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-center ${!item.cantidad ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
                      }`}
                    title="Cantidad"
                    placeholder="Cant."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  disabled={items.length <= 1}
                  className="px-3 py-2 bg-rose-600 text-white rounded-lg disabled:opacity-50 hover:bg-rose-700 transition"
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
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2"
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
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">
            Fotos de Recolección
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
              (Opcional)
            </span>
          </h2>

          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload size={32} className="text-slate-500 dark:text-slate-400 mb-2" />
              <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="font-semibold">Click para tomar foto o subir</span> desde galería
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
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
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                {fotoPreviews.length} foto(s) seleccionada(s)
              </p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {fotoPreviews.map((previewUrl, index) => {
                  // Detectar si es foto prellenada
                  const isPrellenada = previewUrl.startsWith('PRELLENADA::');
                  const displayUrl = isPrellenada ? previewUrl.replace('PRELLENADA::', '') : previewUrl;

                  return (
                    <div key={index} className="relative group">
                      <img
                        src={displayUrl}
                        alt={`Vista previa ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-600"
                      />
                      {/* Badge para fotos del cliente */}
                      {isPrellenada && (
                        <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                          Cliente
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                        title="Eliminar foto"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* NOTAS */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
            Notas Adicionales
          </h2>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="Notas internas, detalles de pago, instrucciones especiales..."
            rows="3"
          />
        </div>

        {/* ERROR */}
        {error && (
          <div className="p-4 bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 rounded-lg flex items-start gap-3">
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
          className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {/* ✅ MODAL DE IMPRESIÓN DE ETIQUETAS */}
      {showPrintModal && labelsToPrint.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 mb-4">
                <Printer className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>

              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                Recolección Creada Exitosamente
              </h3>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Se generaron <strong>{labelsToPrint.length} etiqueta(s)</strong> para imprimir.
                <br />
                ¿Deseas imprimir las etiquetas ahora?
              </p>

              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  💡 <strong>Importante:</strong> Conecta tu impresora de etiquetas antes de imprimir. Compatible con impresoras térmicas, AirPrint, y cualquier impresora del sistema.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {/* Botón impresión principal */}
                <button
                  onClick={() => {
                    handlePrintLabels();
                    setTimeout(() => {
                      setShowPrintModal(false);
                      navigate('/recolecciones');
                    }, 500);
                  }}
                  className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 font-medium"
                >
                  <Printer size={20} />
                  Imprimir Etiquetas
                </button>

                {/* Botón omitir */}
                <button
                  onClick={() => {
                    setShowPrintModal(false);
                    navigate('/recolecciones');
                  }}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm"
                >
                  Imprimir Después
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ COMPONENTE DE IMPRESIÓN (Oculto, solo para window.print()) */}
      {labelsToPrint.length > 0 && (
        <LabelPrinter
          labels={labelsToPrint}
          companyName={userData?.companyName || "PROLOGIX"}
          size="4x2"
        />
      )}
    </div>
  );
};

export default NuevaRecoleccion;
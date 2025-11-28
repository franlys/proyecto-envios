// admin_web/src/pages/PublicTracking.jsx
// ✅ PÁGINA PÚBLICA DE TRACKING - Sin autenticación

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package,
  MapPin,
  Calendar,
  Phone,
  User,
  CheckCircle,
  Clock,
  Truck,
  Home,
  AlertCircle,
  Copy,
  Share2,
  Camera
} from 'lucide-react';
import axios from 'axios';
import SmartImage, { useImageLightbox } from '../components/common/SmartImage';
import TrackingAnimation from '../components/tracking/animations';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PublicTracking = () => {
  const { codigo } = useParams();
  const navigate = useNavigate();

  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [codigoBusqueda, setCodigoBusqueda] = useState(codigo || '');
  const [copied, setCopied] = useState(false);

  // ✅ Hook para lightbox de imágenes
  const { openLightbox, LightboxComponent } = useImageLightbox();

  useEffect(() => {
    if (codigo) {
      fetchTracking(codigo);
    } else {
      setLoading(false);
    }
  }, [codigo]);

  const fetchTracking = async (trackingCode) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/tracking/public/${trackingCode}`);

      if (response.data.success) {
        setTrackingData(response.data);
      } else {
        setError(response.data.error || 'No se pudo obtener la información');
      }
    } catch (err) {
      console.error('Error al buscar tracking:', err);

      if (err.response?.status === 404) {
        setError('Código de tracking no encontrado');
      } else if (err.response?.status === 400) {
        setError('Código de tracking inválido');
      } else {
        setError('Error al conectar con el servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    if (codigoBusqueda.trim()) {
      navigate(`/tracking/${codigoBusqueda.trim()}`);
    }
  };

  const handleCopiarLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCompartir = async () => {
    const url = window.location.href;
    const texto = `Rastrear mi paquete: ${trackingData?.recoleccion?.codigoTracking}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rastreo de Paquete',
          text: texto,
          url: url
        });
      } catch (err) {
        console.log('Error al compartir:', err);
      }
    } else {
      // Fallback: copiar al portapapeles
      handleCopiarLink();
    }
  };

  // Renderizar barra de búsqueda
  const renderSearchBar = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Package className="w-6 h-6 text-blue-600" />
        Rastrear Paquete
      </h2>

      <form onSubmit={handleBuscar} className="flex gap-3">
        <input
          type="text"
          value={codigoBusqueda}
          onChange={(e) => setCodigoBusqueda(e.target.value)}
          placeholder="Ingresa tu código de tracking (ej: EMI-0001)"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!codigoBusqueda.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Buscar
        </button>
      </form>

      {codigo && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleCopiarLink}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copiado!' : 'Copiar link'}
          </button>

          <button
            onClick={handleCompartir}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Compartir
          </button>
        </div>
      )}
    </div>
  );

  // Renderizar estado actual
  const renderEstadoActual = () => {
    const { estadoActual } = trackingData;

    return (
      <div
        className="bg-white rounded-lg shadow-md p-6 mb-6"
        style={{ borderTop: `4px solid ${estadoActual.color}` }}
      >
        {/* Animación del estado */}
        <div className="flex justify-center mb-6">
          <TrackingAnimation estado={estadoActual.codigo} size={250} />
        </div>

        <div className="flex items-start gap-4">
          <div className="text-4xl">{estadoActual.icono}</div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">
              {estadoActual.nombre}
            </h3>
            <p className="text-gray-600 mb-3">{estadoActual.descripcion}</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>
                Última actualización: {trackingData.recoleccion.updatedAt
                  ? new Date(trackingData.recoleccion.updatedAt).toLocaleString('es-DO')
                  : 'No disponible'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar timeline
  const renderTimeline = () => {
    const { timeline } = trackingData;

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">
          Historial de Estados
        </h3>

        <div className="space-y-4">
          {timeline.map((item, index) => (
            <div key={index} className="flex gap-4">
              {/* Línea vertical */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    item.completado
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {item.completado ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                </div>
                {index < timeline.length - 1 && (
                  <div
                    className={`w-0.5 h-12 ${
                      item.completado ? 'bg-green-300' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>

              {/* Contenido */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{item.icono}</span>
                  <h4 className={`font-semibold ${
                    item.actual ? 'text-blue-600' : item.completado ? 'text-gray-800' : 'text-gray-400'
                  }`}>
                    {item.nombre}
                  </h4>
                  {item.actual && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      ACTUAL
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{item.descripcion}</p>
                {item.fecha && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.fecha).toLocaleString('es-DO')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Renderizar información del paquete
  const renderInfoPaquete = () => {
    const { recoleccion } = trackingData;

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Información del Paquete
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Código de tracking */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Package className="w-5 h-5 text-gray-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">Código de Tracking</p>
              <p className="font-semibold text-gray-800">{recoleccion.codigoTracking}</p>
            </div>
          </div>

          {/* Destinatario */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <User className="w-5 h-5 text-gray-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">Destinatario</p>
              <p className="font-semibold text-gray-800">{recoleccion.cliente}</p>
            </div>
          </div>

          {/* Dirección */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">Dirección de Entrega</p>
              <p className="font-semibold text-gray-800">{recoleccion.direccion}</p>
              {recoleccion.zona && (
                <p className="text-sm text-gray-600 mt-1">
                  Zona: {recoleccion.zona} {recoleccion.sector && `- ${recoleccion.sector}`}
                </p>
              )}
            </div>
          </div>

          {/* Empresa */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Home className="w-5 h-5 text-gray-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">Empresa</p>
              <p className="font-semibold text-gray-800">{recoleccion.nombreEmpresa}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        {recoleccion.items && recoleccion.items.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold text-gray-800 mb-3">Artículos ({recoleccion.items.length})</h4>
            <div className="space-y-2">
              {recoleccion.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{item.descripcion}</p>
                    {item.cantidad > 1 && (
                      <p className="text-sm text-gray-600">Cantidad: {item.cantidad}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    item.estado === 'entregado'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.estado === 'entregado' ? 'Entregado' : 'En proceso'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas */}
        {recoleccion.notas && (
          <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-sm text-gray-700">
              <strong>Nota:</strong> {recoleccion.notas}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Renderizar fotos
  const renderFotos = () => {
    const { recoleccion } = trackingData;
    const todasLasFotos = [
      ...(recoleccion.fotosRecoleccion || []),
      ...(recoleccion.fotosEntrega || [])
    ];

    if (todasLasFotos.length === 0) return null;

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Fotos del Paquete
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {todasLasFotos.map((foto, index) => (
            <div
              key={index}
              className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => openLightbox(todasLasFotos, index)}
            >
              <SmartImage
                src={foto}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Renderizar loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Buscando información...</p>
        </div>
      </div>
    );
  }

  // Renderizar error
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {renderSearchBar()}

          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              No se encontró el paquete
            </h3>
            <p className="text-red-700">{error}</p>
            <p className="text-sm text-red-600 mt-2">
              Verifica que el código de tracking sea correcto
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar sin código (landing)
  if (!codigo && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Package className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Sistema de Rastreo de Paquetes
            </h1>
            <p className="text-gray-600">
              Ingresa tu código de tracking para ver el estado de tu envío
            </p>
          </div>

          {renderSearchBar()}

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold text-gray-800 mb-3">¿Cómo funciona?</h3>
            <ol className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600">1.</span>
                Ingresa tu código de tracking en el campo de búsqueda
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600">2.</span>
                Haz clic en "Buscar" para ver el estado de tu paquete
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600">3.</span>
                Puedes compartir el link de rastreo con otras personas
              </li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar datos completos
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Rastreo de Paquete
          </h1>
          <p className="text-gray-600">
            {trackingData.recoleccion.codigoTracking}
          </p>
        </div>

        {/* Barra de búsqueda */}
        {renderSearchBar()}

        {/* Estado actual */}
        {renderEstadoActual()}

        {/* Timeline */}
        {renderTimeline()}

        {/* Información del paquete */}
        {renderInfoPaquete()}

        {/* Fotos */}
        {renderFotos()}

        {/* Lightbox */}
        <LightboxComponent />
      </div>
    </div>
  );
};

export default PublicTracking;

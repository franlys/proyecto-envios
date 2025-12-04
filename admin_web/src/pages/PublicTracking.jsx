// admin_web/src/pages/PublicTracking.jsx
// ✅ PÁGINA PÚBLICA DE TRACKING - Sin autenticación

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package,
  Calendar,
  Phone,
  CheckCircle,
  Clock,
  Truck,
  AlertCircle,
  Copy,
  Share2
} from 'lucide-react';
import axios from 'axios';
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
    const codigoLimpio = codigoBusqueda.trim();

    if (codigoLimpio) {
      if (codigoLimpio === codigo) {
        // Si es el mismo código, forzar recarga
        fetchTracking(codigoLimpio);
      } else {
        navigate(`/tracking/${codigoLimpio}`);
      }
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
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Package className="w-6 h-6 text-indigo-600" />
        Rastrear Paquete
      </h2>

      <form onSubmit={handleBuscar} className="flex gap-3">
        <input
          type="text"
          value={codigoBusqueda}
          onChange={(e) => setCodigoBusqueda(e.target.value)}
          placeholder="Ingresa tu código de tracking (ej: EMI-0001)"
          className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!codigoBusqueda.trim()}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Buscar
        </button>
      </form>

      {codigo && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleCopiarLink}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copiado!' : 'Copiar link'}
          </button>

          <button
            onClick={handleCompartir}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
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
            <h3 className="text-2xl font-bold text-slate-800 mb-1">
              {estadoActual.nombre}
            </h3>
            <p className="text-slate-600 mb-3">{estadoActual.descripcion}</p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
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
        <h3 className="text-xl font-bold text-slate-800 mb-6">
          Historial de Estados
        </h3>

        <div className="space-y-4">
          {timeline.map((item, index) => {
            // ✅ Verificar explícitamente que completado sea true
            const isCompletado = item.completado === true;
            const isActual = item.actual === true;

            return (
              <div key={index} className="flex gap-4">
                {/* Línea vertical */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md ${
                      isCompletado
                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isCompletado ? (
                      <CheckCircle className="w-6 h-6 fill-current" />
                    ) : (
                      <Clock className="w-6 h-6" />
                    )}
                  </div>
                  {index < timeline.length - 1 && (
                    <div
                      className={`w-1 h-12 transition-all ${
                        isCompletado ? 'bg-emerald-400' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{item.icono}</span>
                    <h4 className={`font-semibold ${
                      isActual
                        ? 'text-indigo-600 font-bold'
                        : isCompletado
                          ? 'text-slate-800'
                          : 'text-slate-400'
                    }`}>
                      {item.nombre}
                    </h4>
                    {isActual && (
                      <span className="px-3 py-1 text-xs bg-indigo-500 text-white rounded-full font-semibold animate-pulse">
                        ACTUAL
                      </span>
                    )}
                    {isCompletado && !isActual && (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  <p className={`text-sm ${isCompletado ? 'text-slate-600' : 'text-slate-400'}`}>
                    {item.descripcion}
                  </p>
                  {item.fecha && (
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(item.fecha).toLocaleString('es-DO')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 🔒 FUNCIONES REMOVIDAS: renderInfoPaquete() y renderFotos()
  // Ya no se muestra información sensible en el tracking público

  // Renderizar loading
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
          <p className="text-slate-600">Buscando información...</p>
        </div>
      </div>
    );
  }

  // Renderizar error
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {renderSearchBar()}

          <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-rose-800 mb-2">
              No se encontró el paquete
            </h3>
            <p className="text-rose-700">{error}</p>
            <p className="text-sm text-rose-600 mt-2">
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
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Package className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Sistema de Rastreo de Paquetes
            </h1>
            <p className="text-slate-600">
              Ingresa tu código de tracking para ver el estado de tu envío
            </p>
          </div>

          {renderSearchBar()}

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold text-slate-800 mb-3">¿Cómo funciona?</h3>
            <ol className="space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-indigo-600">1.</span>
                Ingresa tu código de tracking en el campo de búsqueda
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-indigo-600">2.</span>
                Haz clic en "Buscar" para ver el estado de tu paquete
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-indigo-600">3.</span>
                Puedes compartir el link de rastreo con otras personas
              </li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar datos completos
  if (!trackingData) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            Rastreo de Paquete
          </h1>
          <p className="text-slate-600">
            {trackingData.recoleccion.codigoTracking}
          </p>
        </div>

        {/* Barra de búsqueda */}
        {renderSearchBar()}

        {/* Estado actual */}
        {renderEstadoActual()}

        {/* Timeline */}
        {renderTimeline()}

        {/* 🔒 INFORMACIÓN SENSIBLE OCULTA - Solo se muestra el timeline */}
      </div>
    </div>
  );
};

export default PublicTracking;

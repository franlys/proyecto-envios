// admin_web/src/components/DetalleRecoleccion.jsx
// ✅ VERSIÓN CORREGIDA - Compatible con helpers existentes y SmartImage

import React from 'react';
import {
  getDestinatario,
  getRemitente,
  getResumenItems,
  getFotosRecoleccion,
  formatearFecha,
  formatearEstado,
  contarItems
} from '../utils/recoleccionHelpers';
import { X, Package, MapPin, User, Phone, Mail, Home, Calendar } from 'lucide-react';
import SmartImage, { useImageLightbox } from './common/SmartImage';

const DetalleRecoleccion = ({ recoleccion, onClose }) => {
  if (!recoleccion) return null;

  // ✅ Usar helpers existentes
  const destinatario = getDestinatario(recoleccion);
  const remitente = getRemitente(recoleccion);
  const resumenItems = getResumenItems(recoleccion);
  const fotos = getFotosRecoleccion(recoleccion);
  const estado = formatearEstado(recoleccion.estadoGeneral || recoleccion.estado);

  // ✅ Hook para lightbox de imágenes
  const { openLightbox, LightboxComponent } = useImageLightbox();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {recoleccion.codigoTracking}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span 
                className={`px-3 py-1 rounded-full text-xs font-semibold bg-${estado.color}-100 text-${estado.color}-700 dark:bg-${estado.color}-900 dark:text-${estado.color}-200`}
              >
                {estado.label}
              </span>
              {recoleccion.zona && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {recoleccion.zona}
                  {recoleccion.sector && ` - ${recoleccion.sector}`}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Sección del Remitente */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Package size={20} className="text-green-600" />
              Información del Remitente (Quien Envía)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <User size={18} className="text-gray-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Nombre</p>
                  <p className="font-medium text-gray-900 dark:text-white">{remitente.nombre}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone size={18} className="text-gray-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Teléfono</p>
                  <p className="font-medium text-gray-900 dark:text-white">{remitente.telefono}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 md:col-span-2">
                <Home size={18} className="text-gray-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Dirección de Recogida</p>
                  <p className="font-medium text-gray-900 dark:text-white">{remitente.direccion}</p>
                </div>
              </div>
              {remitente.email && remitente.email !== '' && remitente.email !== 'N/A' && (
                <div className="flex items-start gap-2 md:col-span-2">
                  <Mail size={18} className="text-gray-500 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">{remitente.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sección del Destinatario */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <MapPin size={20} className="text-blue-600" />
              Información del Destinatario (Quien Recibe)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <User size={18} className="text-gray-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cliente</p>
                  <p className="font-medium text-gray-900 dark:text-white">{destinatario.nombre}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone size={18} className="text-gray-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Teléfono</p>
                  <p className="font-medium text-gray-900 dark:text-white">{destinatario.telefono}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 md:col-span-2">
                <Home size={18} className="text-gray-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Dirección de Entrega</p>
                  <p className="font-medium text-gray-900 dark:text-white">{destinatario.direccion}</p>
                </div>
              </div>
              {destinatario.email && destinatario.email !== '' && destinatario.email !== 'N/A' && (
                <div className="flex items-start gap-2 md:col-span-2">
                  <Mail size={18} className="text-gray-500 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">{destinatario.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sección de Items */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Items ({contarItems(recoleccion)})
            </h3>
            
            {recoleccion.items && recoleccion.items.length > 0 ? (
              <div className="space-y-3">
                {recoleccion.items.map((item, index) => (
                  <div 
                    key={item.id || index} 
                    className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Package size={20} className="text-purple-600 mt-1" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Descripción</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.descripcion}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Cantidad</p>
                        <p className="font-bold text-lg text-gray-900 dark:text-white">
                          {item.cantidad}
                        </p>
                      </div>
                    </div>
                    {item.estadoItem && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Estado:</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          item.estadoItem === 'recolectado' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' :
                          item.estadoItem === 'verificado' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' :
                          item.estadoItem === 'entregado' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {item.estadoItem}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No hay items en esta recolección
              </p>
            )}
          </div>

          {/* Resumen de Items */}
          {resumenItems.total > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Resumen de Items
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{resumenItems.total}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{resumenItems.recolectados}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Recolectados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{resumenItems.verificados}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Verificados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">{resumenItems.entregados}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Entregados</p>
                </div>
              </div>
            </div>
          )}

          {/* Sección de Fotos con SmartImage */}
          {fotos.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Fotos de Recolección ({fotos.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {fotos.map((foto, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 cursor-pointer"
                  >
                    <SmartImage
                      src={foto}
                      alt={`Foto de recolección ${index + 1}`}
                      className="w-full h-full"
                      onClick={openLightbox}
                      showOptimizedBadge={true}
                      showZoomIcon={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lightbox para vista ampliada */}
          {LightboxComponent}

          {/* Notas */}
          {recoleccion.notas && recoleccion.notas !== '' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border-l-4 border-yellow-500">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Notas
              </h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {recoleccion.notas}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {recoleccion.createdAt && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Calendar size={14} />
                    Creada
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatearFecha(recoleccion.createdAt)}
                  </p>
                </div>
              )}
              {recoleccion.updatedAt && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Calendar size={14} />
                    Actualizada
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatearFecha(recoleccion.updatedAt)}
                  </p>
                </div>
              )}
              {recoleccion.zona && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MapPin size={14} />
                    Zona
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {recoleccion.zona}
                    {recoleccion.sector && ` - ${recoleccion.sector}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetalleRecoleccion;
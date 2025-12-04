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
  // ✅ Hook para lightbox de imágenes - DEBE ir antes de cualquier return condicional
  const { openLightbox, LightboxComponent } = useImageLightbox();

  if (!recoleccion) return null;

  // ✅ Usar helpers existentes
  const destinatario = getDestinatario(recoleccion);
  const remitente = getRemitente(recoleccion);
  const resumenItems = getResumenItems(recoleccion);
  const fotos = getFotosRecoleccion(recoleccion);
  const estado = formatearEstado(recoleccion.estadoGeneral || recoleccion.estado);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {recoleccion.codigoTracking}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span 
                className={`px-3 py-1 rounded-full text-xs font-semibold bg-${estado.color}-100 text-${estado.color}-700 dark:bg-${estado.color}-900 dark:text-${estado.color}-200`}
              >
                {estado.label}
              </span>
              {recoleccion.zona && (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {recoleccion.zona}
                  {recoleccion.sector && ` - ${recoleccion.sector}`}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Sección del Remitente */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border-l-4 border-emerald-500">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Package size={20} className="text-emerald-600" />
              Información del Remitente (Quien Envía)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <User size={18} className="text-slate-500 mt-1" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Nombre</p>
                  <p className="font-medium text-slate-900 dark:text-white">{remitente.nombre}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone size={18} className="text-slate-500 mt-1" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Teléfono</p>
                  <p className="font-medium text-slate-900 dark:text-white">{remitente.telefono}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 md:col-span-2">
                <Home size={18} className="text-slate-500 mt-1" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Dirección de Recogida</p>
                  <p className="font-medium text-slate-900 dark:text-white">{remitente.direccion}</p>
                </div>
              </div>
              {remitente.email && remitente.email !== '' && remitente.email !== 'N/A' && (
                <div className="flex items-start gap-2 md:col-span-2">
                  <Mail size={18} className="text-slate-500 mt-1" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                    <p className="font-medium text-slate-900 dark:text-white">{remitente.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sección del Destinatario */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border-l-4 border-indigo-500">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <MapPin size={20} className="text-indigo-600" />
              Información del Destinatario (Quien Recibe)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <User size={18} className="text-slate-500 mt-1" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Cliente</p>
                  <p className="font-medium text-slate-900 dark:text-white">{destinatario.nombre}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone size={18} className="text-slate-500 mt-1" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Teléfono</p>
                  <p className="font-medium text-slate-900 dark:text-white">{destinatario.telefono}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 md:col-span-2">
                <Home size={18} className="text-slate-500 mt-1" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Dirección de Entrega</p>
                  <p className="font-medium text-slate-900 dark:text-white">{destinatario.direccion}</p>
                </div>
              </div>
              {destinatario.email && destinatario.email !== '' && destinatario.email !== 'N/A' && (
                <div className="flex items-start gap-2 md:col-span-2">
                  <Mail size={18} className="text-slate-500 mt-1" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                    <p className="font-medium text-slate-900 dark:text-white">{destinatario.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sección de Items */}
          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
              Items ({contarItems(recoleccion)})
            </h3>
            
            {recoleccion.items && recoleccion.items.length > 0 ? (
              <div className="space-y-3">
                {recoleccion.items.map((item, index) => (
                  <div 
                    key={item.id || index} 
                    className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Package size={20} className="text-purple-600 mt-1" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Descripción</p>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {item.descripcion}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Cantidad</p>
                        <p className="font-bold text-lg text-slate-900 dark:text-white">
                          {item.cantidad}
                        </p>
                      </div>
                    </div>
                    {item.estadoItem && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-500">Estado:</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          item.estadoItem === 'recolectado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200' :
                          item.estadoItem === 'verificado' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' :
                          item.estadoItem === 'entregado' ? 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200'
                        }`}>
                          {item.estadoItem}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-center py-4">
                No hay items en esta recolección
              </p>
            )}
          </div>

          {/* Resumen de Items */}
          {resumenItems.total > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                Resumen de Items
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{resumenItems.total}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{resumenItems.recolectados}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Recolectados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">{resumenItems.verificados}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Verificados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-600">{resumenItems.entregados}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Entregados</p>
                </div>
              </div>
            </div>
          )}

          {/* Sección de Fotos con SmartImage */}
          {fotos.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                Fotos de Recolección ({fotos.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {fotos.map((foto, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 cursor-pointer"
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
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border-l-4 border-amber-500">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Notas
              </h3>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {recoleccion.notas}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {recoleccion.createdAt && (
                <div>
                  <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar size={14} />
                    Creada
                  </p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {formatearFecha(recoleccion.createdAt)}
                  </p>
                </div>
              )}
              {recoleccion.updatedAt && (
                <div>
                  <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar size={14} />
                    Actualizada
                  </p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {formatearFecha(recoleccion.updatedAt)}
                  </p>
                </div>
              )}
              {recoleccion.zona && (
                <div>
                  <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <MapPin size={14} />
                    Zona
                  </p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {recoleccion.zona}
                    {recoleccion.sector && ` - ${recoleccion.sector}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetalleRecoleccion;
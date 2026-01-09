/**
 * Panel de Gestión de Features Personalizadas por Compañía
 *
 * Permite al Super Admin:
 * - Ver features activas de cada compañía
 * - Activar/Desactivar features individuales
 * - Crear paquetes personalizados
 * - Resetear a plan base
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  Package,
  RefreshCw,
  Loader,
  AlertCircle,
  Save,
  Sparkles
} from 'lucide-react';

const GestionFeaturesCompanias = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  const [planFeatures, setPlanFeatures] = useState({});
  const [customFeatures, setCustomFeatures] = useState({});
  const [effectiveFeatures, setEffectiveFeatures] = useState({});
  const [modifiedFeatures, setModifiedFeatures] = useState({});

  useEffect(() => {
    if (companyId) {
      fetchCompanyFeatures();
    }
  }, [companyId]);

  const fetchCompanyFeatures = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/companies/${companyId}/features`);

      if (response.data.success) {
        const data = response.data.data;
        setCompanyData({
          id: data.companyId,
          name: data.companyName,
          plan: data.plan
        });
        setPlanFeatures(data.planFeatures);
        setCustomFeatures(data.customFeatures);
        setEffectiveFeatures(data.effectiveFeatures);
      }
    } catch (error) {
      console.error('Error cargando features:', error);
      toast.error('Error al cargar features de la compañía');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = (featureName) => {
    const currentValue = effectiveFeatures[featureName];
    const newValue = !currentValue;

    setModifiedFeatures(prev => ({
      ...prev,
      [featureName]: newValue
    }));

    setEffectiveFeatures(prev => ({
      ...prev,
      [featureName]: newValue
    }));
  };

  const saveChanges = async () => {
    if (Object.keys(modifiedFeatures).length === 0) {
      toast.info('No hay cambios para guardar');
      return;
    }

    setSaving(true);
    try {
      const response = await api.put(`/companies/${companyId}/features`, {
        features: modifiedFeatures
      });

      if (response.data.success) {
        toast.success(`${Object.keys(modifiedFeatures).length} features actualizadas`);
        setModifiedFeatures({});
        await fetchCompanyFeatures();
      }
    } catch (error) {
      console.error('Error guardando cambios:', error);
      toast.error('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const resetFeatures = async () => {
    if (!confirm('¿Resetear todas las features personalizadas? La compañía volverá a usar las features de su plan base.')) {
      return;
    }

    setSaving(true);
    try {
      const response = await api.delete(`/companies/${companyId}/features`);

      if (response.data.success) {
        toast.success('Features reseteadas al plan base');
        setModifiedFeatures({});
        await fetchCompanyFeatures();
      }
    } catch (error) {
      console.error('Error reseteando features:', error);
      toast.error('Error al resetear features');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(modifiedFeatures).length > 0;

  // Agrupar features por categoría
  const featureCategories = {
    'Notificaciones WhatsApp': {
      whatsappBusiness: 'WhatsApp Business API',
      chatbot: 'Bot de respuesta automática'
    },
    'Escaneo de Códigos': {
      barcodeScanning: 'Sistema de escaneo con cámara',
      bluetoothScanners: 'Soporte para pistolas Bluetooth/USB'
    },
    'Impresión de Etiquetas': {
      labelPrinting: 'Impresión de etiquetas',
      bluetoothPrinting: 'Impresión Bluetooth'
    },
    'Notificaciones': {
      notificacionesWeb: 'Notificaciones Web',
      notificacionesPush: 'Push Notifications',
      smsCliente: 'SMS a Clientes',
      emailAutomatizado: 'Emails Automáticos'
    },
    'Móvil': {
      gpsMovil: 'GPS en App Móvil',
      modoOffline: 'Modo Offline',
      fotoComprobante: 'Fotos de Comprobante',
      firmaDigital: 'Firma Digital'
    },
    'GPS & Tracking': {
      gpsTracking: 'GPS Tracking',
      gpsVehicular: 'GPS Vehicular',
      geofencing: 'Geofencing',
      sensoresIoT: 'Sensores IoT'
    },
    'Cámaras': {
      camarasIP: 'Cámaras IP',
      streamingLive: 'Streaming en Vivo',
      grabacionNube: 'Grabación en Nube'
    },
    'IA & Optimización': {
      optimizacionRutas: 'Optimización de Rutas',
      prediccionTiempos: 'Predicción de Tiempos',
      asignacionAutomatica: 'Asignación Automática'
    },
    'API & Integraciones': {
      apiAccess: 'Acceso a API',
      webhooks: 'Webhooks',
      integraciones: 'Integraciones'
    },
    'Seguridad': {
      autenticacion2FA: 'Autenticación 2FA',
      logsAuditoria: 'Logs de Auditoría'
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard-super-admin')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Gestión de Features
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {companyData?.name} - Plan: <span className="font-semibold">{companyData?.plan}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {hasChanges && (
              <button
                onClick={saveChanges}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
                Guardar Cambios ({Object.keys(modifiedFeatures).length})
              </button>
            )}

            <button
              onClick={resetFeatures}
              disabled={saving || Object.keys(customFeatures).length === 0}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Resetear
            </button>
          </div>
        </div>

        {Object.keys(customFeatures).length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <Sparkles className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Esta compañía tiene {Object.keys(customFeatures).length} features personalizadas
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Las features marcadas con ⚡ son overrides del plan base
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Features Grid */}
      <div className="space-y-6">
        {Object.entries(featureCategories).map(([categoryName, features]) => {
          // Verificar si alguna feature de esta categoría existe en el plan
          const categoryFeatures = Object.entries(features).filter(([key]) =>
            key in planFeatures || key in effectiveFeatures
          );

          if (categoryFeatures.length === 0) return null;

          return (
            <div key={categoryName} className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Package size={20} />
                {categoryName}
              </h2>

              <div className="space-y-3">
                {categoryFeatures.map(([featureKey, featureLabel]) => {
                  const isEnabled = effectiveFeatures[featureKey];
                  const isFromPlan = planFeatures[featureKey] && !customFeatures[featureKey];
                  const isCustom = featureKey in customFeatures;
                  const isModified = featureKey in modifiedFeatures;

                  return (
                    <div
                      key={featureKey}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition ${
                        isModified
                          ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          isEnabled
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                        }`}>
                          {isEnabled ? <Check size={20} /> : <X size={20} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 dark:text-white">
                              {featureLabel}
                            </span>
                            {isCustom && (
                              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                                ⚡ Custom
                              </span>
                            )}
                            {isModified && (
                              <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                                Sin guardar
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            {isFromPlan ? 'Incluido en el plan' : isCustom ? 'Override personalizado' : 'No incluido'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleFeature(featureKey)}
                        className={`p-2 rounded-lg transition ${
                          isEnabled
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            : 'bg-slate-300 hover:bg-slate-400 text-slate-600'
                        }`}
                      >
                        {isEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={saveChanges}
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            {saving ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
            Guardar {Object.keys(modifiedFeatures).length} Cambios
          </button>
        </div>
      )}
    </div>
  );
};

export default GestionFeaturesCompanias;

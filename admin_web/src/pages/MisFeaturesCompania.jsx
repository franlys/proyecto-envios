/**
 * Panel de Features de la Compañía (Vista de Propietario/Admin)
 *
 * Permite a los administradores de compañía ver:
 * - Qué features tienen activas
 * - Qué plan tienen contratado
 * - Features personalizadas (si Super Admin les dio extras)
 *
 * NO pueden modificar features (solo Super Admin puede)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'sonner';
import {
  Package,
  Check,
  X,
  Sparkles,
  Loader,
  Crown,
  TrendingUp,
  MessageSquare,
  Camera,
  Printer,
  Smartphone,
  MapPin,
  Video,
  Brain,
  Plug,
  Shield
} from 'lucide-react';

const MisFeaturesCompania = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState(null);
  const [planFeatures, setPlanFeatures] = useState({});
  const [customFeatures, setCustomFeatures] = useState({});
  const [effectiveFeatures, setEffectiveFeatures] = useState({});

  useEffect(() => {
    if (userData?.companyId) {
      fetchCompanyFeatures();
    }
  }, [userData]);

  const fetchCompanyFeatures = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/companies/${userData.companyId}/features`);

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
      toast.error('Error al cargar características de la compañía');
    } finally {
      setLoading(false);
    }
  };

  const getPlanName = (plan) => {
    const names = {
      operativo: 'Operativo',
      automatizado: 'Automatizado',
      smart: 'Smart'
    };
    return names[plan] || plan;
  };

  const getPlanColor = (plan) => {
    const colors = {
      operativo: 'bg-blue-100 text-blue-700 border-blue-300',
      automatizado: 'bg-purple-100 text-purple-700 border-purple-300',
      smart: 'bg-amber-100 text-amber-700 border-amber-300'
    };
    return colors[plan] || 'bg-slate-100 text-slate-700';
  };

  // ============================================
  // CATEGORÍAS DE FEATURES (Solo implementadas + roadmap)
  // ============================================
  const featureCategories = [
    {
      name: 'Gestión y Reportes',
      icon: Package,
      color: 'text-blue-600',
      features: {
        importarCSV: 'Importar desde CSV',
        importarExcel: 'Importar desde Excel',
        exportarReportes: 'Exportar reportes',
        dashboardAvanzado: 'Dashboard con gráficas',
        trackingPublico: 'Tracking público (sin login)'
      }
    },
    {
      name: 'Notificaciones',
      icon: MessageSquare,
      color: 'text-indigo-600',
      features: {
        notificacionesWeb: 'Notificaciones Web',
        emailBasico: 'Email básico',
        emailAutomatizado: 'Email automático (eventos)',
        whatsappBusiness: 'WhatsApp Business (Evolution API)',
        smsCliente: 'SMS a clientes (roadmap)'
      }
    },
    {
      name: 'Hardware y Escaneo',
      icon: Camera,
      color: 'text-emerald-600',
      features: {
        escanerCodigoBarras: 'Escáner de códigos de barras',
        escaneoConCamara: 'Escaneo con cámara del celular',
        impresionEtiquetas: 'Impresión de etiquetas',
        impresorasBluetooth: 'Impresoras Bluetooth (Phomemo/Zebra)'
      }
    },
    {
      name: 'App Móvil',
      icon: Smartphone,
      color: 'text-blue-600',
      features: {
        appMovilBasica: 'App móvil (Capacitor WebView)',
        fotoComprobante: 'Subir fotos de comprobante',
        modoOffline: 'Modo offline avanzado (roadmap)',
        firmaDigital: 'Firma digital (roadmap)'
      }
    },
    {
      name: 'GPS y Tracking',
      icon: MapPin,
      color: 'text-rose-600',
      features: {
        trackingBasico: 'Tracking de paquetes',
        gpsEnTiempoReal: 'GPS en tiempo real (roadmap)',
        historialRutas: 'Historial de rutas (roadmap)'
      }
    },
    {
      name: 'API y Webhooks',
      icon: Plug,
      color: 'text-orange-600',
      features: {
        apiPublica: 'API REST pública',
        webhooks: 'Webhooks para eventos',
        integraciones: 'Integraciones con terceros'
      }
    },
    {
      name: 'Seguridad',
      icon: Shield,
      color: 'text-slate-600',
      features: {
        autenticacion2FA: 'Autenticación 2FA (roadmap)',
        logsAuditoria: 'Logs de auditoría'
      }
    }
  ];

  const countActiveFeatures = () => {
    return Object.values(effectiveFeatures).filter(v => v === true || v === -1).length;
  };

  const countCustomFeatures = () => {
    return Object.keys(customFeatures).length;
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
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package size={28} />
              Características de Mi Compañía
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {companyData?.name}
            </p>
          </div>

          <div className={`px-4 py-2 rounded-lg border-2 ${getPlanColor(companyData?.plan)} font-bold flex items-center gap-2`}>
            <Crown size={20} />
            Plan {getPlanName(companyData?.plan)}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Check className="text-white" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Features Activas</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{countActiveFeatures()}</p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-lg">
                <Package className="text-white" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Del Plan Base</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {Object.values(planFeatures).filter(v => v === true || v === -1).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-600 rounded-lg">
                <Sparkles className="text-white" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Personalizadas</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{countCustomFeatures()}</p>
              </div>
            </div>
          </div>
        </div>

        {countCustomFeatures() > 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <Sparkles className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-medium text-amber-800">
                ¡Tu compañía tiene {countCustomFeatures()} características personalizadas!
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Estas features extras fueron habilitadas especialmente para ti. Las features marcadas con ⚡ son personalizadas.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Features por Categoría */}
      <div className="space-y-6">
        {featureCategories.map((category) => {
          const CategoryIcon = category.icon;

          // Filtrar features que existen
          const categoryFeatures = Object.entries(category.features).filter(([key]) =>
            key in planFeatures || key in effectiveFeatures
          );

          if (categoryFeatures.length === 0) return null;

          return (
            <div key={category.name} className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
              <h2 className={`text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 ${category.color}`}>
                <CategoryIcon size={22} />
                {category.name}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryFeatures.map(([featureKey, featureLabel]) => {
                  const isEnabled = effectiveFeatures[featureKey];
                  const isCustom = featureKey in customFeatures;

                  return (
                    <div
                      key={featureKey}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                        isEnabled
                          ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-slate-200 bg-slate-50 dark:bg-slate-900/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          isEnabled
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-300 text-slate-600'
                        }`}>
                          {isEnabled ? <Check size={18} /> : <X size={18} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${
                              isEnabled ? 'text-slate-900 dark:text-white' : 'text-slate-500'
                            }`}>
                              {featureLabel}
                            </span>
                            {isCustom && (
                              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                                ⚡ Extra
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            {isEnabled ? 'Disponible' : 'No disponible'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <TrendingUp className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              ¿Necesitas más funcionalidades?
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Contacta a tu administrador del sistema para explorar opciones de upgrade o características personalizadas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MisFeaturesCompania;

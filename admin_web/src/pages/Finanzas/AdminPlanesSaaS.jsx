import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Edit,
  Save,
  X,
  FileText,
  Calendar,
  CheckCircle,
  AlertCircle,
  Package,
  Users
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

const AdminPlanesSaaS = () => {
  const [planes, setPlanes] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estado para generación de facturas
  const [generandoFacturas, setGenerandoFacturas] = useState(false);
  const [mesFactura, setMesFactura] = useState(new Date().getMonth() + 1);
  const [anioFactura, setAnioFactura] = useState(new Date().getFullYear());
  const [facturasSaas, setFacturasSaas] = useState([]);

  useEffect(() => {
    fetchPlanes();
    fetchFacturasSaas();
  }, []);

  const fetchPlanes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/finanzas/saas/planes');
      if (response.data.success) {
        setPlanes(response.data.data.planes);
      }
    } catch (error) {
      console.error('Error al cargar planes:', error);
      toast.error('Error al cargar planes SaaS');
    } finally {
      setLoading(false);
    }
  };

  const fetchFacturasSaas = async () => {
    try {
      const response = await api.get('/finanzas/saas/facturas?limit=20');
      if (response.data.success) {
        setFacturasSaas(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar facturas SaaS:', error);
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan.id);
    setFormData({
      precio: plan.precio,
      precioUSD: plan.precioUSD
    });
  };

  const handleCancelEdit = () => {
    setEditingPlan(null);
    setFormData({});
  };

  const handleSavePlan = async (planId) => {
    try {
      setSaving(true);
      const response = await api.put(`/finanzas/saas/planes/${planId}`, formData);

      if (response.data.success) {
        toast.success('Plan actualizado exitosamente');
        setEditingPlan(null);
        setFormData({});
        fetchPlanes(); // Recargar planes
      }
    } catch (error) {
      console.error('Error al actualizar plan:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar plan');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerarFacturasMasivas = async () => {
    if (!confirm(`¿Generar facturas de suscripción para TODAS las empresas activas del mes ${mesFactura}/${anioFactura}?`)) {
      return;
    }

    try {
      setGenerandoFacturas(true);
      const response = await api.post('/finanzas/saas/generar-facturas-masivas', {
        mes: mesFactura,
        anio: anioFactura
      });

      if (response.data.success) {
        const { exitosas, fallidas, duplicadas } = response.data.data;
        toast.success(`✅ ${exitosas.length} facturas generadas`);

        if (duplicadas.length > 0) {
          toast.info(`ℹ️ ${duplicadas.length} facturas ya existían`);
        }

        if (fallidas.length > 0) {
          toast.error(`❌ ${fallidas.length} facturas fallaron`);
        }

        // Recargar facturas
        fetchFacturasSaas();
      }
    } catch (error) {
      console.error('Error al generar facturas masivas:', error);
      toast.error(error.response?.data?.message || 'Error al generar facturas');
    } finally {
      setGenerandoFacturas(false);
    }
  };

  const getPrecioFormateado = (precio) => {
    return `RD$ ${precio.toLocaleString('es-DO')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Administración de Planes SaaS
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Gestiona precios, características y facturación de suscripciones
        </p>
      </div>

      {/* Gestión de Precios de Planes */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Precios de Planes</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planes.map((plan) => {
            const isEditing = editingPlan === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:shadow-lg transition-all"
                style={{ borderColor: plan.color + '40' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                      style={{ backgroundColor: plan.color + '20', color: plan.color }}
                    >
                      <Package className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                      {plan.nombre}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {plan.descripcion}
                    </p>
                  </div>

                  {!isEditing && (
                    <button
                      onClick={() => handleEditPlan(plan)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Precio (RD$)
                      </label>
                      <input
                        type="number"
                        value={formData.precio}
                        onChange={(e) => setFormData({ ...formData, precio: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Precio (USD)
                      </label>
                      <input
                        type="number"
                        value={formData.precioUSD}
                        onChange={(e) => setFormData({ ...formData, precioUSD: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSavePlan(plan.id)}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        Guardar
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 dark:text-white">
                        {getPrecioFormateado(plan.precio)}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">/mes</span>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      ~${plan.precioUSD} USD
                    </div>
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center justify-between">
                          <span>Camiones:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {plan.limites.camiones === -1 ? 'Ilimitados' : plan.limites.camiones}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span>Usuarios:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {plan.limites.usuarios === -1 ? 'Ilimitados' : plan.limites.usuarios}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Generación de Facturas */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Generación de Facturas</h3>
        </div>

        <div className="flex items-end gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Mes
            </label>
            <select
              value={mesFactura}
              onChange={(e) => setMesFactura(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                <option key={mes} value={mes}>
                  {new Date(2000, mes - 1).toLocaleString('es', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Año
            </label>
            <input
              type="number"
              value={anioFactura}
              onChange={(e) => setAnioFactura(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <button
            onClick={handleGenerarFacturasMasivas}
            disabled={generandoFacturas}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
          >
            <Calendar className="w-4 h-4" />
            {generandoFacturas ? 'Generando...' : 'Generar Facturas Masivas'}
          </button>
        </div>

        {/* Lista de Facturas Generadas */}
        {facturasSaas.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
              Facturas Recientes
            </h4>
            <div className="space-y-2">
              {facturasSaas.slice(0, 10).map((factura) => (
                <div
                  key={factura.id}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      factura.estado === 'pagada'
                        ? 'bg-emerald-100 dark:bg-emerald-900'
                        : factura.estado === 'vencida'
                        ? 'bg-rose-100 dark:bg-rose-900'
                        : 'bg-amber-100 dark:bg-amber-900'
                    }`}>
                      {factura.estado === 'pagada' ? (
                        <CheckCircle className={`w-5 h-5 ${
                          factura.estado === 'pagada' ? 'text-emerald-600' : 'text-amber-600'
                        }`} />
                      ) : (
                        <AlertCircle className={`w-5 h-5 ${
                          factura.estado === 'vencida' ? 'text-rose-600' : 'text-amber-600'
                        }`} />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {factura.companyName}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {factura.numeroFactura} • {factura.planNombre}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {getPrecioFormateado(factura.monto)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500 capitalize">
                      {factura.estado}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPlanesSaaS;

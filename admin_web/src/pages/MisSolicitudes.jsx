// admin_web/src/pages/MisSolicitudes.jsx
// Vista para recolectores: Ver solicitudes asignadas por secretaria_usa

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin,
    Calendar,
    Clock,
    User,
    CheckCircle,
    Package,
    Phone,
    Mail,
    AlertCircle,
    Loader2,
    Navigation,
    Camera,
    Image as ImageIcon
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const MisSolicitudes = () => {
    const { userData } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [solicitudes, setSolicitudes] = useState([]);

    useEffect(() => {
        fetchMisSolicitudes();

        // Polling cada 15 segundos para mantener la lista fresca
        const interval = setInterval(fetchMisSolicitudes, 15000);
        return () => clearInterval(interval);
    }, []);

    const fetchMisSolicitudes = async () => {
        try {
            // Obtener solicitudes asignadas a este recolector con estado 'asignada'
            const res = await api.get(`/solicitudes?recolectorId=${userData.uid}&estado=asignada`);
            if (res.data.success) {
                setSolicitudes(res.data.data);
            }
        } catch (error) {
            console.error('Error cargando mis solicitudes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleIniciarRecoleccion = (solicitud) => {
        // Redirigir a la página de nueva recolección con datos prellenados
        navigate('/recolecciones/nueva', { state: { solicitud } });
    };

    const openGoogleMaps = (direccion) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Package className="text-indigo-500" />
                        Mis Solicitudes Asignadas
                    </h1>
                    <p className="text-slate-500">Recolecciones que la secretaria te ha asignado</p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800">
                    <span className="text-indigo-700 dark:text-indigo-300 font-bold text-lg">
                        {solicitudes.length}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 text-sm ml-2">asignadas</span>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin w-12 h-12 text-indigo-500" />
                </div>
            ) : solicitudes.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">No tienes solicitudes asignadas</h3>
                    <p className="text-slate-500 mt-2">Cuando la secretaria te asigne una recolección, aparecerá aquí.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {solicitudes.map((sol) => (
                            <motion.div
                                key={sol.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-shadow"
                            >
                                {/* Header con badge de asignada */}
                                <div className="bg-indigo-600 text-white text-center py-2 text-xs font-bold">
                                    ✅ ASIGNADA - Lista para recolectar
                                </div>

                                <div className="p-5">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                                            <MapPin size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-white line-clamp-2">
                                                {sol.ubicacion?.direccion || sol.cliente?.direccion}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {sol.ubicacion?.sector || 'Sin sector'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <User size={16} className="text-slate-400" />
                                            <span className="font-medium">{sol.cliente?.nombre}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <Phone size={16} className="text-slate-400" />
                                            <span>{sol.cliente?.telefono || 'Sin teléfono'}</span>
                                        </div>
                                        {sol.cliente?.email && (
                                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                                <Mail size={16} className="text-slate-400" />
                                                <span className="text-xs">{sol.cliente.email}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <Calendar size={16} className="text-slate-400" />
                                            <span>{sol.programacion?.fecha}</span>
                                            <Clock size={16} className="text-slate-400 ml-2" />
                                            <span className="font-medium text-indigo-600 dark:text-indigo-400">
                                                {sol.programacion?.hora || 'Flexible'}
                                            </span>
                                        </div>
                                        {sol.notas && (
                                            <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                                                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                                <span>{sol.notas}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Fotos del Cliente */}
                                    {sol.fotos && sol.fotos.length > 0 && (
                                        <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Camera size={16} className="text-indigo-600" />
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    Fotos del Cliente ({sol.fotos.length})
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {sol.fotos.slice(0, 3).map((foto, idx) => (
                                                    <div key={idx} className="relative group">
                                                        <img
                                                            src={foto}
                                                            alt={`Foto ${idx + 1}`}
                                                            className="w-full h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer hover:opacity-80 transition-opacity"
                                                            onClick={() => window.open(foto, '_blank')}
                                                        />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                            <ImageIcon className="text-white" size={20} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {sol.fotos.length > 3 && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    +{sol.fotos.length - 3} foto(s) más (verás todas al iniciar)
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Botones de Acción */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => openGoogleMaps(sol.ubicacion?.direccion || sol.cliente?.direccion)}
                                            className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 text-sm"
                                        >
                                            <Navigation size={18} />
                                            Ver Mapa
                                        </button>
                                        <button
                                            onClick={() => handleIniciarRecoleccion(sol)}
                                            className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 text-sm"
                                        >
                                            <CheckCircle size={18} />
                                            Iniciar
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default MisSolicitudes;

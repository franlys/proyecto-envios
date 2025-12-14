import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin,
    Calendar,
    Clock,
    User,
    CheckCircle,
    Package,
    Navigation,
    AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const PoolRecolecciones = () => {
    const { userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [solicitudes, setSolicitudes] = useState([]);
    const [claimingId, setClaimingId] = useState(null);

    useEffect(() => {
        fetchSolicitudesDisponibles();

        // Polling cada 15 segundos para mantener la lista fresca
        const interval = setInterval(fetchSolicitudesDisponibles, 15000);
        return () => clearInterval(interval);
    }, []);

    const fetchSolicitudesDisponibles = async () => {
        try {
            const res = await api.get('/solicitudes?estado=pendiente'); // Solo pendientes
            if (res.data.success) {
                setSolicitudes(res.data.data);
            }
        } catch (error) {
            console.error('Error cargando pool:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTomarSolicitud = async (id, direccion) => {
        if (!confirm(`¿Estás seguro de que puedes recolectar en: ${direccion}?`)) return;

        setClaimingId(id);
        try {
            const res = await api.put(`/solicitudes/${id}/asignar`);
            if (res.data.success) {
                toast.success('¡Solicitud asignada a ti! Ve a "Nueva Recolección" cuando llegues.');
                // Quitar de la lista local
                setSolicitudes(prev => prev.filter(s => s.id !== id));
            }
        } catch (error) {
            console.error('Error asignando:', error);
            toast.error(error.response?.data?.error || 'Error al tomar la solicitud');
        } finally {
            setClaimingId(null);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <MapPin className="text-emerald-500" />
                        Bolsa de Recolecciones
                    </h1>
                    <p className="text-slate-500">Citas disponibles en tu zona. ¡Tómalas antes que otro!</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-lg border border-emerald-100 dark:border-emerald-800">
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold text-lg">
                        {solicitudes.length}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-sm ml-2">disponibles ahora</span>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
            ) : solicitudes.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">No hay recolecciones pendientes</h3>
                    <p className="text-slate-500 mt-2">Relájate un poco, pronto caerán más.</p>
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
                                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-shadow relative"
                            >
                                {/* Bandera de Sector */}
                                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                    {sol.ubicacion?.sector || 'Zona General'}
                                </div>

                                <div className="p-5">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                                            <Navigation size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-white line-clamp-1">
                                                {sol.ubicacion?.direccion}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 text-ellipsis overflow-hidden">
                                                {sol.ubicacion?.referencia || 'Sin referencia'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <User size={16} className="text-slate-400" />
                                            <span>{sol.cliente?.nombre}</span>
                                        </div>
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

                                    <button
                                        onClick={() => handleTomarSolicitud(sol.id, sol.ubicacion?.direccion)}
                                        disabled={claimingId === sol.id}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold rounded-lg shadow-md transition-all active:scale-95 flex justify-center items-center gap-2"
                                    >
                                        {claimingId === sol.id ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white"></div>
                                        ) : (
                                            <>
                                                <CheckCircle size={20} />
                                                ¡LO TOMO!
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default PoolRecolecciones;

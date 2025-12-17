// admin_web/src/pages/GestionSolicitudes.jsx
// ✅ Panel Drag & Drop para Secretarias - Asignar solicitudes arrastrando a recolectores

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
    AlertCircle,
    UserPlus,
    PlusCircle,
    X,
    Phone,
    GripVertical,
    Users,
    Inbox,
    TruckIcon
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const GestionSolicitudes = () => {
    const { userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [solicitudes, setSolicitudes] = useState([]);
    const [recolectores, setRecolectores] = useState([]);
    const [filtroEstado, setFiltroEstado] = useState('pendiente');
    const [showModalNueva, setShowModalNueva] = useState(false);
    const [draggedSolicitud, setDraggedSolicitud] = useState(null);
    const [dragOverRecolector, setDragOverRecolector] = useState(null);
    const [asignando, setAsignando] = useState(false);

    // Formulario nueva solicitud
    const [formNueva, setFormNueva] = useState({
        clienteNombre: '',
        clienteTelefono: '',
        direccion: '',
        sector: '',
        referencia: '',
        fechaPreferida: '',
        horaPreferida: '09:00',
        notas: ''
    });

    useEffect(() => {
        fetchSolicitudes();
        fetchRecolectores();

        // Polling cada 30 segundos
        const interval = setInterval(() => {
            fetchSolicitudes();
            fetchRecolectores();
        }, 30000);
        return () => clearInterval(interval);
    }, [filtroEstado]);

    const fetchSolicitudes = async () => {
        try {
            const params = filtroEstado !== 'todas' ? `?estado=${filtroEstado}` : '';
            const res = await api.get(`/solicitudes${params}`);
            if (res.data.success) {
                setSolicitudes(res.data.data);
            }
        } catch (error) {
            console.error('Error cargando solicitudes:', error);
            toast.error('Error al cargar solicitudes');
        } finally {
            setLoading(false);
        }
    };

    const fetchRecolectores = async () => {
        try {
            const res = await api.get('/solicitudes/recolectores');
            if (res.data.success) {
                setRecolectores(res.data.data);
            }
        } catch (error) {
            console.error('Error cargando recolectores:', error);
        }
    };

    // ============================================
    // 🎯 DRAG & DROP HANDLERS
    // ============================================

    const handleDragStart = (e, solicitud) => {
        setDraggedSolicitud(solicitud);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target);
        e.target.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedSolicitud(null);
        setDragOverRecolector(null);
    };

    const handleDragOver = (e, recolectorId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverRecolector(recolectorId);
    };

    const handleDragLeave = () => {
        setDragOverRecolector(null);
    };

    const handleDrop = async (e, recolectorId) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedSolicitud) return;

        setDragOverRecolector(null);
        setAsignando(true);

        try {
            const res = await api.put(`/solicitudes/${draggedSolicitud.id}/asignar`, {
                recolectorId
            });

            if (res.data.success) {
                toast.success(`✅ ${draggedSolicitud.cliente?.nombre} asignado correctamente`);
                fetchSolicitudes();
            }
        } catch (error) {
            console.error('Error asignando:', error);
            toast.error(error.response?.data?.error || 'Error al asignar solicitud');
        } finally {
            setAsignando(false);
            setDraggedSolicitud(null);
        }
    };

    const handleCrearSolicitud = async (e) => {
        e.preventDefault();

        if (!formNueva.clienteNombre || !formNueva.direccion) {
            toast.error('Nombre del cliente y dirección son obligatorios');
            return;
        }

        try {
            const res = await api.post('/solicitudes', formNueva);
            if (res.data.success) {
                toast.success('✅ Solicitud creada exitosamente');
                setShowModalNueva(false);
                setFormNueva({
                    clienteNombre: '',
                    clienteTelefono: '',
                    direccion: '',
                    sector: '',
                    referencia: '',
                    fechaPreferida: '',
                    horaPreferida: '09:00',
                    notas: ''
                });
                fetchSolicitudes();
            }
        } catch (error) {
            console.error('Error creando solicitud:', error);
            toast.error(error.response?.data?.error || 'Error al crear solicitud');
        }
    };

    const getEstadoBadge = (estado) => {
        const styles = {
            pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            asignada: 'bg-blue-100 text-blue-800 border-blue-200',
            asignada_pendiente: 'bg-purple-100 text-purple-800 border-purple-200',
            completada: 'bg-green-100 text-green-800 border-green-200',
            cancelada: 'bg-red-100 text-red-800 border-red-200'
        };
        return styles[estado] || styles.pendiente;
    };

    const solicitudesPendientes = solicitudes.filter(s => s.estado === 'pendiente');

    return (
        <div className="p-6 max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Package className="text-indigo-500" />
                        Gestión de Solicitudes - Drag & Drop
                    </h1>
                    <p className="text-slate-500">Arrastra solicitudes y suéltalas en los recolectores para asignarlas</p>
                </div>

                <button
                    onClick={() => setShowModalNueva(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all"
                >
                    <PlusCircle size={20} />
                    Nueva Solicitud
                </button>
            </div>

            {/* Filtros */}
            <div className="mb-6 flex gap-2 flex-wrap">
                {['pendiente', 'asignada', 'completada', 'todas'].map((estado) => (
                    <button
                        key={estado}
                        onClick={() => setFiltroEstado(estado)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            filtroEstado === estado
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        {estado.charAt(0).toUpperCase() + estado.slice(1)}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ============================================ */}
                    {/* 📦 POOL DE SOLICITUDES PENDIENTES (IZQUIERDA) */}
                    {/* ============================================ */}
                    <div className="lg:col-span-2">
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-6 border-2 border-indigo-200 dark:border-slate-600 shadow-xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-indigo-600 rounded-xl">
                                    <Inbox size={24} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                        Solicitudes Pendientes
                                    </h2>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        Arrastra para asignar → {solicitudesPendientes.length} disponibles
                                    </p>
                                </div>
                            </div>

                            {solicitudesPendientes.length === 0 ? (
                                <div className="text-center py-16 bg-white dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                                        No hay solicitudes pendientes
                                    </h3>
                                    <p className="text-slate-500 mt-2">Crea una nueva solicitud para comenzar</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[800px] overflow-y-auto pr-2">
                                    <AnimatePresence>
                                        {solicitudesPendientes.map((sol) => (
                                            <motion.div
                                                key={sol.id}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, sol)}
                                                onDragEnd={handleDragEnd}
                                                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all cursor-grab active:cursor-grabbing relative group"
                                            >
                                                {/* Drag Handle Icon */}
                                                <div className="absolute top-2 left-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                                    <GripVertical size={20} className="text-slate-400" />
                                                </div>

                                                {/* Badge de Estado */}
                                                <div className={`absolute top-0 right-0 text-xs font-bold px-3 py-1 rounded-bl-lg border ${getEstadoBadge(sol.estado)}`}>
                                                    {sol.estado}
                                                </div>

                                                <div className="p-5 pt-8">
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                                            <Navigation size={20} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="font-bold text-base text-slate-800 dark:text-white line-clamp-2">
                                                                {sol.ubicacion?.direccion}
                                                            </h3>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                {sol.ubicacion?.sector || 'Sin sector'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                            <User size={14} className="text-slate-400" />
                                                            <span className="font-medium">{sol.cliente?.nombre}</span>
                                                        </div>
                                                        {sol.cliente?.telefono && (
                                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                                <Phone size={14} className="text-slate-400" />
                                                                <span className="text-xs">{sol.cliente.telefono}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                            <Calendar size={14} className="text-slate-400" />
                                                            <span className="text-xs">{sol.programacion?.fecha}</span>
                                                            <Clock size={14} className="text-slate-400 ml-1" />
                                                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                                                {sol.programacion?.hora || 'Flexible'}
                                                            </span>
                                                        </div>

                                                        {sol.notas && (
                                                            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 p-2 rounded mt-2">
                                                                <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                                                                <span className="line-clamp-2">{sol.notas}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ============================================ */}
                    {/* 👥 RECOLECTORES (DROP ZONES - DERECHA) */}
                    {/* ============================================ */}
                    <div className="lg:col-span-1">
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-6 border-2 border-emerald-200 dark:border-slate-600 shadow-xl sticky top-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-emerald-600 rounded-xl">
                                    <Users size={24} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                        Recolectores Activos
                                    </h2>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        Suelta aquí para asignar → {recolectores.length}
                                    </p>
                                </div>
                            </div>

                            {recolectores.length === 0 ? (
                                <div className="text-center py-12 bg-white dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500">No hay recolectores activos</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
                                    {recolectores.map((recolector) => {
                                        const isDropTarget = dragOverRecolector === recolector.id;

                                        return (
                                            <motion.div
                                                key={recolector.id}
                                                onDragOver={(e) => handleDragOver(e, recolector.id)}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, recolector.id)}
                                                animate={{
                                                    scale: isDropTarget ? 1.05 : 1,
                                                    borderColor: isDropTarget ? '#10b981' : undefined
                                                }}
                                                className={`
                                                    bg-white dark:bg-slate-800 rounded-xl p-5 border-3 transition-all shadow-lg
                                                    ${isDropTarget
                                                        ? 'border-emerald-500 shadow-2xl shadow-emerald-200 dark:shadow-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className={`p-3 rounded-full ${isDropTarget ? 'bg-emerald-500' : 'bg-emerald-100 dark:bg-emerald-900/50'}`}>
                                                        <TruckIcon size={24} className={isDropTarget ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                                            {recolector.nombre}
                                                        </h3>
                                                        {recolector.telefono && (
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                                <Phone size={12} />
                                                                {recolector.telefono}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {recolector.zonaAsignada && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg">
                                                        <MapPin size={12} className="text-emerald-600 dark:text-emerald-400" />
                                                        <span>Zona: {recolector.zonaAsignada}</span>
                                                    </div>
                                                )}

                                                {isDropTarget && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="mt-3 text-center text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 py-2 rounded-lg"
                                                    >
                                                        ⬇️ Suelta aquí para asignar
                                                    </motion.div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Nueva Solicitud */}
            {showModalNueva && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Nueva Solicitud de Recolección
                            </h2>
                            <button
                                onClick={() => setShowModalNueva(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCrearSolicitud} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Nombre del Cliente *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formNueva.clienteNombre}
                                        onChange={(e) => setFormNueva({ ...formNueva, clienteNombre: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        value={formNueva.clienteTelefono}
                                        onChange={(e) => setFormNueva({ ...formNueva, clienteTelefono: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Dirección *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formNueva.direccion}
                                    onChange={(e) => setFormNueva({ ...formNueva, direccion: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Sector
                                    </label>
                                    <input
                                        type="text"
                                        value={formNueva.sector}
                                        onChange={(e) => setFormNueva({ ...formNueva, sector: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Referencia
                                    </label>
                                    <input
                                        type="text"
                                        value={formNueva.referencia}
                                        onChange={(e) => setFormNueva({ ...formNueva, referencia: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Fecha Preferida
                                    </label>
                                    <input
                                        type="date"
                                        value={formNueva.fechaPreferida}
                                        onChange={(e) => setFormNueva({ ...formNueva, fechaPreferida: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Hora Preferida
                                    </label>
                                    <input
                                        type="time"
                                        value={formNueva.horaPreferida}
                                        onChange={(e) => setFormNueva({ ...formNueva, horaPreferida: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Notas
                                </label>
                                <textarea
                                    value={formNueva.notas}
                                    onChange={(e) => setFormNueva({ ...formNueva, notas: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModalNueva(false)}
                                    className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold rounded-lg transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all"
                                >
                                    Crear Solicitud
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Loading Overlay cuando está asignando */}
            {asignando && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-2xl flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
                        <span className="text-slate-900 dark:text-white font-medium">Asignando...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionSolicitudes;

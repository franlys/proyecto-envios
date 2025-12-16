// admin_web/src/pages/GestionSolicitudes.jsx
// ✅ Panel para que Secretarias gestionen solicitudes de recolección
// Permite ver el pool, crear nuevas solicitudes, y asignar manualmente a recolectores

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
    Filter,
    PlusCircle,
    X,
    Phone,
    FileText
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
    const [showModalAsignar, setShowModalAsignar] = useState(false);
    const [showModalNueva, setShowModalNueva] = useState(false);
    const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
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
        const interval = setInterval(fetchSolicitudes, 30000);
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

    const handleAbrirModalAsignar = (solicitud) => {
        setSolicitudSeleccionada(solicitud);
        setShowModalAsignar(true);
    };

    const handleAsignarRecolector = async (recolectorId) => {
        if (!solicitudSeleccionada) return;

        setAsignando(true);
        try {
            const res = await api.put(`/solicitudes/${solicitudSeleccionada.id}/asignar`, {
                recolectorId
            });

            if (res.data.success) {
                toast.success(res.data.message || '✅ Solicitud asignada correctamente');
                setShowModalAsignar(false);
                fetchSolicitudes();
            }
        } catch (error) {
            console.error('Error asignando:', error);
            toast.error(error.response?.data?.error || 'Error al asignar solicitud');
        } finally {
            setAsignando(false);
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
            completada: 'bg-green-100 text-green-800 border-green-200',
            cancelada: 'bg-red-100 text-red-800 border-red-200'
        };
        return styles[estado] || styles.pendiente;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Package className="text-indigo-500" />
                        Gestión de Solicitudes de Recolección
                    </h1>
                    <p className="text-slate-500">Administra las citas de recolección y asígnalas a recolectores</p>
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
                {['todas', 'pendiente', 'asignada', 'completada'].map((estado) => (
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

            {/* Lista de Solicitudes */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            ) : solicitudes.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">
                        No hay solicitudes {filtroEstado !== 'todas' && filtroEstado}
                    </h3>
                    <p className="text-slate-500 mt-2">Crea una nueva solicitud para comenzar</p>
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
                                {/* Badge de Estado */}
                                <div className={`absolute top-0 right-0 text-xs font-bold px-3 py-1 rounded-bl-lg border ${getEstadoBadge(sol.estado)}`}>
                                    {sol.estado}
                                </div>

                                <div className="p-5">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                                            <Navigation size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-white line-clamp-1">
                                                {sol.ubicacion?.direccion}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {sol.ubicacion?.sector || 'Sin sector especificado'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <User size={16} className="text-slate-400" />
                                            <span>{sol.cliente?.nombre}</span>
                                        </div>
                                        {sol.cliente?.telefono && (
                                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                                <Phone size={16} className="text-slate-400" />
                                                <span>{sol.cliente.telefono}</span>
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

                                        {sol.recolectorNombre && (
                                            <div className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                                <UserPlus size={14} className="text-blue-600 dark:text-blue-400" />
                                                <span className="text-blue-700 dark:text-blue-300">
                                                    Asignada a: <strong>{sol.recolectorNombre}</strong>
                                                </span>
                                            </div>
                                        )}

                                        {sol.notas && (
                                            <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                                                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                                <span>{sol.notas}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Botón de Asignar (solo si está pendiente) */}
                                    {sol.estado === 'pendiente' && (
                                        <button
                                            onClick={() => handleAbrirModalAsignar(sol)}
                                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all active:scale-95 flex justify-center items-center gap-2"
                                        >
                                            <UserPlus size={20} />
                                            Asignar Recolector
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Modal Asignar Recolector */}
            {showModalAsignar && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Asignar Recolector
                            </h2>
                            <button
                                onClick={() => setShowModalAsignar(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                <strong>Cliente:</strong> {solicitudSeleccionada?.cliente?.nombre}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                <strong>Dirección:</strong> {solicitudSeleccionada?.ubicacion?.direccion}
                            </p>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            Selecciona un recolector para asignar esta solicitud. Se le enviará una notificación por WhatsApp.
                        </p>

                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {recolectores.length === 0 ? (
                                <p className="text-center text-slate-500 py-4">No hay recolectores disponibles</p>
                            ) : (
                                recolectores.map((recolector) => (
                                    <button
                                        key={recolector.id}
                                        onClick={() => handleAsignarRecolector(recolector.id)}
                                        disabled={asignando}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-slate-200 dark:border-slate-600 rounded-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-full">
                                                <User size={20} className="text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-900 dark:text-white">
                                                    {recolector.nombre}
                                                </p>
                                                {recolector.telefono && (
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                                        📞 {recolector.telefono}
                                                    </p>
                                                )}
                                                {recolector.zonaAsignada && (
                                                    <p className="text-xs text-slate-400">
                                                        Zona: {recolector.zonaAsignada}
                                                    </p>
                                                )}
                                            </div>
                                            <CheckCircle size={20} className="text-emerald-500" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
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
        </div>
    );
};

export default GestionSolicitudes;

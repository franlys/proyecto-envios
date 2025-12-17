import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Phone,
    MapPin,
    Calendar,
    Clock,
    User,
    FileText,
    Plus,
    Search,
    CheckCircle,
    Truck,
    Users,
    AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

const DespachoUSA = () => {
    const [loading, setLoading] = useState(false);
    const [solicitudes, setSolicitudes] = useState([]);
    const [recolectores, setRecolectores] = useState([]);
    const [draggedSolicitud, setDraggedSolicitud] = useState(null);
    const [dragOverRecolector, setDragOverRecolector] = useState(null);
    const [asignando, setAsignando] = useState(false);
    const [formData, setFormData] = useState({
        clienteNombre: '',
        clienteTelefono: '',
        direccion: '',
        sector: '',
        referencia: '',
        fechaPreferida: new Date().toISOString().split('T')[0],
        horaPreferida: '',
        notas: ''
    });

    useEffect(() => {
        fetchSolicitudes();
        fetchRecolectores();
    }, []);

    const fetchSolicitudes = async () => {
        try {
            const res = await api.get('/solicitudes'); // Obtiene el pool
            if (res.data.success) {
                // Mostramos TODAS las solicitudes pendientes y asignadas (no solo 10)
                const todasSolicitudes = res.data.data.filter(s =>
                    s.estado === 'pendiente' || s.estado === 'asignada'
                );
                setSolicitudes(todasSolicitudes);
            }
        } catch (error) {
            console.error('Error cargando solicitudes:', error);
            toast.error('Error al cargar solicitudes');
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
            toast.error('Error al cargar recolectores');
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Validación simple
        if (!formData.clienteNombre || !formData.direccion) {
            toast.warning('Nombre y Dirección son obligatorios');
            setLoading(false);
            return;
        }

        try {
            const res = await api.post('/solicitudes', formData);
            if (res.data.success) {
                toast.success('Solicitud de recolección creada');
                setFormData({
                    clienteNombre: '',
                    clienteTelefono: '',
                    direccion: '',
                    sector: '',
                    referencia: '',
                    fechaPreferida: new Date().toISOString().split('T')[0],
                    horaPreferida: '',
                    notas: ''
                });
                fetchSolicitudes(); // Recargar lista
            }
        } catch (error) {
            console.error('Error creando solicitud:', error);
            toast.error('Error al agendar la cita');
        } finally {
            setLoading(false);
        }
    };

    // ========== DRAG & DROP HANDLERS ==========
    const handleDragStart = (e, solicitud) => {
        setDraggedSolicitud(solicitud);
        e.dataTransfer.effectAllowed = 'move';
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
        setDragOverRecolector(null);

        if (!draggedSolicitud) return;

        setAsignando(true);

        try {
            const res = await api.put(`/solicitudes/${draggedSolicitud.id}/asignar`, {
                recolectorId
            });

            if (res.data.success) {
                toast.success(`Cita asignada a ${res.data.data.recolectorNombre}`);
                fetchSolicitudes(); // Recargar lista
            }
        } catch (error) {
            console.error('Error asignando solicitud:', error);
            toast.error(error.response?.data?.error || 'Error al asignar la cita');
        } finally {
            setAsignando(false);
            setDraggedSolicitud(null);
        }
    };

    return (
        <div className="p-6 max-w-[1800px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Phone className="text-indigo-600" />
                        Call Center USA
                    </h1>
                    <p className="text-slate-500">Agendamiento de Citas de Recolección</p>
                </div>
            </div>

            {/* Ayuda visual de drag & drop */}
            {solicitudes.filter(s => s.estado === 'pendiente').length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
                >
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600" />
                        <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                            Arrastra las citas pendientes y suéltalas en la tarjeta del recolector para asignarlas automáticamente
                        </p>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* 📝 COLUMNA IZQUIERDA: FORMULARIO */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sticky top-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-indigo-600" />
                            Nueva Cita
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Cliente */}
                            <div className="space-y-3">
                                <div className="relative">
                                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input
                                        name="clienteNombre"
                                        value={formData.clienteNombre}
                                        onChange={handleChange}
                                        placeholder="Nombre del Cliente"
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input
                                        name="clienteTelefono"
                                        value={formData.clienteTelefono}
                                        onChange={handleChange}
                                        placeholder="Teléfono (Opcional)"
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <hr className="border-slate-100 dark:border-slate-700" />

                            {/* Ubicación */}
                            <div className="space-y-3">
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input
                                        name="direccion"
                                        value={formData.direccion}
                                        onChange={handleChange}
                                        placeholder="Dirección Completa (Calle, Casa, Apto)"
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        name="sector"
                                        value={formData.sector}
                                        onChange={handleChange}
                                        placeholder="Sector / Ciudad"
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                    <input
                                        name="referencia"
                                        value={formData.referencia}
                                        onChange={handleChange}
                                        placeholder="Referencia (Ej: Casa azul)"
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                            </div>

                            <hr className="border-slate-100 dark:border-slate-700" />

                            {/* Fecha y Hora */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input
                                        type="date"
                                        name="fechaPreferida"
                                        value={formData.fechaPreferida}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-2 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input
                                        type="time"
                                        name="horaPreferida"
                                        value={formData.horaPreferida}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-2 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Notas */}
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <textarea
                                    name="notas"
                                    value={formData.notas}
                                    onChange={handleChange}
                                    placeholder="Notas adicionales (Ej: Cajas pesadas, Tocar timbre)"
                                    rows="2"
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all active:scale-95 flex justify-center items-center gap-2"
                            >
                                {loading ? 'Agendando...' : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Agendar Cita
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* 📋 COLUMNA CENTRAL: CITAS PENDIENTES (DRAGGABLE) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Citas Agendadas</h2>
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                            Total: {solicitudes.length}
                        </span>
                    </div>

                    <div className="grid gap-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                        {solicitudes.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300">
                                <p className="text-slate-500">No hay citas agendadas.</p>
                            </div>
                        ) : (
                            solicitudes.map((sol) => (
                                <motion.div
                                    key={sol.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    draggable={sol.estado === 'pendiente'}
                                    onDragStart={(e) => handleDragStart(e, sol)}
                                    onDragEnd={handleDragEnd}
                                    className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-3 transition-all ${
                                        sol.estado === 'pendiente'
                                            ? 'cursor-grab active:cursor-grabbing hover:shadow-lg hover:scale-[1.02]'
                                            : 'opacity-75'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-slate-900 dark:text-white">{sol.cliente?.nombre}</h3>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                                                    sol.estado === 'pendiente' ? 'bg-amber-100 text-amber-800' :
                                                    sol.estado === 'asignada' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-green-100 text-green-800'
                                                }`}>
                                                    {sol.estado}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                                <p className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {sol.ubicacion?.direccion} {sol.ubicacion?.sector && `(${sol.ubicacion.sector})`}
                                                </p>
                                                <p className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {sol.cliente?.telefono || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-slate-400" />
                                                {sol.programacion?.fecha}
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                <Clock className="w-3 h-3" />
                                                {sol.programacion?.hora || 'Por definir'}
                                            </div>
                                        </div>
                                    </div>
                                    {sol.recolectorNombre && (
                                        <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center gap-1 w-fit">
                                            <Truck className="w-3 h-3" />
                                            Asignado a: {sol.recolectorNombre}
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* 🚚 COLUMNA DERECHA: RECOLECTORES (DROP ZONE) */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-green-600" />
                            Recolectores
                        </h2>
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                            {recolectores.length}
                        </span>
                    </div>

                    <div className="grid gap-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                        {recolectores.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300">
                                <p className="text-slate-500">No hay recolectores activos</p>
                            </div>
                        ) : (
                            recolectores.map((rec) => (
                                <motion.div
                                    key={rec.id}
                                    onDragOver={(e) => handleDragOver(e, rec.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, rec.id)}
                                    className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border-2 transition-all ${
                                        dragOverRecolector === rec.id
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 scale-105 shadow-lg'
                                            : 'border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                                            {rec.nombre?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-900 dark:text-white">{rec.nombre}</h3>
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                <Truck className="w-3 h-3" />
                                                {rec.vehiculo || 'Sin vehículo'}
                                            </p>
                                        </div>
                                    </div>
                                    {dragOverRecolector === rec.id && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-xs text-green-700 dark:text-green-400 mt-2 font-medium"
                                        >
                                            Suelta aquí para asignar
                                        </motion.p>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DespachoUSA;

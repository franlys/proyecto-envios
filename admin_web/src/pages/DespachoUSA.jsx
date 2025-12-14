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
    Truck
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

const DespachoUSA = () => {
    const [loading, setLoading] = useState(false);
    const [solicitudes, setSolicitudes] = useState([]);
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
    }, []);

    const fetchSolicitudes = async () => {
        try {
            const res = await api.get('/solicitudes'); // Obtiene el pool
            if (res.data.success) {
                // Filtramos solo las pendientes o asignadas recientes para vista rápida
                setSolicitudes(res.data.data.slice(0, 10));
            }
        } catch (error) {
            console.error('Error cargando solicitudes:', error);
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

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Phone className="text-indigo-600" />
                        Call Center USA
                    </h1>
                    <p className="text-slate-500">Agendamiento de Citas de Recolección</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

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

                {/* 📋 COLUMNA DERECHA: LISTADO RECIENTE */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Últimas Solicitudes</h2>
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                            Total: {solicitudes.length}
                        </span>
                    </div>

                    <div className="grid gap-4">
                        {solicitudes.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300">
                                <p className="text-slate-500">No hay solicitudes recientes hoy.</p>
                            </div>
                        ) : (
                            solicitudes.map((sol) => (
                                <motion.div
                                    key={sol.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between gap-4"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-slate-900 dark:text-white">{sol.cliente?.nombre}</h3>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${sol.estado === 'pendiente' ? 'bg-amber-100 text-amber-800' :
                                                    sol.estado === 'asignada' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-green-100 text-green-800'
                                                }`}>
                                                {sol.estado}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                            <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {sol.ubicacion?.direccion} {sol.ubicacion?.sector && `(${sol.ubicacion.sector})`}</p>
                                            <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {sol.cliente?.telefono || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end justify-center text-right border-t md:border-t-0 md:border-l border-slate-100 md:pl-4 pt-2 md:pt-0">
                                        <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-slate-400" />
                                            {sol.programacion?.fecha}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                            <Clock className="w-3 h-3" />
                                            {sol.programacion?.hora || 'Por definir'}
                                        </div>
                                        {sol.recolectorNombre ? (
                                            <div className="mt-2 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                                                <Truck className="w-3 h-3" />
                                                {sol.recolectorNombre}
                                            </div>
                                        ) : (
                                            <div className="mt-2 text-xs text-amber-600 italic">
                                                Esperando recolector...
                                            </div>
                                        )}
                                    </div>
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

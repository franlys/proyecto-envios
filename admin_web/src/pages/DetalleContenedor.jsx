import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Package,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    MapPin,
    User,
    Phone,
    Printer,
    Download,
    TrendingUp,
    TrendingDown,
    FileText,
    Calendar
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

const DetalleContenedor = () => {
    const { contenedorId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [contenedor, setContenedor] = useState(null);
    const [facturas, setFacturas] = useState([]);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchDetalleContenedor();
    }, [contenedorId]);

    const fetchDetalleContenedor = async () => {
        try {
            setLoading(true);

            // Obtener info del contenedor
            const contRes = await api.get(`/contenedores/${contenedorId}`);
            if (contRes.data.success) {
                setContenedor(contRes.data.data);
            }

            // Obtener estadísticas del contenedor
            const statsRes = await api.get(`/dashboard/contenedor/${contenedorId}`);
            if (statsRes.data.success) {
                setStats(statsRes.data.data);
            }

            // Obtener todas las facturas del contenedor con su estado actual
            const facturasRes = await api.get(`/contenedores/${contenedorId}/facturas-detalladas`);
            if (facturasRes.data.success) {
                setFacturas(facturasRes.data.data);
            }

        } catch (error) {
            console.error('Error cargando detalle de contenedor:', error);
            toast.error('Error al cargar información del contenedor');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        // TODO: Implementar exportación a PDF
        toast.info('Funcionalidad de exportación próximamente');
    };

    const getEstadoBadge = (estado) => {
        const badges = {
            'entregada': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle2 },
            'sin_confirmar': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
            'confirmada': { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle2 },
            'danada': { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
            'no_entregada': { bg: 'bg-orange-100', text: 'text-orange-800', icon: AlertTriangle },
            'en_ruta': { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: TrendingUp }
        };

        const badge = badges[estado] || badges['sin_confirmar'];
        const Icon = badge.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                <Icon size={12} />
                {estado?.replace(/_/g, ' ').toUpperCase()}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Cargando detalle del contenedor...</p>
                </div>
            </div>
        );
    }

    if (!contenedor) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Contenedor no encontrado</h2>
                    <button onClick={() => navigate(-1)} className="text-indigo-600 hover:underline">
                        Volver atrás
                    </button>
                </div>
            </div>
        );
    }

    // Filtrar facturas por estado
    const facturasNoEntregadas = facturas.filter(f => f.estadoGeneral !== 'entregada' && f.estadoGeneral !== 'danada');
    const facturasDanadas = facturas.filter(f => f.estadoGeneral === 'danada');
    const facturasEntregadas = facturas.filter(f => f.estadoGeneral === 'entregada');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-6 print:hidden">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4"
                >
                    <ArrowLeft size={20} />
                    Volver
                </button>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <Package className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                                    Contenedor {contenedor.codigo}
                                </h1>
                                <p className="text-slate-600 dark:text-slate-400 mt-1">
                                    Estado: <span className="font-semibold capitalize">{contenedor.estado?.replace(/_/g, ' ')}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                <Printer size={18} />
                                Imprimir
                            </button>
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Download size={18} />
                                Exportar PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-slate-700"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Facturas</h3>
                            <FileText className="text-indigo-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats?.totalFacturas || 0}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-slate-700"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Entregadas</h3>
                            <CheckCircle2 className="text-green-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-green-600">{facturasEntregadas.length}</p>
                        <p className="text-sm text-slate-500 mt-1">{stats?.porcentajeEntrega || 0}% del total</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-slate-700"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">No Entregadas</h3>
                            <AlertTriangle className="text-orange-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-orange-600">{facturasNoEntregadas.length}</p>
                        <p className="text-sm text-slate-500 mt-1">Pendientes de gestión</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-slate-700"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Dañadas</h3>
                            <XCircle className="text-red-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-red-600">{facturasDanadas.length}</p>
                        <p className="text-sm text-slate-500 mt-1">Requieren atención</p>
                    </motion.div>
                </div>
            </div>

            {/* Tabs de Facturas */}
            <div className="max-w-7xl mx-auto">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                    {/* Facturas No Entregadas */}
                    {facturasNoEntregadas.length > 0 && (
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <AlertTriangle className="text-orange-500" />
                                Facturas No Entregadas ({facturasNoEntregadas.length})
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tracking</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Destinatario</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Dirección</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Teléfono</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Última Actualización</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {facturasNoEntregadas.map((factura, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                                                    {factura.codigoTracking}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {factura.destinatario?.nombre || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {factura.destinatario?.direccion || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {factura.destinatario?.telefono || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {getEstadoBadge(factura.estadoGeneral)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {factura.fechaActualizacion || 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Facturas Dañadas */}
                    {facturasDanadas.length > 0 && (
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <XCircle className="text-red-500" />
                                Facturas Dañadas ({facturasDanadas.length})
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tracking</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Destinatario</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Motivo</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha Reporte</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Notas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {facturasDanadas.map((factura, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                                                    {factura.codigoTracking}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {factura.destinatario?.nombre || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-red-600 font-medium">
                                                    {factura.motivoDano || 'No especificado'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {factura.fechaDano || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {factura.notasDano || 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Facturas Entregadas */}
                    {facturasEntregadas.length > 0 && (
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <CheckCircle2 className="text-green-500" />
                                Facturas Entregadas ({facturasEntregadas.length})
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tracking</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Destinatario</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha Entrega</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Recibido Por</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Repartidor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {facturasEntregadas.map((factura, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                                                    {factura.codigoTracking}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {factura.destinatario?.nombre || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {factura.fechaEntrega || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {factura.recibidoPor || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {factura.repartidorNombre || 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Print Styles */}
            <style jsx>{`
                @media print {
                    .print\\:hidden {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default DetalleContenedor;

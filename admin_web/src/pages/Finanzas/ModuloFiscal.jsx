// admin_web/src/pages/Finanzas/ModuloFiscal.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    CreditCard,
    Download,
    Upload,
    Plus,
    Search,
    CheckCircle,
    AlertCircle,
    Building2
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

// Componente para la generación de nómina
const NominaPanel = () => {
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmpleados, setSelectedEmpleados] = useState([]);
    const [selectedBank, setSelectedBank] = useState('BHD'); // Estado para el banco seleccionado

    useEffect(() => {
        fetchEmpleados();
    }, []);

    const fetchEmpleados = async () => {
        setLoading(true);
        try {
            // Obtenemos repartidores (o todos los empleados si hubiese endpoint general)
            const res = await api.get('/empleados');
            if (res.data.success) {
                // Enriquecer con campo de monto temporal (salario base simulado o real)
                const emps = res.data.data.map(e => ({
                    ...e,
                    salary: e.salarioBase || 0, // Usar salario de DB si existe
                    montoAPagar: e.salarioBase || 0, // Por defecto pagar salario completo
                    banco: e.banco || 'BHD', // Default BHD
                    cuenta: e.cuentaBanco || ''
                }));
                setEmpleados(emps);
            }
        } catch (error) {
            console.error('Error cargando empleados:', error);
            toast.error('Error cargando empleados');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedEmpleados(empleados.map(e => e.id));
        } else {
            setSelectedEmpleados([]);
        }
    };

    const handleSelectOne = (id) => {
        if (selectedEmpleados.includes(id)) {
            setSelectedEmpleados(selectedEmpleados.filter(sid => sid !== id));
        } else {
            setSelectedEmpleados([...selectedEmpleados, id]);
        }
    };

    const generarArchivoBanco = async () => {
        if (selectedEmpleados.length === 0) {
            toast.warning('Seleccione al menos un empleado');
            return;
        }

        const payrollData = empleados
            .filter(e => selectedEmpleados.includes(e.id))
            .map(e => ({
                userId: e.id,
                monto: parseFloat(e.montoAPagar),
                nombre: e.nombre, // Fallback
                cuenta: e.cuenta // Explicit for visibility, backend prefers DB
            }));

        // Validar cuentas vacías
        const sinCuenta = payrollData.filter(p => !p.cuenta);
        if (sinCuenta.length > 0) {
            toast.error(`Hay ${sinCuenta.length} empleados seleccionados sin cuenta bancaria.`);
            return;
        }

        try {
            const res = await api.post('/nomina/generar-archivo-banco', {
                banco: selectedBank,
                nomina: payrollData
            });

            if (res.data.success) {
                // Descargar archivo
                const blob = new Blob([res.data.content], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = res.data.fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                toast.success(`Archivo de Nómina (${selectedBank}) generado exitosamente`);
            }
        } catch (error) {
            console.error('Error generando nómina:', error);
            toast.error(error.response?.data?.error || 'Error generando archivo');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Generar Archivo de Nómina</h3>
                    <p className="text-sm text-slate-500">Seleccione el banco, los empleados y genere el archivo.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                        <option value="BHD">Banco BHD</option>
                        <option value="POPULAR">Banco Popular</option>
                        <option value="BANRESERVAS">Banreservas</option>
                    </select>
                    <button
                        onClick={generarArchivoBanco}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Generar TXT
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
                        <tr>
                            <th className="p-4 w-10">
                                <input type="checkbox" onChange={handleSelectAll} checked={selectedEmpleados.length === empleados.length && empleados.length > 0} />
                            </th>
                            <th className="p-4">Empleado</th>
                            <th className="p-4">Cédula</th>
                            <th className="p-4">Banco</th>
                            <th className="p-4">Cuenta</th>
                            <th className="p-4 text-right">Monto a Pagar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {loading ? (
                            <tr><td colSpan="6" className="p-8 text-center">Cargando empleados...</td></tr>
                        ) : empleados.map(emp => (
                            <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td className="p-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedEmpleados.includes(emp.id)}
                                        onChange={() => handleSelectOne(emp.id)}
                                    />
                                </td>
                                <td className="p-4 font-medium text-slate-900 dark:text-white">
                                    {emp.nombre}
                                </td>
                                <td className="p-4 text-slate-500">{emp.cedula || '---'}</td>
                                <td className="p-4">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">BHD</span>
                                </td>
                                <td className={`p-4 font-mono ${!emp.cuenta ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {emp.cuenta || 'Sin Cuenta Configurada'}
                                </td>
                                <td className="p-4 text-right font-medium text-slate-900 dark:text-white">
                                    {/* Input simple para editar monto en MVP */}
                                    RD$ <input
                                        type="number"
                                        className="w-24 text-right border-b border-slate-300 bg-transparent focus:outline-none focus:border-indigo-500"
                                        value={emp.montoAPagar}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setEmpleados(empleados.map(ee => ee.id === emp.id ? { ...ee, montoAPagar: val } : ee));
                                        }}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// 📊 Componente para Reporte 606 (Gastos Fiscales)
const GastosFiscalesPanel = ({ userData }) => {
    const [gastos, setGastos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    const fetchGastos = async () => {
        if (!userData?.companyId) return;
        setLoading(true);
        try {
            // ✅ Endpoint real para 606
            const res = await api.get(`/companies/${userData.companyId}/reporte-606?year=${year}&month=${month}`);
            if (res.data.success) {
                setGastos(res.data.data);
                if (res.data.data.length === 0) toast.info('No se encontraron gastos fiscales en este periodo');
            }
        } catch (error) {
            console.error('Error cargando 606:', error);
            toast.error('Error al consultar reporte 606');
        } finally {
            setLoading(false);
        }
    };

    const descargarTXT = () => {
        if (gastos.length === 0) {
            toast.warning('No hay datos para exportar');
            return;
        }

        // Formato DGII: 606|RNC|Periodo|Cantidad... (Simplificado para MVP)
        // Header Real: 606|RNC_EMPRESA|PERIODO|CANTIDAD_REGISTROS
        const periodo = `${year}${String(month).padStart(2, '0')}`;
        const header = `606|${userData.companyConfig?.rnc || '000000000'}|${periodo}|${gastos.length}`;

        const lines = gastos.map(g => {
            // RNC|TipoId|TipoBienes|NCF|NCFMod|Fecha|FechaPago|MontoFacturado|ITBIS|ITBISRetenido|MontoTotal|TipoPago
            return `${g.rnc}|${g.tipoId}|${g.tipoBienes}|${g.ncf}|${g.ncfModificado}|${g.fechaComprobante}|${g.fechaPago}|${g.montoFacturado}|${g.itbisFacturado}|${g.itbisRetenido}|${g.montoTotal}|${g.tipoPago}`;
        });

        const content = [header, ...lines].join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DGII_606_${periodo}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Archivo 606 generado');
    };

    return (

        <div className="space-y-6">
            {/* Controles del Reporte */}
            <div className="flex flex-col md:flex-row justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Generar Reporte 606</h3>
                    <p className="text-sm text-slate-500">Seleccione el periodo para generar el reporte de compras y gastos.</p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('es', { month: 'long' })}</option>
                        ))}
                    </select>

                    <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />

                    <button
                        onClick={fetchGastos}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        <Search className="w-4 h-4" />
                        {loading ? '...' : 'Consultar'}
                    </button>

                    {gastos.length > 0 && (
                        <button
                            onClick={descargarTXT}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            TXT
                        </button>
                    )}
                </div>
            </div>

            {/* Resumen Totales */}
            {gastos.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="text-xs text-slate-500 uppercase font-semibold">Total Facturado</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                            RD$ {gastos.reduce((sum, g) => sum + parseFloat(g.montoTotal), 0).toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="text-xs text-slate-500 uppercase font-semibold">ITBIS Total</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                            RD$ {gastos.reduce((sum, g) => sum + parseFloat(g.itbisFacturado), 0).toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="text-xs text-slate-500 uppercase font-semibold">Registros</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                            {gastos.length}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
                        <tr>
                            <th className="p-4">Fecha</th>
                            <th className="p-4">NCF</th>
                            <th className="p-4">RNC</th>
                            <th className="p-4">Concepto</th>
                            <th className="p-4 text-right">Monto</th>
                            <th className="p-4 text-center">Evidencia</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {loading ? (
                            <tr><td colSpan="6" className="p-8 text-center">Cargando gastos...</td></tr>
                        ) : gastos.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-slate-500">No hay gastos fiscales registrados.</td></tr>
                        ) : gastos.map(g => (
                            <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td className="p-4 text-slate-600">
                                    {new Date(g.fecha).toLocaleDateString()}
                                </td>
                                <td className="p-4 font-mono font-medium text-slate-900 dark:text-white">
                                    {g.ncf || '---'}
                                </td>
                                <td className="p-4 text-slate-500">{g.rnc || '---'}</td>
                                <td className="p-4 text-slate-700 dark:text-slate-300">
                                    <div className="font-medium capitalize">{g.tipo}</div>
                                    <div className="text-xs text-slate-500">{g.descripcion}</div>
                                </td>
                                <td className="p-4 text-right font-medium text-slate-900 dark:text-white">
                                    RD$ {(g.monto || 0).toLocaleString()}
                                </td>
                                <td className="p-4 text-center">
                                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full font-medium">Sí</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Componente principal
const ModuloFiscal = ({ userData }) => {
    const [activeTab, setActiveTab] = useState('nomina'); // nomina, gastos

    return (
        <div className="space-y-6">
            {/* Selector de Sub-Tabs */}
            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('nomina')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'nomina'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Nomina & Pagos
                    {activeTab === 'nomina' && (
                        <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('gastos')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'gastos'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Gastos Fiscales (606)
                    {activeTab === 'gastos' && (
                        <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                    )}
                </button>
            </div>

            {/* Contenido */}
            <div className="min-h-[400px]">
                {activeTab === 'nomina' ? <NominaPanel /> : <GastosFiscalesPanel userData={userData} />}
            </div>
        </div>
    );
};

export default ModuloFiscal;

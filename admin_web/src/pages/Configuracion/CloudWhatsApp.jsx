import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../../services/api';
import { RefreshCw, QrCode, Trash2, Smartphone, Building2, ExternalLink } from 'lucide-react';

export default function CloudWhatsApp() {
    const [companies, setCompanies] = useState([]);
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estado para el modal de conexión
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [qrCode, setQrCode] = useState(null);
    const [polling, setPolling] = useState(false);

    // Configuración Evolution API
    // NO USAMOS MÁS URL DIRECTA PARA EVITAR CORS
    // TODO PASA POR NUESTRO BACKEND PROXY

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([fetchCompanies(), fetchInstances()]);
        } catch (error) {
            console.error(error);
            toast.error('Error cargando datos');
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        const res = await api.get('/companies');
        if (res.data.success) {
            setCompanies(res.data.data || []);
        }
    };

    const fetchInstances = async () => {
        try {
            // USAMOS EL PROXY: /api/whatsapp/instances
            const res = await api.get('/whatsapp/instances');
            setInstances(res.data);
        } catch (error) {
            console.error('Error fetching instances:', error);
            setInstances([]);
        }
    };

    const getInstanceName = (company) => {
        const cleanName = company.nombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
        return `company_${cleanName}_${company.id}`;
    };

    const getInstanceStatus = (company) => {
        const instanceName = getInstanceName(company);
        const instance = instances.find(i => i.name === instanceName || i.instance?.instanceName === instanceName);

        if (!instance) return 'not_created';

        // Soporte v2 (connectionStatus/state) y v1.8.2 (status)
        const isConnected =
            instance.connectionStatus === 'open' ||
            instance.instance?.state === 'open' ||
            instance.instance?.status === 'open'; // v1.8.2

        if (isConnected) return 'connected';
        return 'disconnected';
    };

    const handleCreateInstance = async (company) => {
        const instanceName = getInstanceName(company);
        setSelectedCompany(company);
        setQrCode(null);
        setPolling(true);

        const createPayload = {
            instanceName: instanceName,
            token: "secret_token_" + company.id,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
        };

        try {
            // PROXY: POST /api/whatsapp/instance
            const createRes = await api.post('/whatsapp/instance', createPayload);

            if (createRes.data.qrcode && createRes.data.qrcode.base64) {
                setQrCode(createRes.data.qrcode.base64);
                startPolling(instanceName);
            } else {
                connectInstance(instanceName);
            }

        } catch (error) {
            // Si ya existe (403), es una instancia 'zombie' (existe en Evolution pero no en nuestra DB/Frontend)
            // La eliminamos y volvemos a crear para asegurar un estado limpio.
            if (error.response && error.response.status === 403) {
                console.warn("Instancia Zombie detectada. Eliminando y recreando...", error);
                toast.loading('Reiniciando instancia antigua...');

                try {
                    // 1. Eliminar
                    await api.delete(`/whatsapp/instance/${instanceName}`);

                    // Aumentamos tiempo de espera para asegurar que Evolution libere el nombre
                    await new Promise(r => setTimeout(r, 4000));

                    // 2. Recrear
                    const retryRes = await api.post('/whatsapp/instance', createPayload);
                    toast.dismiss(); // Quitar loading

                    if (retryRes.data.qrcode && retryRes.data.qrcode.base64) {
                        setQrCode(retryRes.data.qrcode.base64);
                        startPolling(instanceName);
                        toast.success('Instancia reiniciada correctamente');
                    } else {
                        // Esperar un poco antes de pedir el QR para dar tiempo a que se genere
                        await new Promise(r => setTimeout(r, 2000));
                        connectInstance(instanceName);
                    }
                } catch (retryError) {
                    console.error("Fallo al recrear:", retryError);
                    toast.dismiss();
                    toast.error('No se pudo reiniciar la instancia. Intenta esperar unos segundos.');
                    // connectInstance(instanceName); // No forzamos conexión si falló la creación
                }
            } else {
                console.warn("Error creando, intentando conectar...", error);
                connectInstance(instanceName);
            }
        }
    };

    const connectInstance = async (instanceName, retryCount = 0) => {
        try {
            // PROXY: GET /api/whatsapp/instance/:name/connect
            const res = await api.get(`/whatsapp/instance/${instanceName}/connect`);
            const data = res.data;

            if (data.base64 || data.qrcode?.base64) {
                setQrCode(data.base64 || data.qrcode.base64);
                startPolling(instanceName);
            } else if (data.instance?.state === 'open' || data.instance?.status === 'open') {
                toast.success('¡Esta instancia ya estaba conectada!');
                closeModal();
                fetchInstances();
            } else {
                // Si no hay QR, intentamos unos cuantos reintentos antes de rendirnos
                if (retryCount < 10) { // Aumentamos a 10 intentos (30 seg aprox)
                    console.log(`No se recibió QR, reintentando (${retryCount + 1}/10)...`);
                    setTimeout(() => connectInstance(instanceName, retryCount + 1), 3000);
                } else {
                    console.warn('Respuesta connect inesperada (Final):', data);
                    toast.warning('No se pudo obtener el QR tras varios intentos. La API puede estar lenta.');
                    // Aún así iniciamos polling por si acaso aparece después
                    startPolling(instanceName);
                }
            }
        } catch (error) {
            console.error('Error conectando:', error);
            if (retryCount < 10) {
                setTimeout(() => connectInstance(instanceName, retryCount + 1), 3000);
            } else {
                toast.error('Error conectando: ' + error.message);
            }
        }
    };

    const startPolling = (instanceName) => {
        let attempts = 0;
        const maxAttempts = 40;

        const interval = setInterval(async () => {
            attempts++;
            if (attempts > maxAttempts) {
                clearInterval(interval);
                toast.error('Tiempo de espera agotado. Por favor intenta "Forzar Reinicio".');
                return;
            }

            try {
                const res = await api.get(`/whatsapp/instance/${instanceName}/connect`);
                const data = res.data;

                if (data.base64 || data.qrcode?.base64) {
                    setQrCode(data.base64 || data.qrcode.base64);
                }

                if (data.instance?.state === 'open' || data.instance?.status === 'open') {
                    clearInterval(interval);
                    toast.success(`¡${selectedCompany?.nombre} conectado exitosamente!`);
                    closeModal();
                    fetchInstances();
                }
            } catch (err) {
                console.warn('Polling error', err);
            }
        }, 3000);
    };

    const handleDeleteInstance = async (company) => {
        if (!confirm(`¿Eliminar la conexión de WhatsApp de ${company.nombre}? Dejarán de enviarse mensajes.`)) return;

        const instanceName = getInstanceName(company);
        try {
            await api.delete(`/whatsapp/instance/${instanceName}`);
            toast.success('Instancia eliminada');
            fetchInstances();
        } catch (error) {
            toast.error('Error eliminando instancia');
        }
    };

    const closeModal = () => {
        setSelectedCompany(null);
        setQrCode(null);
        setPolling(false);
    };

    // Filtrar solo planes aptos (Automatizado 75k y Smart 120k)
    // Asumimos que 'operativo' es el básico (50k)
    const eligibleCompanies = companies.filter(c => ['automatizado', 'smart'].includes(c.plan));
    const ignoredCompanies = companies.filter(c => !['automatizado', 'smart'].includes(c.plan));

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Smartphone className="text-green-600" /> Gestión Multi-Tenant WhatsApp
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Administra las conexiones de WhatsApp para clientes con Plan Automatizado (75k) o Superior.
                    </p>
                </div>
                <button onClick={loadData} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition">
                    <RefreshCw size={20} className={loading ? 'animate-spin text-indigo-600' : 'text-slate-500'} />
                </button>
            </div>

            {/* TABLA DE COMPAÑIAS ELEGIBLES */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300">
                        Compañías Habilitadas ({eligibleCompanies.length})
                    </h3>
                </div>

                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Compañía</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Plan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado WhatsApp</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {loading && (
                            <tr><td colSpan="4" className="px-6 py-10 text-center">Cargando datos...</td></tr>
                        )}
                        {!loading && eligibleCompanies.map(company => {
                            const status = getInstanceStatus(company);
                            return (
                                <tr key={company.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                <Building2 size={20} />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-slate-900 dark:text-white">{company.nombre}</div>
                                                <div className="text-sm text-slate-500">{company.adminEmail}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${company.plan === 'smart'
                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                            }`}>
                                            {company.plan.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {status === 'connected' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                <span className="w-2 h-2 mr-1 bg-green-500 rounded-full animate-pulse"></span>
                                                Conectado
                                            </span>
                                        )}
                                        {status === 'disconnected' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                <span className="w-2 h-2 mr-1 bg-yellow-500 rounded-full"></span>
                                                Requiere Escaneo
                                            </span>
                                        )}
                                        {status === 'not_created' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                                Sin Configurar
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {status === 'connected' ? (
                                            <button
                                                onClick={() => handleDeleteInstance(company)}
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                                                title="Desconectar / Eliminar"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleCreateInstance(company)}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                            >
                                                <QrCode size={16} className="mr-1.5" />
                                                {status === 'disconnected' ? 'Escanear QR' : 'Crear & Conectar'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* TABLA DE PLANES BASICOS (Informativo) */}
            {ignoredCompanies.length > 0 && (
                <div className="opacity-60">
                    <h3 className="text-sm font-medium text-slate-500 mb-2 px-2">
                        Compañías sin acceso a Automation (Plan Operativo) - {ignoredCompanies.length}
                    </h3>
                    {/* Lista simple o colapsada */}
                </div>
            )}

            {/* MODAL QR */}
            {selectedCompany && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                Conectar {selectedCompany.nombre}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <span className="text-2xl">×</span>
                            </button>
                        </div>

                        <div className="p-8 flex flex-col items-center">
                            {qrCode ? (
                                <>
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                        <img src={qrCode} alt="QR" className="relative w-64 h-64 rounded-lg bg-white p-2 shadow-sm" />
                                    </div>
                                    <p className="mt-6 text-center text-slate-600 dark:text-slate-300 text-sm">
                                        Abre WhatsApp ➝ Dispositivos Vinculados ➝ <strong>Escanear Código</strong>
                                    </p>
                                    <div className="mt-4 flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full animate-pulse">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        Esperando conexión...
                                    </div>
                                </>
                            ) : (
                                <div className="py-12 flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
                                    <p className="text-slate-500 text-sm">Conectando con Evolution API...</p>
                                    <p className="text-xs text-slate-400 mt-2">Esto puede tomar hasta 30 segundos</p>

                                    {polling && (
                                        <button
                                            onClick={() => {
                                                if (confirm('¿Reiniciar conexión? Esto borrará la sesión actual.')) {
                                                    handleCreateInstance(selectedCompany);
                                                }
                                            }}
                                            className="mt-6 text-xs text-red-500 hover:text-red-700 underline"
                                        >
                                            ¿Tarda demasiado? Forzar Reinicio
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

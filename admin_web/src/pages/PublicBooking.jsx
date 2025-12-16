import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Package, MapPin, Upload, Search, ArrowRight, Calendar, Camera } from 'lucide-react';
import axios from 'axios';

// Backend URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function PublicBooking() {
    const { companyId } = useParams();
    const navigate = useNavigate(); // ✅ Hook for navigation

    const [loadingCompany, setLoadingCompany] = useState(!!companyId); // Only load if ID exists
    const [inputCompanyId, setInputCompanyId] = useState(''); // ✅ State for manual input
    const [company, setCompany] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [trackingCode, setTrackingCode] = useState('');

    // Form State - Simplified for customer pickup requests
    const [formData, setFormData] = useState({
        remitenteNombre: '',
        remitenteTelefono: '',
        remitenteEmail: '',
        remitenteDireccion: '',
        fechaPreferida: '',
        horaPreferida: '',
        items: [],
        fotos: [],
        notasAdicionales: ''
    });

    const [newItem, setNewItem] = useState({
        descripcion: '',
        cantidad: 1,
        pesoAproximado: '',
        dimensionesAproximadas: ''
    });

    useEffect(() => {
        fetchCompany();
    }, [companyId]);

    const fetchCompany = async () => {
        try {
            if (!companyId) return;
            // In Client-SDK, accessing 'companies/{id}' usually requires Rules allowing read.
            // Assuming public read is allowed for basic info, or we use a backend endpoint.
            // Let's try direct SDK first. If it fails, we need a backend endpoint for getting public company info.
            const docRef = doc(db, 'companies', companyId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                setCompany(snap.data());
            } else {
                toast.error('Empresa no encontrada');
            }
        } catch (error) {
            console.error('Error fetching company:', error);
            // Fallback: Show generic error
        } finally {
            setLoadingCompany(false);
        }
    };

    const handleAddItem = () => {
        if (!newItem.descripcion) {
            toast.error('Ingresa una descripción del artículo');
            return;
        }
        setFormData({
            ...formData,
            items: [...formData.items, newItem]
        });
        setNewItem({
            descripcion: '',
            cantidad: 1,
            pesoAproximado: '',
            dimensionesAproximadas: ''
        });
    };

    const handleRemoveItem = (index) => {
        setFormData({
            ...formData,
            items: formData.items.filter((_, i) => i !== index)
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.items.length === 0) {
            toast.error('Agrega al menos un artículo para recolectar');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                companyId,
                remitenteNombre: formData.remitenteNombre,
                remitenteTelefono: formData.remitenteTelefono,
                remitenteEmail: formData.remitenteEmail,
                remitenteDireccion: formData.remitenteDireccion,
                fechaPreferida: formData.fechaPreferida,
                horaPreferida: formData.horaPreferida,
                items: formData.items,
                fotos: formData.fotos,
                notasAdicionales: formData.notasAdicionales,
                tipoServicio: 'standard',
                // Backend will handle destinatario, pricing, etc.
            };

            const res = await axios.post(`${API_URL}/recolecciones/public`, payload);

            if (res.data.success) {
                setSuccess(true);
                setTrackingCode(res.data.data.codigoTracking);
                toast.success(`¡Solicitud enviada! Código: ${res.data.data.codigoTracking}`);
            }
        } catch (error) {
            console.error('Submit Error:', error);
            toast.error(error.response?.data?.message || 'Error enviando solicitud');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingCompany) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin text-indigo-600" /></div>;

    // ✅ RENDER: LANDING PAGE (Si no hay companyId)
    if (!companyId && !company) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package className="w-8 h-8 text-indigo-600" />
                    </div>

                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Agendar Recolección</h1>
                    <p className="text-slate-600 mb-8">Ingresa el ID de la compañía para iniciar tu solicitud.</p>

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (inputCompanyId.trim()) navigate(`/agendar/${inputCompanyId.trim()}`);
                    }}>
                        <div className="relative mb-6">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={inputCompanyId}
                                onChange={(e) => setInputCompanyId(e.target.value)}
                                placeholder="Ej: embarques_ivan"
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50 focus:bg-white"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!inputCompanyId.trim()}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continuar <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>

                    <p className="mt-6 text-xs text-slate-400">
                        ¿No sabes el ID? Pídelo a tu proveedor de envíos.
                    </p>
                </div>
                <div className="mt-8 text-slate-400 text-sm font-medium">
                    Powered by ProLogix
                </div>
            </div>
        );
    }

    if (!company) return <div className="min-h-screen flex items-center justify-center text-red-500 font-medium">Empresa no encontrada o enlace inválido</div>;

    const primaryColor = company.colors?.primary || '#3b82f6';

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Solicitud Recibida!</h2>
                    <p className="text-gray-600 mb-6">Tu código de rastreo es:</p>
                    <div className="bg-gray-100 p-4 rounded-xl mb-6">
                        <span className="text-3xl font-mono font-bold text-gray-800 tracking-wider">{trackingCode}</span>
                    </div>
                    <p className="text-sm text-gray-500">Hemos enviado una confirmación a tu WhatsApp.</p>
                    <button onClick={() => window.location.reload()} className="mt-8 text-blue-600 hover:underline">
                        Nueva Solicitud
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50" style={{ '--primary': primaryColor }}>
            {/* Header */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
                    {company.logo && <img src={company.logo} alt={company.name} className="h-10 w-10 rounded-full object-cover" />}
                    <div>
                        <h1 className="font-bold text-xl text-gray-800">{company.name || 'Solicitud de Recolección'}</h1>
                        <p className="text-xs text-gray-500">Nueva Solicitud</p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-8">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Tus Datos */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-4">
                            <MapPin className="w-5 h-5 text-[color:var(--primary)]" />
                            Tus Datos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                required
                                placeholder="Tu Nombre Completo"
                                className="p-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:border-transparent"
                                value={formData.remitenteNombre}
                                onChange={e => setFormData({ ...formData, remitenteNombre: e.target.value })}
                            />
                            <input
                                required
                                placeholder="Teléfono / WhatsApp"
                                className="p-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:border-transparent"
                                value={formData.remitenteTelefono}
                                onChange={e => setFormData({ ...formData, remitenteTelefono: e.target.value })}
                            />
                            <input
                                type="email"
                                placeholder="Email (Opcional)"
                                className="p-3 border border-gray-300 rounded-lg w-full md:col-span-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:border-transparent"
                                value={formData.remitenteEmail}
                                onChange={e => setFormData({ ...formData, remitenteEmail: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Dirección de Recolección */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-4">
                            <MapPin className="w-5 h-5 text-[color:var(--primary)]" />
                            Dirección de Recolección
                        </h3>
                        <textarea
                            required
                            placeholder="Dirección exacta donde recogeremos (Calle, número, sector, referencias)"
                            className="p-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:border-transparent"
                            rows="3"
                            value={formData.remitenteDireccion}
                            onChange={e => setFormData({ ...formData, remitenteDireccion: e.target.value })}
                        />
                        <p className="text-xs text-gray-500 mt-2">💡 Sé lo más específico posible para que nuestro equipo te encuentre fácilmente</p>
                    </div>

                    {/* Fecha y Hora Preferida */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-4">
                            <Calendar className="w-5 h-5 text-[color:var(--primary)]" />
                            Fecha y Hora Preferida
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-600 mb-1 block">Fecha</label>
                                <input
                                    type="date"
                                    className="p-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:border-transparent"
                                    value={formData.fechaPreferida}
                                    onChange={e => setFormData({ ...formData, fechaPreferida: e.target.value })}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-600 mb-1 block">Hora</label>
                                <input
                                    type="time"
                                    className="p-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:border-transparent"
                                    value={formData.horaPreferida}
                                    onChange={e => setFormData({ ...formData, horaPreferida: e.target.value })}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">⏰ Opcional: Si no especificas, te contactaremos para coordinar</p>
                    </div>

                    {/* Artículos a Recolectar */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-4">
                            <Package className="w-5 h-5 text-[color:var(--primary)]" />
                            ¿Qué necesitas enviar?
                        </h3>

                        {/* Lista de artículos agregados */}
                        {formData.items.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {formData.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-700">
                                                {item.cantidad}x {item.descripcion}
                                            </div>
                                            {item.pesoAproximado && (
                                                <div className="text-xs text-gray-500">Peso: {item.pesoAproximado}</div>
                                            )}
                                            {item.dimensionesAproximadas && (
                                                <div className="text-xs text-gray-500">Dimensiones: {item.dimensionesAproximadas}</div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(idx)}
                                            className="text-red-500 hover:text-red-700 text-sm font-medium ml-2"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Formulario para agregar artículo */}
                        <div className="space-y-3 border-t border-gray-200 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="md:col-span-2">
                                    <label className="text-xs text-gray-500 mb-1 block">Descripción del artículo *</label>
                                    <input
                                        value={newItem.descripcion}
                                        onChange={e => setNewItem({ ...newItem, descripcion: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:border-transparent"
                                        placeholder="Ej: Caja de zapatos, Electrodoméstico, etc."
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Cantidad *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newItem.cantidad}
                                        onChange={e => setNewItem({ ...newItem, cantidad: parseInt(e.target.value) || 1 })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Peso aproximado (opcional)</label>
                                    <input
                                        value={newItem.pesoAproximado}
                                        onChange={e => setNewItem({ ...newItem, pesoAproximado: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:border-transparent"
                                        placeholder="Ej: 5kg, 10 libras"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Dimensiones aproximadas (opcional)</label>
                                    <input
                                        value={newItem.dimensionesAproximadas}
                                        onChange={e => setNewItem({ ...newItem, dimensionesAproximadas: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:border-transparent"
                                        placeholder="Ej: 30x20x15cm"
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="w-full bg-[color:var(--primary)] text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity font-medium"
                            >
                                + Agregar Artículo
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">📦 Esta información nos ayuda a estimar el espacio necesario en el vehículo</p>
                    </div>

                    {/* Fotos Opcionales */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-4">
                            <Camera className="w-5 h-5 text-[color:var(--primary)]" />
                            Fotos (Opcional)
                        </h3>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[color:var(--primary)] transition-colors cursor-pointer">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Próximamente: Sube fotos de tus artículos</p>
                            <p className="text-xs text-gray-400 mt-1">Esto ayudará a nuestros recolectores a prepararse mejor</p>
                        </div>
                    </div>

                    {/* Notas Adicionales */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-4">
                            <Upload className="w-5 h-5 text-[color:var(--primary)]" />
                            Notas Adicionales
                        </h3>
                        <textarea
                            placeholder="¿Algo más que debamos saber? (instrucciones especiales, acceso al lugar, etc.)"
                            className="p-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:border-transparent"
                            rows="3"
                            value={formData.notasAdicionales}
                            onChange={e => setFormData({ ...formData, notasAdicionales: e.target.value })}
                        />
                    </div>

                    <button
                        disabled={submitting}
                        type="submit"
                        className="w-full bg-[color:var(--primary)] text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Enviando solicitud...
                            </span>
                        ) : (
                            '📦 Solicitar Recolección'
                        )}
                    </button>
                </form>
            </div>

            <div className="text-center py-6 text-gray-400 text-sm">
                Powered by ProLogix
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../config/firebase'; // Ensure this points to your firebase config
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Package, MapPin, DollarSign, Upload, Camera } from 'lucide-react';
import axios from 'axios';

// Backend URL - Should be env var but for now hardcoded fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function PublicBooking() {
    const { companyId } = useParams();

    const [loadingCompany, setLoadingCompany] = useState(true);
    const [company, setCompany] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [trackingCode, setTrackingCode] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        remitenteNombre: '',
        remitenteTelefono: '',
        remitenteEmail: '',
        remitenteDireccion: '',
        destinatarioNombre: '',
        destinatarioTelefono: '',
        destinatarioDireccion: '',
        destinatarioSector: '',
        items: [],
        fotos: []
    });

    const [newItem, setNewItem] = useState({ descripcion: '', cantidad: 1, precio: 0 });

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
        if (!newItem.descripcion) return;
        setFormData({
            ...formData,
            items: [...formData.items, newItem]
        });
        setNewItem({ descripcion: '', cantidad: 1, precio: 0 });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.items.length === 0) {
            toast.error('Agrega al menos un artículo');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                companyId,
                ...formData,
                subtotal: 0, // Calculate on backend or simple sum
                total: 0 // Calculate logic here or backend? Let's sum it roughly for display logic
            };
            // Simple sum
            const total = formData.items.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
            payload.subtotal = total;
            payload.total = total;
            payload.tipoServicio = 'standard';

            const res = await axios.post(`${API_URL}/recolecciones/public`, payload);

            if (res.data.success) {
                setSuccess(true);
                setTrackingCode(res.data.data.codigoTracking);
                toast.success(`Solicitud enviada: ${res.data.data.codigoTracking}`);
            }
        } catch (error) {
            console.error('Submit Error:', error);
            toast.error('Error enviando solicitud');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingCompany) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin" /></div>;
    if (!company) return <div className="min-h-screen flex items-center justify-center">Empresa no válida</div>;

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

                    {/* Remitente (Tú) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-4">
                            <MapPin className="w-5 h-5 text-[color:var(--primary)]" />
                            Tus Datos (Remitente)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input required placeholder="Tu Nombre Completo" className="input-field p-3 border rounded-lg w-full"
                                value={formData.remitenteNombre} onChange={e => setFormData({ ...formData, remitenteNombre: e.target.value })} />
                            <input required placeholder="Teléfono / WhatsApp" className="input-field p-3 border rounded-lg w-full"
                                value={formData.remitenteTelefono} onChange={e => setFormData({ ...formData, remitenteTelefono: e.target.value })} />
                            <input placeholder="Email (Opcional)" className="input-field p-3 border rounded-lg w-full md:col-span-2"
                                value={formData.remitenteEmail} onChange={e => setFormData({ ...formData, remitenteEmail: e.target.value })} />
                            <textarea placeholder="Tu Dirección Exacta (Calle, Casa, Referencia)" className="input-field p-3 border rounded-lg w-full md:col-span-2" rows="2"
                                value={formData.remitenteDireccion} onChange={e => setFormData({ ...formData, remitenteDireccion: e.target.value })} />
                        </div>
                    </div>

                    {/* Destinatario */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-4">
                            <Package className="w-5 h-5 text-[color:var(--primary)]" />
                            ¿A quién envías?
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input required placeholder="Nombre Destinatario" className="input-field p-3 border rounded-lg w-full"
                                value={formData.destinatarioNombre} onChange={e => setFormData({ ...formData, destinatarioNombre: e.target.value })} />
                            <input required placeholder="Teléfono Destinatario" className="input-field p-3 border rounded-lg w-full"
                                value={formData.destinatarioTelefono} onChange={e => setFormData({ ...formData, destinatarioTelefono: e.target.value })} />
                            <textarea required placeholder="Dirección de Entrega" className="input-field p-3 border rounded-lg w-full md:col-span-2" rows="2"
                                value={formData.destinatarioDireccion} onChange={e => setFormData({ ...formData, destinatarioDireccion: e.target.value })} />
                        </div>
                    </div>

                    {/* Paquetes */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-4">
                            <Upload className="w-5 h-5 text-[color:var(--primary)]" />
                            ¿Qué envías?
                        </h3>
                        <div className="space-y-4">
                            {formData.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                    <span>{item.cantidad}x {item.descripcion}</span>
                                    <span className="font-medium">${item.precio}</span>
                                </div>
                            ))}

                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500">Descripción</label>
                                    <input value={newItem.descripcion} onChange={e => setNewItem({ ...newItem, descripcion: e.target.value })} className="w-full p-2 border rounded" placeholder="Ej: Caja de Zapatos" />
                                </div>
                                <div className="w-20">
                                    <label className="text-xs text-gray-500">Cant.</label>
                                    <input type="number" value={newItem.cantidad} onChange={e => setNewItem({ ...newItem, cantidad: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
                                </div>
                                <div className="w-24">
                                    <label className="text-xs text-gray-500">Valor $</label>
                                    <input type="number" value={newItem.precio} onChange={e => setNewItem({ ...newItem, precio: parseFloat(e.target.value) })} className="w-full p-2 border rounded" />
                                </div>
                                <button type="button" onClick={handleAddItem} className="bg-[color:var(--primary)] text-white p-2 rounded hover:opacity-90">
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    <button disabled={submitting} type="submit" className="w-full bg-[color:var(--primary)] text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
                        {submitting ? 'Enviando...' : 'Solicitar Recolección'}
                    </button>
                </form>
            </div>

            <div className="text-center py-6 text-gray-400 text-sm">
                Powered by ProLogix
            </div>
        </div>
    );
}

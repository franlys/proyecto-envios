// Página de Configuración - Datos fiscales y configuración de la empresa
import { Building, MapPin, Phone, Mail, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Configuracion = () => {
  const { userData } = useAuth();

  return (
    <div className="h-full overflow-auto bg-slate-50">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Configuración Financiera</h1>
          <p className="text-sm text-slate-600 mt-1">Gestiona la información fiscal y de facturación</p>
        </div>

        {/* Información de la Empresa */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Información de la Empresa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Building className="w-4 h-4 inline mr-2" />
                Nombre de la Empresa
              </label>
              <input
                type="text"
                defaultValue={userData?.companyName || ''}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                RNC / Tax ID
              </label>
              <input
                type="text"
                placeholder="123-4567890-1"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email de Facturación
              </label>
              <input
                type="email"
                defaultValue={userData?.email || ''}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Teléfono
              </label>
              <input
                type="tel"
                placeholder="+1 (809) 555-1234"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Dirección Fiscal
              </label>
              <textarea
                rows="3"
                placeholder="Calle, número, sector, ciudad"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              Guardar Cambios
            </button>
          </div>
        </div>

        {/* Configuración de Notificaciones */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Notificaciones Financieras</h2>
          <div className="space-y-4">
            {[
              { label: 'Alertas de transacciones grandes', desc: 'Recibir email cuando una transacción supere $5,000' },
              { label: 'Reporte mensual automático', desc: 'Enviar estado financiero cada fin de mes' },
              { label: 'Recordatorio de pagos', desc: 'Notificar 3 días antes de vencimientos' }
            ].map((item, idx) => (
              <label key={idx} className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500" />
                <div>
                  <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{item.label}</p>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracion;

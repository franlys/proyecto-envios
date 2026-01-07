// Panel de Gestión de Hardware - SuperAdmin
// Permite configurar sistemas Zebra RFID y Scanners Manuales

import { useState, useEffect } from 'react';
import {
  Settings,
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  RefreshCw,
  Monitor,
  Printer,
  ArrowRightLeft,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle,
  Building2,
  Barcode,
  Radio
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';

const HARDWARE_SYSTEMS = {
  RFID_ZEBRA: 'rfid_zebra_automatic',
  BARCODE_MANUAL: 'barcode_manual_scanner'
};

const SCANNER_BRANDS = [
  { value: 'munbyn', label: 'MUNBYN', precio: 60 },
  { value: 'netum', label: 'NETUM', precio: 35 },
  { value: 'honeywell', label: 'Honeywell', precio: 120 },
  { value: 'zebra_scanner', label: 'Zebra Scanner', precio: 200 },
  { value: 'otro', label: 'Otro', precio: 0 }
];

const PRINTER_BRANDS = [
  { value: 'munbyn', label: 'MUNBYN', precio: 140 },
  { value: 'netum', label: 'NETUM', precio: 90 },
  { value: 'zebra', label: 'Zebra', precio: 350 },
  { value: 'dymo', label: 'DYMO', precio: 250 },
  { value: 'brother', label: 'Brother', precio: 180 },
  { value: 'otro', label: 'Otro', precio: 0 }
];

const GestionHardware = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [hardwareConfig, setHardwareConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modales
  const [modalCambiarSistema, setModalCambiarSistema] = useState(false);
  const [modalAgregarScanner, setModalAgregarScanner] = useState(false);
  const [modalAgregarImpresora, setModalAgregarImpresora] = useState(false);

  // Formularios
  const [nuevoSistema, setNuevoSistema] = useState('');
  const [motivoCambio, setMotivoCambio] = useState('');
  const [formScanner, setFormScanner] = useState({
    marca: 'munbyn',
    modelo: '',
    nombre: '',
    ubicacion: '',
    conexion: 'wireless',
    precio: 60
  });
  const [formImpresora, setFormImpresora] = useState({
    marca: 'netum',
    modelo: '',
    nombre: '',
    ubicacion: '',
    conexion: 'usb',
    precio: 90
  });

  // Cargar compañías al montar
  useEffect(() => {
    cargarCompanies();
  }, []);

  // Cargar hardware config cuando se selecciona compañía
  useEffect(() => {
    if (selectedCompany) {
      cargarHardwareConfig(selectedCompany.id);
    }
  }, [selectedCompany]);

  const cargarCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.get('/companies');
      if (response.data.success) {
        setCompanies(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando compañías:', error);
      toast.error('Error al cargar compañías');
    } finally {
      setLoading(false);
    }
  };

  const cargarHardwareConfig = async (companyId) => {
    try {
      setLoading(true);
      const response = await api.get(`/hardware/${companyId}`);
      if (response.data.success) {
        setHardwareConfig(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      toast.error('Error al cargar configuración de hardware');
    } finally {
      setLoading(false);
    }
  };

  const cambiarSistema = async () => {
    if (!selectedCompany || !nuevoSistema) return;

    try {
      setLoading(true);
      const response = await api.post(`/hardware/${selectedCompany.id}/cambiar-sistema`, {
        nuevoSistema,
        motivo: motivoCambio
      });

      if (response.data.success) {
        toast.success(response.data.message);
        await cargarHardwareConfig(selectedCompany.id);
        setModalCambiarSistema(false);
        setNuevoSistema('');
        setMotivoCambio('');
      }
    } catch (error) {
      console.error('Error cambiando sistema:', error);
      toast.error(error.response?.data?.message || 'Error al cambiar sistema');
    } finally {
      setLoading(false);
    }
  };

  const agregarScanner = async () => {
    if (!selectedCompany || !formScanner.nombre) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(`/hardware/${selectedCompany.id}/scanners`, formScanner);

      if (response.data.success) {
        toast.success('Scanner agregado exitosamente');
        await cargarHardwareConfig(selectedCompany.id);
        setModalAgregarScanner(false);
        setFormScanner({
          marca: 'munbyn',
          modelo: '',
          nombre: '',
          ubicacion: '',
          conexion: 'wireless',
          precio: 60
        });
      }
    } catch (error) {
      console.error('Error agregando scanner:', error);
      toast.error(error.response?.data?.message || 'Error al agregar scanner');
    } finally {
      setLoading(false);
    }
  };

  const agregarImpresora = async () => {
    if (!selectedCompany || !formImpresora.nombre) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(`/hardware/${selectedCompany.id}/impresoras`, formImpresora);

      if (response.data.success) {
        toast.success('Impresora agregada exitosamente');
        await cargarHardwareConfig(selectedCompany.id);
        setModalAgregarImpresora(false);
        setFormImpresora({
          marca: 'netum',
          modelo: '',
          nombre: '',
          ubicacion: '',
          conexion: 'usb',
          precio: 90
        });
      }
    } catch (error) {
      console.error('Error agregando impresora:', error);
      toast.error(error.response?.data?.message || 'Error al agregar impresora');
    } finally {
      setLoading(false);
    }
  };

  const eliminarDispositivo = async (dispositivoId, tipo) => {
    if (!confirm(`¿Eliminar este ${tipo}?`)) return;

    try {
      setLoading(true);
      const response = await api.delete(
        `/hardware/${selectedCompany.id}/dispositivos/${dispositivoId}?tipo=${tipo}`
      );

      if (response.data.success) {
        toast.success(`${tipo === 'scanner' ? 'Scanner' : 'Impresora'} eliminado`);
        await cargarHardwareConfig(selectedCompany.id);
      }
    } catch (error) {
      console.error('Error eliminando dispositivo:', error);
      toast.error('Error al eliminar dispositivo');
    } finally {
      setLoading(false);
    }
  };

  const toggleSistema = async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);
      const nuevoEstado = !hardwareConfig.enabled;
      const response = await api.patch(`/hardware/${selectedCompany.id}/toggle`, {
        enabled: nuevoEstado
      });

      if (response.data.success) {
        toast.success(nuevoEstado ? 'Sistema activado' : 'Sistema desactivado');
        await cargarHardwareConfig(selectedCompany.id);
      }
    } catch (error) {
      console.error('Error cambiando estado:', error);
      toast.error('Error al cambiar estado del sistema');
    } finally {
      setLoading(false);
    }
  };

  const sistemaActualNombre = hardwareConfig?.sistemaActivo === HARDWARE_SYSTEMS.RFID_ZEBRA
    ? 'Zebra RFID Automático'
    : 'Scanners Manuales';

  return (
    <div className="h-full overflow-auto bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Settings className="text-indigo-600" size={32} />
              Gestión de Hardware
            </h1>
            <p className="text-slate-600 mt-1">
              Configura sistemas Zebra RFID y Scanners Manuales
            </p>
          </div>

          {selectedCompany && hardwareConfig && (
            <button
              onClick={toggleSistema}
              className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
                hardwareConfig.enabled
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-600 text-white hover:bg-slate-700'
              }`}
            >
              {hardwareConfig.enabled ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              {hardwareConfig.enabled ? 'Sistema Activo' : 'Sistema Inactivo'}
            </button>
          )}
        </div>

        {/* Selector de Compañía */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Seleccionar Compañía
          </label>
          <select
            value={selectedCompany?.id || ''}
            onChange={(e) => {
              const company = companies.find(c => c.id === e.target.value);
              setSelectedCompany(company);
            }}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">-- Selecciona una compañía --</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Configuración de Hardware */}
        {selectedCompany && hardwareConfig && (
          <div className="space-y-6">
            {/* Sistema Activo */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  {hardwareConfig.sistemaActivo === HARDWARE_SYSTEMS.RFID_ZEBRA ? (
                    <Radio className="text-purple-600" size={24} />
                  ) : (
                    <Barcode className="text-indigo-600" size={24} />
                  )}
                  Sistema Activo: {sistemaActualNombre}
                </h2>
                <button
                  onClick={() => setModalCambiarSistema(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <ArrowRightLeft size={18} />
                  Cambiar Sistema
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600">Tipo</p>
                  <p className="text-lg font-bold text-slate-900">{sistemaActualNombre}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600">Estado</p>
                  <p className={`text-lg font-bold ${hardwareConfig.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {hardwareConfig.enabled ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600">Inversión Total</p>
                  <p className="text-lg font-bold text-indigo-600">
                    ${hardwareConfig.barcodeManual?.estadisticasGenerales?.costoTotalInversion || 0} USD
                  </p>
                </div>
              </div>
            </div>

            {/* Sistema Manual de Códigos de Barras */}
            {hardwareConfig.sistemaActivo === HARDWARE_SYSTEMS.BARCODE_MANUAL && (
              <div className="space-y-6">
                {/* Scanners */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Monitor className="text-indigo-600" size={20} />
                      Scanners Manuales ({hardwareConfig.barcodeManual?.scanners?.length || 0})
                    </h3>
                    <button
                      onClick={() => setModalAgregarScanner(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Agregar Scanner
                    </button>
                  </div>

                  {hardwareConfig.barcodeManual?.scanners?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {hardwareConfig.barcodeManual.scanners.map(scanner => (
                        <div key={scanner.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900">{scanner.nombre}</h4>
                              <p className="text-sm text-slate-600">{scanner.marca.toUpperCase()} - {scanner.modelo}</p>
                              <p className="text-xs text-slate-500 mt-1">{scanner.ubicacion}</p>
                            </div>
                            <button
                              onClick={() => eliminarDispositivo(scanner.id, 'scanner')}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              scanner.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {scanner.activo ? 'Activo' : 'Inactivo'}
                            </span>
                            <span className="text-indigo-600 font-bold">${scanner.precio} USD</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Monitor className="mx-auto mb-2 text-slate-400" size={48} />
                      <p>No hay scanners configurados</p>
                    </div>
                  )}
                </div>

                {/* Impresoras */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Printer className="text-indigo-600" size={20} />
                      Impresoras Térmicas ({hardwareConfig.barcodeManual?.impresoras?.length || 0})
                    </h3>
                    <button
                      onClick={() => setModalAgregarImpresora(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Agregar Impresora
                    </button>
                  </div>

                  {hardwareConfig.barcodeManual?.impresoras?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {hardwareConfig.barcodeManual.impresoras.map(impresora => (
                        <div key={impresora.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900">{impresora.nombre}</h4>
                              <p className="text-sm text-slate-600">{impresora.marca.toUpperCase()} - {impresora.modelo}</p>
                              <p className="text-xs text-slate-500 mt-1">{impresora.ubicacion}</p>
                            </div>
                            <button
                              onClick={() => eliminarDispositivo(impresora.id, 'impresora')}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              impresora.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {impresora.activo ? 'Activa' : 'Inactiva'}
                            </span>
                            <span className="text-indigo-600 font-bold">${impresora.precio} USD</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Printer className="mx-auto mb-2 text-slate-400" size={48} />
                      <p>No hay impresoras configuradas</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sistema Zebra RFID */}
            {hardwareConfig.sistemaActivo === HARDWARE_SYSTEMS.RFID_ZEBRA && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="text-center py-12">
                  <Radio className="mx-auto mb-4 text-purple-600" size={64} />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Sistema Zebra RFID Automático
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Configuración avanzada de dispositivos Zebra RFID
                  </p>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-sm text-indigo-800">
                      La configuración detallada de dispositivos Zebra RFID estará disponible próximamente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Cambiar Sistema */}
        {modalCambiarSistema && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ArrowRightLeft className="text-indigo-600" />
                Cambiar Sistema de Hardware
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nuevo Sistema
                  </label>
                  <select
                    value={nuevoSistema}
                    onChange={(e) => setNuevoSistema(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecciona...</option>
                    <option value={HARDWARE_SYSTEMS.BARCODE_MANUAL}>Scanners Manuales (Económico)</option>
                    <option value={HARDWARE_SYSTEMS.RFID_ZEBRA}>Zebra RFID (Premium)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Motivo del Cambio
                  </label>
                  <textarea
                    value={motivoCambio}
                    onChange={(e) => setMotivoCambio(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: Cliente adquirió equipos Zebra Premium"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={cambiarSistema}
                  disabled={loading || !nuevoSistema}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {loading ? 'Cambiando...' : 'Cambiar Sistema'}
                </button>
                <button
                  onClick={() => {
                    setModalCambiarSistema(false);
                    setNuevoSistema('');
                    setMotivoCambio('');
                  }}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Agregar Scanner */}
        {modalAgregarScanner && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Monitor className="text-indigo-600" />
                Agregar Scanner Manual
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Marca *
                  </label>
                  <select
                    value={formScanner.marca}
                    onChange={(e) => {
                      const marca = e.target.value;
                      const brandInfo = SCANNER_BRANDS.find(b => b.value === marca);
                      setFormScanner({
                        ...formScanner,
                        marca,
                        precio: brandInfo?.precio || 0
                      });
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {SCANNER_BRANDS.map(brand => (
                      <option key={brand.value} value={brand.value}>
                        {brand.label} (${brand.precio} USD)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Modelo
                  </label>
                  <input
                    type="text"
                    value={formScanner.modelo}
                    onChange={(e) => setFormScanner({ ...formScanner, modelo: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: 2D Wireless Scanner"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formScanner.nombre}
                    onChange={(e) => setFormScanner({ ...formScanner, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: Scanner Almacén USA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={formScanner.ubicacion}
                    onChange={(e) => setFormScanner({ ...formScanner, ubicacion: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: almacen_usa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de Conexión
                  </label>
                  <select
                    value={formScanner.conexion}
                    onChange={(e) => setFormScanner({ ...formScanner, conexion: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="wireless">Inalámbrico</option>
                    <option value="usb">USB</option>
                    <option value="bluetooth">Bluetooth</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Precio (USD)
                  </label>
                  <input
                    type="number"
                    value={formScanner.precio}
                    onChange={(e) => setFormScanner({ ...formScanner, precio: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={agregarScanner}
                  disabled={loading || !formScanner.nombre}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {loading ? 'Agregando...' : 'Agregar Scanner'}
                </button>
                <button
                  onClick={() => setModalAgregarScanner(false)}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Agregar Impresora */}
        {modalAgregarImpresora && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Printer className="text-indigo-600" />
                Agregar Impresora Térmica
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Marca *
                  </label>
                  <select
                    value={formImpresora.marca}
                    onChange={(e) => {
                      const marca = e.target.value;
                      const brandInfo = PRINTER_BRANDS.find(b => b.value === marca);
                      setFormImpresora({
                        ...formImpresora,
                        marca,
                        precio: brandInfo?.precio || 0
                      });
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {PRINTER_BRANDS.map(brand => (
                      <option key={brand.value} value={brand.value}>
                        {brand.label} (${brand.precio} USD)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Modelo
                  </label>
                  <input
                    type="text"
                    value={formImpresora.modelo}
                    onChange={(e) => setFormImpresora({ ...formImpresora, modelo: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: NT-P31"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formImpresora.nombre}
                    onChange={(e) => setFormImpresora({ ...formImpresora, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: Impresora Etiquetas USA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={formImpresora.ubicacion}
                    onChange={(e) => setFormImpresora({ ...formImpresora, ubicacion: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: almacen_usa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de Conexión
                  </label>
                  <select
                    value={formImpresora.conexion}
                    onChange={(e) => setFormImpresora({ ...formImpresora, conexion: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="usb">USB</option>
                    <option value="bluetooth">Bluetooth</option>
                    <option value="wifi">WiFi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Precio (USD)
                  </label>
                  <input
                    type="number"
                    value={formImpresora.precio}
                    onChange={(e) => setFormImpresora({ ...formImpresora, precio: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={agregarImpresora}
                  disabled={loading || !formImpresora.nombre}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {loading ? 'Agregando...' : 'Agregar Impresora'}
                </button>
                <button
                  onClick={() => setModalAgregarImpresora(false)}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionHardware;

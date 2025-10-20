import { useState } from 'react';
import { HelpCircle, Book, MessageCircle, Mail, Phone, Video, FileText, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Ayuda = () => {
  const { userData } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const faqCategories = [
    { id: 'all', name: 'Todas', icon: HelpCircle },
    { id: 'embarques', name: 'Embarques', icon: FileText },
    { id: 'rutas', name: 'Rutas', icon: MessageCircle },
    { id: 'facturas', name: 'Facturas', icon: FileText },
    { id: 'cuenta', name: 'Mi Cuenta', icon: MessageCircle }
  ];

  const faqs = [
    {
      category: 'embarques',
      question: '¿Cómo crear un nuevo embarque?',
      answer: 'Para crear un embarque, ve a la sección "Embarques" y haz clic en "Nuevo Embarque". Completa los campos requeridos como código de tracking, origen, destino y fechas.'
    },
    {
      category: 'embarques',
      question: '¿Cómo importar facturas desde un Excel?',
      answer: 'En la página de embarques, selecciona un embarque y haz clic en "Importar Facturas". Sube un archivo Excel con las columnas: cliente, dirección, teléfono, monto, etc.'
    },
    {
      category: 'rutas',
      question: '¿Cómo asignar facturas a una ruta?',
      answer: 'Ve a "Rutas" > "Nueva Ruta". Selecciona un embarque, elige las facturas que deseas incluir, asigna un repartidor y establece el monto para gastos.'
    },
    {
      category: 'rutas',
      question: '¿Cómo cerrar una ruta completada?',
      answer: 'En la lista de rutas activas, haz clic en "Cerrar Ruta". Verás un resumen del balance y confirmación antes de cerrarla definitivamente.'
    },
    {
      category: 'facturas',
      question: '¿Qué hacer con facturas no entregadas?',
      answer: 'Las facturas no entregadas aparecen en "Facturas No Entregadas". Desde ahí puedes reasignarlas a otra ruta o contactar nuevamente al cliente.'
    },
    {
      category: 'facturas',
      question: '¿Cómo confirmar una factura antes de crear rutas?',
      answer: 'Usa el "Panel de Secretarias" para verificar datos de contacto, confirmar direcciones y marcar facturas como listas para entrega.'
    },
    {
      category: 'cuenta',
      question: '¿Cómo cambiar mi contraseña?',
      answer: 'Ve a "Configuración" en el menú lateral, luego selecciona "Seguridad" y haz clic en "Cambiar Contraseña".'
    },
    {
      category: 'cuenta',
      question: '¿Qué permisos tiene mi rol?',
      answer: 'Los permisos varían según tu rol: Admin tiene acceso completo, Secretarias manejan confirmaciones, Almacén gestiona embarques, y Repartidores ven sus rutas.'
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Centro de Ayuda</h1>
        <p className="text-gray-600 dark:text-gray-400">Encuentra respuestas y soporte para el sistema</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar en el centro de ayuda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition text-left">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full inline-block mb-3">
            <MessageCircle className="text-blue-600 dark:text-blue-300" size={24} />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Chat en Vivo</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Chatea con nuestro equipo de soporte</p>
          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Iniciar Chat →</span>
        </button>

        <button className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition text-left">
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full inline-block mb-3">
            <Mail className="text-green-600 dark:text-green-300" size={24} />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Email</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">soporte@sistemaenvios.com</p>
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">Enviar Email →</span>
        </button>

        <button className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition text-left">
          <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full inline-block mb-3">
            <Phone className="text-purple-600 dark:text-purple-300" size={24} />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Teléfono</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">+1 (809) 555-0123</p>
          <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">Llamar →</span>
        </button>

        <button className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition text-left">
          <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full inline-block mb-3">
            <Video className="text-orange-600 dark:text-orange-300" size={24} />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Videoconferencia</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Agenda una sesión con soporte</p>
          <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">Agendar →</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAQ Section */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Preguntas Frecuentes
            </h2>

            {/* Category Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {faqCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Icon size={16} />
                    {category.name}
                  </button>
                );
              })}
            </div>

            {/* FAQ List */}
            <div className="space-y-4">
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-8">
                  <HelpCircle className="mx-auto text-gray-400 dark:text-gray-600 mb-3" size={48} />
                  <p className="text-gray-500 dark:text-gray-400">No se encontraron resultados</p>
                </div>
              ) : (
                filteredFaqs.map((faq, index) => (
                  <details
                    key={index}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                  >
                    <summary className="font-medium text-gray-900 dark:text-white">
                      {faq.question}
                    </summary>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  </details>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Resources Sidebar */}
        <div className="space-y-6">
          {/* Quick Resources */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recursos Útiles
            </h3>
            <div className="space-y-3">
              <a href="#" className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Book className="text-blue-600 dark:text-blue-300" size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Documentación Completa</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Guías detalladas de uso del sistema</p>
                </div>
              </a>

              <a href="#" className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Video className="text-blue-600 dark:text-blue-300" size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Video Tutoriales</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Aprende con videos paso a paso</p>
                </div>
              </a>

              <a href="#" className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <FileText className="text-blue-600 dark:text-blue-300" size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Notas de Versión</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Últimas actualizaciones y mejoras</p>
                </div>
              </a>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">Tu Cuenta</h3>
            <div className="space-y-2 text-sm">
              <p className="text-blue-800 dark:text-blue-300">
                <strong>Usuario:</strong> {userData?.nombre}
              </p>
              <p className="text-blue-800 dark:text-blue-300">
                <strong>Rol:</strong> {userData?.rol}
              </p>
              <p className="text-blue-800 dark:text-blue-300">
                <strong>Email:</strong> {userData?.email}
              </p>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-200">Sistema Operativo</h3>
            </div>
            <p className="text-sm text-green-800 dark:text-green-300">
              Todos los servicios funcionando correctamente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ayuda;
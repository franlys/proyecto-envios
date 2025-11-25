import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { Loader2, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Simular splash screen de carga inicial
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Iniciar animación de salida
      setIsExiting(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 600); // Esperar a que termine la animación
    } catch (error) {
      console.error('Error en login:', error);
      setError('Email o contraseña incorrectos');
      setLoading(false);
    }
  };

  // Splash Screen Component
  if (showSplash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center animate-pulse">
          <div className="bg-white w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl ring-4 ring-white/20 p-5">
            <img
              src={logo}
              alt="ProLogix Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            ProLogix
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center transition-opacity duration-700 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      {/* Overlay oscuro con blur */}
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"></div>

      <div className={`relative bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 transform transition-all duration-500 ${isExiting ? 'scale-95 opacity-0 translate-y-4' : 'animate-fade-in-up'}`}>
        <div className="text-center mb-8">
          <div className="bg-white w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl ring-4 ring-white/20 p-4">
            <img
              src={logo}
              alt="ProLogix Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ProLogix</h1>
          <p className="text-gray-300 mt-2">Panel de Administración</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-white p-3 rounded-lg mb-6 flex items-center gap-2 animate-pulse">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-white/20"
              placeholder="nombre@empresa.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-white/20"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Iniciando...</span>
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">Credenciales de prueba:</p>
          <p className="font-mono text-xs text-blue-300 mt-1 bg-blue-900/30 inline-block px-3 py-1 rounded-full border border-blue-500/20">
            admin@envios.com / Admin123456
          </p>
        </div>
      </div >
    </div >
  );
};

export default Login;
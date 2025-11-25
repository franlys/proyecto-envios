import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error en login:', error);
      setError('Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center">
      {/* Overlay oscuro con blur */}
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"></div>

      <div className="relative bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-white/10">
            <img
              src={logo}
              alt="ProLogix Logo"
              className="h-16 w-auto drop-shadow-md"
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ProLogix</h1>
          <p className="text-gray-200 mt-2 font-light">Panel de Administración</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-200 ml-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all backdrop-blur-sm"
              placeholder="admin@envios.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-200 ml-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all backdrop-blur-sm"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-3 rounded-xl text-sm flex items-center gap-2 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transform transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Iniciando...
              </span>
            ) : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">Credenciales de prueba:</p>
          <p className="font-mono text-xs text-blue-300 mt-1 bg-blue-900/30 inline-block px-3 py-1 rounded-full border border-blue-500/20">
            admin@envios.com / Admin123456
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
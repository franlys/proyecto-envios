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
  const [animationStep, setAnimationStep] = useState(0); // 0: Splash, 1: Form, 2: Collapse, 3: Drop, 4: Depart
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Crane Animation Sequence
    const timer = setTimeout(() => {
      setShowSplash(false);
      setAnimationStep(1); // Show Form
    }, 4000); // 4s for full crane cycle
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);

      // Start Exit Sequence
      setAnimationStep(2); // Collapse to Box

      setTimeout(() => {
        setAnimationStep(3); // Drop to Ship
      }, 800);

      setTimeout(() => {
        setAnimationStep(4); // Ship Departs

        // Navigate after ship leaves
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }, 1400);

    } catch (error) {
      console.error('Error en login:', error);
      setError('Email o contraseña incorrectos');
      setLoading(false);
    }
  };

  // --- Render Helpers ---

  // Crane Splash Screen
  if (showSplash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 overflow-hidden relative">
        {/* Crane Mechanism */}
        <div className="absolute top-[-200px] left-1/2 w-1 h-[200px] bg-gray-600 origin-top animate-cable-drop">
          <div className="absolute bottom-[-40px] left-[-18px] w-10 h-10 border-4 border-gray-400 border-t-0 rounded-b-[20px] -translate-x-[2px]"></div>
        </div>

        {/* The Box (Logo) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)] animate-box-lift z-10">
          <img src={logo} className="w-12 h-12 object-contain" alt="ProLogix" />
        </div>

        {/* Title */}
        <div className="absolute bottom-[20%] w-full text-center animate-pulse">
          <span className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            ProLogix
          </span>
        </div>
      </div>
    );
  }

  // Main Login & Exit Scene
  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center overflow-hidden relative">
      {/* Overlay */}
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm z-0"></div>

      {/* Water (Always present but low z-index) */}
      <div className="absolute bottom-0 w-full h-[140px] bg-blue-900/90 z-30 overflow-hidden">
        <div className="absolute -top-5 w-[200%] h-10 bg-[url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 120\' preserveAspectRatio=\'none\'%3E%3Cpath d=\'M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z\' fill=\'%231E3A8A\' opacity=\'0.5\'/%3E%3C/svg%3E')] bg-[length:50%_100%] animate-wave"></div>
      </div>

      {/* Ship Container */}
      <div
        className={`absolute bottom-[120px] w-[260px] h-[100px] z-10 transition-transform duration-[2500ms] ease-in ${animationStep >= 4 ? 'translate-x-[150vw]' :
            animationStep >= 1 ? 'translate-x-0 left-[calc(50%-130px)]' : '-translate-x-[400px]'
          }`}
      >
        <div className="absolute -top-[50px] right-[40px] w-[70px] h-[50px] bg-gray-400 rounded-t-[5px] border-2 border-gray-600">
          <div className="absolute top-[10px] left-[10px] w-5 h-5 bg-blue-300 rounded-[2px]"></div>
        </div>
        <div className="w-full h-[70px] bg-gray-700 rounded-bl-[20px] rounded-br-[50px] relative shadow-inner">
          <div className="absolute top-[10px] w-full h-[10px] bg-red-500"></div>
        </div>
      </div>

      {/* Login Card / Box */}
      <div
        className={`relative bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 z-20 flex flex-col items-center transition-all duration-500
          ${animationStep === 1 ? 'animate-fade-in-up' : ''}
          ${animationStep === 2 ? 'animate-collapse' : ''}
          ${animationStep === 3 ? 'w-[60px] h-[60px] min-h-[60px] p-0 rounded-lg bg-white border-2 border-blue-500 animate-[dropToShip_0.6s_cubic-bezier(0.34,1.56,0.64,1)_forwards]' : ''}
          ${animationStep >= 4 ? 'w-[60px] h-[60px] min-h-[60px] p-0 rounded-lg bg-white border-2 border-blue-500 translate-x-[150vw] translate-y-[200px] transition-transform duration-[2500ms] ease-in' : ''}
        `}
      >
        {/* Content - Hides when collapsing */}
        <div className={`w-full transition-opacity duration-200 ${animationStep >= 2 ? 'opacity-0 hidden' : 'opacity-100'}`}>
          <div className="text-center mb-8">
            <div className="bg-white w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl ring-4 ring-white/20 p-4">
              <img src={logo} alt="ProLogix Logo" className="w-full h-full object-contain" />
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
              <label className="block text-sm font-medium text-gray-200 mb-2">Correo Electrónico</label>
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
              <label className="block text-sm font-medium text-gray-200 mb-2">Contraseña</label>
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
              ) : 'Iniciar Sesión'}
            </button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-400">Credenciales de prueba:</p>
              <p className="font-mono text-xs text-blue-300 mt-1 bg-blue-900/30 inline-block px-3 py-1 rounded-full border border-blue-500/20">
                admin@envios.com / Admin123456
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { Loader2, AlertCircle, Package } from 'lucide-react';

const Login = ({ onLoginStart, onExitComplete }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Animation States: 
  // 0: Ship Entering (0-2s)
  // 1: Box Float Up (2-3.2s)
  // 2: Expand to Form (3.2s+)
  // 3: Form Active
  // 4: Collapsing
  // 5: Dropping to Ship
  // 6: Ship Departing
  const [animState, setAnimState] = useState(0);

  const { login } = useAuth();
  // const navigate = useNavigate(); // Navigation is now handled by AppContent via onExitComplete

  useEffect(() => {
    // Entry Sequence
    const t1 = setTimeout(() => setAnimState(1), 2000); // Ship Arrived, Box Floats Up
    const t2 = setTimeout(() => setAnimState(2), 3200); // Box at Center, Expand
    const t3 = setTimeout(() => setAnimState(3), 4000); // Form Active

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (onLoginStart) onLoginStart(); // Notify App to keep Login mounted
      await login(email, password);

      // Exit Sequence
      setAnimState(4); // Collapse

      setTimeout(() => setAnimState(5), 800); // Drop

      setTimeout(() => {
        setAnimState(6); // Ship Depart
        setTimeout(() => {
          if (onExitComplete) onExitComplete(); // Notify App to switch to Layout
        }, 2000);
      }, 1000);

    } catch (error) {
      console.error('Error en login:', error);
      setError('Email o contraseña incorrectos');
      setLoading(false);
      // If login failed, we might want to reset isExitingLogin in App, but we don't have a callback for failure here.
      // However, since userData won't be set, App will continue to render Login anyway.
      // Ideally we should have onLoginFailure to be clean, but it works as is because !userData keeps Login mounted.
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900 overflow-hidden relative">

      {/* --- Environment --- */}
      <div className="absolute bottom-0 w-full h-[140px] bg-blue-900/80 z-30 overflow-hidden border-t border-blue-500/30 backdrop-blur-sm">
        <div className="absolute -top-5 w-[200%] h-10 bg-[url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 120\' preserveAspectRatio=\'none\'%3E%3Cpath d=\'M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z\' fill=\'%2360A5FA\' opacity=\'0.3\'/%3E%3C/svg%3E')] bg-[length:50%_100%] animate-wave"></div>
      </div>

      {/* Ship Container */}
      <div
        className={`absolute bottom-[100px] w-[260px] h-[100px] z-20 transition-transform duration-[2500ms] ease-in-out
          ${animState === 0 ? 'animate-ship-enter' : ''}
          ${animState >= 1 && animState < 6 ? 'translate-x-0 left-[calc(50%-130px)]' : ''}
          ${animState === 6 ? 'animate-ship-depart left-[calc(50%-130px)]' : ''}
        `}
      >
        <div className="absolute -top-[50px] right-[40px] w-[70px] h-[50px] bg-gray-700 rounded-t-[5px] border-2 border-gray-600">
          <div className="absolute top-[10px] left-[10px] w-5 h-5 bg-blue-400/50 rounded-[2px] animate-pulse"></div>
        </div>
        <div className="w-full h-[70px] bg-gray-800 rounded-bl-[20px] rounded-br-[50px] relative shadow-lg border-t border-gray-600">
          <div className="absolute top-[15px] w-full h-[8px] bg-red-600/80"></div>
          <div className="absolute bottom-[10px] left-[20px] text-gray-500 text-[10px] font-mono tracking-widest">PROLOGIX-01</div>
        </div>

        {/* Cargo Box on Ship (Visible only before float up and after drop) */}
        <div className={`absolute -top-[60px] left-[100px] w-[60px] h-[60px] bg-white border-2 border-blue-500 rounded-lg flex items-center justify-center shadow-md transition-opacity duration-0
          ${(animState < 1 || animState >= 6) ? 'opacity-100' : 'opacity-0'}
        `}>
          <Package className="text-blue-600" size={32} />
        </div>
      </div>

      {/* Main Container (The Active Box/Form) */}
      <div
        className={`relative z-50 flex flex-col items-center justify-center transition-all overflow-hidden
          ${animState < 1 ? 'opacity-0 scale-0' : ''} 
          ${animState === 1 ? 'w-[60px] h-[60px] bg-white border-2 border-blue-500 rounded-lg animate-box-float-up' : ''}
          ${animState === 2 ? 'animate-expand-form' : ''}
          ${animState === 3 ? 'w-full max-w-md h-[500px] bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8' : ''}
          ${animState === 4 ? 'animate-collapse' : ''}
          ${animState === 5 ? 'w-[60px] h-[60px] bg-white border-2 border-blue-500 rounded-lg animate-box-drop' : ''}
          ${animState === 6 ? 'opacity-0' : ''}
        `}
      >
        {/* Vector Icon (Visible in Box/Animation states) */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${(animState === 1 || animState === 2 || animState >= 4) ? 'opacity-100' : 'opacity-0'
          }`}>
          <Package className="text-blue-600" size={32} />
        </div>

        {/* Form Content (Visible in Form state) */}
        <div className={`w-full h-full flex flex-col justify-center transition-opacity duration-700 delay-200 ${animState === 3 ? 'opacity-100' : 'opacity-0 hidden'}`}>
          <div className="text-center mb-8">
            <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-white/10 p-4">
              <img src={logo} alt="ProLogix" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">ProLogix</h1>
            <p className="text-blue-200/80 mt-2 text-sm font-light tracking-wide">SISTEMA DE GESTIÓN LOGÍSTICA</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-white p-3 rounded-lg mb-6 flex items-center gap-2 animate-pulse">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-blue-200 mb-1 uppercase tracking-wider">Correo Corporativo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-blue-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-gray-900/70"
                placeholder="usuario@prologix.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-200 mb-1 uppercase tracking-wider">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-blue-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-gray-900/70"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-900/50 transform transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Autenticando...</span>
                </>
              ) : 'Acceder al Sistema'}
            </button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-8 text-center opacity-60 hover:opacity-100 transition-opacity">
              <p className="font-mono text-[10px] text-blue-300 bg-blue-950/50 inline-block px-3 py-1 rounded-full border border-blue-500/20">
                DEV: admin@envios.com / Admin123456
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
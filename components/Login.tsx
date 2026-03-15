import React, { useState, useEffect } from 'react';
import {
  Activity, ArrowRight, Lock, ShieldCheck,
  User, Smartphone, Users, Sparkles, Loader2
} from 'lucide-react';
import InstallationGuide from './InstallationGuide';

interface LoginProps {
  onLogin: (identifier: string, password?: string, roleType?: 'staff' | 'client') => Promise<void>;
  onRegisterClick?: () => void;
  error?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegisterClick, error: externalError }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Dynamic UI state
  const isEmail = identifier.includes('@');

  useEffect(() => {
    if (externalError) setError(externalError);
  }, [externalError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Predict role type for the existing handleLogin logic
      const predictedRole = isEmail ? 'staff' : 'client';
      await onLogin(identifier, password, predictedRole);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Brand Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-blue-600/20 backdrop-blur-xl rounded-[2.5rem] border border-blue-500/30 mb-6 shadow-2xl w-28 h-28">
            <span className="text-4xl font-black text-blue-400 tracking-tight">PT</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            Padron Trainer
          </h1>
          <p className="text-slate-400 font-medium">Plataforma de Entrenamiento y Coaching</p>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-8 md:p-10 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white text-center">Bienvenido de nuevo</h2>
            <p className="text-slate-400 text-sm text-center mt-1">Ingresa tus datos para acceder a tu panel</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-2xl flex items-start gap-3 animate-in zoom-in-95">
              <Activity className="w-5 h-5 shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Identificador de Acceso
              </label>
              <div className="relative group">
                <input
                  type="text"
                  required
                  className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none font-bold placeholder:text-slate-600"
                  placeholder="Email o Teléfono"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
                <User className="absolute left-4 top-4 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
            </div>

            {isEmail && (
              <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Contraseña
                </label>
                <div className="relative group">
                  <input
                    type="password"
                    required
                    className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none font-bold placeholder:text-slate-600"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <div className="flex justify-end px-1">
                  <a href="/#/forgot-password" title="Forgot Password" className="text-xs text-blue-400 hover:text-blue-300 font-bold">
                    ¿Has olvidado la contraseña?
                  </a>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-4 shadow-xl shadow-blue-600/20 active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Acceder al Portal
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

          </form>

          {/* Footer Actions */}
          <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
            {!isEmail && (
              <p className="text-xs text-slate-500 text-center italic">
                * Si eres alumno/a y usas teléfono, recibirás acceso directo tras la validación.
              </p>
            )}

            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="w-full text-blue-400/80 hover:text-blue-400 font-bold transition-all text-xs flex items-center justify-center gap-2 group border border-white/5 py-3 rounded-2xl hover:bg-white/5"
            >
              <Smartphone className="w-4 h-4" />
              Instalar como Aplicación (App)
            </button>

            {onRegisterClick && (
              <button
                type="button"
                onClick={onRegisterClick}
                className="w-full text-slate-400 hover:text-white font-bold transition-all text-xs flex items-center justify-center gap-2 group"
              >
                <Sparkles className="w-4 h-4 text-amber-400 group-hover:scale-125 transition-transform" />
                ¿Nuevo Alumno? Empieza aquí
              </button>
            )}
          </div>
        </div>

        <InstallationGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

        {/* Demo Access Links (Development) */}
        <div className="mt-8 flex justify-center gap-6 opacity-40 hover:opacity-100 transition-opacity">
          <button
            onClick={() => { setIdentifier('jesusmartinezpadron@gmail.com'); setPassword('123456'); }}
            className="text-[10px] font-black text-slate-500 hover:text-blue-400 flex items-center gap-1.5 uppercase tracking-widest"
          >
            <ShieldCheck className="w-3 h-3" /> Admin
          </button>
          <button
            onClick={() => { setIdentifier('coach@demo.com'); setPassword('123'); }}
            className="text-[10px] font-black text-slate-500 hover:text-indigo-400 flex items-center gap-1.5 uppercase tracking-widest"
          >
            <Users className="w-3 h-3" /> Equipo
          </button>
        </div>
      </div>

      <p className="mt-12 text-[10px] text-slate-600 font-mono z-10">
        v1.0 | PADRON TRAINER PLATFORM
      </p>
    </div>
  );
};

export default Login;

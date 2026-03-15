import React, { useMemo, useState } from 'react';
import { ArrowLeft, Copy, CheckCircle2, KeyRound, LogIn } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const ClientAccessPage: React.FC = () => {
  const [mode, setMode] = useState<'start' | 'first_time' | 'returning'>('start');
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [activationInput, setActivationInput] = useState('');
  const [activationError, setActivationError] = useState<string | null>(null);

  const loginUrl = useMemo(() => `${window.location.origin}/#/`, []);
  const accessUrl = useMemo(() => `${window.location.origin}/#/login`, []);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // no-op
    }
  };

  const extractActivationToken = (value: string): string | null => {
    const raw = value.trim();
    if (!raw) return null;

    const fromUrl = raw.match(/\/activar-cuenta\/([^?#/]+)/i)?.[1];
    if (fromUrl) return fromUrl;

    if (!raw.includes('/') && raw.length >= 12) return raw;

    return null;
  };

  const handleActivationContinue = () => {
    setActivationError(null);
    const token = extractActivationToken(activationInput);
    if (!token) {
      setActivationError('Pega el enlace de alta completo o el token que te envio tu coach.');
      return;
    }

    window.location.href = `/#/activar-cuenta/${encodeURIComponent(token)}`;
  };

  const handleSendAccessLink = async () => {
    setSendError(null);
    setSent(false);

    if (!email.trim() || !email.includes('@')) {
      setSendError('Introduce un email valido para enviarte el enlace.');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });

      if (error && error.message?.toLowerCase().includes('rate limit')) {
        throw new Error('Has solicitado demasiados correos. Espera un minuto e intentalo de nuevo.');
      }

      setSent(true);
    } catch (err: any) {
      setSendError(err?.message || 'No hemos podido enviar el enlace ahora.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-2xl z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Acceso de Clientes</h1>
          <p className="text-slate-400 font-medium">
            Te guiamos paso a paso. Elige una opcion y sigue solo 1 accion.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl rounded-[2rem] border border-white/10 p-8 shadow-2xl space-y-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 rounded-2xl p-4 text-sm leading-relaxed">
            <p className="font-bold">IMPORTANTE:</p>
            <p>Guarda este enlace. Es el unico acceso que necesitas siempre.</p>
            <p className="mt-1 font-mono text-xs break-all">{accessUrl}</p>
          </div>

          {mode === 'start' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setMode('first_time')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl"
              >
                Es mi primera vez / No recuerdo como entrar
              </button>
              <button
                type="button"
                onClick={() => setMode('returning')}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-4 rounded-xl"
              >
                Ya tengo cuenta y contrasena
              </button>
            </div>
          )}

          {mode === 'first_time' && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold text-blue-200">Paso 1 de 2: escribe tu email</p>
              <p className="text-xs text-slate-300">
                Te enviaremos un enlace para crear o recuperar tu acceso. Es la forma mas facil.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-slate-900/50 border border-white/10 text-white px-3 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              {sendError && <p className="text-xs text-red-300">{sendError}</p>}
              {sent && (
                <p className="text-xs text-emerald-300">
                  Paso 2 de 2: revisa tu email y pulsa el enlace recibido.
                </p>
              )}
              <button
                type="button"
                onClick={handleSendAccessLink}
                disabled={sending}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-70 text-white font-bold py-3 rounded-xl"
              >
                {sending ? 'Enviando enlace...' : 'Enviar enlace a mi email'}
              </button>

              <details className="bg-white/5 border border-white/10 rounded-xl p-3">
                <summary className="cursor-pointer text-xs text-slate-200 font-semibold">Tengo enlace de alta del coach</summary>
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={activationInput}
                    onChange={(e) => setActivationInput(e.target.value)}
                    placeholder="Pega aqui el enlace de alta"
                    className="w-full bg-slate-900/50 border border-white/10 text-white px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {activationError && <p className="text-xs text-red-300">{activationError}</p>}
                  <button
                    type="button"
                    onClick={handleActivationContinue}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl"
                  >
                    Continuar alta
                  </button>
                </div>
              </details>

              <button
                type="button"
                onClick={() => setMode('start')}
                className="w-full text-xs text-slate-300 hover:text-white"
              >
                Volver atras
              </button>
            </div>
          )}

          {mode === 'returning' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold text-slate-100">Perfecto. Entra con tu email y contrasena.</p>
              <a
                href="/#/"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" /> Entrar ahora
              </a>
              <a
                href="/#/forgot-password"
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" /> No recuerdo mi contrasena
              </a>
              <button
                type="button"
                onClick={() => setMode('start')}
                className="w-full text-xs text-slate-300 hover:text-white"
              >
                Volver atras
              </button>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Enlace permanente de acceso</p>
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-3 font-mono text-xs text-slate-200 break-all">
              {accessUrl}
            </div>
            <button
              type="button"
              onClick={() => handleCopy(accessUrl)}
              className="w-full border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Enlace copiado' : 'Copiar enlace'}
            </button>
          </div>

          <a
            href="/#/forgot-password"
            className="block text-center bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl"
          >
            Ver guia completa y FAQ
          </a>

          <div className="text-xs text-slate-400 leading-relaxed">
            Si te pierdes, vuelve siempre a esta pagina. Desde aqui haces todo.
            <div className="mt-2 font-mono text-[11px] text-slate-300 break-all">Login directo: {loginUrl}</div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/#/" className="inline-flex items-center text-xs text-slate-400 hover:text-white gap-1">
            <ArrowLeft className="w-3 h-3" />
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, MessageCircle, Sparkles } from 'lucide-react';
import { leadsService } from '../../services/leadsService';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const WHATSAPP_URL =
  'https://wa.me/34664401328?text=Hola%2C%20quiero%20solicitar%20informacion%20de%20Padron%20Trainer';

export const RequestInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [goal, setGoal] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const widgetIdRef = useRef<string | null>(null);
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  const whatsappFallbackUrl = useMemo(() => {
    const msg = encodeURIComponent('Hola, acabo de enviar el formulario web y quiero más información de Padron Trainer');
    return `https://wa.me/34664401328?text=${msg}`;
  }, []);

  useEffect(() => {
    if (!turnstileSiteKey) return;

    const scriptId = 'cf-turnstile-script';
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

    const renderCaptcha = () => {
      if (!window.turnstile || !captchaContainerRef.current || widgetIdRef.current) return;

      widgetIdRef.current = window.turnstile.render(captchaContainerRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token: string) => {
          setCaptchaToken(token);
          setError(null);
        },
        'expired-callback': () => setCaptchaToken(null),
        'error-callback': () => {
          setCaptchaToken(null);
          setError('Error validando captcha. Intenta de nuevo.');
        },
      });
    };

    if (existing) {
      if (window.turnstile) renderCaptcha();
      else existing.addEventListener('load', renderCaptcha, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = renderCaptcha;
    document.body.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [turnstileSiteKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!firstName.trim() || !surname.trim() || !phone.trim()) {
      setError('Nombre, apellidos y teléfono son obligatorios.');
      return;
    }

    if (!turnstileSiteKey) {
      setError('El formulario no está configurado todavía. Escríbenos por WhatsApp.');
      return;
    }

    if (!captchaToken) {
      setError('Completa el captcha para enviar la solicitud.');
      return;
    }

    setLoading(true);
    try {
      const result = await leadsService.capturePublicLead({
        firstName: firstName.trim(),
        surname: surname.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        instagram_user: instagram.trim() || undefined,
        notes: goal.trim() || undefined,
        source: 'Formulario Web',
        procedencia: 'Formulario',
        in_out: 'Inbound',
        turnstileToken: captchaToken,
        website,
      });

      setSuccess(result.message || 'Solicitud enviada. Te contactaremos pronto.');
      setFirstName('');
      setSurname('');
      setPhone('');
      setEmail('');
      setInstagram('');
      setGoal('');
      setWebsite('');
      setCaptchaToken(null);
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current);
      }
    } catch (err: any) {
      setError(err?.message || 'No hemos podido enviar tu solicitud.');
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current);
      }
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute top-28 -right-20 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <section className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-black/20 sm:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-xs font-black uppercase tracking-[0.15em] text-emerald-300">
            <Sparkles className="h-4 w-4" />
            Solicitar informacion
          </div>

          <h1 className="mt-5 text-4xl font-black leading-tight text-white sm:text-5xl">
            Transforma tu vida,
            <span className="text-emerald-300"> es por aqui </span>
          </h1>

          <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
            Rellena este formulario y un miembro del equipo te contactará para valorar tu caso y explicarte el siguiente
            paso.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Nombre*"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
                required
              />
              <input
                type="text"
                placeholder="Apellidos*"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="tel"
                placeholder="WhatsApp*"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
                required
              />
              <input
                type="email"
                placeholder="Email (opcional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
              />
            </div>

            <input
              type="text"
              placeholder="Instagram (opcional)"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
            />

            <textarea
              placeholder="¿Cuál es tu objetivo ahora mismo?"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="min-h-[110px] rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
            />

            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="hidden"
              aria-hidden="true"
            />

            <div ref={captchaContainerRef} className="mt-1" />

            {error && <p className="text-sm text-rose-300">{error}</p>}
            {success && <p className="text-sm text-emerald-300">{success}</p>}

            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar solicitud
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <a
                href={whatsappFallbackUrl || WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Escribir por WhatsApp
                <MessageCircle className="h-4 w-4" />
              </a>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Ir a acceso clientes
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

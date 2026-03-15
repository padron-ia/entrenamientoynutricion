import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react';

const WHATSAPP_URL =
  'https://wa.me/34664401328?text=Hola%2C%20quiero%20solicitar%20informacion%20de%20Padron%20Trainer';

export const RequestInfoPage: React.FC = () => {
  const navigate = useNavigate();

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
            Estamos preparando el formulario de informacion. Mientras tanto, puedes escribirnos por WhatsApp y te
            atendemos directamente.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
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
        </section>
      </main>
    </div>
  );
};

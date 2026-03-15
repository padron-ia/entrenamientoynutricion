import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LifeBuoy,
  Lock,
  PlayCircle,
  ShieldCheck,
  Smartphone,
  Timer,
  UserCheck,
} from 'lucide-react';

export const ClientAccessLanding: React.FC = () => {
  const navigate = useNavigate();
  const helpRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-28 -left-20 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-40 -right-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-3"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black tracking-wide text-white">Padron Trainer</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Acceso Clientes</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
          >
            Entrar
          </button>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pb-24 lg:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              Zona privada de alumnos
            </span>

            <h1 className="mt-6 text-4xl font-black leading-tight text-white sm:text-5xl">
              Accede a tu portal de
              <span className="text-emerald-300"> seguimiento </span>
              en menos de 1 minuto
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Desde aqui puedes entrar a tu cuenta, revisar tus pautas, ver materiales y continuar tu proceso con el
              equipo de Padron Trainer.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
              >
                Entrar al portal
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Recuperar acceso
                <KeyRound className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: <Lock className="h-4 w-4" />, text: 'Acceso seguro' },
                { icon: <Timer className="h-4 w-4" />, text: 'Ingreso rapido' },
                { icon: <Smartphone className="h-4 w-4" />, text: 'Movil y desktop' },
              ].map((item) => (
                <div key={item.text} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-200">
                    {item.icon}
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Primer acceso</p>
            <h2 className="mt-2 text-2xl font-black text-white">3 pasos para entrar sin complicaciones</h2>

            <div className="mt-6 space-y-4">
              {[
                {
                  title: '1. Usa tu identificador',
                  desc: 'Introduce el email o telefono con el que te registraste en Padron Trainer.',
                },
                {
                  title: '2. Valida tu cuenta',
                  desc: 'Si accedes por email, usa tu contrasena. Si usas telefono, sigue el acceso guiado.',
                },
                {
                  title: '3. Continua tu plan',
                  desc: 'Una vez dentro, revisa tus clases, tareas y seguimiento de progreso.',
                },
              ].map((step) => (
                <article key={step.title} className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                  <h3 className="text-sm font-black text-white">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">{step.desc}</p>
                </article>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-200 transition hover:bg-emerald-400/20"
            >
              Ir al acceso de clientes
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="border-y border-white/10 bg-slate-900/50 py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-black text-white">Que encontraras dentro del portal</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: <PlayCircle className="h-5 w-5" />,
                  title: 'Clases y sesiones',
                  desc: 'Consulta contenido semanal y recursos del programa.',
                },
                {
                  icon: <CheckCircle2 className="h-5 w-5" />,
                  title: 'Seguimiento',
                  desc: 'Visualiza avances, tareas y hitos de tu proceso.',
                },
                {
                  icon: <LifeBuoy className="h-5 w-5" />,
                  title: 'Acompanamiento',
                  desc: 'Recibe soporte continuo en tu dia a dia.',
                },
                {
                  icon: <ShieldCheck className="h-5 w-5" />,
                  title: 'Privacidad',
                  desc: 'Tus datos se gestionan en un entorno seguro.',
                },
              ].map((item) => (
                <article key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="inline-flex rounded-lg bg-emerald-400/15 p-2 text-emerald-300">{item.icon}</div>
                  <h3 className="mt-3 text-base font-black text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section ref={helpRef} className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-7 sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Ayuda de acceso</p>
            <h2 className="mt-2 text-3xl font-black text-white">No puedes entrar a tu cuenta?</h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              Recupera tu acceso en pocos pasos desde la pantalla oficial de recuperacion de contrasena.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300"
              >
                Recuperar acceso ahora
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Volver al login
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

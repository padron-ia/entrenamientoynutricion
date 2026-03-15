import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Dumbbell,
  Flame,
  Heart,
  LineChart,
  MessageCircle,
  Phone,
  Quote,
  RefreshCcw,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Utensils,
  Zap,
} from 'lucide-react';
import { LandingHeader } from './LandingHeader';
import { LandingFooter } from './LandingFooter';

const WHATSAPP_URL =
  'https://wa.me/34664401328?text=Hola%2C%20quiero%20solicitar%20informacion%20de%20Padron%20Trainer';

/* ——— Scroll-reveal hook ——— */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          obs.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return ref;
}

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal-on-scroll ${className}`}>
      {children}
    </div>
  );
}

/* ——— Animated counter ——— */
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start = 0;
    const duration = 1600;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(value * ease) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(step);
          obs.unobserve(el);
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

/* ======================================================================= */

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#060a13] text-white selection:bg-emerald-500/30 overflow-x-hidden">
      <LandingHeader />

      <main>
        {/* ════════════════ 1. HERO ════════════════ */}
        <section className="relative overflow-hidden pb-20 pt-32 lg:pb-28 lg:pt-44">
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 -top-40 h-[40rem] w-[40rem] rounded-full bg-emerald-500/[0.07] blur-[120px]" />
            <div className="absolute -right-28 top-20 h-[34rem] w-[34rem] rounded-full bg-cyan-500/[0.06] blur-[100px]" />
            <div className="absolute bottom-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              {/* Badge */}
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-5 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                <Flame className="h-3.5 w-3.5" />
                +196 alumnos ya transformándose
              </span>

              {/* Headline */}
              <h1 className="mt-8 text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
                Pierde hasta{' '}
                <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                  7 kg de grasa
                </span>{' '}
                en 90 días
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
                Sin dietas absurdas, sin rebote, sin improvisar cada lunes. Con un sistema de
                entrenamiento, nutrición y acompañamiento real que funciona.
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/solicitar-informacion')}
                  className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-8 py-4 text-base font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:brightness-110"
                >
                  Quiero empezar mi cambio
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-4 text-base font-bold text-white backdrop-blur transition hover:bg-white/[0.08]"
                >
                  <MessageCircle className="h-5 w-5 text-emerald-400" />
                  Hablar por WhatsApp
                </a>
              </div>

              {/* Mini trust badges */}
              <div className="mx-auto mt-12 grid max-w-xl grid-cols-3 gap-3">
                {[
                  { icon: <LineChart className="h-4 w-4" />, text: 'Progreso medible' },
                  { icon: <Clock3 className="h-4 w-4" />, text: 'Sistema semanal' },
                  { icon: <ShieldCheck className="h-4 w-4" />, text: 'Proceso guiado' },
                ].map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-slate-300"
                  >
                    <span className="text-emerald-400">{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="mt-16 flex justify-center">
            <ChevronDown className="h-5 w-5 animate-bounce text-slate-600" />
          </div>
        </section>

        {/* ════════════════ 2. SOCIAL PROOF BAR ════════════════ */}
        <Reveal>
          <section className="border-y border-white/[0.06] bg-white/[0.02]">
            <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
              {[
                { value: 196, suffix: '+', label: 'Alumnos activos', icon: <Users className="h-5 w-5" /> },
                { value: 6, suffix: '', label: 'Coaches dedicados', icon: <UserCheck className="h-5 w-5" /> },
                { value: 87, suffix: '%', label: 'Tasa de renovación', icon: <RefreshCcw className="h-5 w-5" /> },
                { value: 8, suffix: '.6', label: 'Satisfacción / 10', icon: <Star className="h-5 w-5" /> },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="mx-auto mb-2 inline-flex rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                    {stat.icon}
                  </div>
                  <p className="text-3xl font-black tabular-nums text-white sm:text-4xl">
                    <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ════════════════ 3. PROBLEMA — Agitación ════════════════ */}
        <Reveal>
          <section className="py-20 lg:py-28">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-3xl text-center">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">
                  Si no haces nada, nada cambia
                </span>
                <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
                  El ciclo que ya conoces:{' '}
                  <span className="text-rose-400">lunes empiezo, viernes abandono</span>
                </h2>
                <p className="mt-4 text-base text-slate-400">
                  No es falta de voluntad. Es falta de sistema. Y cada semana que pasa sin estructura, tu
                  objetivo se aleja un poco más.
                </p>
              </div>

              <div className="mt-14 grid gap-5 md:grid-cols-3">
                {[
                  {
                    emoji: '😤',
                    title: 'Más frustración',
                    text: 'Te esfuerzas en el gimnasio, pero no ves resultados en el espejo, en la ropa ni en tu energía. Empiezas a dudar de ti.',
                    accent: 'border-rose-500/20 bg-rose-500/[0.04]',
                  },
                  {
                    emoji: '⏰',
                    title: 'Más tiempo perdido',
                    text: 'Saltas de rutina en rutina, de dieta en dieta, sin construir una base real. Los meses pasan y sigues en el mismo cuerpo.',
                    accent: 'border-orange-500/20 bg-orange-500/[0.04]',
                  },
                  {
                    emoji: '📉',
                    title: 'Más lejos de tu objetivo',
                    text: 'Cada semana sin estructura pierde músculo y acumula hábitos que alejan tu recomposición corporal varios meses más.',
                    accent: 'border-red-500/20 bg-red-500/[0.04]',
                  },
                ].map((item) => (
                  <article
                    key={item.title}
                    className={`rounded-2xl border p-6 transition-transform hover:-translate-y-1 ${item.accent}`}
                  >
                    <span className="text-3xl">{item.emoji}</span>
                    <h3 className="mt-3 text-xl font-black text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ════════════════ 4. MÉTODO — 3 Fases ════════════════ */}
        <Reveal>
          <section className="relative overflow-hidden border-y border-white/[0.06] bg-gradient-to-b from-emerald-950/30 to-transparent py-20 lg:py-28">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-3xl text-center">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                  El método Padron Trainer
                </span>
                <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
                  3 fases para perder grasa y{' '}
                  <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                    recomponer de verdad
                  </span>
                </h2>
              </div>

              <div className="mt-14 grid gap-6 md:grid-cols-3">
                {[
                  {
                    phase: '01',
                    icon: <Target className="h-7 w-7" />,
                    title: 'Diagnóstico',
                    subtitle: 'Semanas 1-2',
                    text: 'Evaluamos tu punto de partida real: composición corporal, hábitos, historial y capacidad de adherencia. Sin esto, cualquier plan es disparar a ciegas.',
                    result: 'Resultado: Sabes exactamente dónde estás y qué necesitas.',
                  },
                  {
                    phase: '02',
                    icon: <TrendingDown className="h-7 w-7" />,
                    title: 'Ejecución',
                    subtitle: 'Semanas 3-10',
                    text: 'Plan de entrenamiento y nutrición personalizado orientado a pérdida de grasa progresiva. Cada semana se ajusta según tu evolución real, no por feeling.',
                    result: 'Resultado: Pierdes grasa sin perder músculo ni energía.',
                  },
                  {
                    phase: '03',
                    icon: <UserCheck className="h-7 w-7" />,
                    title: 'Consolidación',
                    subtitle: 'Semanas 10-12+',
                    text: 'Afinamos lo que funciona, reforzamos hábitos sostenibles y preparamos tu siguiente fase. El objetivo: que nunca vuelvas al punto de partida.',
                    result: 'Resultado: Mantienes resultados sin volver a empezar de cero.',
                  },
                ].map((phase) => (
                  <article
                    key={phase.phase}
                    className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur transition-all hover:border-emerald-500/30 hover:bg-white/[0.05]"
                  >
                    <span className="absolute -top-4 left-6 rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-slate-950">
                      FASE {phase.phase}
                    </span>
                    <div className="mt-2 inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-300">
                      {phase.icon}
                    </div>
                    <h3 className="mt-4 text-xl font-black text-white">{phase.title}</h3>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                      {phase.subtitle}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">{phase.text}</p>
                    <p className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.05] p-3 text-sm font-semibold text-emerald-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      {phase.result}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ════════════════ 5. TESTIMONIOS ════════════════ */}
        <Reveal>
          <section className="py-20 lg:py-28">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-3xl text-center">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
                  Resultados reales
                </span>
                <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
                  Lo que dicen quienes ya han pasado por el sistema
                </h2>
              </div>

              <div className="mt-14 grid gap-6 md:grid-cols-3">
                {[
                  {
                    name: 'Marcos R.',
                    age: 34,
                    result: '-6.8 kg en 11 semanas',
                    quote:
                      'Llevaba años yendo al gimnasio sin resultados claros. En 3 meses con Padron Trainer cambié más que en los últimos 3 años. La diferencia es que aquí nadie te deja solo.',
                    rating: 5,
                  },
                  {
                    name: 'Laura M.',
                    age: 29,
                    result: '-5.2 kg en 8 semanas',
                    quote:
                      'Pensaba que comer bien era pasar hambre. Mi coach me enseñó a comer para perder grasa sin quitarme nada. Ahora como más que antes y estoy en mi mejor forma.',
                    rating: 5,
                  },
                  {
                    name: 'Daniel A.',
                    age: 41,
                    result: '-7.1 kg en 12 semanas',
                    quote:
                      'Con 41 años creía que ya era tarde. El equipo me demostró que con un plan real y seguimiento constante, la edad no es excusa. Me siento 10 años más joven.',
                    rating: 5,
                  },
                ].map((t) => (
                  <article
                    key={t.name}
                    className="flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur"
                  >
                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>

                    <div className="mt-4 flex-1">
                      <Quote className="mb-2 h-5 w-5 text-slate-600" />
                      <p className="text-sm italic leading-relaxed text-slate-300">{t.quote}</p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
                      <div>
                        <p className="text-sm font-black text-white">{t.name}</p>
                        <p className="text-xs text-slate-500">{t.age} años</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                        {t.result}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ════════════════ 6. QUIÉN SOY ════════════════ */}
        <Reveal>
          <section className="border-y border-white/[0.06] bg-gradient-to-b from-slate-900/50 to-transparent py-20 lg:py-28">
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="grid items-center gap-12 lg:grid-cols-5">
                {/* Photo placeholder */}
                <div className="mx-auto lg:col-span-2">
                  <div className="relative">
                    <div className="h-80 w-72 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-900/40 to-slate-900 p-1 shadow-2xl sm:h-96 sm:w-80">
                      <div className="flex h-full w-full items-center justify-center rounded-[1.35rem] bg-slate-800/60 text-8xl">
                        💪
                      </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 rounded-2xl border border-emerald-500/20 bg-slate-900 px-4 py-2 shadow-xl">
                      <p className="text-xs font-bold text-emerald-400">+8 años de experiencia</p>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="lg:col-span-3">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                    Quién está detrás
                  </span>
                  <h2 className="mt-4 text-4xl font-black leading-tight">
                    Jesús Martínez Padrón
                  </h2>
                  <p className="mt-2 text-sm font-bold uppercase tracking-wider text-emerald-400">
                    Coach de Recomposición Corporal & Fundador de Padron Trainer
                  </p>
                  <p className="mt-5 text-base leading-relaxed text-slate-400">
                    Después de trabajar con cientos de personas, me di cuenta de que la mayoría no
                    necesita más motivación — necesita estructura, datos y alguien que le acompañe de
                    verdad. Por eso creé Padron Trainer: un sistema donde cada alumno tiene plan
                    personalizado, seguimiento semanal y un equipo completo de coaches detrás.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-400">
                    No vendemos humo ni transformaciones de 2 semanas. Vendemos un proceso real que
                    funciona porque está diseñado para adaptarse a tu vida, no al revés.
                  </p>

                  <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: 'Alumnos', value: '196+' },
                      { label: 'Coaches', value: '6' },
                      { label: 'Renovación', value: '87%' },
                      { label: 'NPS', value: '8.6/10' },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
                        <p className="text-xl font-black text-white">{s.value}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ════════════════ 7. QUÉ INCLUYE — Stack de Valor ════════════════ */}
        <Reveal>
          <section className="py-20 lg:py-28">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-3xl text-center">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                  Todo incluido en tu plaza
                </span>
                <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
                  No te falta motivación.{' '}
                  <span className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                    Te falta el sistema completo
                  </span>
                </h2>
              </div>

              <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    icon: <Dumbbell className="h-6 w-6" />,
                    title: 'Plan de entrenamiento personalizado',
                    desc: 'Diseñado según tu nivel, disponibilidad y objetivos. Se ajusta cada semana según progreso.',
                    value: 'Valor: 200€/mes',
                  },
                  {
                    icon: <Utensils className="h-6 w-6" />,
                    title: 'Estrategia nutricional adaptada',
                    desc: 'Sin dietas genéricas. Plan flexible que se integra en tu vida real sin pasar hambre.',
                    value: 'Valor: 150€/mes',
                  },
                  {
                    icon: <BarChart3 className="h-6 w-6" />,
                    title: 'Seguimiento semanal con datos',
                    desc: 'Revisión de peso, medidas, adherencia y rendimiento. Todo medido, nada al azar.',
                    value: 'Valor: 120€/mes',
                  },
                  {
                    icon: <Users className="h-6 w-6" />,
                    title: 'Coach personal dedicado',
                    desc: 'Un coach real asignado que conoce tu caso, responde tus dudas y ajusta tu plan.',
                    value: 'Valor: 200€/mes',
                  },
                  {
                    icon: <Phone className="h-6 w-6" />,
                    title: 'Soporte directo por WhatsApp',
                    desc: 'Comunicación directa con tu coach. Sin chatbots, sin esperas infinitas.',
                    value: 'Valor: 80€/mes',
                  },
                  {
                    icon: <Sparkles className="h-6 w-6" />,
                    title: 'Portal de progreso personal',
                    desc: 'Tu panel privado con gráficos de evolución, historial y acceso a todo tu contenido.',
                    value: 'Valor: 50€/mes',
                  },
                ].map((item) => (
                  <article
                    key={item.title}
                    className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-all hover:border-cyan-500/20 hover:bg-white/[0.05]"
                  >
                    <div className="inline-flex rounded-xl bg-cyan-500/10 p-3 text-cyan-300 transition-colors group-hover:bg-cyan-500/20">
                      {item.icon}
                    </div>
                    <h3 className="mt-4 text-lg font-black text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
                    <p className="mt-3 text-xs font-bold text-slate-500 line-through">{item.value}</p>
                  </article>
                ))}
              </div>

              {/* Value anchor */}
              <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-6 text-center">
                <p className="text-sm text-slate-400">
                  Valor total si contrataras cada servicio por separado:
                </p>
                <p className="mt-1 text-3xl font-black text-slate-500 line-through">800€/mes</p>
                <p className="mt-2 text-lg font-bold text-emerald-300">
                  Todo incluido por una fracción. Escríbenos para conocer tu precio.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/solicitar-informacion')}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
                >
                  Solicitar información y precio
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ════════════════ 8. GARANTÍA ════════════════ */}
        <Reveal>
          <section className="border-y border-white/[0.06] bg-gradient-to-r from-emerald-950/20 via-transparent to-cyan-950/20 py-16">
            <div className="mx-auto w-full max-w-4xl px-4 text-center sm:px-6 lg:px-8">
              <div className="inline-flex rounded-2xl bg-emerald-500/10 p-4 text-emerald-300">
                <Shield className="h-10 w-10" />
              </div>
              <h2 className="mt-5 text-3xl font-black sm:text-4xl">
                Garantía de compromiso mutuo
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
                Si en los primeros <strong className="text-white">30 días</strong> cumples con el proceso
                y no ves progreso medible (pérdida de grasa, mejora de medidas o rendimiento), te
                devolvemos tu inversión íntegra. Sin preguntas, sin letra pequeña.
              </p>
              <p className="mt-4 text-sm font-bold text-emerald-400">
                Asumimos el riesgo nosotros, no tú.
              </p>
            </div>
          </section>
        </Reveal>

        {/* ════════════════ 9. FAQ ════════════════ */}
        <Reveal>
          <section className="py-20 lg:py-28">
            <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Preguntas frecuentes
                </span>
                <h2 className="mt-4 text-4xl font-black">&quot;Ya, pero...&quot;</h2>
              </div>

              <div className="mt-12 space-y-4">
                {[
                  {
                    q: '¿No tengo tiempo para entrenar?',
                    a: 'El sistema se adapta a tu disponibilidad real. Con 3-4 sesiones de 45 min a la semana es suficiente. Sin sistema siempre "falta tiempo" — con estructura, el tiempo rinde.',
                  },
                  {
                    q: 'Ya lo intenté antes y no funcionó',
                    a: 'Lo que falló no fuiste tú, fue el enfoque. Aquí tienes plan personalizado, nutrición adaptada y un coach que te acompaña cada semana. No es lo mismo que seguir una rutina genérica de internet.',
                  },
                  {
                    q: '¿Y si no consigo mantener los resultados?',
                    a: 'Precisamente por eso existe la Fase 3 (Consolidación). No buscamos cambios de 2 semanas. Construimos hábitos sostenibles y ajustamos inteligentemente para que lo que logres, lo mantengas.',
                  },
                  {
                    q: '¿Es solo para gente que quiere perder peso?',
                    a: 'No. Trabajamos recomposición corporal: perder grasa y ganar o mantener músculo. Tenemos alumnos que quieren definir, ganar masa o simplemente sentirse mejor con su cuerpo.',
                  },
                  {
                    q: '¿Cuánto cuesta?',
                    a: 'El precio depende de tu plan y duración. Escríbenos por WhatsApp o solicita información y te explicamos las opciones sin compromiso. Lo que sí te decimos: cuesta mucho menos que seguir perdiendo meses sin resultados.',
                  },
                  {
                    q: '¿Necesito ir a un gimnasio?',
                    a: 'Depende de tus objetivos. Podemos diseñar planes para gimnasio, para casa con equipamiento mínimo, o combinados. Tu coach lo adapta a tu situación.',
                  },
                ].map((faq) => (
                  <details
                    key={faq.q}
                    className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-5 transition-colors open:border-emerald-500/20 open:bg-emerald-500/[0.03]"
                  >
                    <summary className="flex cursor-pointer items-center justify-between text-base font-black text-white list-none">
                      {faq.q}
                      <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ════════════════ 10. CTA FINAL ════════════════ */}
        <section className="relative overflow-hidden py-24">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-emerald-500/[0.08] blur-[100px]" />
          </div>
          <div className="relative z-10 mx-auto w-full max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Puedes esperar otro lunes.
              <br />
              <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                O empezar hoy.
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base text-slate-400 sm:text-lg">
              Tu objetivo no necesita más motivación suelta. Necesita decisión, sistema y acompañamiento
              de alguien que sabe cómo llevarte ahí.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => navigate('/solicitar-informacion')}
                className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-8 py-4 text-base font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:brightness-110"
              >
                Quiero empezar ahora
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-4 text-base font-bold text-white transition hover:bg-white/[0.08]"
              >
                Ya soy cliente
              </button>
            </div>

            <p className="mt-8 text-sm text-slate-600">
              +196 personas ya confían en Padron Trainer. La siguiente puedes ser tú.
            </p>
          </div>
        </section>

        {/* ════════════════ 11. WHATSAPP FLOATING ════════════════ */}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg shadow-[#25D366]/30 transition-transform hover:scale-110"
          aria-label="Contactar por WhatsApp"
        >
          <MessageCircle className="h-7 w-7 text-white" />
        </a>
      </main>

      <LandingFooter />
    </div>
  );
};

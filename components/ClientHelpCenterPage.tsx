import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Copy, HelpCircle, LifeBuoy, LogIn, MessageSquare, ShieldCheck } from 'lucide-react';

type FaqItem = {
  q: string;
  a: string;
};

const clientFaqs: FaqItem[] = [
  {
    q: 'Es mi primera vez, donde entro?',
    a: 'Entra en Acceso de Clientes, pega tu enlace de alta o usa tu email para recibir enlace de acceso.'
  },
  {
    q: 'Que enlace uso siempre?',
    a: 'Usa siempre el enlace permanente de Acceso de Clientes. Guardalo en favoritos.'
  },
  {
    q: 'No recuerdo mi contrasena',
    a: 'Desde Acceso de Clientes pulsa Recuperar contrasena o Enviar enlace de acceso.'
  },
  {
    q: 'No me llega el correo',
    a: 'Revisa spam/promociones, espera 1-2 minutos y confirma que el email este bien escrito.'
  },
  {
    q: 'No veo mi plan nutricional',
    a: 'Puede estar en preparacion. Contacta con tu coach para validar asignacion y aprobacion.'
  },
  {
    q: 'Que debo registrar cada semana?',
    a: 'Check-in semanal, pasos, glucosa (si aplica) y peso segun pauta de tu coach.'
  },
  {
    q: 'Donde veo clases grabadas y directos?',
    a: 'Desde Recursos entra en Clases Semanales. Arriba veras el acceso al directo cuando este activo y debajo todas las grabaciones.'
  }
];

const coachFaqs: FaqItem[] = [
  {
    q: 'Que enlace envio siempre al cliente?',
    a: 'Envia siempre el enlace de Acceso de Clientes. Evita enviar solo el link magico suelto.'
  },
  {
    q: 'El cliente no sabe si ya activo su cuenta',
    a: 'Si ya activo, entra con email + contrasena. Si no recuerda, que use Enviar enlace de acceso.'
  },
  {
    q: 'Como reduzco tickets de acceso?',
    a: 'Usa un solo mensaje estandar de onboarding y pide guardar el enlace permanente en favoritos.'
  },
  {
    q: 'Cuando uso el enlace de activacion manual?',
    a: 'Solo para primera alta. Despues todo pasa por Acceso de Clientes.'
  }
];

export const ClientHelpCenterPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);

  const accessUrl = useMemo(() => `${window.location.origin}/#/login`, []);
  const helpUrl = useMemo(() => `${window.location.origin}/#/forgot-password`, []);

  const waTemplate = useMemo(
    () =>
      [
        'Hola, te comparto tu acceso oficial al portal:',
        accessUrl,
        '',
        'Primera vez: activa tu cuenta con el enlace de alta y crea contrasena.',
        'Siguientes veces: entra siempre con email + contrasena en ese mismo enlace.',
        'Si olvidas contrasena: usa Recuperar contrasena o Enviar enlace de acceso.',
        '',
        `Guia completa: ${helpUrl}`
      ].join('\n'),
    [accessUrl, helpUrl]
  );

  const handleCopy = async (text: string, type: 'url' | 'wa') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } else {
        setCopiedWa(true);
        setTimeout(() => setCopiedWa(false), 1800);
      }
    } catch {
      // no-op
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <a href="/#/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </a>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
          <div className="flex items-start gap-3 mb-4">
            <LifeBuoy className="w-6 h-6 text-blue-300 mt-1" />
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">Centro de Ayuda de Acceso</h1>
              <p className="text-slate-300 mt-2">Guia completa para clientes y coach: alta, acceso recurrente y resolucion de incidencias.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
            <a href="/#/login" className="bg-blue-600 hover:bg-blue-500 rounded-xl py-3 px-4 font-bold inline-flex items-center justify-center gap-2">
              <LogIn className="w-4 h-4" /> Ir a Acceso de Clientes
            </a>
            <button
              type="button"
              onClick={() => handleCopy(accessUrl, 'url')}
              className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl py-3 px-4 font-bold inline-flex items-center justify-center gap-2"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Enlace copiado' : 'Copiar enlace permanente'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-black mb-4 inline-flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-300" /> Guia cliente
            </h2>
            <ol className="space-y-3 text-sm text-slate-200 leading-relaxed list-decimal list-inside">
              <li><strong>Primera vez:</strong> abre Acceso de Clientes, pega enlace de alta o solicita enlace por email.</li>
              <li><strong>Crear contrasena:</strong> define contrasena y vuelve al acceso permanente.</li>
              <li><strong>Siguientes veces:</strong> entra con email + contrasena en el mismo enlace.</li>
              <li><strong>Si olvidas contrasena:</strong> usa Recuperar contrasena o Enviar enlace de acceso.</li>
              <li><strong>Uso semanal:</strong> completa check-in y registros de pasos/glucosa/peso segun pauta.</li>
              <li><strong>Clases:</strong> entra en Clases Semanales para ver grabaciones y unirte al directo semanal.</li>
            </ol>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-black mb-4 inline-flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-300" /> Toolkit coach
            </h2>
            <p className="text-sm text-slate-300 mb-4">Mensaje estandar para WhatsApp y seguimiento de accesos.</p>
            <button
              type="button"
              onClick={() => handleCopy(waTemplate, 'wa')}
              className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-xl py-3 px-4 font-bold inline-flex items-center justify-center gap-2"
            >
              {copiedWa ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedWa ? 'Mensaje copiado' : 'Copiar mensaje WhatsApp'}
            </button>
            <div className="mt-4 text-xs text-slate-400 bg-slate-900/50 border border-white/10 rounded-xl p-3 whitespace-pre-wrap">
              {waTemplate}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-black mb-4 inline-flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-300" /> FAQ clientes
            </h3>
            <div className="space-y-2">
              {clientFaqs.map((item) => (
                <details key={item.q} className="bg-slate-900/50 border border-white/10 rounded-xl p-3">
                  <summary className="cursor-pointer font-semibold text-sm">{item.q}</summary>
                  <p className="mt-2 text-sm text-slate-300">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-black mb-4 inline-flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-300" /> FAQ coach/staff
            </h3>
            <div className="space-y-2">
              {coachFaqs.map((item) => (
                <details key={item.q} className="bg-slate-900/50 border border-white/10 rounded-xl p-3">
                  <summary className="cursor-pointer font-semibold text-sm">{item.q}</summary>
                  <p className="mt-2 text-sm text-slate-300">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

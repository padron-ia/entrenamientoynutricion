import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

const WHATSAPP_URL =
  'https://wa.me/34664401328?text=Hola%2C%20quiero%20informacion%20de%20Padron%20Trainer';

export const LandingFooter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-white/[0.06] bg-[#050810] py-14">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="inline-flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-black text-white">
                PT
              </div>
              <div>
                <p className="text-base font-black text-white">Padron Trainer</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                  Coaching & recomposición
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              Entrenamiento personalizado, nutrición estratégica y acompañamiento real para perder
              grasa y construir un físico que se mantenga.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Enlaces</p>
            <ul className="mt-4 space-y-3">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/solicitar-informacion')}
                  className="text-sm text-slate-400 transition hover:text-emerald-400"
                >
                  Solicitar información
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-sm text-slate-400 transition hover:text-emerald-400"
                >
                  Acceso clientes
                </button>
              </li>
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-emerald-400"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Contacto</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li>
                <a href="https://instagram.com/padrontrainer" target="_blank" rel="noopener noreferrer" className="transition hover:text-emerald-400">
                  📸 @padrontrainer
                </a>
              </li>
              <li>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-emerald-400">
                  📱 +34 664 401 328
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} Padron Trainer. Todos los derechos reservados.
          </p>
          <p className="text-xs text-slate-700">
            Hecho con 💪 para gente que quiere resultados reales
          </p>
        </div>
      </div>
    </footer>
  );
};

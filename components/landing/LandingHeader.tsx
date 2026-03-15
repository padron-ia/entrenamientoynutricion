import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export const LandingHeader: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/[0.06] bg-[#060a13]/90 py-3 backdrop-blur-xl'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button type="button" onClick={() => navigate('/')} className="inline-flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-500/20">
            PT
          </div>
          <div className="text-left">
            <p className="text-base font-black text-white">Padron Trainer</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Coaching & recomposición
            </p>
          </div>
        </button>

        {/* Desktop nav */}
        <div className="hidden items-center gap-3 sm:flex">
          <button
            type="button"
            onClick={() => navigate('/solicitar-informacion')}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.08]"
          >
            Solicitar información
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-black text-slate-950 shadow-md shadow-emerald-500/20 transition hover:brightness-110"
          >
            Acceso clientes
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="inline-flex rounded-lg p-2 text-white sm:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-white/[0.06] bg-[#060a13]/95 px-4 py-4 backdrop-blur-xl sm:hidden">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => { navigate('/solicitar-informacion'); setMenuOpen(false); }}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white"
            >
              Solicitar información
            </button>
            <button
              type="button"
              onClick={() => { navigate('/login'); setMenuOpen(false); }}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950"
            >
              Acceso clientes
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

import React, { useEffect, useState } from 'react';
import { ChevronRight, Dumbbell, TrendingUp } from 'lucide-react';
import { TrainingWorkspaceView } from './TrainingWorkspaceView';
import { StrengthProgressView } from './StrengthProgressView';

interface TrainingHubViewProps {
  clientId: string;
  onBack: () => void;
  initialTab?: 'workspace' | 'strength';
}

export function TrainingHubView({ clientId, onBack, initialTab = 'workspace' }: TrainingHubViewProps) {
  const [tab, setTab] = useState<'workspace' | 'strength'>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sea-400 hover:text-sea-800 transition-colors font-bold group">
        <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver al Dashboard
      </button>

      <div className="glass rounded-3xl p-4 shadow-card border border-sea-100/50">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTab('workspace')}
            className={`px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-all ${tab === 'workspace' ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'}`}
          >
            <Dumbbell className="w-4 h-4" /> Mi Entrenamiento
          </button>
          <button
            onClick={() => setTab('strength')}
            className={`px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-all ${tab === 'strength' ? 'bg-emerald-600 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'}`}
          >
            <TrendingUp className="w-4 h-4" /> Progresion de Fuerza
          </button>
        </div>
      </div>

      {tab === 'workspace' ? (
        <TrainingWorkspaceView clientId={clientId} embedded />
      ) : (
        <StrengthProgressView clientId={clientId} embedded />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { gymService } from '../../../services/gymService';
import type { GymMemberCredit } from '../../../types';
import { CreditCard, Tag } from 'lucide-react';

interface GymCreditsViewProps {
  memberId: string;
}

const GymCreditsView: React.FC<GymCreditsViewProps> = ({ memberId }) => {
  const [tab, setTab] = useState<'vigente' | 'caducado'>('vigente');
  const [data, setData] = useState<{ vigente: GymMemberCredit[]; caducado: GymMemberCredit[] }>({ vigente: [], caducado: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    gymService.getMemberCreditSummary(memberId)
      .then(d => { setData(d); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [memberId]);

  const items = tab === 'vigente' ? data.vigente : data.caducado;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setTab('vigente')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'vigente' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
          Vigente
        </button>
        <button onClick={() => setTab('caducado')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'caducado' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
          Caducado
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Nada por aqui</h3>
          <p className="text-gray-500 text-sm">El listado de saldo esta vacio.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(c => (
            <div key={c.id} className={`p-4 rounded-xl border ${tab === 'vigente' ? 'bg-white' : 'bg-gray-50 opacity-70'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{c.bono_name}</span>
                <span className={`text-lg font-bold ${tab === 'vigente' ? 'text-blue-600' : 'text-gray-400'}`}>
                  {c.remaining_sessions} / {c.total_sessions}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {tab === 'vigente'
                    ? `Caduca el ${new Date(c.valid_until).toLocaleDateString('es-ES')}`
                    : `Caduco el ${new Date(c.valid_until).toLocaleDateString('es-ES')}`
                  }
                </span>
                {c.payment_provider && <span className="capitalize">{c.payment_provider}</span>}
              </div>
              {tab === 'vigente' && (
                <div className="mt-2 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.round((c.remaining_sessions / c.total_sessions) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GymCreditsView;

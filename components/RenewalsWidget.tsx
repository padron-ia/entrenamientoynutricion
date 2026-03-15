
import React, { useMemo } from 'react';
import { Client, ClientStatus } from '../types';
import { Calendar, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';

interface RenewalsWidgetProps {
  clients: Client[];
  onViewClient: (client: Client) => void;
}

interface RenewalItem {
  client: Client;
  phase: string;
  date: string;
  daysRemaining: number;
  isOverdue: boolean;
}

const RenewalsWidget: React.FC<RenewalsWidgetProps> = ({ clients, onViewClient }) => {
  const renewals = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const results: RenewalItem[] = [];

    clients.forEach(client => {
      if (client.status !== ClientStatus.ACTIVE) return;

      let nextPhase = '';
      let nextDateStr = '';

      // Cascade Logic: Check phases sequentially
      if (!client.program.renewal_f2_contracted && client.program.f2_renewalDate) {
        nextPhase = 'Fase 2';
        nextDateStr = client.program.f2_renewalDate;
      } else if (!client.program.renewal_f3_contracted && client.program.f3_renewalDate) {
        nextPhase = 'Fase 3';
        nextDateStr = client.program.f3_renewalDate;
      } else if (!client.program.renewal_f4_contracted && client.program.f4_renewalDate) {
        nextPhase = 'Fase 4';
        nextDateStr = client.program.f4_renewalDate;
      } else if (!client.program.renewal_f5_contracted && client.program.f5_renewalDate) {
        nextPhase = 'Fase 5';
        nextDateStr = client.program.f5_renewalDate;
      }

      if (nextPhase && nextDateStr) {
        const renewalDate = new Date(nextDateStr);
        const diffTime = renewalDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Show renewals overdue or coming up in the next 60 days
        if (diffDays < 60) {
          results.push({
            client,
            phase: nextPhase,
            date: nextDateStr,
            daysRemaining: diffDays,
            isOverdue: diffDays < 0
          });
        }
      }
    });

    return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [clients]);

  if (renewals.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center h-full min-h-[250px]">
        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
          <Calendar className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="font-medium text-slate-900">Sin renovaciones próximas</h3>
        <p className="text-sm text-slate-500 mt-1">No hay renovaciones de fase (F2, F3...) pendientes para los próximos 60 días.</p>
      </div>
    );
  }

  // Group by month
  const groupedRenewals = renewals.reduce((acc, item) => {
    const date = new Date(item.date);
    const monthKey = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(item);
    return acc;
  }, {} as Record<string, RenewalItem[]>);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 bg-indigo-50/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800">Calendario de Renovaciones</h3>
        </div>
        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
          {renewals.length} pendientes
        </span>
      </div>
      
      <div className="overflow-y-auto max-h-[400px] p-0">
        {Object.entries(groupedRenewals).map(([month, items]) => (
          <div key={month}>
            <div className="bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-y border-slate-100">
              {month}
            </div>
            <div>
              {(items as RenewalItem[]).map((item) => (
                <div 
                  key={`${item.client.id}-${item.phase}`}
                  onClick={() => onViewClient(item.client)}
                  className="group flex items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-2 h-2 rounded-full ${item.isOverdue ? 'bg-red-500' : 'bg-blue-500'}`} />
                    <div>
                      <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                        {item.client.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                          Renovación {item.phase}
                        </span>
                        <span className={`text-xs ${item.isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {item.isOverdue && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RenewalsWidget;

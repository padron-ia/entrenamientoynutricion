
import React, { useMemo } from 'react';
import { Client, ClientStatus } from '../types';
import { AlertTriangle, Calendar, ChevronRight } from 'lucide-react';

interface ExpiringContractsProps {
  clients: Client[];
  onViewClient: (client: Client) => void;
}

const ExpiringContracts: React.FC<ExpiringContractsProps> = ({ clients, onViewClient }) => {
  const expiringClients = useMemo(() => {
    const today = new Date();
    // 30 days from now
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 30);

    return clients
      .filter(c => c.status === ClientStatus.ACTIVE)
      .map(c => {
        const endDate = new Date(c.contract_end_date);
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...c, daysRemaining: diffDays };
      })
      .filter(c => c.daysRemaining >= 0 && c.daysRemaining <= 30)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [clients]);

  if (expiringClients.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
          <Calendar className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="font-medium text-slate-900">Todo en orden</h3>
        <p className="text-sm text-slate-500 mt-1">No hay contratos próximos a vencer en los siguientes 30 días.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 bg-amber-50/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-slate-800">Renovaciones Próximas</h3>
        </div>
        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
          {expiringClients.length}
        </span>
      </div>
      
      <div className="overflow-y-auto max-h-[300px] p-2">
        {expiringClients.map(client => (
          <div 
            key={client.id}
            onClick={() => onViewClient(client)}
            className="group flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors mb-1"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{client.name}</span>
                {client.daysRemaining <= 7 && (
                   <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">URGENTE</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Vence: {new Date(client.contract_end_date).toLocaleDateString()}
              </p>
            </div>
            
            <div className="text-right flex items-center gap-3">
              <span className={`text-xs font-semibold ${
                client.daysRemaining <= 7 ? 'text-red-600' : 'text-amber-600'
              }`}>
                {client.daysRemaining} días
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpiringContracts;

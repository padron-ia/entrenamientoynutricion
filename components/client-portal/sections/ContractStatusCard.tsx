import React from 'react';
import { Clock } from 'lucide-react';

interface ContractStatusCardProps {
    activeContract: {
        phase?: string;
        startDate?: string;
        endDate?: string;
        duration?: number;
        name?: string;
    };
    isUrgent: boolean;
}

export function ContractStatusCard({ activeContract, isUrgent }: ContractStatusCardProps) {
    return (
        <div className="glass rounded-3xl p-6 shadow-card flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${isUrgent ? 'bg-red-500' : 'bg-accent-500'}`}></div>

            <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className={`p-3 rounded-2xl ${isUrgent ? 'bg-red-50 text-red-600' : 'bg-accent-50 text-accent-600'}`}>
                    <Clock className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-xs text-sea-400 font-bold uppercase tracking-wider mb-1">Tu Plan Actual</p>
                    <h3 className="text-lg font-bold text-sea-900">
                        {activeContract.duration ? `Programa ${activeContract.duration} Meses` : 'Seguimiento Activo'}
                    </h3>
                    <p className="text-sm text-sea-400 flex items-center gap-2 mt-1">
                        {activeContract.phase || 'Fase General'}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-700">VIGENTE</span>
                        {activeContract.endDate && <span className="text-sea-200">•</span>}
                        {activeContract.endDate && `Hasta el ${new Date(activeContract.endDate).toLocaleDateString()}`}
                    </p>
                </div>
            </div>

            <div className="w-full sm:w-auto bg-sea-50 rounded-2xl p-4 flex items-center justify-between sm:justify-center gap-6 min-w-[200px]">
                <div className="text-center">
                    <p className="text-[10px] text-sea-400 font-bold uppercase mb-0.5">Inicio</p>
                    <p className="font-semibold text-sea-700 text-sm">
                        {activeContract.startDate ? new Date(activeContract.startDate).toLocaleDateString() : '-'}
                    </p>
                </div>
                <div className="h-8 w-px bg-sea-200"></div>
                <div className="text-center">
                    <p className="text-[10px] text-sea-400 font-bold uppercase mb-0.5">Fin</p>
                    <p className={`font-semibold text-sm ${isUrgent ? 'text-red-600' : 'text-sea-700'}`}>
                        {activeContract.endDate ? new Date(activeContract.endDate).toLocaleDateString() : '-'}
                    </p>
                </div>
            </div>
        </div>
    );
}

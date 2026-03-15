import React from 'react';
import { Users, AlertCircle, Search, Filter, Download } from 'lucide-react';

interface CRMMEClientsViewProps {
    onNavigate?: (view: string) => void;
}

export const CRMMEClientsView: React.FC<CRMMEClientsViewProps> = ({ onNavigate }) => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Cartera de Clientes ME</h1>
                    <p className="text-slate-500">Médicos Emprendedores</p>
                </div>

                {/* Toolbar placeholder */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg opacity-50">
                        <Search className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-400">Buscar...</span>
                    </div>
                    <button className="p-2 bg-white border border-slate-200 rounded-lg opacity-50" disabled>
                        <Filter className="w-4 h-4 text-slate-400" />
                    </button>
                    <button className="p-2 bg-white border border-slate-200 rounded-lg opacity-50" disabled>
                        <Download className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Coming Soon State */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* Table Header */}
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
                    <div className="grid grid-cols-6 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <span>Cliente</span>
                        <span>Email</span>
                        <span>Teléfono</span>
                        <span>Estado</span>
                        <span>Fecha Alta</span>
                        <span>Acciones</span>
                    </div>
                </div>

                {/* Empty State */}
                <div className="py-16 px-6 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                        <Users className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Sin datos disponibles</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-6">
                        La cartera de clientes de Médicos Emprendedores se mostrará aquí una vez
                        que se configure la base de datos correspondiente.
                    </p>
                    <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg text-sm">
                        <AlertCircle className="w-4 h-4" />
                        Base de datos ME pendiente de configurar
                    </div>
                </div>
            </div>

            {/* Stats Placeholder */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Clientes', value: '--' },
                    { label: 'Activos', value: '--' },
                    { label: 'En Pausa', value: '--' },
                    { label: 'Bajas', value: '--' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold text-slate-300">{stat.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CRMMEClientsView;

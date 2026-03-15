
import React from 'react';
import { TrendingUp, UserPlus, UserMinus, AlertOctagon, Target, Calendar } from 'lucide-react';

interface MonthlyMetrics {
    label: string;
    signups: number;
    churn: number;
    dropouts: number;
    renewals: {
        target: number;
        done: number;
        rate: number;
    };
    key: string;
}

interface StaffPerformanceProps {
    performanceData: MonthlyMetrics[];
    title?: string;
}

export const StaffPerformance: React.FC<StaffPerformanceProps> = ({ performanceData, title = "Rendimiento Histórico" }) => {
    if (!performanceData) return <div className="p-8 text-center text-slate-400 font-medium bg-white rounded-3xl border border-slate-200">Cargando métricas de rendimiento...</div>;

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Métricas mensuales consolidadas</p>
                </div>
                <Calendar className="w-6 h-6 text-slate-400" />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Mes</th>
                            <th className="px-6 py-4 text-center">Altas</th>
                            <th className="px-6 py-4 text-center">Bajas</th>
                            <th className="px-6 py-4 text-center">Abandonos</th>
                            <th className="px-6 py-4 text-center">Renovaciones</th>
                            <th className="px-6 py-4 text-right">% Éxito</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {performanceData.map((data) => (
                            <tr key={data.key} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 font-bold text-slate-700 capitalize">
                                    {data.label}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5 underline decoration-blue-200 decoration-2 underline-offset-4">
                                        <UserPlus className="w-3.5 h-3.5 text-blue-500" />
                                        <span className="font-black text-slate-800">{data.signups}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5 underline decoration-slate-200 decoration-2 underline-offset-4">
                                        <UserMinus className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="font-bold text-slate-600">{data.churn}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5 underline decoration-orange-200 decoration-2 underline-offset-4">
                                        <AlertOctagon className="w-3.5 h-3.5 text-orange-500" />
                                        <span className="font-bold text-orange-700">{data.dropouts}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1">
                                            <span className="font-black text-green-600">{data.renewals.done}</span>
                                            <span className="text-slate-300">/</span>
                                            <span className="text-slate-500 font-medium">{data.renewals.target}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                            <div
                                                className={`h-full rounded-full ${data.renewals.rate >= 80 ? 'bg-emerald-500' : data.renewals.rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                style={{ width: `${data.renewals.rate}%` }}
                                            />
                                        </div>
                                        <span className={`font-black text-xs ${data.renewals.rate >= 80 ? 'text-emerald-600' : data.renewals.rate >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {data.renewals.rate}%
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <Target className="w-3.5 h-3.5" />
                Las renovaciones se calculan en base a la fecha de fin de fase contratada.
            </div>
        </div>
    );
};

import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Droplets, Activity, Clock, Utensils, Sunrise, ArrowDown, ArrowUp } from 'lucide-react';

interface GlucoseEntry {
    id: string;
    glucose_value: number;
    measurement_type: string;
    measured_at: string;
    notes?: string;
}

export function GlucoseHistoryTable({ clientId }: { clientId: string }) {
    const [history, setHistory] = useState<GlucoseEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, [clientId]);

    const loadHistory = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('glucose_history')
            .select('*')
            .eq('client_id', clientId)
            .order('measured_at', { ascending: false })
            .limit(20);
        if (data) setHistory(data);
        setLoading(false);
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'fasting': return { label: 'Ayunas', icon: <Sunrise className="w-4 h-4 text-amber-500" /> };
            case 'post_meal': return { label: 'Post-comida', icon: <Utensils className="w-4 h-4 text-blue-500" /> };
            case 'before_meal': return { label: 'Pre-comida', icon: <Clock className="w-4 h-4 text-slate-500" /> };
            case 'hba1c': return { label: 'HbA1c', icon: <Activity className="w-4 h-4 text-purple-500" /> };
            default: return { label: 'Aleatorio', icon: <Droplets className="w-4 h-4 text-slate-400" /> };
        }
    };

    if (loading) return <div className="text-sm text-slate-400 p-4">Cargando historial...</div>;

    if (history.length === 0) return (
        <div className="text-sm text-slate-400 p-4 bg-slate-50 rounded-lg border border-slate-100 italic">
            No hay registros de glucemia.
        </div>
    );

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Valor</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Notas</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                    {history.map((entry) => {
                        const typeInfo = getTypeLabel(entry.measurement_type);
                        const isHbA1c = entry.measurement_type === 'hba1c';

                        // Simple logic for highlighting
                        let valueColor = 'text-slate-900';
                        if (!isHbA1c) {
                            if (entry.glucose_value > 180) valueColor = 'text-red-600 font-bold';
                            else if (entry.glucose_value < 70) valueColor = 'text-blue-600 font-bold';
                        } else {
                            if (entry.glucose_value > 6.5) valueColor = 'text-amber-600 font-bold';
                        }

                        return (
                            <tr key={entry.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                                    {format(new Date(entry.measured_at), "d MMM, HH:mm", { locale: es })}
                                </td>
                                <td className={`px-4 py-3 text-sm ${valueColor} whitespace-nowrap`}>
                                    {entry.glucose_value} <span className="text-xs text-slate-400 font-normal">{isHbA1c ? '%' : 'mg/dL'}</span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap flex items-center gap-2">
                                    {typeInfo.icon} {typeInfo.label}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-500 italic truncate max-w-[150px]">
                                    {entry.notes || '-'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { BarChart3, Scale, Droplets, Footprints, CheckCircle2, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface WeeklySummaryCardProps {
    clientId: string;
}

interface WeekData {
    weightChange: number | null;
    avgGlucose: number | null;
    avgSteps: number | null;
    checkinDone: boolean;
    daysWithWeight: number;
    daysWithGlucose: number;
    daysWithSteps: number;
}

export function WeeklySummaryCard({ clientId }: WeeklySummaryCardProps) {
    const [data, setData] = useState<WeekData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadWeekData();
    }, [clientId]);

    async function loadWeekData() {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sun
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const lastMonday = new Date(now);
        lastMonday.setDate(now.getDate() - mondayOffset - 7);
        lastMonday.setHours(0, 0, 0, 0);
        const lastSunday = new Date(lastMonday);
        lastSunday.setDate(lastMonday.getDate() + 6);
        lastSunday.setHours(23, 59, 59, 999);

        const since = lastMonday.toISOString();
        const until = lastSunday.toISOString();

        try {
            const [weights, glucose, steps, checkins] = await Promise.all([
                supabase.from('weight_history').select('weight, date, created_at').eq('client_id', clientId)
                    .gte('created_at', since).lte('created_at', until).order('created_at'),
                supabase.from('glucose_history').select('glucose_value, measured_at').eq('client_id', clientId)
                    .gte('measured_at', since).lte('measured_at', until),
                supabase.from('steps_history').select('steps, date, created_at').eq('client_id', clientId)
                    .gte('created_at', since).lte('created_at', until),
                supabase.from('weekly_checkins').select('id').eq('client_id', clientId)
                    .gte('created_at', since).lte('created_at', until).limit(1),
            ]);

            const wData = weights.data || [];
            const gData = glucose.data || [];
            const sData = steps.data || [];

            let weightChange: number | null = null;
            if (wData.length >= 2) {
                weightChange = +(wData[wData.length - 1].weight - wData[0].weight).toFixed(1);
            }

            const avgGlucose = gData.length > 0
                ? Math.round(gData.reduce((s, g) => s + g.glucose_value, 0) / gData.length)
                : null;

            const avgSteps = sData.length > 0
                ? Math.round(sData.reduce((s, st) => s + st.steps, 0) / sData.length)
                : null;

            setData({
                weightChange,
                avgGlucose,
                avgSteps,
                checkinDone: (checkins.data || []).length > 0,
                daysWithWeight: wData.length,
                daysWithGlucose: gData.length,
                daysWithSteps: sData.length,
            });
        } catch (err) {
            console.error('WeeklySummary error:', err);
        } finally {
            setLoading(false);
        }
    }

    // Only show on Monday-Tuesday (day 1-2)
    const dayOfWeek = new Date().getDay();
    const isShowDay = dayOfWeek === 1 || dayOfWeek === 2;
    if (!isShowDay || loading || !data) return null;

    // Don't show if there's no data at all
    const hasAnyData = data.weightChange !== null || data.avgGlucose !== null || data.avgSteps !== null;
    if (!hasAnyData) return null;

    return (
        <div className="glass rounded-3xl p-5 shadow-card border border-indigo-100/60">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-50 rounded-xl">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                    <p className="text-xs text-indigo-500 font-black uppercase tracking-wider">Resumen semanal</p>
                    <p className="text-[11px] text-sea-400">Semana anterior</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Weight */}
                {data.weightChange !== null && (
                    <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Scale className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-[10px] font-bold text-blue-400 uppercase">Peso</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {data.weightChange < 0 ? (
                                <TrendingDown className="w-4 h-4 text-green-500" />
                            ) : data.weightChange > 0 ? (
                                <TrendingUp className="w-4 h-4 text-orange-500" />
                            ) : (
                                <Minus className="w-4 h-4 text-slate-400" />
                            )}
                            <span className={`text-lg font-black ${
                                data.weightChange < 0 ? 'text-green-600' : data.weightChange > 0 ? 'text-orange-600' : 'text-slate-600'
                            }`}>
                                {data.weightChange > 0 ? '+' : ''}{data.weightChange} kg
                            </span>
                        </div>
                        <p className="text-[10px] text-blue-400 mt-0.5">{data.daysWithWeight} registros</p>
                    </div>
                )}

                {/* Glucose */}
                {data.avgGlucose !== null && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Droplets className="w-3.5 h-3.5 text-rose-500" />
                            <span className="text-[10px] font-bold text-rose-400 uppercase">Glucosa</span>
                        </div>
                        <span className="text-lg font-black text-rose-600">{data.avgGlucose}</span>
                        <span className="text-xs text-rose-400 ml-1">mg/dL</span>
                        <p className="text-[10px] text-rose-400 mt-0.5">{data.daysWithGlucose} mediciones</p>
                    </div>
                )}

                {/* Steps */}
                {data.avgSteps !== null && (
                    <div className="p-3 rounded-2xl bg-green-50 border border-green-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Footprints className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-[10px] font-bold text-green-400 uppercase">Pasos</span>
                        </div>
                        <span className="text-lg font-black text-green-600">{data.avgSteps.toLocaleString()}</span>
                        <span className="text-xs text-green-400 ml-1">/dia</span>
                        <p className="text-[10px] text-green-400 mt-0.5">{data.daysWithSteps} dias</p>
                    </div>
                )}

                {/* Checkin */}
                <div className={`p-3 rounded-2xl ${
                    data.checkinDone ? 'bg-accent-50 border border-accent-100' : 'bg-amber-50 border border-amber-100'
                }`}>
                    <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${data.checkinDone ? 'text-accent-500' : 'text-amber-500'}`} />
                        <span className={`text-[10px] font-bold uppercase ${data.checkinDone ? 'text-accent-400' : 'text-amber-400'}`}>Check-in</span>
                    </div>
                    <span className={`text-sm font-black ${data.checkinDone ? 'text-accent-600' : 'text-amber-600'}`}>
                        {data.checkinDone ? 'Completado' : 'No enviado'}
                    </span>
                </div>
            </div>
        </div>
    );
}

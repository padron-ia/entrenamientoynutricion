import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { Scale, Droplets, Footprints, CheckCircle2, Calendar, Camera, Video } from 'lucide-react';

interface MyWeekGridProps {
    clientId: string;
    refreshKey?: number;
}

interface DayData {
    weight: boolean;
    glucose: boolean;
    steps: boolean;
}

interface WeeklyManualChecks {
    mealPhotosSent: boolean;
    trainingVideosSent: boolean;
}

const DAYS_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAYS_FULL = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

const TRACKERS = [
    { key: 'steps' as const, label: 'Pasos (diario)', icon: Footprints, color: 'text-green-500', bg: 'bg-green-500', bgLight: 'bg-green-100' },
    { key: 'weight' as const, label: 'Peso', icon: Scale, color: 'text-blue-500', bg: 'bg-blue-500', bgLight: 'bg-blue-100' },
    { key: 'glucose' as const, label: 'Glucosa (si aplica)', icon: Droplets, color: 'text-rose-500', bg: 'bg-rose-500', bgLight: 'bg-rose-100' },
];

const EMPTY_MANUAL_CHECKS: WeeklyManualChecks = {
    mealPhotosSent: false,
    trainingVideosSent: false,
};

export function MyWeekGrid({ clientId, refreshKey }: MyWeekGridProps) {
    const [weekData, setWeekData] = useState<DayData[]>(
        Array.from({ length: 7 }, () => ({ weight: false, glucose: false, steps: false }))
    );
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [checkinDoneThisWeek, setCheckinDoneThisWeek] = useState(false);
    const [manualChecks, setManualChecks] = useState<WeeklyManualChecks>(EMPTY_MANUAL_CHECKS);

    const weekStorageKey = useMemo(() => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - mondayOffset);
        monday.setHours(0, 0, 0, 0);
        const keyDate = monday.toISOString().slice(0, 10);
        return `ado_client_weekly_manual_checks_${clientId}_${keyDate}`;
    }, [clientId]);

    useEffect(() => {
        loadWeekData();
    }, [clientId, refreshKey]);

    // Load manual checks from DB
    useEffect(() => {
        if (!clientId) return;

        const loadManualFromDB = async () => {
            const weekKey = weekStorageKey.split('_').pop(); // Extraction "YYYY-MM-DD"
            if (!weekKey) return;

            try {
                const { data, error } = await supabase
                    .from('client_weekly_manual_checks')
                    .select('meal_photos_sent, training_videos_sent')
                    .eq('client_id', clientId)
                    .eq('week_start_date', weekKey)
                    .single();

                if (data) {
                    setManualChecks({
                        mealPhotosSent: !!data.meal_photos_sent,
                        trainingVideosSent: !!data.training_videos_sent,
                    });
                } else {
                    // Migration from localStorage
                    const raw = localStorage.getItem(weekStorageKey);
                    if (raw) {
                        const parsed = JSON.parse(raw) as WeeklyManualChecks;
                        const checks = {
                            mealPhotosSent: !!parsed.mealPhotosSent,
                            trainingVideosSent: !!parsed.trainingVideosSent,
                        };
                        setManualChecks(checks);
                        // Save to DB immediately to migrate
                        await supabase.from('client_weekly_manual_checks').upsert({
                            client_id: clientId,
                            week_start_date: weekKey,
                            meal_photos_sent: checks.mealPhotosSent,
                            training_videos_sent: checks.trainingVideosSent
                        });
                    } else {
                        setManualChecks(EMPTY_MANUAL_CHECKS);
                    }
                }
            } catch (err) {
                console.error('Error loading manual checks from DB:', err);
                setManualChecks(EMPTY_MANUAL_CHECKS);
            }
        };

        loadManualFromDB();
    }, [clientId, weekStorageKey]);

    const toggleManualCheck = async (key: keyof WeeklyManualChecks) => {
        const next = { ...manualChecks, [key]: !manualChecks[key] };
        setManualChecks(next);

        const weekKey = weekStorageKey.split('_').pop();
        if (!clientId || !weekKey) return;

        try {
            await supabase.from('client_weekly_manual_checks').upsert({
                client_id: clientId,
                week_start_date: weekKey,
                meal_photos_sent: next.mealPhotosSent,
                training_videos_sent: next.trainingVideosSent
            });
            // Keep local for quick UI or offline
            localStorage.setItem(weekStorageKey, JSON.stringify(next));
        } catch (err) {
            console.error('Error saving manual check to DB:', err);
        }
    };

    async function loadWeekData() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - mondayOffset);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const since = monday.toISOString();
        const until = sunday.toISOString();

        try {
            const [weights, glucose, steps, checkins] = await Promise.all([
                supabase.from('weight_history').select('created_at').eq('client_id', clientId)
                    .gte('created_at', since).lte('created_at', until),
                supabase.from('glucose_history').select('measured_at').eq('client_id', clientId)
                    .gte('measured_at', since).lte('measured_at', until),
                supabase.from('steps_history').select('created_at').eq('client_id', clientId)
                    .gte('created_at', since).lte('created_at', until),
                supabase.from('weekly_checkins').select('created_at').eq('client_id', clientId)
                    .gte('created_at', since).lte('created_at', until),
            ]);

            const getDayIndex = (dateStr: string) => {
                const d = new Date(dateStr);
                const diff = Math.floor((d.getTime() - monday.getTime()) / 86400000);
                return Math.min(Math.max(diff, 0), 6);
            };

            const days: DayData[] = Array.from({ length: 7 }, () => ({
                weight: false, glucose: false, steps: false,
            }));

            for (const w of weights.data || []) days[getDayIndex(w.created_at)].weight = true;
            for (const g of glucose.data || []) days[getDayIndex(g.measured_at)].glucose = true;
            for (const s of steps.data || []) days[getDayIndex(s.created_at)].steps = true;

            setCheckinDoneThisWeek((checkins.data || []).length > 0);
            setWeekData(days);

            const todayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            setSelectedDay(todayIdx);
        } catch (err) {
            console.error('MyWeekGrid error:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return null;

    const todayIdx = (() => {
        const d = new Date().getDay();
        return d === 0 ? 6 : d - 1;
    })();
    const isCheckinWindow = todayIdx >= 4;

    return (
        <div className="glass rounded-3xl p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-sea-500" />
                <p className="text-xs text-sea-500 font-black uppercase tracking-wider">Mi Semana</p>
            </div>

            <div className="grid grid-cols-7 gap-1.5 mb-4">
                {DAYS_LABELS.map((label, idx) => {
                    const day = weekData[idx];
                    const completedCount = TRACKERS.filter(t => day[t.key]).length;
                    const isToday = idx === todayIdx;
                    const isFuture = idx > todayIdx;
                    const isSelected = selectedDay === idx;

                    return (
                        <button
                            key={idx}
                            onClick={() => setSelectedDay(isSelected ? null : idx)}
                            className={`relative flex flex-col items-center py-2 rounded-xl transition-all ${isSelected ? 'bg-sea-100 ring-2 ring-sea-400' :
                                    isToday ? 'bg-sea-50' : ''
                                } ${isFuture ? 'opacity-40' : ''}`}
                        >
                            <span className={`text-[10px] font-bold uppercase mb-1.5 ${isToday ? 'text-sea-600' : 'text-sea-400'
                                }`}>{label}</span>

                            <div className="flex flex-col gap-0.5">
                                {TRACKERS.map(tracker => (
                                    <div
                                        key={tracker.key}
                                        className={`w-4 h-1 rounded-full transition-colors ${day[tracker.key] ? tracker.bg : 'bg-slate-200'
                                            }`}
                                    />
                                ))}
                            </div>

                            {completedCount > 0 && !isFuture && (
                                <span className={`mt-1.5 text-[9px] font-black ${completedCount === 3 ? 'text-accent-500' :
                                        completedCount >= 2 ? 'text-sea-600' : 'text-sea-400'
                                    }`}>{completedCount}/3</span>
                            )}

                            {isToday && (
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent-500" />
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-sea-100">
                {TRACKERS.map(tracker => (
                    <div key={tracker.key} className="flex items-center gap-1">
                        <div className={`w-3 h-1 rounded-full ${tracker.bg}`} />
                        <span className="text-[10px] text-sea-400 font-medium">{tracker.label}</span>
                    </div>
                ))}
            </div>

            <div className="mt-3 pt-3 border-t border-sea-100 space-y-2">
                <p className="text-[10px] font-bold text-sea-400 uppercase tracking-wider">Compromisos semanales</p>

                <div className={`flex items-center justify-between rounded-xl px-3 py-2 border ${checkinDoneThisWeek ? 'bg-accent-50 border-accent-200' : 'bg-amber-50 border-amber-200'
                    }`}>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${checkinDoneThisWeek ? 'text-accent-500' : 'text-amber-500'}`} />
                        <span className="text-xs font-semibold text-slate-700">Check-in semanal (viernes a domingo)</span>
                    </div>
                    <span className={`text-[11px] font-bold ${checkinDoneThisWeek ? 'text-accent-600' : 'text-amber-600'}`}>
                        {checkinDoneThisWeek ? 'Enviado' : (isCheckinWindow ? 'Pendiente' : 'Aun no toca')}
                    </span>
                </div>

                <label className="flex items-center justify-between rounded-xl px-3 py-2 border border-slate-200 bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-sea-500" />
                        <span className="text-xs font-semibold text-slate-700">Enviar fotos de comidas (Telegram)</span>
                    </div>
                    <input
                        type="checkbox"
                        checked={manualChecks.mealPhotosSent}
                        onChange={() => toggleManualCheck('mealPhotosSent')}
                    />
                </label>

                <label className="flex items-center justify-between rounded-xl px-3 py-2 border border-slate-200 bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-sea-500" />
                        <span className="text-xs font-semibold text-slate-700">Enviar videos de entrenamiento (cuando toque)</span>
                    </div>
                    <input
                        type="checkbox"
                        checked={manualChecks.trainingVideosSent}
                        onChange={() => toggleManualCheck('trainingVideosSent')}
                    />
                </label>
            </div>

            {selectedDay !== null && (
                <div className="mt-3 pt-3 border-t border-sea-100">
                    <p className="text-xs font-bold text-sea-600 mb-2">{DAYS_FULL[selectedDay]}</p>
                    <div className="flex flex-wrap gap-2">
                        {TRACKERS.map(tracker => {
                            const Icon = tracker.icon;
                            const done = weekData[selectedDay][tracker.key];
                            return (
                                <div
                                    key={tracker.key}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${done ? `${tracker.bgLight} ${tracker.color}` : 'bg-slate-50 text-slate-300'
                                        }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {tracker.label}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

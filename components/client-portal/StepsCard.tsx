import React, { useState, useEffect } from 'react';
import { Footprints, Plus, TrendingUp, Calendar, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { parseStepsFromInput } from '../../utils/numberParsing';

interface StepsEntry {
    id: string;
    client_id: string;
    steps: number;
    date: string;
    created_at: string;
}

interface StepsCardProps {
    clientId: string;
    isClientView?: boolean; // true = portal cliente, false = vista coach
    refreshKey?: number;
    openComposerSignal?: number;
    onStepsSaved?: () => void;
}

// Compact version for coach overview
export function StepsSummary({ clientId }: { clientId: string }) {
    const [todaySteps, setTodaySteps] = useState<number | null>(null);
    const [weeklyAvg, setWeeklyAvg] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSteps = async () => {
            try {
                const { data } = await supabase
                    .from('steps_history')
                    .select('steps, date')
                    .eq('client_id', clientId)
                    .order('date', { ascending: false })
                    .limit(7);

                if (data && data.length > 0) {
                    const today = new Date().toISOString().split('T')[0];
                    const todayEntry = data.find(e => e.date === today);
                    setTodaySteps(todayEntry?.steps || null);

                    const total = data.reduce((sum, e) => sum + e.steps, 0);
                    setWeeklyAvg(Math.round(total / data.length));
                }
            } catch (err) {
                console.log('Steps not available');
            } finally {
                setLoading(false);
            }
        };
        loadSteps();
    }, [clientId]);

    if (loading) {
        return (
            <div className="flex items-center gap-3 p-3 bg-sea-50 rounded-xl border border-sea-100 animate-pulse">
                <div className="w-8 h-8 bg-accent-200 rounded-lg"></div>
                <div className="h-4 bg-accent-200 rounded w-24"></div>
            </div>
        );
    }

    if (todaySteps === null && weeklyAvg === null) {
        return (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <Footprints className="w-5 h-5 text-slate-300" />
                <span className="text-sm text-slate-400">Sin registros de pasos</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4 p-3 bg-sea-50 rounded-xl border border-sea-100">
            <div className="p-2 bg-accent-500 rounded-lg text-white">
                <Footprints className="w-5 h-5" />
            </div>
            <div className="flex gap-6">
                <div>
                    <p className="text-[10px] font-bold text-accent-600 uppercase">Hoy</p>
                    <p className="text-lg font-black text-slate-800">{todaySteps?.toLocaleString() || '-'}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-accent-500 uppercase">Media 7d</p>
                    <p className="text-lg font-black text-slate-800">{weeklyAvg?.toLocaleString() || '-'}</p>
                </div>
            </div>
        </div>
    );
}

export function StepsCard({ clientId, isClientView = true, refreshKey, openComposerSignal, onStepsSaved }: StepsCardProps) {
    const [stepsHistory, setStepsHistory] = useState<StepsEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newSteps, setNewSteps] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showHistory, setShowHistory] = useState(true);
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

    const todayDate = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    useEffect(() => {
        loadStepsHistory();
    }, [clientId, refreshKey]);

    useEffect(() => {
        if (!openComposerSignal) return;
        setIsModalOpen(true);
    }, [openComposerSignal]);

    const loadStepsHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('steps_history')
                .select('*')
                .eq('client_id', clientId)
                .order('date', { ascending: false })
                .limit(30);

            if (error) {
                // Table might not exist yet, that's ok
                console.log('Steps history table may not exist:', error.message);
                setStepsHistory([]);
            } else {
                setStepsHistory(data || []);
            }
        } catch (err) {
            console.error('Error loading steps:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedSteps = parseStepsFromInput(newSteps);
        if (!parsedSteps) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('steps_history')
                .upsert(
                    [{
                        client_id: clientId,
                        steps: parsedSteps,
                        date: selectedDate
                    }],
                    { onConflict: 'client_id,date' }
                );

            if (error) throw error;

            await loadStepsHistory();
            onStepsSaved?.();
            const savedDate = new Date(selectedDate).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short'
            });
            setSaveFeedback(`Guardado: ${parseInt(newSteps, 10).toLocaleString()} pasos (${savedDate})`);
            setIsModalOpen(false);
            setNewSteps('');
            setSelectedDate(new Date().toISOString().split('T')[0]);
            setTimeout(() => setSaveFeedback(null), 3500);
        } catch (error: any) {
            console.error('Error saving steps:', error);
            alert('Error al guardar los pasos: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate weekly average
    const calculateWeeklyAverage = () => {
        const now = new Date();
        // Set to beginning of today
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // Set to 7 days ago (including today)
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const thisWeekEntries = stepsHistory.filter(entry => {
            const entryDate = new Date(entry.date);
            // Normalize entry date to start of day for comparison
            const normalizedEntryDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
            return normalizedEntryDate >= weekAgo && normalizedEntryDate <= today;
        });

        if (thisWeekEntries.length === 0) return null;

        const total = thisWeekEntries.reduce((sum, entry) => sum + entry.steps, 0);
        return Math.round(total / thisWeekEntries.length);
    };

    const weeklyAverage = calculateWeeklyAverage();
    const todayEntry = stepsHistory.find(e => e.date === new Date().toISOString().split('T')[0]);
    const yesterdayEntry = stepsHistory.find(e => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return e.date === yesterday.toISOString().split('T')[0];
    });

    if (loading) {
        return (
            <div className="bg-sea-50 rounded-2xl p-6 border border-sea-100 animate-pulse">
                <div className="h-6 bg-accent-200 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-accent-200 rounded w-1/2"></div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-sea-50 rounded-2xl p-6 border border-sea-100 shadow-sm hover:shadow-md transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-accent-400 to-accent-500 rounded-xl text-white shadow-lg shadow-accent-200">
                            <Footprints className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Pasos Diarios</h3>
                            <p className="text-xs text-slate-500">Registro de actividad (hoy o fecha anterior)</p>
                        </div>
                    </div>
                    {isClientView && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-sm font-medium transition-all shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Registrar
                        </button>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Today */}
                    <div className="bg-white/60 rounded-xl p-4 border border-sea-100">
                        <p className="text-[10px] font-bold text-accent-600 uppercase tracking-wider mb-1">Hoy</p>
                        <p className="text-2xl font-black text-slate-800">
                            {todayEntry ? todayEntry.steps.toLocaleString() : '-'}
                        </p>
                        <p className="text-xs text-slate-500">pasos</p>
                    </div>

                    {/* Weekly Average */}
                    <div className="bg-white/60 rounded-xl p-4 border border-sea-100">
                        <p className="text-[10px] font-bold text-accent-500 uppercase tracking-wider mb-1">Media Semanal</p>
                        <p className="text-2xl font-black text-slate-800">
                            {weeklyAverage ? weeklyAverage.toLocaleString() : '-'}
                        </p>
                        <p className="text-xs text-slate-500">pasos/día</p>
                    </div>
                </div>

                {/* Yesterday comparison */}
                {yesterdayEntry && todayEntry && (
                    <div className="flex items-center gap-2 text-sm mb-4">
                        <TrendingUp className={`w-4 h-4 ${todayEntry.steps >= yesterdayEntry.steps ? 'text-green-500' : 'text-red-500'}`} />
                        <span className={todayEntry.steps >= yesterdayEntry.steps ? 'text-green-600' : 'text-red-600'}>
                            {todayEntry.steps >= yesterdayEntry.steps ? '+' : ''}
                            {(todayEntry.steps - yesterdayEntry.steps).toLocaleString()} vs ayer
                        </span>
                    </div>
                )}

                {saveFeedback && (
                    <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                        {saveFeedback}
                    </div>
                )}

                {/* History Toggle */}
                {stepsHistory.length > 0 && (
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between p-3 bg-white/50 rounded-xl border border-sea-100 hover:bg-white/80 transition-colors"
                    >
                        <span className="text-sm font-medium text-slate-600">
                            Historial ({stepsHistory.length} registros)
                        </span>
                        {showHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                )}

                {/* History List */}
                {showHistory && stepsHistory.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                        {stepsHistory.slice(0, showAllHistory ? 30 : 7).map((entry) => (
                            <div key={entry.id || entry.date} className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-sea-50">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-accent-400" />
                                    <span className="text-sm text-slate-600">
                                        {new Date(entry.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                                <span className="font-bold text-slate-800">{entry.steps.toLocaleString()} pasos</span>
                            </div>
                        ))}
                        {stepsHistory.length > 7 && (
                            <button
                                onClick={() => setShowAllHistory((v) => !v)}
                                className="w-full rounded-lg border border-sea-100 bg-white/70 px-3 py-2 text-sm font-medium text-sea-700 hover:bg-white"
                            >
                                {showAllHistory ? 'Ver menos' : 'Ver mas'}
                            </button>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {stepsHistory.length === 0 && (
                    <div className="text-center py-4">
                        <Footprints className="w-10 h-10 text-accent-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">
                            {isClientView ? 'Registra tus pasos diarios' : 'Sin registros de pasos'}
                        </p>
                    </div>
                )}
            </div>

            {/* Modal for adding steps */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 bg-sea-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-accent-500 rounded-xl text-white">
                                    <Footprints className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Registrar Pasos</h3>
                                    <p className="text-xs text-slate-500">Elige fecha y pasos</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha</label>
                                <div className="mb-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDate(todayDate)}
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${selectedDate === todayDate ? 'bg-accent-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        Hoy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDate(yesterdayDate)}
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${selectedDate === yesterdayDate ? 'bg-accent-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        Ayer
                                    </button>
                                </div>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    max={todayDate}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Número de pasos</label>
                                <input
                                    type="text"
                                    value={newSteps}
                                    onChange={(e) => setNewSteps(e.target.value)}
                                    inputMode="numeric"
                                    placeholder="Ej: 23.486"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all text-lg font-semibold"
                                    autoFocus
                                />
                                <p className="text-xs text-slate-500 mt-1">Puedes escribir 23486 o 23.486</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !parseStepsFromInput(newSteps)}
                                    className="flex-1 px-4 py-3 bg-accent-500 text-white rounded-xl font-medium hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        'Guardar'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

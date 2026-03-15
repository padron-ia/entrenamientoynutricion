import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Trophy, Lock, Sparkles } from 'lucide-react';

interface Achievement {
    id: string;
    code: string;
    title: string;
    description: string;
    icon: string;
    category: string;
}

interface ClientAchievement {
    id: string;
    achievement_id: string;
    unlocked_at: string;
    achievement: Achievement;
}

interface AchievementsCardProps {
    clientId: string;
}

export function AchievementsCard({ clientId }: AchievementsCardProps) {
    const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
    const [unlockedAchievements, setUnlockedAchievements] = useState<ClientAchievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        loadAchievements();
    }, [clientId]);

    const loadAchievements = async () => {
        setLoading(true);

        // Get all achievements
        const { data: allData } = await supabase
            .from('achievements')
            .select('*')
            .order('category');

        if (allData) setAllAchievements(allData);

        // Get client's unlocked achievements
        const { data: unlockedData } = await supabase
            .from('client_achievements')
            .select('*, achievement:achievements(*)')
            .eq('client_id', clientId);

        if (unlockedData) setUnlockedAchievements(unlockedData);
        setLoading(false);
    };

    const unlockedIds = new Set(unlockedAchievements.map(u => u.achievement_id));
    const recentUnlocked = unlockedAchievements
        .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
        .slice(0, 3);

    const AchievementBadge = ({ achievement, unlocked, date }: { achievement: Achievement; unlocked: boolean; date?: string }) => (
        <div className={`relative group ${unlocked ? '' : 'opacity-50 grayscale'}`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-transform ${unlocked
                    ? 'bg-gradient-to-br from-amber-100 to-yellow-200 shadow-lg shadow-amber-200 hover:scale-110'
                    : 'bg-slate-100'
                }`}>
                {achievement.icon}
                {!unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 rounded-2xl">
                        <Lock className="w-4 h-4 text-slate-600" />
                    </div>
                )}
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                <p className="font-bold">{achievement.title}</p>
                <p className="text-slate-300">{achievement.description}</p>
                {date && <p className="text-amber-400 mt-1">Desbloqueado: {new Date(date).toLocaleDateString('es-ES')}</p>}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 animate-pulse">
                <div className="h-8 bg-slate-100 rounded w-1/3 mb-4"></div>
                <div className="flex gap-3">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl"></div>
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl"></div>
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="glass bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-sea-100 hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Tus Logros</h3>
                        <p className="text-sm text-slate-500">
                            {unlockedAchievements.length}/{allAchievements.length} desbloqueados
                        </p>
                    </div>
                </div>
                {unlockedAchievements.length > 0 && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold animate-pulse">
                        <Sparkles className="w-3 h-3" /> {unlockedAchievements.length}
                    </div>
                )}
            </div>

            {/* Recent/All Achievements */}
            {!showAll ? (
                <>
                    {/* Show recent unlocked or first locked */}
                    <div className="flex flex-wrap gap-3 mb-4">
                        {recentUnlocked.length > 0 ? (
                            recentUnlocked.map(ua => (
                                <AchievementBadge
                                    key={ua.id}
                                    achievement={ua.achievement}
                                    unlocked={true}
                                    date={ua.unlocked_at}
                                />
                            ))
                        ) : (
                            allAchievements.slice(0, 3).map(a => (
                                <AchievementBadge key={a.id} achievement={a} unlocked={false} />
                            ))
                        )}

                        {/* Show remaining count */}
                        {allAchievements.length > 3 && (
                            <button
                                onClick={() => setShowAll(true)}
                                className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:border-sea-300 hover:text-sea-500 transition-colors"
                            >
                                +{allAchievements.length - 3}
                            </button>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Progreso</span>
                            <span>{Math.round((unlockedAchievements.length / allAchievements.length) * 100)}%</span>
                        </div>
                        <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-500"
                                style={{ width: `${(unlockedAchievements.length / allAchievements.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {recentUnlocked.length > 0 && (
                        <button
                            onClick={() => setShowAll(true)}
                            className="w-full py-3 bg-white text-sea-600 font-bold rounded-xl shadow-sm hover:shadow-md transition-all border border-sea-200"
                        >
                            Ver Todos los Logros
                        </button>
                    )}
                </>
            ) : (
                <>
                    {/* All Achievements Grid */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                        {allAchievements.map(a => (
                            <AchievementBadge
                                key={a.id}
                                achievement={a}
                                unlocked={unlockedIds.has(a.id)}
                                date={unlockedAchievements.find(u => u.achievement_id === a.id)?.unlocked_at}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => setShowAll(false)}
                        className="w-full py-3 text-slate-500 font-bold rounded-xl hover:bg-white transition-colors"
                    >
                        Mostrar Menos
                    </button>
                </>
            )}

            {/* Empty State */}
            {unlockedAchievements.length === 0 && !showAll && (
                <p className="text-center text-slate-500 text-sm py-4">
                    ¡Comienza a registrar tu progreso para desbloquear logros! 🏆
                </p>
            )}
        </div>
    );
}

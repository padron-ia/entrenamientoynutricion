import React from 'react';
import { Award, Target, Pencil } from 'lucide-react';

interface ObjectivesCardProps {
    clientId: string;
    goals: any;
    // 3 months
    isEditingGoal3: boolean;
    setIsEditingGoal3: (v: boolean) => void;
    tempGoal3: string;
    setTempGoal3: (v: string) => void;
    isSavingGoal3: boolean;
    // 6 months
    isEditingGoal6: boolean;
    setIsEditingGoal6: (v: boolean) => void;
    tempGoal6: string;
    setTempGoal6: (v: string) => void;
    isSavingGoal6: boolean;
    // 1 year
    isEditingGoal1: boolean;
    setIsEditingGoal1: (v: boolean) => void;
    tempGoal1: string;
    setTempGoal1: (v: string) => void;
    isSavingGoal1: boolean;
    handleGoalSave: (period: '3m' | '6m' | '1y') => void;
}

function GoalRow({
    period, label, color, goals, goalKey, statusKey,
    isEditing, setIsEditing, tempValue, setTempValue, isSaving,
    handleGoalSave
}: {
    period: '3m' | '6m' | '1y';
    label: string;
    color: { bg: string; text: string; border: string; editBg: string; editText: string };
    goals: any;
    goalKey: string;
    statusKey: string;
    isEditing: boolean;
    setIsEditing: (v: boolean) => void;
    tempValue: string;
    setTempValue: (v: string) => void;
    isSaving: boolean;
    handleGoalSave: (period: '3m' | '6m' | '1y') => void;
}) {
    return (
        <div className={`${color.bg} p-4 rounded-xl border ${color.border} flex gap-3`}>
            <div className="mt-0.5"><Target className={`w-4 h-4 ${color.text}`} /></div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <p className={`${color.editText} text-xs font-bold uppercase`}>{label}</p>
                    <div className="flex items-center gap-2">
                        {goals[statusKey] && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${goals[statusKey] === 'achieved' ? 'bg-accent-100 text-accent-700' :
                                goals[statusKey] === 'failed' ? 'bg-red-100 text-red-600' :
                                    'bg-white/50 text-sea-600'
                                }`}>
                                {goals[statusKey] === 'achieved' ? 'Conseguido' : goals[statusKey] === 'failed' ? 'No Conseguido' : 'Pendiente'}
                            </span>
                        )}
                        {!isEditing && (
                            <button onClick={() => { setTempValue(goals[goalKey] || ''); setIsEditing(true); }} className={`flex items-center gap-1 px-2 py-0.5 ${color.text} hover:bg-white/50 rounded-lg transition-colors`}>
                                <Pencil className="w-3 h-3" />
                                <span className="text-[10px] font-bold">Editar</span>
                            </button>
                        )}
                    </div>
                </div>
                {isEditing ? (
                    <div className="space-y-2">
                        <textarea
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="w-full p-2 text-sm border border-sea-200 rounded-lg focus:ring-2 focus:ring-accent-400 outline-none bg-white"
                            rows={2}
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleGoalSave(period)}
                                disabled={isSaving}
                                className="px-3 py-1 bg-sea-600 text-white text-xs font-bold rounded-lg hover:bg-sea-700 disabled:opacity-50"
                            >
                                {isSaving ? '...' : 'Guardar'}
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setTempValue(goals[goalKey] || '');
                                }}
                                className="px-3 py-1 bg-white text-sea-600 border border-sea-200 text-xs font-bold rounded-lg hover:bg-sea-50"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div onClick={() => { setTempValue(goals[goalKey] || ''); setIsEditing(true); }} className="cursor-pointer group/goal">
                        {goals[goalKey] ? (
                            <p className={`${color.editText} font-medium text-sm group-hover/goal:opacity-70 transition-opacity`}>{goals[goalKey]}</p>
                        ) : (
                            <p className="text-sea-300 italic text-sm">Toca para definir tu objetivo</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export function ObjectivesCard(props: ObjectivesCardProps) {
    const {
        clientId, goals,
        isEditingGoal3, setIsEditingGoal3, tempGoal3, setTempGoal3, isSavingGoal3,
        isEditingGoal6, setIsEditingGoal6, tempGoal6, setTempGoal6, isSavingGoal6,
        isEditingGoal1, setIsEditingGoal1, tempGoal1, setTempGoal1, isSavingGoal1,
        handleGoalSave,
    } = props;

    return (
        <div className="glass rounded-3xl p-6 sm:p-8 shadow-card">
            <h3 className="text-lg font-bold text-sea-900 mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-accent-500" /> Tus Objetivos
            </h3>
            <div className="space-y-4">
                <GoalRow
                    period="3m" label="3 Meses"
                    color={{ bg: 'bg-accent-50', text: 'text-accent-600', border: 'border-accent-100', editBg: 'bg-accent-600', editText: 'text-accent-800' }}
                    goals={goals} goalKey="goal_3_months" statusKey="goal_3_months_status"
                    isEditing={isEditingGoal3} setIsEditing={setIsEditingGoal3}
                    tempValue={tempGoal3} setTempValue={setTempGoal3}
                    isSaving={isSavingGoal3} handleGoalSave={handleGoalSave}
                />
                <GoalRow
                    period="6m" label="6 Meses"
                    color={{ bg: 'bg-sea-50', text: 'text-sea-600', border: 'border-sea-100', editBg: 'bg-sea-600', editText: 'text-sea-800' }}
                    goals={goals} goalKey="goal_6_months" statusKey="goal_6_months_status"
                    isEditing={isEditingGoal6} setIsEditing={setIsEditingGoal6}
                    tempValue={tempGoal6} setTempValue={setTempGoal6}
                    isSaving={isSavingGoal6} handleGoalSave={handleGoalSave}
                />
                <GoalRow
                    period="1y" label="1 Año"
                    color={{ bg: 'bg-sea-50/70', text: 'text-sea-500', border: 'border-sea-100', editBg: 'bg-sea-500', editText: 'text-sea-700' }}
                    goals={goals} goalKey="goal_1_year" statusKey="goal_1_year_status"
                    isEditing={isEditingGoal1} setIsEditing={setIsEditingGoal1}
                    tempValue={tempGoal1} setTempValue={setTempGoal1}
                    isSaving={isSavingGoal1} handleGoalSave={handleGoalSave}
                />

            </div>
        </div>
    );
}

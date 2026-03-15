import React from 'react';
import { CoachGoal, GoalCompletionStatus } from '../types';
import { CheckCircle2, XCircle, Target } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

export interface GoalAssessment {
  goalId: string;
  completionStatus: GoalCompletionStatus;
  reasonCategory?: string;
  reasonDetail?: string;
}

export interface WeeklyAssessmentData {
  goalAssessments: GoalAssessment[];
  feeling: 'green' | 'yellow' | 'red' | null;
  nextWeekDecision: 'maintain' | 'simplify' | 'change_approach' | null;
  coachNote: string;
}

interface WeeklyAssessmentSectionProps {
  activeGoals: CoachGoal[];
  onDataChange: (data: WeeklyAssessmentData) => void;
  data: WeeklyAssessmentData;
  isLocked?: boolean;
  checkinId?: string;
}

// ─── Component ──────────────────────────────────────────────

const WeeklyAssessmentSection: React.FC<WeeklyAssessmentSectionProps> = ({
  activeGoals,
  onDataChange,
  data,
  isLocked = false,
}) => {
  const updateGoal = (goalId: string, achieved: boolean, reason?: string) => {
    if (isLocked) return;
    const existing = data.goalAssessments.find(a => a.goalId === goalId);
    const updated: GoalAssessment = {
      goalId,
      completionStatus: achieved ? 'fulfilled' : 'not_fulfilled',
      reasonDetail: achieved ? undefined : (reason !== undefined ? reason : existing?.reasonDetail),
    };
    const newAssessments = data.goalAssessments.filter(a => a.goalId !== goalId);
    newAssessments.push(updated);
    onDataChange({ ...data, goalAssessments: newAssessments });
  };

  const getAssessment = (goalId: string) => data.goalAssessments.find(a => a.goalId === goalId);

  if (activeGoals.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <p className="text-xs text-slate-400 italic flex items-center gap-2">
          <Target className="w-3.5 h-3.5" /> No hay objetivos de la semana anterior para valorar
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
        <Target className="w-4 h-4 text-indigo-500" />
        Valorar objetivo de la semana pasada
      </h4>

      {activeGoals.map(goal => {
        const assessment = getAssessment(goal.id);
        const achieved = assessment?.completionStatus === 'fulfilled';
        const notAchieved = assessment?.completionStatus === 'not_fulfilled' || assessment?.completionStatus === 'partial';

        return (
          <div key={goal.id} className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
            <p className="text-sm font-medium text-slate-700">{goal.title}</p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isLocked}
                onClick={() => updateGoal(goal.id, true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-lg transition-all ${achieved
                    ? 'bg-green-100 border-green-400 text-green-700'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-green-300 hover:text-green-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Conseguido
              </button>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => updateGoal(goal.id, false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-lg transition-all ${notAchieved
                    ? 'bg-red-100 border-red-400 text-red-700'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <XCircle className="w-3.5 h-3.5" /> No conseguido
              </button>
            </div>

            {notAchieved && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="text-[10px] text-slate-500 font-medium block mb-1">¿Por qué no se consiguió?</label>
                <input
                  type="text"
                  value={assessment?.reasonDetail || ''}
                  disabled={isLocked}
                  onChange={e => updateGoal(goal.id, false, e.target.value)}
                  placeholder="Escribe el motivo..."
                  className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:border-indigo-400 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WeeklyAssessmentSection;

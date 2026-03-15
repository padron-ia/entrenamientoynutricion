import React from 'react';
import {
    Target, Scale, Activity, Award, TrendingDown, TrendingUp, Pencil
} from 'lucide-react';

interface ProgressCardProps {
    startWeight: number;
    currentWeight: number;
    targetWeight: number;
    weightProgress: number;
    remainingWeight: string;
    isWeightLoss: boolean;
    // Target weight editing
    isEditingTargetWeight: boolean;
    setIsEditingTargetWeight: (v: boolean) => void;
    tempTargetWeight: string;
    setTempTargetWeight: (v: string) => void;
    isSavingTargetWeight: boolean;
    handleTargetWeightSave: () => void;
    clientTargetWeight?: number;
}

export function ProgressCard({
    startWeight, currentWeight, targetWeight, weightProgress, remainingWeight, isWeightLoss,
    isEditingTargetWeight, setIsEditingTargetWeight, tempTargetWeight, setTempTargetWeight,
    isSavingTargetWeight, handleTargetWeightSave, clientTargetWeight,
}: ProgressCardProps) {
    return (
        <div className="relative rounded-3xl overflow-hidden group">
            {/* Deep Sea Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-sea-900 via-sea-800 to-sea-950"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-sea-500/30 to-accent-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-accent-500/20 to-sea-400/10 rounded-full blur-3xl -ml-16 -mb-16"></div>

            <div className="relative z-10 p-6 sm:p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sea-500 to-accent-500 flex items-center justify-center text-white shadow-xl shadow-sea-500/30 ring-4 ring-white/10">
                        <Target className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white">Tu Progreso</h2>
                        <p className="text-sea-200/80">
                            {Math.abs(parseFloat(remainingWeight)) > 0
                                ? `Estás a ${remainingWeight} kg de tu meta`
                                : '¡Has alcanzado tu objetivo! 🎉'}
                        </p>
                    </div>
                </div>

                {/* Weight Cards */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
                    {/* Inicial */}
                    <div className="text-center p-4 sm:p-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="w-8 h-8 mx-auto mb-2 rounded-xl bg-sea-700/50 flex items-center justify-center">
                            <Scale className="w-4 h-4 text-sea-300" />
                        </div>
                        <p className="text-sea-300 text-[10px] sm:text-xs uppercase font-bold tracking-wider mb-1">Inicial</p>
                        <p className="text-2xl sm:text-3xl font-bold text-white">{startWeight}</p>
                        <p className="text-xs text-sea-400 font-medium">kg</p>
                    </div>

                    {/* Actual - Highlighted */}
                    <div className="text-center p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sea-500/20 to-accent-500/20 backdrop-blur-sm border-2 border-accent-400/50 shadow-xl shadow-accent-500/20 relative overflow-hidden transform hover:scale-[1.02] transition-transform">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sea-400 via-accent-400 to-accent-300"></div>
                        <div className="w-8 h-8 mx-auto mb-2 rounded-xl bg-accent-500/30 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-accent-300" />
                        </div>
                        <p className="text-accent-300 text-[10px] sm:text-xs uppercase font-bold tracking-wider mb-1">Actual</p>
                        <p className="text-3xl sm:text-4xl font-bold text-white">{currentWeight}</p>
                        <p className="text-xs text-accent-300 font-medium">kg</p>
                    </div>

                    {/* Objetivo */}
                    <div
                        className={`text-center p-4 sm:p-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 transition-colors relative ${!isEditingTargetWeight ? 'cursor-pointer hover:bg-white/10' : ''}`}
                        onClick={() => { if (!isEditingTargetWeight) { setTempTargetWeight(clientTargetWeight?.toString() || ''); setIsEditingTargetWeight(true); } }}
                    >
                        <div className="w-8 h-8 mx-auto mb-2 rounded-xl bg-accent-700/50 flex items-center justify-center">
                            <Award className="w-4 h-4 text-accent-400" />
                        </div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <p className="text-sea-300 text-[10px] sm:text-xs uppercase font-bold tracking-wider">Objetivo</p>
                            {!isEditingTargetWeight && (
                                <Pencil className="w-2.5 h-2.5 text-accent-400" />
                            )}
                        </div>

                        {isEditingTargetWeight ? (
                            <div className="flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={tempTargetWeight}
                                    onChange={(e) => setTempTargetWeight(e.target.value)}
                                    className="w-20 bg-sea-800 text-white text-center font-bold p-1 rounded border border-accent-500 text-lg"
                                    autoFocus
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleTargetWeightSave}
                                        disabled={isSavingTargetWeight}
                                        className="p-1 px-2 bg-accent-500 text-white text-[10px] font-bold rounded hover:bg-accent-400"
                                    >
                                        {isSavingTargetWeight ? '...' : 'Guardar'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditingTargetWeight(false);
                                            setTempTargetWeight(clientTargetWeight?.toString() || '');
                                        }}
                                        className="p-1 px-2 bg-sea-700 text-white text-[10px] font-bold rounded hover:bg-sea-600"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-2xl sm:text-3xl font-bold text-accent-400">{targetWeight}</p>
                                <p className="text-xs text-accent-500/70 font-medium">kg</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div>
                    <div className="flex justify-between text-sm mb-3 font-medium">
                        <span className="text-white flex items-center gap-2">
                            <span className="w-2 h-2 bg-accent-400 rounded-full animate-pulse"></span>
                            {weightProgress}% completado
                        </span>
                        <span className={`flex items-center gap-1 ${isWeightLoss ? 'text-accent-400' : 'text-sea-300'}`}>
                            {isWeightLoss ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                            {remainingWeight} kg restantes
                        </span>
                    </div>
                    <div className="w-full bg-sea-800/50 rounded-full h-4 sm:h-5 overflow-hidden backdrop-blur-sm border border-white/5">
                        <div
                            className="h-full rounded-full shadow-lg transition-all duration-1000 ease-out relative bg-gradient-to-r from-sea-500 via-accent-500 to-accent-400"
                            style={{ width: `${weightProgress}%` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

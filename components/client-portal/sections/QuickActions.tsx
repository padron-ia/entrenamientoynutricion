import React from 'react';
import { Scale, ChevronRight, Zap, Dumbbell } from 'lucide-react';

interface QuickActionsProps {
    setIsWeightModalOpen: (open: boolean) => void;
    setActiveView: (view: string) => void;
    activeView: string;
}

export function QuickActions({ setIsWeightModalOpen, setActiveView, activeView }: QuickActionsProps) {
    return (
        <div className="glass rounded-3xl p-6 shadow-card border border-sea-100/50 lg:sticky lg:top-24">
            <h3 className="text-lg font-bold text-sea-900 mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent-500 fill-accent-500" /> Acciones Rápidas
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                <button
                    onClick={() => setIsWeightModalOpen(true)}
                    className="col-span-2 flex items-center justify-between p-4 rounded-2xl bg-sea-900 text-white shadow-lg shadow-sea-200 hover:bg-sea-800 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl"><Scale className="w-5 h-5" /></div>
                        <div className="text-left">
                            <p className="font-bold text-sm">Registrar Peso</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                    onClick={() => activeView !== 'training' && setActiveView('training')}
                    className="col-span-2 flex items-center justify-between p-4 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl"><Dumbbell className="w-5 h-5" /></div>
                        <div className="text-left">
                            <p className="font-bold text-sm">Entrenamiento de Hoy</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import {
    X,
    Loader2,
    AlertCircle,
    Check,
    Coffee,
    Sun,
    Moon,
    Cookie,
    FileText,
    ChevronDown,
    ChevronUp,
    Utensils,
    Flame,
    Upload
} from 'lucide-react';
import { nutritionService } from '../../services/nutritionService';
import { NutritionPlan, RecipeCategory } from '../../types';

interface BlockMealImporterProps {
    currentUser: any;
    onSuccess: (plan: NutritionPlan) => void;
    onClose: () => void;
}

interface BlockData {
    id: RecipeCategory | 'intro';
    label: string;
    icon: React.FC<any>;
    color: string;
    bgColor: string;
    placeholder: string;
}

const BLOCKS: BlockData[] = [
    {
        id: 'intro',
        label: 'Introducción del Plan',
        icon: FileText,
        color: 'text-slate-600',
        bgColor: 'bg-slate-100',
        placeholder: `Pegar aquí la introducción, objetivos, instrucciones generales...`
    },
    {
        id: 'breakfast',
        label: 'Desayunos',
        icon: Coffee,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        placeholder: `Pegar aquí todas las opciones de desayuno...`
    },
    {
        id: 'lunch',
        label: 'Comidas',
        icon: Sun,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        placeholder: `Pegar aquí todas las opciones de comida...`
    },
    {
        id: 'dinner',
        label: 'Cenas',
        icon: Moon,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
        placeholder: `Pegar aquí todas las opciones de cena...`
    },
    {
        id: 'snack',
        label: 'Snacks',
        icon: Cookie,
        color: 'text-pink-600',
        bgColor: 'bg-pink-100',
        placeholder: `Pegar aquí las opciones de snacks...`
    }
];

export function BlockMealImporter({ currentUser, onSuccess, onClose }: BlockMealImporterProps) {
    const [step, setStep] = useState<'input' | 'preview'>('input');
    const [planName, setPlanName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [blocks, setBlocks] = useState<Record<string, string>>({
        intro: '',
        breakfast: '',
        lunch: '',
        dinner: '',
        snack: ''
    });

    const handleConfirmImport = async () => {
        if (!planName.trim()) return;

        try {
            setIsSubmitting(true);

            // 1. Create the plan with text blocks directly
            const newPlan = await nutritionService.createPlan({
                name: planName,
                description: 'Plan importado por bloques',
                created_by: currentUser.id,
                target_calories: 0, // Optional or extract from text if needed, but keeping simple
                // Text Blocks
                intro_content: blocks.intro,
                breakfast_content: blocks.breakfast,
                lunch_content: blocks.lunch,
                dinner_content: blocks.dinner,
                snack_content: blocks.snack
            });

            onSuccess(newPlan);
        } catch (error) {
            console.error('Error importing plan:', error);
            alert('Error al importar el plan');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Upload className="w-6 h-6 text-emerald-600" />
                            Importar Plan por Bloques
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Pega el texto completo para cada sección. Se guardará tal cual lo escribas.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Plan Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nombre del Plan *
                        </label>
                        <input
                            type="text"
                            value={planName}
                            onChange={(e) => setPlanName(e.target.value)}
                            placeholder="Ej: Plan Digestivo - Fase 1"
                            className="w-full px-4 py-3 text-lg border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {BLOCKS.map((block) => (
                            <div key={block.id} className={`p-4 rounded-xl border border-slate-200 ${block.bgColor} bg-opacity-30`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className={`p-2 rounded-lg bg-white shadow-sm ${block.color}`}>
                                        <block.icon className="w-5 h-5" />
                                    </div>
                                    <h3 className={`font-bold ${block.color}`}>{block.label}</h3>
                                </div>
                                <textarea
                                    value={blocks[block.id]}
                                    onChange={(e) => setBlocks(prev => ({ ...prev, [block.id]: e.target.value }))}
                                    placeholder={block.placeholder}
                                    className="w-full h-48 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none font-mono text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 font-medium rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirmImport}
                        disabled={!planName.trim() || isSubmitting}
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                Crear Plan
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

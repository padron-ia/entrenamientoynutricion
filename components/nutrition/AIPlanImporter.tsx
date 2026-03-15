import React, { useState } from 'react';
import { Sparkles, X, Loader2, AlertCircle, Copy, Check, ChevronRight, Utensils, Flame, Zap, FileText } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { nutritionService } from '../../services/nutritionService';

interface AIPlanImporterProps {
    currentUser: any;
    onSuccess: (plan: any) => void;
    onClose: () => void;
}

type Step = 'setup' | 'generating' | 'preview';

export function AIPlanImporter({ currentUser, onSuccess, onClose }: AIPlanImporterProps) {
    const [step, setStep] = useState<Step>('setup');
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<any>(null);

    // Prompt Configuration
    const [config, setConfig] = useState({
        calories: '1400',
        conditions: 'Protección Digestiva (sin carne roja, biliar)',
        notes: 'Adaptado a productos de España, alta saciedad.'
    });

    const generateSystemPrompt = (isAnalysis: boolean) => {
        const base = `Actúa como un experto nutricionista clínico y un ingeniero de datos.`;

        const structure = `
        {
          "plan": {
            "name": "Nombre descriptivo (ej: Dieta ${config.calories}kcal - ${config.conditions})",
            "description": "Resumen nutricional",
            "target_calories": ${parseInt(config.calories) || 1400},
            "diet_type": "Flexible | Control Glucémico | Sin Gluten + Sin Lactosa | Digestivo Sensible | Vegetariano | Sin Carne Roja | Pescetariano | Fácil / Baja Adherencia | Especial Clínico",
            "target_month": ${new Date().getMonth() + 1},
            "target_fortnight": ${new Date().getDate() <= 15 ? 1 : 2},
            "tags": ["${config.calories}kcal", "IA_Generated", "${config.conditions}"],
            "instructions": "Consejos detallados del coach (mínimo 3 párrafos)"
          },
          "recipes": [
            {
              "category": "breakfast" | "lunch" | "dinner" | "snack",
              "name": "Nombre",
              "preparation": "Paso a paso",
              "ingredients": [{"name": "Ingrediente", "quantity": "X", "unit": "g/unidad"}],
              "calories": 350,
              "protein": 25,
              "carbs": 30,
              "fat": 10
            }
          ]
        }`;

        if (isAnalysis) {
            return `${base} Analiza el texto proporcionado y conviértelo EXACTAMENTE a este JSON: ${structure}`;
        }

        return `${base} Genera un plan nutricional COMPLETO de 1 semana (6 recetas por categoría: desayuno, comida, cena, merienda) basado en:
        - Calorías: ${config.calories}
        - Condición: ${config.conditions}
        - Notas: ${config.notes}
        - Mes: ${new Date().toLocaleString('es-ES', { month: 'long' })}
        
        Devuelve SOLO el objeto JSON con esta estructura: ${structure}`;
    };

    const runAI = async (prompt: string) => {
        const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
        if (!apiKey) throw new Error('API Key de Gemini no configurada');

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonText = response.text();

        // Sanitize JSON
        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonText);
    }

    const handleDirectGenerate = async () => {
        try {
            setLoading(true);
            setError(null);
            setStep('generating');

            const data = await runAI(generateSystemPrompt(false));
            setPreviewData(data);
            setStep('preview');
        } catch (err: any) {
            console.error('AI error:', err);
            setError(err.message || 'Error al generar con IA');
            setStep('setup');
        } finally {
            setLoading(false);
        }
    };

    const handleManualAnalyze = async () => {
        if (!text.trim()) return;
        try {
            setLoading(true);
            setError(null);

            const data = await runAI(`${generateSystemPrompt(true)}\n\nTexto a analizar:\n${text}`);
            setPreviewData(data);
            setStep('preview');
        } catch (err: any) {
            setError(err.message || 'Error al analizar el texto');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        try {
            setLoading(true);

            // 1. Create Plan
            const uniqueness = await nutritionService.validatePlanRecipeUniqueness({
                diet_type: previewData.plan.diet_type,
                target_calories: previewData.plan.target_calories,
                target_month: previewData.plan.target_month,
                target_fortnight: previewData.plan.target_fortnight,
                recipeNames: (previewData.recipes || []).map((r: any) => r.name),
                maxOverlapPct: 20
            });

            if (uniqueness.checked && !uniqueness.isValid) {
                throw new Error(
                    `El plan IA repite demasiadas recetas frente a la quincena anterior (${uniqueness.overlapPct}%). ` +
                    `Plan previo: ${uniqueness.previousPlanName || 'N/A'}.`
                );
            }

            const newPlan = await nutritionService.createPlan({
                ...previewData.plan,
                created_by: currentUser.id
            });

            // 2. Create Recipes Batch
            const recipes = previewData.recipes.map((r: any, idx: number) => ({
                ...r,
                plan_id: newPlan.id,
                position: idx
            }));

            await nutritionService.createRecipesBatch(recipes);

            onSuccess(newPlan);
        } catch (err: any) {
            setError(err.message || 'Error al guardar el plan');
        } finally {
            setLoading(false);
        }
    };

    const getMasterPromptForClipboard = () => {
        return `Eres un experto nutricionista clínico de la Padron Trainer. Genera un plan nutricional magistral con estas especificaciones:

PARÁMETROS CRÍTICOS:
- Objetivo Calórico: ${config.calories} kcal/día.
- Situación Médica: ${config.conditions}.
- Preferencias/Notas: ${config.notes}.
- Temporada: ${new Date().toLocaleString('es-ES', { month: 'long' })}.

ESTRUCTURA DEL PLAN (7 RECETAS POR CATEGORÍA):
1. Desayunos (Nutritivos y saciantes)
2. Comidas (Equilibradas, ricas en proteína)
3. Cenas (Ligeras pero completas)
4. Snacks/Meriendas (Opciones rápidas y saludables)

REQUISITOS POR RECETA:
- Título creativo y sugerente.
- Lista de ingredientes con gramos/cantidades exactas.
- Instrucciones de preparación paso a paso.
- Desglose macro: Calorías, Proteínas (g), Grasas (g), Hidratos (g).

RECOMENDACIONES GENERALES:
- Incluye una sección de "Instrucciones del Coach" al final con consejos sobre hidratación, masticación y suplementación si aplica.
- Estilo de redacción: Profesional, motivador y claro.`;
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20">
                {/* Header */}
                <div className="p-8 bg-gradient-to-br from-indigo-600 via-blue-600 to-emerald-500 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/30">
                                <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">AI Nutrition Architect</h2>
                                <p className="text-blue-100 font-medium opacity-90">Crea planes magistrales en segundos</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-all hover:rotate-90">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                    {step === 'setup' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-bottom-4">
                            {/* Configuration */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black">1</div>
                                    <h3 className="text-xl font-bold text-slate-800">Definir Parámetros</h3>
                                </div>
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Calorías</label>
                                            <div className="relative">
                                                <Flame className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                                                <input
                                                    type="text"
                                                    value={config.calories}
                                                    onChange={e => setConfig(prev => ({ ...prev, calories: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700"
                                                    placeholder="1400"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Objetivo</label>
                                            <div className="relative">
                                                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                                <input
                                                    type="text"
                                                    value={config.conditions}
                                                    onChange={e => setConfig(prev => ({ ...prev, conditions: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700"
                                                    placeholder="Ej: Bajar grasa"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrucciones Extra</label>
                                        <textarea
                                            value={config.notes}
                                            onChange={e => setConfig(prev => ({ ...prev, notes: e.target.value }))}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm h-32 resize-none leading-relaxed text-slate-600 font-medium"
                                            placeholder="Detalla alergias, gustos o temporada..."
                                        />
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={handleDirectGenerate}
                                            disabled={loading}
                                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-500/25 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                            GENERAR PLAN DIRECTO CON IA
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(getMasterPromptForClipboard());
                                                alert("Instrucción copiada con éxito 🚀");
                                            }}
                                            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                                        >
                                            <Copy className="w-4 h-4" /> Copiar para Gemini Externo
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Manual Input */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">2</div>
                                    <h3 className="text-xl font-bold text-slate-800">Importar Texto</h3>
                                </div>
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full min-h-[400px]">
                                    <textarea
                                        value={text}
                                        onChange={e => setText(e.target.value)}
                                        placeholder="Si usaste Gemini externo, pega el resultado aquí para procesarlo..."
                                        className="flex-1 w-full p-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-mono leading-relaxed text-slate-600 resize-none mb-4"
                                    />
                                    <button
                                        onClick={handleManualAnalyze}
                                        disabled={!text.trim() || loading}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                                        ANALIZAR Y PREVISUALIZAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'generating' && (
                        <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-500">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse rounded-full" />
                                <Loader2 className="w-24 h-24 text-blue-600 animate-spin relative z-10" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 mt-8">Arquitectando tu plan...</h3>
                            <p className="text-slate-500 font-medium mt-2">Nuestra IA está diseñando las recetas perfectas para tu paciente.</p>
                            <div className="mt-10 flex gap-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'preview' && previewData && (
                        <div className="animate-in slide-in-from-right-4 duration-500 space-y-8 pb-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setStep('setup')} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                        <X className="w-6 h-6" />
                                    </button>
                                    <h3 className="text-2xl font-black text-slate-800">Previsualización del Plan</h3>
                                </div>
                                <div className="flex gap-3">
                                    <span className="px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-black flex items-center gap-2">
                                        <Flame className="w-4 h-4" /> {previewData.plan.target_calories} kcal
                                    </span>
                                    <span className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-black flex items-center gap-2">
                                        <Utensils className="w-4 h-4" /> {previewData.recipes.length} Recetas
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left: Info & Instructions */}
                                <div className="lg:col-span-1 space-y-6">
                                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Detalles del Plan</h4>
                                        <p className="text-xl font-black text-slate-800 leading-tight mb-4">{previewData.plan.name}</p>
                                        <div className="space-y-4">
                                            <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-indigo-500">
                                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Descripción</p>
                                                <p className="text-sm text-slate-600 font-medium">{previewData.plan.description}</p>
                                            </div>
                                            <div className="bg-indigo-50/50 p-4 rounded-xl border-l-4 border-emerald-500">
                                                <p className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                                    <FileText className="w-3 h-3" /> Recomendaciones IA
                                                </p>
                                                <p className="text-sm text-slate-700 leading-relaxed italic line-clamp-6">
                                                    {previewData.plan.instructions}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Recipes List */}
                                <div className="lg:col-span-2 space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {previewData.recipes.map((recipe: any, idx: number) => (
                                        <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:border-blue-200 transition-all group">
                                            <div className="flex gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg ${recipe.category === 'breakfast' ? 'bg-amber-400' :
                                                    recipe.category === 'lunch' ? 'bg-orange-500' :
                                                        recipe.category === 'dinner' ? 'bg-indigo-600' : 'bg-emerald-500'
                                                    }`}>
                                                    {recipe.category.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h5 className="font-bold text-slate-800 text-lg">{recipe.name}</h5>
                                                        <span className="text-xs font-black text-slate-400 uppercase">{recipe.category}</span>
                                                    </div>
                                                    <div className="flex gap-3 text-xs font-bold">
                                                        <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg">{recipe.calories} kcal</span>
                                                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">P: {recipe.protein}g</span>
                                                        <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">F: {recipe.fat}g</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Sticky Footer for Preview */}
                            <div className="sticky bottom-0 bg-slate-50 pt-6 border-t border-slate-200 flex justify-end gap-4">
                                <button
                                    onClick={() => setStep('setup')}
                                    className="px-6 py-3 text-slate-500 font-bold hover:text-slate-800 transition-colors"
                                >
                                    Corregir Parámetros
                                </button>
                                <button
                                    onClick={handleConfirmImport}
                                    disabled={loading}
                                    className="px-12 py-3 bg-gradient-to-r from-emerald-600 to-green-500 text-white rounded-[1.5rem] font-black shadow-xl shadow-green-500/30 flex items-center gap-3 transition-all active:scale-95"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    CONFIRMAR Y GUARDAR PLAN
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mx-8 mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

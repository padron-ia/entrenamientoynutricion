import React, { useState } from 'react';
import { Sparkles, X, Loader2, AlertCircle, Copy, Check, Calendar, Dumbbell, Target, Zap, FileText, ChevronRight } from 'lucide-react';
import { trainingService } from '../../services/trainingService';
import { TrainingProgram, Workout, ProgramDay, ProgramActivity } from '../../types';

interface AIProgramImporterProps {
    currentUser: any;
    onSuccess: (program: TrainingProgram) => void;
    onClose: () => void;
}

type Step = 'setup' | 'preview';

export function AIProgramImporter({ currentUser, onSuccess, onClose }: AIProgramImporterProps) {
    const [step, setStep] = useState<Step>('setup');
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<any>(null);

    // Configuration
    const [config, setConfig] = useState({
        goal: 'Pérdida de Grasa y Mantenimiento de Masa Muscular',
        level: 'Intermedio',
        equipment: 'Gimnasio completo o Mancuernas y Bancos',
        daysPerWeek: '4',
        weeks: '4',
        notes: 'Priorizar entrenamiento de fuerza con énfasis en glúteo y core. Adaptado para mujer.'
    });

    const handleManualAnalyze = async () => {
        if (!text.trim()) return;

        try {
            setLoading(true);
            setError(null);

            // Cleanup the input text - more robust regex
            let jsonText = text.trim();

            // Try to find a JSON block first
            const jsonBlockMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonBlockMatch) {
                jsonText = jsonBlockMatch[0];
            } else {
                // Fallback: strip markdown markers
                jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
            }

            const data = JSON.parse(jsonText);

            if (!data.program || !data.days) {
                throw new Error('El formato JSON no es válido. Falta "program" o "days".');
            }

            setPreviewData(data);
            setStep('preview');
        } catch (err: any) {
            console.error('Parsing error:', err);
            setError('El texto no es un código JSON válido. Asegúrate de copiar el bloque de código completo que generó Gemini.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Create the Program
            const program = await trainingService.saveProgram({
                ...previewData.program,
                created_by: currentUser.id
            });

            // 2. Process Days and Workouts
            for (const dayData of previewData.days) {
                let workoutId = undefined;

                if (dayData.activity.type === 'workout' && dayData.activity.workout_data) {
                    // Pre-resolve exercise names to real exercise IDs
                    const resolvedBlocks = [];
                    for (const block of dayData.activity.workout_data.blocks) {
                        const resolvedExercises = [];
                        for (const exData of block.exercises) {
                            const exercise = await trainingService.findOrCreateExercise(exData.exercise_name);
                            resolvedExercises.push({
                                ...exData,
                                exercise_id: exercise.id
                            });
                        }
                        resolvedBlocks.push({
                            ...block,
                            exercises: resolvedExercises
                        });
                    }

                    // Create the workout with resolved IDs
                    const savedWorkout = await trainingService.saveWorkout({
                        ...dayData.activity.workout_data,
                        blocks: resolvedBlocks,
                        created_by: currentUser.id
                    });
                    workoutId = savedWorkout.id;
                }

                // Add day to program
                await trainingService.addProgramDay(program.id, {
                    week_number: dayData.week_number,
                    day_number: dayData.day_number,
                    activities: [{
                        type: dayData.activity.type,
                        activity_id: workoutId,
                        title: dayData.activity.title,
                        description: dayData.activity.description,
                        position: 0
                    }] as any[]
                });
            }

            // Fetch the full program with its days to return it
            const programs = await trainingService.getPrograms();
            const fullProgram = programs.find(p => p.id === program.id);

            onSuccess(fullProgram || program);
        } catch (err: any) {
            console.error('Save error:', err);
            setError(err.message || 'Error al guardar el programa');
        } finally {
            setLoading(false);
        }
    };

    const getJsonStructureOnly = () => {
        return `{
  "program": {
    "name": "Nombre del Programa",
    "description": "Breve resumen",
    "weeks_count": ${config.weeks}
  },
  "days": [
    {
      "week_number": 1,
      "day_number": 1,
      "activity": {
        "type": "workout",
        "title": "Nombre del Entrenamiento",
        "description": "Enfoque del día",
        "workout_data": {
          "name": "Nombre Entrenamiento",
          "blocks": [
            {
              "name": "Calentamiento / Principal / Vuelta a calma",
              "structure_type": "lineal | superserie | circuito (opcional, por defecto lineal)",
              "exercises": [
                { "exercise_name": "Nombre Ejercicio", "superset_id": "OPCIONAL: un_string_identico_para_agrupar_superseries", "sets": 3, "reps": "12", "rest_seconds": 60, "notes": "" }
              ]
            }
          ]
        }
      }
    }
  ]
}`;
    };

    const getMasterPromptForClipboard = () => {
        const structure = getJsonStructureOnly();

        return `Actúa como un preparador físico de alto rendimiento y experto en análisis de datos. Tu tarea es diseñar una planificación detallada y entregarla EXCLUSIVAMENTE en un bloque de código JSON válido.

REGLAS CRÍTICAS:
1. No escribas introducciones, ni explicaciones, ni conclusiones. SOLO el JSON.
2. Usa el idioma ESPAÑOL para todos los textos.
3. Respeta estrictamente la estructura de datos proporcionada.
4. Asegúrate de que todos los días de entrenamiento estén incluidos dentro del array "days".
5. Puedes declarar el tipo de bloque con "structure_type": "lineal", "superserie" o "circuito".
6. Si deseas agrupar ejercicios en una superserie, asígnales el mismo valor en el campo "superset_id" (por ejemplo, "superset-1") a los ejercicios y colócalos consecutivos dentro del mismo bloque. Si no es superserie, omite "superset_id".

CONTEXTO DEL ATLETA:
- Objetivo: ${config.goal}
- Nivel actual: ${config.level}
- Material disponible: ${config.equipment}
- Frecuencia: ${config.daysPerWeek} días por semana
- Duración total: ${config.weeks} semanas
- Notas de salud/preferencias: ${config.notes}

ESTRUCTURA JSON REQUERIDA (Sigue este esquema exacto):
${structure}

IMPORTANTE: Verifica que el JSON sea válido antes de enviarlo. El bloque debe comenzar con { y terminar con }.`;
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20">
                {/* Header */}
                <div className="p-8 bg-gradient-to-br from-brand-green via-emerald-600 to-teal-500 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/30">
                                <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">AI Training Architect</h2>
                                <p className="text-emerald-50 font-medium opacity-90">Diseña planificaciones de élite con Gemini</p>
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
                                    <div className="w-10 h-10 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center font-black">1</div>
                                    <h3 className="text-xl font-bold text-slate-800">Definir Parámetros</h3>
                                </div>
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Objetivo</label>
                                            <div className="relative">
                                                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-green" />
                                                <input
                                                    type="text"
                                                    value={config.goal}
                                                    onChange={e => setConfig(prev => ({ ...prev, goal: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-green transition-all font-bold text-slate-700"
                                                    placeholder="Ej: Fuerza máxima"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nivel</label>
                                            <div className="relative">
                                                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                                <select
                                                    value={config.level}
                                                    onChange={e => setConfig(prev => ({ ...prev, level: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-green transition-all font-bold text-slate-700 appearance-none"
                                                >
                                                    <option>Principiante</option>
                                                    <option>Intermedio</option>
                                                    <option>Avanzado</option>
                                                    <option>Atleta Contienda</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Días/Semana</label>
                                            <input
                                                type="number"
                                                value={config.daysPerWeek}
                                                onChange={e => setConfig(prev => ({ ...prev, daysPerWeek: e.target.value }))}
                                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-green transition-all font-bold text-slate-700"
                                                min="1" max="7"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Semanas Totales</label>
                                            <input
                                                type="number"
                                                value={config.weeks}
                                                onChange={e => setConfig(prev => ({ ...prev, weeks: e.target.value }))}
                                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-green transition-all font-bold text-slate-700"
                                                min="1" max="12"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Equipamiento</label>
                                        <input
                                            type="text"
                                            value={config.equipment}
                                            onChange={e => setConfig(prev => ({ ...prev, equipment: e.target.value }))}
                                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-green transition-all font-medium text-slate-600"
                                            placeholder="Gym, Casa, Bandas..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas del Coach</label>
                                        <textarea
                                            value={config.notes}
                                            onChange={e => setConfig(prev => ({ ...prev, notes: e.target.value }))}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-green transition-all text-sm h-24 resize-none leading-relaxed text-slate-600 font-medium"
                                            placeholder="Detalla lesiones, preferencias..."
                                        />
                                    </div>

                                    <div className="space-y-3 pt-4">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(getMasterPromptForClipboard());
                                                alert("Instrucciones completas copiadas 🚀");
                                            }}
                                            className="w-full py-5 bg-gradient-to-r from-brand-green to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-black shadow-xl shadow-brand-green/25 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                                        >
                                            <Copy className="w-5 h-5" /> COPIAR PROMPT PARA GEMINI
                                        </button>

                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(getJsonStructureOnly());
                                                alert("Estructura JSON copiada 📄");
                                            }}
                                            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                                        >
                                            <FileText className="w-4 h-4" /> Sólo copiar estructura JSON
                                        </button>

                                        <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">Usa la estructura si ya tienes la rutina y solo quieres formatearla</p>
                                    </div>
                                </div>
                            </div>

                            {/* Manual Input */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">2</div>
                                    <h3 className="text-xl font-bold text-slate-800">Importar Texto</h3>
                                </div>
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full min-h-[400px]">
                                    <textarea
                                        value={text}
                                        onChange={e => setText(e.target.value)}
                                        placeholder="Pega aquí el código JSON generado por Gemini..."
                                        className="flex-1 w-full p-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm font-mono leading-relaxed text-slate-600 resize-none mb-4"
                                    />
                                    <button
                                        onClick={handleManualAnalyze}
                                        disabled={!text.trim() || loading}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                                        ANALIZAR Y PREVISUALIZAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && previewData && (
                        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="px-4 py-1.5 bg-brand-green text-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-green/20">
                                            Vista Previa del Programa
                                        </div>
                                        <div className="px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            {previewData.program.weeks_count} Semanas
                                        </div>
                                    </div>
                                    <h3 className="text-4xl font-black mb-2">{previewData.program.name}</h3>
                                    <p className="text-slate-300 text-lg font-medium max-w-2xl">{previewData.program.description}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {previewData.days.map((day: any, idx: number) => (
                                    <div key={idx} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                                        <div className="p-6 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex flex-col items-center justify-center border border-slate-100">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase leading-none">Sem</span>
                                                    <span className="text-lg font-black text-brand-green leading-none">{day.week_number}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-800 flex items-center gap-2">
                                                        Día {day.day_number}: {day.activity.title}
                                                        {day.activity.type === 'workout' && <Dumbbell className="w-4 h-4 text-brand-green" />}
                                                    </h4>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{day.activity.description}</p>
                                                </div>
                                            </div>
                                            <div className="px-4 py-2 bg-white rounded-xl border border-slate-100 text-xs font-bold text-slate-500">
                                                {day.activity.type === 'workout' ? 'Entrenamiento' : 'Actividad'}
                                            </div>
                                        </div>

                                        {day.activity.type === 'workout' && day.activity.workout_data && (
                                            <div className="p-6 space-y-6">
                                                {day.activity.workout_data.blocks.map((block: any, bIdx: number) => (
                                                    <div key={bIdx} className="space-y-3">
                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                            <div className="h-px flex-1 bg-slate-100" />
                                                            {block.name}
                                                            <div className="h-px flex-1 bg-slate-100" />
                                                        </h5>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {block.exercises.map((ex: any, eIdx: number) => (
                                                                <div key={eIdx} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between hover:bg-white hover:border-brand-green/30 transition-all group/ex">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-xs font-black text-slate-400 group-hover/ex:text-brand-green transition-colors">
                                                                            {eIdx + 1}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-slate-700 text-sm">{ex.exercise_name}</p>
                                                                            <p className="text-[10px] font-semibold text-slate-400">
                                                                                {ex.sets} × {ex.reps} {ex.notes && `• ${ex.notes}`}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-[10px] font-black text-slate-400 tabular-nums">
                                                                        {ex.rest_seconds}s rest
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-white px-8">
                    {step === 'preview' ? (
                        <>
                            <button
                                onClick={() => setStep('setup')}
                                className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all"
                            >
                                Volver a ajustar
                            </button>
                            <div className="flex items-center gap-3">
                                {error && (
                                    <div className="flex items-center gap-2 text-rose-500 px-4 font-bold text-sm bg-rose-50 py-2 rounded-xl border border-rose-100 animate-in slide-in-from-right-4">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}
                                <button
                                    onClick={handleConfirmImport}
                                    disabled={loading}
                                    className="px-10 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black shadow-xl flex items-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    CONFIRMAR E IMPORTAR PROGRAMA
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-400 font-medium text-sm italic">
                            <AlertCircle className="w-4 h-4" />
                            Asegúrate de copiar el código completo desde Gemini
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

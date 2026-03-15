import React, { useState, useEffect } from 'react';
import {
    Dumbbell, Play, Youtube, Info,
    ArrowLeft, CheckCircle2, Loader2, Sparkles, MessageSquare, History
} from 'lucide-react';
import { Client, AssessmentTest } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface TrainingAssessmentProps {
    client: Client;
    onBack: () => void;
    onComplete: () => void;
}

export function TrainingAssessment({ client, onBack, onComplete }: TrainingAssessmentProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tests, setTests] = useState<AssessmentTest[]>([]);
    const [responses, setResponses] = useState<Record<string, string>>(
        client.property_assessment_responses || {}
    );
    const [experience, setExperience] = useState(client.training?.activityLevel || 'Nula/Poca');

    useEffect(() => {
        fetchTests();
    }, []);

    async function fetchTests() {
        try {
            const { data, error } = await supabase
                .from('assessment_tests')
                .select('*')
                .eq('active', true)
                .order('order_index', { ascending: true });

            if (error) throw error;
            setTests(data || []);
        } catch (err) {
            console.error('Error fetching assessment tests:', err);
        } finally {
            setIsLoading(false);
        }
    }

    const handleNoteChange = (testId: string, value: string) => {
        setResponses(prev => ({
            ...prev,
            [testId]: value
        }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('clientes_pt_notion')
                .update({
                    property_assessment_responses: responses,
                    property_actividad_f_sica_general_cliente: experience,
                })
                .eq('id', client.id);

            if (error) throw error;
            onComplete();
        } catch (err) {
            console.error('Error saving training assessment:', err);
            alert("Error al guardar los datos de entrenamiento.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                <p className="text-slate-500 font-medium">Cargando tests de valoración...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* 1. Experiencia Previa (Se mantiene como cabecera) */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-500" /> 1. Tu Experiencia Previa
                </h3>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3 text-center">Nivel de experiencia en fuerza</label>
                    <div className="flex flex-wrap justify-center gap-3">
                        {['Nula/Poca', 'Intermedio (meses)', 'Avanzado (+1 año)', 'Atleta de competición'].map(level => (
                            <button
                                key={level}
                                onClick={() => setExperience(level)}
                                className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all ${experience === level ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'}`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* 2. Tests Dinámicos (Vídeo + Notas) */}
            <section className="space-y-8">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Play className="w-5 h-5 text-blue-500" /> 2. Realiza estos Tests de Técnica
                </h3>

                <div className="space-y-10">
                    {tests.map((test, index) => (
                        <div key={test.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden border-l-4 border-l-blue-500">
                            <div className="grid grid-cols-1 lg:grid-cols-2">
                                {/* Video Side */}
                                <div className="aspect-video bg-slate-900 relative">
                                    <iframe
                                        className="w-full h-full"
                                        src={`https://www.youtube.com/embed/${test.youtube_id}`}
                                        title={test.title}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                    <div className="absolute top-4 left-4 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                                        {index + 1}
                                    </div>
                                </div>

                                {/* Content Side */}
                                <div className="p-6 flex flex-col justify-between space-y-4">
                                    <div>
                                        <h4 className="text-xl font-bold text-slate-900 mb-2">{test.title}</h4>
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100/50">
                                            <p className="text-sm text-slate-600 leading-relaxed italic">
                                                "{test.description}"
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            <MessageSquare className="w-3 h-3" /> Tus notas / sensaciones:
                                        </label>
                                        <textarea
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm outline-none focus:bg-white focus:border-blue-500 transition-all min-h-[100px]"
                                            placeholder="¿Cómo te has sentido? ¿Alguna molestia?"
                                            value={responses[test.id] || ''}
                                            onChange={(e) => handleNoteChange(test.id, e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" /> Volver a Nutrición
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || tests.length === 0}
                    className="group bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Guardando Finalización...
                        </>
                    ) : (
                        <>
                            Finalizar Valoración <CheckCircle2 className="w-5 h-5" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

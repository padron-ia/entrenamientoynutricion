import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Client, AssessmentTest } from '../types';
import { supabase } from '../services/supabaseClient';
import { useToast } from './ToastProvider';

interface AssessmentTabProps {
    client: Client;
    onRequestNew: () => void;
}

export const AssessmentTab: React.FC<AssessmentTabProps> = ({ client, onRequestNew }) => {
    const [tests, setTests] = useState<AssessmentTest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const toast = useToast();

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
            console.error('Error fetching tests:', err);
        } finally {
            setIsLoading(false);
        }
    }

    const responses = client.property_assessment_responses || {};
    const hasCompleted = client.onboarding_phase2_completed;
    const completedAt = client.onboarding_phase2_completed_at;

    return (
        <div className="space-y-6">
            {/* Status Card */}
            <div className={`rounded-2xl p-6 border-2 ${hasCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${hasCompleted ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                            {hasCompleted ? (
                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            ) : (
                                <Clock className="w-6 h-6 text-amber-600" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">
                                {hasCompleted ? 'Valoración Completada' : 'Valoración Pendiente'}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                {hasCompleted
                                    ? `Completada el ${new Date(completedAt || '').toLocaleDateString('es-ES')}`
                                    : 'El cliente aún no ha completado su valoración profunda.'
                                }
                            </p>
                        </div>
                    </div>
                    {hasCompleted && (
                        <button
                            onClick={onRequestNew}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all active:scale-95"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Solicitar Nueva
                        </button>
                    )}
                </div>
            </div>

            {/* Responses */}
            {hasCompleted && (
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Respuestas del Cliente</h4>

                    {isLoading ? (
                        <div className="text-center py-8 text-slate-400">Cargando tests...</div>
                    ) : tests.length === 0 ? (
                        <div className="bg-slate-50 rounded-xl p-8 text-center">
                            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-500">No hay tests configurados</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {tests.map((test) => (
                                <div key={test.id} className="bg-white border border-slate-200 rounded-xl p-5">
                                    <div className="flex items-start gap-3 mb-3">
                                        <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <h5 className="font-bold text-slate-900">{test.title}</h5>
                                            <p className="text-xs text-slate-500 italic mt-1">"{test.description}"</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notas del Cliente:</p>
                                        <p className="text-sm text-slate-700 leading-relaxed">
                                            {responses[test.id] || <span className="text-slate-400 italic">Sin respuesta</span>}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!hasCompleted && (
                <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
                    <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="font-bold text-slate-900 mb-1">Esperando Valoración</h4>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                        El cliente verá el portal de valoración la próxima vez que inicie sesión.
                    </p>
                </div>
            )}
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { Users, Star, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';

interface Props {
    formData: any;
    updateField: (field: string, value: any) => void;
}

interface Coach {
    id: string;
    name: string;
}

export function CoachSelectionStep({ formData, updateField }: Props) {
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCoaches();
    }, []);

    const loadCoaches = async () => {
        try {
            const { data } = await supabase
                .from('coach_capacity_view')
                .select('id, name, status, available_for_assignment')
                .order('name');

            if (data) {
                // Coaches excluidos del formulario de registro
                const excludedNames = ['Jesús'];
                // Coaches que siempre deben aparecer
                const requiredNames = ['Esperanza', 'Juan', 'Leticia'];

                const activeCoaches = (data as any[]).filter(c =>
                    (c.status === 'active' || c.available_for_assignment || requiredNames.some(name => c.name?.toLowerCase().includes(name.toLowerCase()))) &&
                    !excludedNames.some(name => c.name?.toLowerCase().includes(name.toLowerCase()))
                ).map(c => ({ id: c.id, name: c.name }));
                setCoaches(activeCoaches);
            }
        } catch (err) {
            console.error('Error loading coaches:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Elige tu Coach</h3>
                <p className="text-slate-600">Selecciona el coach que te acompañará en tu proceso</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-accent-600" />
                    <span className="ml-3 text-slate-600">Cargando coaches disponibles...</span>
                </div>
            ) : coaches.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                    <p className="text-amber-800 font-medium">No hay coaches disponibles en este momento. Por favor, contacta con nosotros.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {coaches.map(coach => {
                        const isSelected = formData.coachId === coach.id;
                        return (
                            <button
                                key={coach.id}
                                type="button"
                                onClick={() => {
                                    updateField('coachId', coach.id);
                                    updateField('coachName', coach.name);
                                }}
                                className={`relative p-5 rounded-xl border-2 text-left transition-all ${isSelected
                                    ? 'border-accent-500 bg-accent-50 shadow-lg'
                                    : 'border-slate-200 bg-white hover:border-accent-300 hover:shadow-md'
                                    }`}
                            >
                                {isSelected && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="w-6 h-6 text-accent-600" />
                                    </div>
                                )}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${isSelected ? 'bg-accent-600' : 'bg-slate-400'
                                        }`}>
                                        {coach.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{coach.name}</h4>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { Client, EndocrinoReview, User } from '../types';
import { mockDb } from '../services/mockSupabase';
import { Calendar, ClipboardList, Send, Plus, X, ListTodo, History } from 'lucide-react';
import { useToast } from './ToastProvider';

interface EndocrinoAssessmentSectionProps {
    client: Client;
    currentUser?: User;
}

const EndocrinoAssessmentSection: React.FC<EndocrinoAssessmentSectionProps> = ({ client, currentUser }) => {
    const { toast } = useToast();
    const [reviews, setReviews] = useState<EndocrinoReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        fecha_revision: new Date().toISOString().split('T')[0],
        valoracion_situacion: '',
        plan_accion: ''
    });

    useEffect(() => {
        if (client?.id) {
            loadReviews();
        }
    }, [client?.id]);

    const loadReviews = async () => {
        setLoading(true);
        try {
            const data = await mockDb.endocrino.getByClient(client.id);
            setReviews(data);
        } catch (err) {
            console.error('Error loading endocrino reviews:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.valoracion_situacion || !formData.plan_accion) {
            toast.error('Por favor, completa todos los campos.');
            return;
        }

        setSubmitting(true);
        try {
            await mockDb.endocrino.create({
                client_id: client.id,
                doctor_id: currentUser?.id,
                ...formData
            });
            toast.success('Valoración guardada correctamente.');
            await loadReviews();
            setShowForm(false);
            setFormData({
                fecha_revision: new Date().toISOString().split('T')[0],
                valoracion_situacion: '',
                plan_accion: ''
            });
        } catch (err) {
            console.error('Error saving review:', err);
            toast.error('Error al guardar la valoración.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Historial de Valoración Endocrino</h3>
                        <p className="text-xs text-slate-500">Registro de revisiones y planes de acción</p>
                    </div>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md shadow-indigo-100"
                    >
                        <Plus className="w-4 h-4" /> Nueva Revisión
                    </button>
                )}
            </div>

            {/* FORMULARIO */}
            {showForm && (
                <div className="bg-white rounded-xl border-2 border-indigo-100 overflow-hidden shadow-lg animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex justify-between items-center">
                        <span className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Registrar Nueva Valoración
                        </span>
                        <button onClick={() => setShowForm(false)} className="text-indigo-400 hover:text-indigo-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Fecha de Revisión</label>
                                <input
                                    type="date"
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    value={formData.fecha_revision}
                                    onChange={e => setFormData({ ...formData, fecha_revision: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Valoración de la Situación</label>
                                <textarea
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[80px]"
                                    placeholder="Describe el estado actual del paciente..."
                                    value={formData.valoracion_situacion}
                                    onChange={e => setFormData({ ...formData, valoracion_situacion: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Plan de Acción</label>
                                <textarea
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[80px]"
                                    placeholder="Pasos a seguir, cambios en medicación, objetivos..."
                                    value={formData.plan_accion}
                                    onChange={e => setFormData({ ...formData, plan_accion: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-slate-500 text-sm font-bold hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
                            >
                                {submitting ? 'Guardando...' : <><Send className="w-4 h-4" /> Guardar Valoración</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* HISTÓRICO */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4"></div>
                        <p className="text-sm">Cargando histórico...</p>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
                        <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-slate-600 font-bold">Sin revisiones registradas</h4>
                        <p className="text-slate-400 text-sm">Añade la primera valoración para este cliente.</p>
                    </div>
                ) : (
                    <div className="space-y-4 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-100 before:h-full">
                        {reviews.map((review, idx) => (
                            <div key={review.id} className="relative pl-12 animate-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                <div className="absolute left-3 top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm z-10"></div>
                                <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-100">
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-indigo-500" />
                                            <span className="text-sm font-bold text-slate-700">{new Date(review.fecha_revision).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                <ListTodo className="w-3 h-3" /> Valoración de la Situación
                                            </h4>
                                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                {review.valoracion_situacion}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                                <Send className="w-3 h-3" /> Plan de Acción
                                            </h4>
                                            <div className="bg-indigo-50/30 rounded-lg p-3 border border-indigo-50">
                                                <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-wrap font-medium">
                                                    {review.plan_accion}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EndocrinoAssessmentSection;

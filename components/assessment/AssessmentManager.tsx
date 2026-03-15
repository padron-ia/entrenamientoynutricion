import React, { useState, useEffect } from 'react';
import {
    Plus, Edit2, Trash2, Youtube, GripVertical,
    Save, X, Loader2, Play, Info, CheckCircle2,
    Settings, Layout, ArrowUp, ArrowDown
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { AssessmentTest } from '../../types';
import { useToast } from '../ToastProvider';

export const AssessmentManager: React.FC = () => {
    const [tests, setTests] = useState<AssessmentTest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingTest, setEditingTest] = useState<Partial<AssessmentTest> | null>(null);
    const toast = useToast();

    useEffect(() => {
        fetchTests();
    }, []);

    async function fetchTests() {
        try {
            const { data, error } = await supabase
                .from('assessment_tests')
                .select('*')
                .order('order_index', { ascending: true });

            if (error) throw error;
            setTests(data || []);
        } catch (err) {
            console.error('Error fetching tests:', err);
            toast.error("Error al cargar los tests");
        } finally {
            setIsLoading(false);
        }
    }

    const handleSave = async () => {
        if (!editingTest?.title || !editingTest?.youtube_id) {
            toast.error("El título y el ID de YouTube son obligatorios");
            return;
        }

        setIsSaving(true);
        try {
            if (editingTest.id) {
                // Update
                const { error } = await supabase
                    .from('assessment_tests')
                    .update({
                        title: editingTest.title,
                        description: editingTest.description,
                        youtube_id: editingTest.youtube_id,
                        order_index: editingTest.order_index
                    })
                    .eq('id', editingTest.id);
                if (error) throw error;
                toast.success("Test actualizado");
            } else {
                // Create
                const { error } = await supabase
                    .from('assessment_tests')
                    .insert([{
                        ...editingTest,
                        order_index: (tests.length + 1)
                    }]);
                if (error) throw error;
                toast.success("Test creado");
            }
            setEditingTest(null);
            fetchTests();
        } catch (err) {
            console.error('Error saving test:', err);
            toast.error("Error al guardar el test");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar este test?")) return;

        try {
            const { error } = await supabase
                .from('assessment_tests')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast.success("Test eliminado");
            fetchTests();
        } catch (err) {
            console.error('Error deleting test:', err);
            toast.error("Error al eliminar el test");
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <Loader2 className="w-10 h-10 animate-spin text-slate-400 mb-4" />
                <p className="text-slate-500 font-medium tracking-tight">Cargando gestión de valoración...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
                        <Settings className="w-8 h-8 text-slate-400" />
                        Gestión de Valoración
                    </h1>
                    <p className="text-slate-500 mt-1">Configura los vídeos y explicaciones que verán los alumnos en su Onboarding.</p>
                </div>
                <button
                    onClick={() => setEditingTest({ title: '', description: '', youtube_id: '', category: 'training' })}
                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 whitespace-nowrap"
                >
                    <Plus className="w-5 h-5" /> Añadir Nuevo Test
                </button>
            </div>

            {/* List of Tests */}
            <div className="grid gap-6">
                {tests.map((test, index) => (
                    <div key={test.id} className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm hover:shadow-md transition-shadow group flex flex-col md:flex-row gap-6">
                        {/* Video Preview */}
                        <div className="w-full md:w-64 aspect-video bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-100 flex-shrink-0">
                            <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${test.youtube_id}`}
                                title={test.title}
                                frameBorder="0"
                            ></iframe>
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            Test #{index + 1}
                                        </span>
                                        <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            {test.category}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900">{test.title}</h3>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setEditingTest(test)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                        title="Editar"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(test.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 line-clamp-2 italic">"{test.description}"</p>
                            <div className="flex items-center gap-4 pt-2">
                                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                                    <Youtube className="w-4 h-4" /> ID: {test.youtube_id}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {tests.length === 0 && (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-20 text-center">
                        <Layout className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-900">No hay tests configurados</h2>
                        <p className="text-slate-500 max-w-xs mx-auto mt-1">Empieza añadiendo tu primer test de valoración para los vídeos de bienvenida.</p>
                    </div>
                )}
            </div>

            {/* Modal de Edición */}
            {editingTest && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-slate-900">
                                    {editingTest.id ? 'Editar Test' : 'Añadir Nuevo Test'}
                                </h2>
                                <button onClick={() => setEditingTest(null)} className="p-2 hover:bg-slate-100 rounded-2xl transition-all">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Título del Test</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-slate-900 transition-all font-medium"
                                        placeholder="Ej: Análisis de Sentadilla"
                                        value={editingTest.title || ''}
                                        onChange={(e) => setEditingTest({ ...editingTest, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ID de YouTube</label>
                                    <div className="relative">
                                        <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-slate-900 transition-all font-mono"
                                            placeholder="q5p1K-o3068"
                                            value={editingTest.youtube_id || ''}
                                            onChange={(e) => setEditingTest({ ...editingTest, youtube_id: e.target.value })}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Copia solo el código que aparece después de "v=" en la URL de YouTube.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Explicación Técnica</label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-slate-900 transition-all min-h-[100px] leading-relaxed"
                                        placeholder="Describe en qué debe fijarse el alumno mientras realiza el test..."
                                        value={editingTest.description || ''}
                                        onChange={(e) => setEditingTest({ ...editingTest, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setEditingTest(null)}
                                    className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

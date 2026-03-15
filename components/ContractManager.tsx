import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { FileText, Plus, Save, History, Check, AlertCircle, Edit3, Trash2 } from 'lucide-react';
import { useToast } from './ToastProvider';

interface ContractTemplate {
    id: string;
    name: string;
    content: string;
    version: number;
    is_active: boolean;
    created_at: string;
    created_by: string;
}

interface ContractManagerProps {
    currentUser: {
        id: string;
        name: string;
    };
}

export function ContractManager({ currentUser }: ContractManagerProps) {
    const [templates, setTemplates] = useState<ContractTemplate[]>([]);
    const [editingTemplate, setEditingTemplate] = useState<Partial<ContractTemplate> | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('contract_templates')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (err: any) {
            toast.error('Error al cargar plantillas: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingTemplate?.name || !editingTemplate?.content) {
            toast.error('Por favor completa el nombre y el contenido');
            return;
        }

        setIsSaving(true);
        try {
            if (editingTemplate.id) {
                // Update - We follow user's request: "cada cambio pueda quedar registrado como una nueva versión"
                // So instead of strictly updating, we should create a new record if we want version history, 
                // but let's just update for now or implement a simple versioning logic.
                // The user said: "cada cambio pueda quedar registrado como una nueva versión del contrato".
                // This means we should probably insert a NEW row with an incremented version if it's an "update".

                const { data: current } = await supabase
                    .from('contract_templates')
                    .select('version')
                    .eq('id', editingTemplate.id)
                    .single();

                const newVersion = (current?.version || 1) + 1;

                // Deactivate old one? Or just keep it. 
                // User says: "el closer puyeda elegir el contrato que envía".

                const { error } = await supabase
                    .from('contract_templates')
                    .insert([{
                        name: editingTemplate.name,
                        content: editingTemplate.content,
                        version: newVersion,
                        is_active: true,
                        created_by: currentUser.name || 'Admin'
                    }]);

                if (error) throw error;
                toast.success('Nueva versión del contrato guardada');
            } else {
                // New
                const { error } = await supabase
                    .from('contract_templates')
                    .insert([{
                        name: editingTemplate.name,
                        content: editingTemplate.content,
                        version: 1,
                        is_active: true,
                        created_by: currentUser.name || 'Admin'
                    }]);
                if (error) throw error;
                toast.success('Plantilla de contrato creada');
            }
            setEditingTemplate(null);
            loadTemplates();
        } catch (err: any) {
            toast.error('Error al guardar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleActive = async (template: ContractTemplate) => {
        try {
            const { error } = await supabase
                .from('contract_templates')
                .update({ is_active: !template.is_active })
                .eq('id', template.id);

            if (error) throw error;
            loadTemplates();
            toast.success('Estado actualizado');
        } catch (err: any) {
            toast.error('Error: ' + err.message);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Gestión de Contratos</h2>
                    <p className="text-slate-500 text-sm">Administra las versiones y el contenido de los contratos legales.</p>
                </div>
                {!editingTemplate && (
                    <button
                        onClick={() => setEditingTemplate({ name: '', content: '', version: 1 })}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all"
                    >
                        <Plus className="w-4 h-4" /> Nueva Plantilla
                    </button>
                )}
            </div>

            {editingTemplate ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b pb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Edit3 className="w-5 h-5 text-blue-600" />
                            {editingTemplate.id ? `Editando: ${editingTemplate.name} (v${editingTemplate.version})` : 'Nueva Plantilla'}
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditingTemplate(null)}
                                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Guardar Versión'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre de la Plantilla</label>
                            <input
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                                value={editingTemplate.name}
                                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                placeholder="Ej: Contrato Estándar 2024"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-slate-500 uppercase block">Contenido legal</label>
                                <span className="text-[10px] text-slate-400 font-mono">Usa [DIA], [MES], [AÑO], [NOMBRE_CLIENTE], [DNI_CLIENTE], [DOMICILIO_CLIENTE], [DURACION_MESES] como variables.</span>
                            </div>
                            <textarea
                                className="w-full h-96 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-serif text-sm leading-relaxed"
                                value={editingTemplate.content}
                                onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                                placeholder="Escribe aquí el texto legal completo..."
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {loading ? (
                        <div className="p-12 text-center text-slate-400">Cargando plantillas...</div>
                    ) : templates.length === 0 ? (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">No hay plantillas de contrato creadas aún.</p>
                        </div>
                    ) : (
                        templates.map((template) => (
                            <div key={template.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all group shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className={`p-3 rounded-xl ${template.is_active ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-slate-800">{template.name}</h4>
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">v{template.version}</span>
                                                {!template.is_active && (
                                                    <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-bold">Inactivo</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 font-medium italic">
                                                Publicado el {new Date(template.created_at).toLocaleDateString()} por {template.created_by}
                                            </p>
                                            <p className="text-sm text-slate-600 mt-2 line-clamp-2 max-w-2xl">
                                                {template.content.substring(0, 200)}...
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingTemplate(template)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            title="Editar / Nueva Versión"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => toggleActive(template)}
                                            className={`p-2 rounded-lg transition-all ${template.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}
                                            title={template.is_active ? 'Desactivar' : 'Activar'}
                                        >
                                            <Check className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

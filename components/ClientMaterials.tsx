import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { ClientMaterial, User } from '../types';
import { FileText, Link as LinkIcon, Video, Trash2, Plus, ExternalLink, Download, File, Loader2, Lock, Globe } from 'lucide-react';
import { useToast } from './ToastProvider';
import { UserRole } from '../types';

interface ClientMaterialsProps {
    clientId: string;
    currentUser: User;
    readOnly?: boolean;
}

const ClientMaterials: React.FC<ClientMaterialsProps> = ({ clientId, currentUser, readOnly = false }) => {
    const [materials, setMaterials] = useState<ClientMaterial[]>([]);
    const [libraryMaterials, setLibraryMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const { toast } = useToast();

    const [newMaterial, setNewMaterial] = useState({
        title: '',
        type: 'document' as 'link' | 'document' | 'video',
        url: '',
        is_public: true
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const isStaff = [UserRole.ADMIN, UserRole.COACH, UserRole.HEAD_COACH, UserRole.DIRECCION, UserRole.DIETITIAN].includes(currentUser.role);
    // Clients can read, but only Staff can edit. The 'readOnly' prop might come from parent, but we enforce role check too.
    const canEdit = isStaff && !readOnly;

    useEffect(() => {
        fetchMaterials();
    }, [clientId]);

    const fetchMaterials = async () => {
        try {
            setLoading(true);

            // Fetch client-specific materials
            const { data: clientData, error: clientError } = await supabase
                .from('client_materials')
                .select('*')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false });

            if (clientError) console.error('Error fetching client materials:', clientError);

            const formattedClientData = (clientData || []).map((item: any) => ({
                ...item,
                creator_name: 'Staff',
                source: 'client'
            }));

            setMaterials(formattedClientData);

            // Fetch global library materials (active only)
            const { data: libraryData, error: libraryError } = await supabase
                .from('materials_library')
                .select('*')
                .eq('is_active', true)
                .order('category', { ascending: true })
                .order('sort_order', { ascending: true });

            if (libraryError) console.error('Error fetching library materials:', libraryError);

            setLibraryMaterials(libraryData || []);
        } catch (error: any) {
            console.error('Error fetching materials:', error);
            toast.error('Error al cargar materiales');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (file: File): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${clientId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('client-materials')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('client-materials')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error: any) {
            console.error("Upload error details:", error);
            throw new Error(error.message || "Error subiendo archivo");
        }
    };

    const handleAddMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMaterial.title) return toast.error('Debes poner un título');

        setIsUploading(true);
        try {
            let finalUrl = newMaterial.url;

            if (newMaterial.type === 'document' && selectedFile) {
                const url = await handleFileUpload(selectedFile);
                if (!url) throw new Error('Error al subir archivo');
                finalUrl = url;
            } else if (newMaterial.type !== 'document' && !newMaterial.url) {
                return toast.error('Debes indicar una URL');
            }

            const { error } = await supabase.from('client_materials').insert({
                client_id: clientId,
                created_by: currentUser.id,
                title: newMaterial.title,
                type: newMaterial.type,
                url: finalUrl,
                is_public: newMaterial.is_public
            });

            if (error) throw error;

            toast.success('Material añadido correctamente');
            setShowAddModal(false);
            setNewMaterial({ title: '', type: 'document', url: '', is_public: true });
            setSelectedFile(null);
            fetchMaterials();
        } catch (error: any) {
            console.error('Error adding material:', error);
            toast.error('Error al guardar: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string, url: string, type: string) => {
        if (!window.confirm('¿Seguro que quieres eliminar este material?')) return;

        try {
            // If it's a file in storage key, try to delete it?
            // Extract path from URL if it matches our bucket
            if (type === 'document' && url.includes('client-materials')) {
                try {
                    const path = url.split('client-materials/').pop();
                    if (path) {
                        await supabase.storage.from('client-materials').remove([path]);
                    }
                } catch (e) {
                    console.warn("Could not delete file from storage, deleting record anyway", e);
                }
            }

            const { error } = await supabase.from('client_materials').delete().eq('id', id);
            if (error) throw error;

            toast.success('Eliminado correctamente');
            fetchMaterials();
        } catch (error: any) {
            toast.error('Error al eliminar');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'video': return <Video className="w-5 h-5 text-rose-500" />;
            case 'link': return <LinkIcon className="w-5 h-5 text-blue-500" />;
            case 'document':
            default: return <FileText className="w-5 h-5 text-amber-500" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {canEdit && (
                <div className="flex items-center justify-end">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                    >
                        <Plus className="w-4 h-4" />
                        Añadir Material
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            ) : (
                <>
                    {/* Client-specific materials */}
                    {materials.length > 0 && (
                        <>
                            {isStaff && <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Materiales del Cliente</h3>}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                {materials.map((item) => (
                                    <div key={item.id} className="group bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full">
                                        <div>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-slate-100 transition-colors">
                                                    {getIcon(item.type)}
                                                </div>
                                                {canEdit && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleDelete(item.id, item.url, item.type)}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <h4 className="font-bold text-slate-800 mb-1 line-clamp-2" title={item.title}>{item.title}</h4>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                                {item.is_public ? (
                                                    <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-1" title="Visible para el cliente">
                                                        <Globe className="w-3 h-3" /> Público
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded ml-1" title="Solo visible para Staff">
                                                        <Lock className="w-3 h-3" /> Privado
                                                    </span>
                                                )}
                                            </div>
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline decoration-2 underline-offset-2"
                                            >
                                                {item.type === 'document' ? 'Descargar' : 'Abrir'}
                                                {item.type === 'document' ? <Download className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Global library materials */}
                    {libraryMaterials.length > 0 && (
                        <>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
                                {materials.length > 0 ? 'Biblioteca de Recursos' : 'Materiales y Recursos'}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {libraryMaterials.map((item) => (
                                    <div key={item.id} className="group bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full">
                                        <div>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="p-2 bg-white/80 rounded-lg group-hover:bg-white transition-colors">
                                                    {getIcon(item.type)}
                                                </div>
                                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full uppercase">
                                                    {item.category || 'General'}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-slate-800 mb-1 line-clamp-2" title={item.title}>{item.title}</h4>
                                            {item.description && (
                                                <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                                            )}
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-indigo-100/50 flex items-center justify-end">
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline decoration-2 underline-offset-2"
                                            >
                                                {item.type === 'document' ? 'Descargar' : 'Abrir'}
                                                {item.type === 'document' ? <Download className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Empty state */}
                    {materials.length === 0 && libraryMaterials.length === 0 && (
                        <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-slate-400">No hay materiales compartidos todavía.</p>
                        </div>
                    )}
                </>
            )}

            {/* MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800">Añadir Nuevo Material</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleAddMaterial} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
                                <input
                                    type="text"
                                    value={newMaterial.title}
                                    onChange={e => setNewMaterial({ ...newMaterial, title: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Ej: Pautas Nutricionales, Video de Bienvenida..."
                                    required
                                />
                            </div>


                            {/* Type Selector - Segmented Control */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Material</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setNewMaterial({ ...newMaterial, type: 'document' })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${newMaterial.type === 'document'
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        <FileText className="w-4 h-4" />
                                        Archivo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewMaterial({ ...newMaterial, type: 'link' })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${newMaterial.type === 'link'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        <LinkIcon className="w-4 h-4" />
                                        Enlace
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewMaterial({ ...newMaterial, type: 'video' })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${newMaterial.type === 'video'
                                            ? 'bg-white text-rose-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        <Video className="w-4 h-4" />
                                        Video
                                    </button>
                                </div>
                            </div>

                            {/* Visibility */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Visibilidad</label>
                                <div className="relative">
                                    <select
                                        value={newMaterial.is_public ? "true" : "false"}
                                        onChange={e => setNewMaterial({ ...newMaterial, is_public: e.target.value === 'true' })}
                                        className="w-full pl-3 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none cursor-pointer"
                                    >
                                        <option value="true">Público (Visible para el Cliente)</option>
                                        <option value="false">Privado (Solo visible para Staff)</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                    {newMaterial.type === 'document' ? 'Archivo' : 'URL'}
                                </label>

                                {newMaterial.type === 'document' ? (
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                                        <input
                                            type="file"
                                            onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        {selectedFile ? (
                                            <div className="flex items-center justify-center gap-2 text-indigo-600 font-medium">
                                                <FileCheck className="w-5 h-5" />
                                                <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
                                            </div>
                                        ) : (
                                            <div className="text-slate-400 text-sm">
                                                <p>Haz clic para subir un archivo</p>
                                                <p className="text-xs mt-1 opacity-70">PDF, JPG, PNG, DOCX...</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <input
                                        type="url"
                                        value={newMaterial.url}
                                        onChange={e => setNewMaterial({ ...newMaterial, url: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="https://..."
                                        required={newMaterial.type !== 'document'}
                                    />
                                )}
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="flex-1 px-4 py-2 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                                >
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    {isUploading ? 'Guardando...' : 'Guardar Material'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Missing icon fix
const FileCheck = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="m9 15 2 2 4-4" />
    </svg>
);

export default ClientMaterials;

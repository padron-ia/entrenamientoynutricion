import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { User, UserRole } from '../types';
import {
    FileText, Video, Link as LinkIcon, Music, Plus, Trash2, Edit3, Search,
    ExternalLink, Download, X, Loader2, FolderOpen, Tag, Upload, Globe
} from 'lucide-react';
import { useToast } from './ToastProvider';

interface MaterialItem {
    id: string;
    created_by: string;
    title: string;
    description: string;
    type: 'link' | 'document' | 'video' | 'audio';
    url: string;
    category: string;
    tags: string[];
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
    creator_name?: string;
}

interface MaterialsLibraryProps {
    currentUser: User;
}

const CATEGORIES = [
    { value: 'general', label: 'General' },
    { value: 'nutricion', label: 'Nutrición' },
    { value: 'ejercicio', label: 'Ejercicio' },
    { value: 'diabetes', label: 'Diabetes' },
    { value: 'motivacion', label: 'Motivación' },
    { value: 'recetas', label: 'Recetas' },
    { value: 'guias', label: 'Guías' },
    { value: 'videos', label: 'Videos Formativos' },
];

const TYPE_ICONS = {
    document: FileText,
    video: Video,
    link: LinkIcon,
    audio: Music,
};

const TYPE_COLORS = {
    document: 'bg-blue-100 text-blue-600',
    video: 'bg-purple-100 text-purple-600',
    link: 'bg-emerald-100 text-emerald-600',
    audio: 'bg-amber-100 text-amber-600',
};

export default function MaterialsLibrary({ currentUser }: MaterialsLibraryProps) {
    const { toast } = useToast();
    const [materials, setMaterials] = useState<MaterialItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [uploading, setUploading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'link' as 'link' | 'document' | 'video' | 'audio',
        url: '',
        category: 'general',
        tags: '',
        is_active: true,
    });

    const canEdit = [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH, UserRole.DIRECCION].includes(currentUser.role);

    useEffect(() => {
        loadMaterials();
    }, []);

    const loadMaterials = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('materials_library')
                .select(`
                    *,
                    users!created_by(name)
                `)
                .order('category', { ascending: true })
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;

            setMaterials((data || []).map(m => ({
                ...m,
                creator_name: m.users?.name || 'Sistema'
            })));
        } catch (err) {
            console.error('Error loading materials:', err);
            toast.error('Error al cargar los materiales');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (file: File) => {
        setUploading(true);
        try {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const ext = file.name.split('.').pop();
            const filePath = `library/${timestamp}_${random}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('client-materials')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('client-materials')
                .getPublicUrl(filePath);

            setFormData(prev => ({
                ...prev,
                url: urlData.publicUrl,
                title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
                type: 'document'
            }));

            toast.success('Archivo subido correctamente');
        } catch (err) {
            console.error('Upload error:', err);
            toast.error('Error al subir el archivo');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim() || !formData.url.trim()) {
            toast.error('Título y URL son obligatorios');
            return;
        }

        try {
            const materialData = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                type: formData.type,
                url: formData.url.trim(),
                category: formData.category,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                is_active: formData.is_active,
                created_by: currentUser.id,
            };

            if (editingMaterial) {
                const { error } = await supabase
                    .from('materials_library')
                    .update(materialData)
                    .eq('id', editingMaterial.id);
                if (error) throw error;
                toast.success('Material actualizado');
            } else {
                const { error } = await supabase
                    .from('materials_library')
                    .insert(materialData);
                if (error) throw error;
                toast.success('Material añadido');
            }

            setShowModal(false);
            resetForm();
            loadMaterials();
        } catch (err) {
            console.error('Error saving material:', err);
            toast.error('Error al guardar el material');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este material?')) return;

        try {
            const { error } = await supabase
                .from('materials_library')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast.success('Material eliminado');
            loadMaterials();
        } catch (err) {
            console.error('Error deleting:', err);
            toast.error('Error al eliminar');
        }
    };

    const handleEdit = (material: MaterialItem) => {
        setEditingMaterial(material);
        setFormData({
            title: material.title,
            description: material.description || '',
            type: material.type,
            url: material.url,
            category: material.category,
            tags: material.tags?.join(', ') || '',
            is_active: material.is_active,
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingMaterial(null);
        setFormData({
            title: '',
            description: '',
            type: 'link',
            url: '',
            category: 'general',
            tags: '',
            is_active: true,
        });
    };

    const filteredMaterials = materials.filter(m => {
        const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = filterCategory === 'all' || m.category === filterCategory;
        const matchesType = filterType === 'all' || m.type === filterType;
        return matchesSearch && matchesCategory && matchesType;
    });

    const groupedMaterials = filteredMaterials.reduce((acc, m) => {
        const cat = m.category || 'general';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(m);
        return acc;
    }, {} as Record<string, MaterialItem[]>);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <FolderOpen className="w-6 h-6 text-indigo-600" />
                        </div>
                        Biblioteca de Materiales
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Materiales disponibles para todos los clientes
                    </p>
                </div>

                {canEdit && (
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Añadir Material
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar materiales..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Todas las categorías</option>
                        {CATEGORIES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Todos los tipos</option>
                        <option value="document">Documentos</option>
                        <option value="video">Videos</option>
                        <option value="link">Enlaces</option>
                        <option value="audio">Audio</option>
                    </select>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : filteredMaterials.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-600 mb-2">No hay materiales</h3>
                    <p className="text-slate-500">
                        {searchTerm || filterCategory !== 'all' || filterType !== 'all'
                            ? 'No se encontraron materiales con esos filtros'
                            : 'Añade el primer material a la biblioteca'}
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedMaterials).map(([category, items]) => {
                        const categoryInfo = CATEGORIES.find(c => c.value === category);
                        return (
                            <div key={category}>
                                <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <Tag className="w-5 h-5 text-slate-400" />
                                    {categoryInfo?.label || category}
                                    <span className="text-sm font-normal text-slate-400">({items.length})</span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {items.map(material => {
                                        const TypeIcon = TYPE_ICONS[material.type] || LinkIcon;
                                        return (
                                            <div
                                                key={material.id}
                                                className={`bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow ${!material.is_active ? 'opacity-50' : ''}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-lg ${TYPE_COLORS[material.type]}`}>
                                                        <TypeIcon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-slate-800 truncate">
                                                            {material.title}
                                                        </h3>
                                                        {material.description && (
                                                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                                                {material.description}
                                                            </p>
                                                        )}
                                                        {material.tags?.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {material.tags.slice(0, 3).map(tag => (
                                                                    <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                                    <div className="flex items-center gap-1">
                                                        {material.is_active ? (
                                                            <Globe className="w-4 h-4 text-emerald-500" />
                                                        ) : (
                                                            <span className="text-xs text-slate-400">Inactivo</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <a
                                                            href={material.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="Abrir"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                        {canEdit && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleEdit(material)}
                                                                    className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                                    title="Editar"
                                                                >
                                                                    <Edit3 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(material.id)}
                                                                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Eliminar"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-800">
                                    {editingMaterial ? 'Editar Material' : 'Añadir Material'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-slate-100 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Título */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Título *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Nombre del material"
                                    required
                                />
                            </div>

                            {/* Descripción */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Descripción
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Breve descripción del material"
                                    rows={2}
                                />
                            </div>

                            {/* Tipo */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Tipo
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="link">Enlace</option>
                                    <option value="document">Documento</option>
                                    <option value="video">Video</option>
                                    <option value="audio">Audio</option>
                                </select>
                            </div>

                            {/* URL o Upload */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    URL / Archivo *
                                </label>
                                <div className="space-y-2">
                                    <input
                                        type="url"
                                        value={formData.url}
                                        onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="https://..."
                                    />
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">o</span>
                                        <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer text-sm font-medium text-slate-600 transition-colors">
                                            <Upload className="w-4 h-4" />
                                            {uploading ? 'Subiendo...' : 'Subir archivo'}
                                            <input
                                                type="file"
                                                className="hidden"
                                                disabled={uploading}
                                                onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Categoría */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Categoría
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Etiquetas
                                </label>
                                <input
                                    type="text"
                                    value={formData.tags}
                                    onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="nutricion, basico, principiantes (separadas por coma)"
                                />
                            </div>

                            {/* Activo */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="is_active" className="text-sm text-slate-700">
                                    Visible para clientes
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    {editingMaterial ? 'Guardar Cambios' : 'Añadir Material'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

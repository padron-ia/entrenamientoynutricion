import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { User, UserRole } from '../types';
import {
    Search, Mail, Phone, Instagram, Linkedin, Calendar,
    Edit2, Camera, Loader2, Save, X, User as UserIcon,
    Briefcase, MapPin, Cake, Trash2, UserPlus, Link, CheckCircle2, DollarSign, Users
} from 'lucide-react';
import { compressTeamPhoto } from '../utils/imageCompression';
import { normalizePhone, isValidPhone, PHONE_HELP_TEXT, PHONE_PLACEHOLDER } from '../utils/phoneUtils';

interface TeamDirectoryProps {
    currentUser: User;
}

export default function TeamDirectory({ currentUser }: TeamDirectoryProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [search, setSearch] = useState('');

    // Editing State
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Form State for editing
    const [formData, setFormData] = useState<Partial<User>>({});

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('name');

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (user: User) => {
        if (user.email === currentUser.email) {
            alert("No puedes eliminar tu propio perfil desde aquí.");
            return;
        }

        if (!confirm(`🚨 ¿ESTÁS SEGURO?\n\nVas a eliminar a ${user.name} del sistema definitivamente.\nEsta acción no se puede deshacer.`)) return;

        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', user.id);

            if (error) throw error;

            alert("✅ Perfil eliminado correctamente");
            fetchUsers();
        } catch (error: any) {
            console.error("Error al eliminar usuario:", error);
            alert("Error al eliminar el perfil: Es posible que tenga registros asociados (ventas, clientes).");
        }
    };

    // --- FILTERS ---
    const filteredUsers = users.filter(u => {
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
        const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase());
        return matchesRole && matchesSearch;
    });

    const roles = Array.from(new Set(users.map(u => u.role)));

    // --- EDITING ---
    const handleEditClick = (user: User) => {
        if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.HEAD_COACH && currentUser.email !== user.email) {
            alert("Solo puedes editar tu propio perfil.");
            return;
        }
        setEditingUser(user);
        setFormData(user);
        setIsEditModalOpen(true);
    };

    const handleSaveProfile = async () => {
        if (!editingUser) return;

        if (formData.phone && !isValidPhone(formData.phone)) {
            alert(`Por favor, introduce un teléfono válido.\n${PHONE_HELP_TEXT}`);
            return;
        }

        const payload = {
            name: formData.name,
            bio: formData.bio,
            phone: formData.phone,
            specialty: formData.specialty,
            instagram: formData.instagram,
            linkedin: formData.linkedin,
            calendar_url: formData.calendar_url,
            photo_url: formData.photo_url,
            birth_date: formData.birth_date,
            address: formData.address,
            // Enviamos SIEMPRE la comisión si existe
            ...(formData.commission_percentage !== undefined && formData.commission_percentage !== null ? {
                commission_percentage: parseFloat(formData.commission_percentage.toString())
            } : {}),
            // Enviamos la tarifa por cliente si existe
            ...(formData.price_per_client !== undefined && formData.price_per_client !== null ? {
                price_per_client: parseFloat(formData.price_per_client.toString())
            } : {})
        };

        try {
            const { error } = await supabase
                .from('users')
                .update(payload)
                .eq('id', editingUser.id);

            if (error) throw error;

            alert("Perfil actualizado correctamente");
            setIsEditModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error("Error en handleSaveProfile:", error);
            alert("Error al actualizar perfil");
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !editingUser) return;
        setUploadingPhoto(true);

        try {
            const originalFile = e.target.files[0];

            // 1. Compress Image
            const file = await compressTeamPhoto(originalFile);
            const fileName = `${editingUser.id}-${Date.now()}.webp`;

            // 2. Upload to storage
            const { error: uploadError } = await supabase.storage
                .from('team-photos')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 3. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('team-photos')
                .getPublicUrl(fileName);

            setFormData(prev => ({ ...prev, photo_url: publicUrl }));
        } catch (error: any) {
            alert("Error subiendo foto: " + error.message);
        } finally {
            setUploadingPhoto(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display text-slate-800 dark:text-white">Directorio del Equipo</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Gestiona y contacta a los profesionales de la academia</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 uppercase tracking-widest">
                        Modo Directorio
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    <button
                        onClick={() => setRoleFilter('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${roleFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        Todos
                    </button>
                    {roles.map(role => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap ${roleFilter === role ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {role}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                    <p className="font-bold text-slate-500">Cargando directorio profesional...</p>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">No se encontraron miembros</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">Prueba con otros términos de búsqueda o filtros de rol.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map(user => {
                        const isCurrentUser = currentUser.email === user.email;

                        return (
                            <div key={user.id} className="group bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">

                                {/* Actions */}
                                <div className={`absolute top-4 right-4 flex gap-2 transition-all z-10 ${isCurrentUser ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    {(currentUser.role === UserRole.ADMIN || isCurrentUser) && (
                                        <button
                                            onClick={() => handleEditClick(user)}
                                            className="p-2 bg-white/90 backdrop-blur shadow-sm rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                            title="Editar Ficha"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HEAD_COACH) && !isCurrentUser && (
                                        <button
                                            onClick={() => handleDeleteUser(user)}
                                            className="p-2 bg-white/90 backdrop-blur shadow-sm rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50"
                                            title="Eliminar del Equipo"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-start gap-4 mb-6">
                                    <div className="relative shrink-0">
                                        {user.photo_url ? (
                                            <img
                                                src={user.photo_url}
                                                alt={user.name}
                                                className="w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-white dark:border-slate-700"
                                            />
                                        ) : (
                                            <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 border-2 border-white dark:border-slate-700">
                                                <UserIcon className="w-8 h-8" />
                                            </div>
                                        )}
                                        <span className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-white dark:border-slate-700 shadow-sm
                                        ${user.role === 'admin' ? 'bg-slate-900 text-white' :
                                                user.role === 'coach' ? 'bg-blue-600 text-white' :
                                                    'bg-slate-200 text-slate-600'}`}>
                                            {user.role}
                                        </span>
                                    </div>

                                    <div className="flex-1 min-w-0 pt-1">
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate pr-6">{user.name}</h3>
                                        <p className="text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">
                                            {user.specialty || 'Especialista PT'}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                            {user.bio || 'Sin biografía disponible actualmente.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <a href={`mailto:${user.email}`} className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-blue-600 transition-colors truncate p-1">
                                        <Mail className="w-3.5 h-3.5" />
                                        <span className="truncate">{user.email}</span>
                                    </a>
                                    {user.phone && (
                                        <a href={`tel:${user.phone}`} className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-blue-600 transition-colors truncate p-1">
                                            <Phone className="w-3.5 h-3.5" />
                                            {user.phone}
                                        </a>
                                    )}
                                    {user.instagram && (
                                        <a href={`https://instagram.com/${user.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[11px] text-pink-600 hover:text-pink-700 font-bold transition-colors p-1">
                                            <Instagram className="w-3.5 h-3.5" />
                                            @{user.instagram.replace('@', '')}
                                        </a>
                                    )}
                                    {user.calendar_url && (
                                        <a href={user.calendar_url} target="_blank" rel="noreferrer" className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 mt-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all border border-blue-100 dark:border-blue-800">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Agendar Cita
                                        </a>
                                    )}

                                    {/* Edit Profile Button - Always visible for current user */}
                                    {isCurrentUser && (
                                        <button
                                            onClick={() => handleEditClick(user)}
                                            className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 mt-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-sm"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            Editar Mi Perfil
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* EDIT PROFILE MODAL */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <div>
                                <h2 className="text-xl font-bold">Actualizar Ficha Profesional</h2>
                                <p className="text-xs text-slate-500">Miembro del equipo: <span className="font-bold">{formData.name}</span></p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X className="text-slate-400 hover:text-slate-600" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-6">
                            {/* Photo Upload Section */}
                            <div className="flex flex-col items-center gap-4 py-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-xl border-4 border-white dark:border-slate-700 bg-white">
                                        {formData.photo_url ? (
                                            <img src={formData.photo_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <UserIcon className="w-12 h-12" />
                                            </div>
                                        )}
                                        {uploadingPhoto && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <label className="absolute -bottom-2 -right-2 p-3 bg-blue-600 text-white rounded-2xl shadow-lg cursor-pointer hover:bg-blue-700 transition-all group-hover:scale-110 active:scale-95">
                                        <Camera className="w-5 h-5" />
                                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                    </label>
                                </div>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Dimensiones sugeridas: 400x400px</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Email (Acceso)</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="email"
                                            readOnly
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-500 cursor-not-allowed font-medium shadow-inner"
                                            value={editingUser?.email || ''}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Especialidad</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Ej: Coach de Nutrición"
                                            value={formData.specialty || ''}
                                            onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Biografía Profesional</label>
                                    <textarea
                                        rows={6}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none leading-relaxed"
                                        placeholder="Cuéntanos sobre tu experiencia y enfoque..."
                                        value={formData.bio || ''}
                                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                                        Teléfono <span className="ml-2 normal-case font-medium text-slate-400">({PHONE_HELP_TEXT})</span>
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="tel"
                                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            value={formData.phone || ''}
                                            onChange={e => setFormData({ ...formData, phone: normalizePhone(e.target.value) })}
                                            placeholder={PHONE_PLACEHOLDER}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Link de Calendario</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="url"
                                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="https://calendly.com/tu-link"
                                            value={formData.calendar_url || ''}
                                            onChange={e => setFormData({ ...formData, calendar_url: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Instagram (@usuario)</label>
                                    <div className="relative">
                                        <Instagram className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="ej: academia_diabetes"
                                            value={formData.instagram || ''}
                                            onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">LinkedIn</label>
                                    <div className="relative">
                                        <Linkedin className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="URL de tu perfil"
                                            value={formData.linkedin || ''}
                                            onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {(currentUser.role === UserRole.ADMIN || currentUser.email === editingUser?.email) && (
                                    <div className="md:col-span-2 pt-6 mt-2 border-t border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                                Datos Privados (Solo Admin/RRHH)
                                            </h4>
                                            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                                                🔒 Visible solo para ti y la administración
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Fecha Nacimiento</label>
                                                <div className="relative">
                                                    <Cake className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                                    <input
                                                        type="date"
                                                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        value={formData.birth_date || ''}
                                                        onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Dirección</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        placeholder="Dirección completa"
                                                        value={formData.address || ''}
                                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HEAD_COACH) && (
                                                <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mt-2">
                                                    <div>
                                                        <label className="block text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 ml-1 flex items-center gap-2">
                                                            <DollarSign className="w-3 h-3" />
                                                            Comisión Venta (%)
                                                        </label>
                                                        <p className="text-[10px] text-slate-500 mb-2">Sobre el NETO de renovación.</p>
                                                        <div className="relative">
                                                            <span className="absolute right-4 top-3.5 font-bold text-slate-400">%</span>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                max="100"
                                                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-lg text-blue-900 dark:text-blue-100"
                                                                placeholder="10.0"
                                                                value={formData.commission_percentage || ''}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setFormData({ ...formData, commission_percentage: val === '' ? null : parseFloat(val) });
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 ml-1 flex items-center gap-2">
                                                            <Users className="w-3 h-3" />
                                                            Tarifa / Cliente (€)
                                                        </label>
                                                        <p className="text-[10px] text-slate-500 mb-2">Pago fijo mensual por alumno.</p>
                                                        <div className="relative">
                                                            <span className="absolute left-4 top-3.5 font-bold text-slate-400">€</span>
                                                            <input
                                                                type="number"
                                                                step="1"
                                                                min="0"
                                                                className="w-full pl-8 pr-4 py-3 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-lg text-blue-900 dark:text-blue-100"
                                                                placeholder="50"
                                                                value={formData.price_per_client || ''}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setFormData({ ...formData, price_per_client: val === '' ? null : parseFloat(val) });
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* READ ONLY VIEW FOR OWNER (IF NOT ADMIN) */}
                                            {currentUser.role !== UserRole.ADMIN && currentUser.email === editingUser?.email && (
                                                <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mt-2 opacity-75">
                                                    <div>
                                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1 ml-1 flex items-center gap-2">
                                                            <DollarSign className="w-3 h-3" />
                                                            Tu Comisión (%)
                                                        </label>
                                                        <p className="text-xl font-black text-slate-700 dark:text-slate-300">
                                                            {formData.commission_percentage ? `${formData.commission_percentage}%` : '0%'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1 ml-1 flex items-center gap-2">
                                                            <Users className="w-3 h-3" />
                                                            Tu Tarifa / Cliente
                                                        </label>
                                                        <p className="text-xl font-black text-slate-700 dark:text-slate-300">
                                                            {formData.price_per_client ? `${formData.price_per_client}€` : '0€'}
                                                        </p>
                                                    </div>
                                                    <p className="col-span-2 text-[10px] text-slate-400 italic text-center mt-2 border-t border-slate-200 pt-2">
                                                        * Estas condiciones son gestionadas exclusivamente por la administración.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex gap-4">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

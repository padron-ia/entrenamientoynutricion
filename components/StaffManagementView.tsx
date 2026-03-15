import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { User, UserRole } from '../types';
import {
    Users, UserPlus, Mail, Shield, ShieldCheck,
    Trash2, Copy, X, Loader2, Search,
    Briefcase, Target, Calculator, Stethoscope,
    Brain, Share2, Bell, CheckCircle2, RefreshCw, Smartphone,
    Building2
} from 'lucide-react';
import InstallationGuide from './InstallationGuide';

interface StaffManagementViewProps {
    currentUser: User;
    onUpdateUser: (user: User) => Promise<User>;
    onDeleteUser: (userId: string) => Promise<void>;
}

const ROLE_DETAILS: Record<string, { icon: any, color: string, description: string }> = {
    [UserRole.ADMIN]: { icon: ShieldCheck, color: 'bg-slate-900', description: 'Acceso total al sistema y finanzas' },
    [UserRole.HEAD_COACH]: { icon: Shield, color: 'bg-indigo-600', description: 'Gestión de coaches y supervisión' },
    [UserRole.COACH]: { icon: Users, color: 'bg-blue-600', description: 'Gestión directa de alumnos' },
    [UserRole.CLOSER]: { icon: Target, color: 'bg-emerald-600', description: 'Ventas y registro de altas' },
    [UserRole.SETTER]: { icon: Share2, color: 'bg-amber-600', description: 'Prospección y leads' },
    [UserRole.CONTABILIDAD]: { icon: Calculator, color: 'bg-rose-600', description: 'Gestión de cobros y facturas' },
    [UserRole.ENDOCRINO]: { icon: Stethoscope, color: 'bg-cyan-600', description: 'Revisiones médicas especializadas' },
    [UserRole.PSICOLOGO]: { icon: Brain, color: 'bg-purple-600', description: 'Apoyo psicológico a alumnos' },
    [UserRole.RRSS]: { icon: Bell, color: 'bg-pink-600', description: 'Gestión de anuncios y comunidad' },
    [UserRole.DIRECCION]: { icon: Building2, color: 'bg-slate-800', description: 'Visión ejecutiva y control de negocio' }
};

export default function StaffManagementView({ currentUser, onUpdateUser, onDeleteUser }: StaffManagementViewProps) {
    const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
    const [users, setUsers] = useState<User[]>([]);
    const [invitations, setInvitations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal States
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
    const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
    const [invitationFormData, setInvitationFormData] = useState({
        email: '',
        role: UserRole.COACH,
        name: ''
    });

    // User Management States
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [reassignTargetId, setReassignTargetId] = useState<string>('');
    const [isReassigning, setIsReassigning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [editFormData, setEditFormData] = useState({
        name: '',
        email: '',
        role: UserRole.COACH,
        max_clients: 15,
        permissions: [] as string[],
        password: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Active Users
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .order('name');
            if (userError) throw userError;
            setUsers(userData || []);

            // Fetch Invitations
            const { data: invData, error: invError } = await supabase
                .from('team_invitations')
                .select('*')
                .order('created_at', { ascending: false });
            if (invError) throw invError;
            setInvitations(invData || []);

        } catch (error) {
            console.error('Error fetching staff data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateInvitation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invitationFormData.email || !invitationFormData.role) return;

        setIsSubmittingInvite(true);
        try {
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            const link = `${window.location.origin}/#/equipo/unirse/${token}`;
            const emailLower = invitationFormData.email.toLowerCase().trim();

            const { error } = await supabase
                .from('team_invitations')
                .upsert({
                    email: emailLower,
                    name: invitationFormData.name,
                    role: invitationFormData.role,
                    token: token,
                    invited_by: currentUser.id,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                }, { onConflict: 'email' });

            if (error) throw error;

            setCreatedInviteLink(link);
            setInvitationFormData({ email: '', role: UserRole.COACH, name: '' });
            fetchData();
        } catch (error: any) {
            alert("Error al crear invitación: " + error.message);
        } finally {
            setIsSubmittingInvite(false);
        }
    };

    const revokeInvitation = async (id: string) => {
        if (!confirm("¿Revocar esta invitación? El enlace dejará de funcionar.")) return;
        try {
            const { error } = await supabase.from('team_invitations').delete().eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (error) {
            alert("Error al revocar");
        }
    };

    const filteredUsers = users
        .filter(u => u.role !== 'client')
        .filter(u =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        );

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setEditFormData({
            name: user.name,
            email: user.email,
            role: user.role,
            max_clients: user.max_clients || 15,
            permissions: user.permissions || [],
            password: ''
        });
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsSubmitting(true);
        try {
            await onUpdateUser({
                ...editingUser,
                name: editFormData.name,
                email: editFormData.email,
                role: editFormData.role,
                max_clients: editFormData.max_clients,
                permissions: editFormData.permissions,
                password: editFormData.password || undefined
            });
            setEditingUser(null);
            fetchData();
            alert("✅ Usuario actualizado correctamente");
        } catch (error: any) {
            alert("Error al actualizar: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const initiateDelete = (user: User) => {
        if (user.id === currentUser.id) {
            alert("No puedes eliminar tu propia cuenta.");
            return;
        }
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        try {
            await onDeleteUser(userToDelete.id);
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            setShowDeleteModal(false);
            setUserToDelete(null);
            alert("✅ Staff eliminado correctamente.");
        } catch (error: any) {
            alert(`⚠️ ERROR:\n\n${error.message}\n\nProbablemente este usuario tiene registros asociados.`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleMassReassign = async () => {
        if (!userToDelete || !reassignTargetId) {
            alert("Selecciona un destinatario");
            return;
        }

        const targetUser = users.find(u => u.id === reassignTargetId);
        if (!targetUser) return;

        setIsReassigning(true);
        try {
            // Logic moved from AdminSettings: Update clients, sales, invitations
            const { error: error1 } = await supabase
                .from('clientes_pt_notion')
                .update({ property_coach: targetUser.name, coach_id: targetUser.id })
                .eq('property_coach', userToDelete.name);

            const { error: error2 } = await supabase
                .from('sales')
                .update({ assigned_coach_id: targetUser.id })
                .eq('assigned_coach_id', userToDelete.id);

            const { error: error3 } = await supabase
                .from('sales')
                .update({ closer_id: targetUser.id })
                .eq('closer_id', userToDelete.id);

            const { error: error4 } = await supabase
                .from('team_invitations')
                .update({ invited_by: targetUser.id })
                .eq('invited_by', userToDelete.id);

            if (error1 || error2 || error3 || error4) {
                throw new Error("Error parcial en la reasignación");
            }

            alert(`✅ ¡PROCESO COMPLETADO!\n\nTodo ha sido traspasado de ${userToDelete.name} a ${targetUser.name}.`);
            setShowReassignModal(false);
            setReassignTargetId('');
            fetchData();
        } catch (error: any) {
            alert(`❌ ERROR: ${error.message}`);
        } finally {
            setIsReassigning(false);
        }
    };

    const pendingCount = invitations.filter(i => i.status === 'pending').length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-indigo-600" />
                        Gestión de Staff
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Administra el equipo profesional y gestiona nuevas incorporaciones</p>
                </div>

                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
                >
                    <UserPlus className="w-5 h-5" />
                    Invitar al Equipo
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-blue-100 rounded-2xl text-blue-600">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Staff</p>
                        <p className="text-2xl font-black text-slate-800">{filteredUsers.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-amber-100 rounded-2xl text-amber-600">
                        <Mail className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Invites Pendientes</p>
                        <p className="text-2xl font-black text-slate-800">{pendingCount}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-emerald-100 rounded-2xl text-emerald-600">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Estado Sistema</p>
                        <p className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            Operativo
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Tabs */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-2">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Shield className="w-4 h-4" />
                        Equipo Activo
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Mail className="w-4 h-4" />
                        Invitaciones Pendientes
                        {pendingCount > 0 && <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">{pendingCount}</span>}
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'active' ? (
                        <div className="space-y-6">
                            {/* Search */}
                            <div className="relative max-w-md">
                                <Search className="absolute left-4 top-3 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o email..."
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>

                            {/* Staff Table */}
                            <div className="overflow-x-auto rounded-2xl border border-slate-100">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/80 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Profesional</th>
                                            <th className="px-6 py-4">Rol & Función</th>
                                            <th className="px-6 py-4">Contacto</th>
                                            <th className="px-6 py-4 text-right">Ficha</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-20 text-center">
                                                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
                                                    <p className="font-bold text-slate-400">Consultando base de datos...</p>
                                                </td>
                                            </tr>
                                        ) : filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-20 text-center text-slate-400">No se encontraron resultados</td>
                                            </tr>
                                        ) : filteredUsers.map(user => {
                                            const roleInfo = ROLE_DETAILS[user.role] || { icon: Users, color: 'bg-slate-500' };
                                            return (
                                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-400">
                                                                {user.photo_url ? <img src={user.photo_url} className="w-full h-full object-cover" /> : user.name[0]}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800">{user.name}</p>
                                                                <p className="text-[10px] font-mono text-slate-400">ID: {user.id.substring(0, 8)}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`p-1.5 rounded-lg ${roleInfo.color} text-white`}>
                                                                <roleInfo.icon className="w-3.5 h-3.5" />
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-700 capitalize">{user.role}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col text-xs space-y-1">
                                                            <div className="flex items-center gap-2 text-slate-500">
                                                                <Mail className="w-3.5 h-3.5" />
                                                                {user.email}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleEditUser(user)}
                                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-indigo-100"
                                                                title="Editar perfil"
                                                            >
                                                                <Briefcase className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => initiateDelete(user)}
                                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-red-100"
                                                                title="Eliminar staff"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100">
                                <h3 className="text-amber-900 font-bold flex items-center gap-2 mb-2">
                                    <Bell className="w-5 h-5" /> Invitaciones en curso
                                </h3>
                                <p className="text-amber-800/70 text-sm">Estas personas han recibido un enlace pero aún no han completado su perfil.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {invitations.filter(i => i.status === 'pending').map(inv => {
                                    const roleInfo = ROLE_DETAILS[inv.role] || { color: 'bg-slate-400', icon: Users };
                                    return (
                                        <div key={inv.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className={`px-3 py-1 rounded-full ${roleInfo.color} text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5`}>
                                                        <roleInfo.icon className="w-3 h-3" />
                                                        {inv.role}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 italic">Expira en 7 días</span>
                                                </div>
                                                <h4 className="font-bold text-slate-800 text-lg mb-1">{inv.name || 'Sin nombre'}</h4>
                                                <p className="text-sm text-slate-500 flex items-center gap-2">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    {inv.email}
                                                </p>
                                            </div>

                                            <div className="mt-6 flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        const link = `${window.location.origin}/#/equipo/unirse/${inv.token}`;
                                                        navigator.clipboard.writeText(link);
                                                        alert("Link copiado!");
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-2xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                    Copiar Enlace
                                                </button>
                                                <button
                                                    onClick={() => revokeInvitation(inv.id)}
                                                    className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {invitations.filter(i => i.status === 'pending').length === 0 && (
                                    <div className="md:col-span-2 py-20 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                                        <p className="text-slate-400 font-bold">No hay invitaciones pendientes</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* INVITE MODAL */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-8 pb-4 flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Incoporar al Equipo</h3>
                                <p className="text-slate-500 font-medium">Completa los datos para generar un enlace de invitación</p>
                            </div>
                            <button onClick={() => { setIsInviteModalOpen(false); setCreatedInviteLink(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        {!createdInviteLink ? (
                            <form onSubmit={handleCreateInvitation} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nombre (Referencia)</label>
                                        <input
                                            required
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                                            placeholder="Ej: Victor Bravo"
                                            value={invitationFormData.name}
                                            onChange={e => setInvitationFormData({ ...invitationFormData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Profesional</label>
                                        <input
                                            type="email"
                                            required
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                                            placeholder="doctorvictorbravo@gmail.com"
                                            value={invitationFormData.email}
                                            onChange={e => setInvitationFormData({ ...invitationFormData, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Rol</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {Object.entries(ROLE_DETAILS).map(([role, detail]) => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setInvitationFormData({ ...invitationFormData, role: role as UserRole })}
                                                className={`p-4 rounded-[2rem] border-2 text-left transition-all ${invitationFormData.role === role ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-slate-100 hover:border-slate-200'}`}
                                            >
                                                <div className={`p-2 rounded-xl w-fit mb-3 ${invitationFormData.role === role ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    <detail.icon className="w-4 h-4" />
                                                </div>
                                                <p className="font-black text-slate-800 text-xs block mb-1 uppercase tracking-tighter">{role}</p>
                                                <p className="text-[9px] text-slate-500 leading-tight line-clamp-2">{detail.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    disabled={isSubmittingInvite}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSubmittingInvite ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Share2 className="w-5 h-5" /> Generar Link de Acceso</>}
                                </button>
                            </form>
                        ) : (
                            <div className="p-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
                                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-12 h-12" />
                                </div>
                                <div>
                                    <h4 className="text-3xl font-black text-slate-800">¡Enlace Generado!</h4>
                                    <p className="text-slate-500 font-medium mt-2 max-w-xs mx-auto">
                                        Envía este enlace a <span className="text-indigo-600 font-bold">{invitationFormData.name || invitationFormData.email}</span> para que complete su registro.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center gap-2 group">
                                        <code className="flex-1 text-xs text-slate-600 font-mono truncate px-2">{createdInviteLink}</code>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(createdInviteLink);
                                                alert("¡Enlace copiado!");
                                            }}
                                            className="bg-slate-100 text-slate-600 p-3 rounded-2xl font-bold hover:bg-slate-200 active:scale-95 transition-all"
                                            title="Copiar link solo"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => {
                                            const message = `¡Hola! Aquí tienes tu acceso para unirte al equipo de Padron Trainer:\n\n${createdInviteLink}\n\n📱 *Tip de instalación:*\n1. Abre el enlace en Safari (iPhone) o Chrome (Android).\n2. Selecciona 'Añadir a la pantalla de inicio' en el menú de compartir/ajustes.\n3. ¡Ya lo tendrás como una App en tu escritorio!`;
                                            navigator.clipboard.writeText(message);
                                            alert("¡Invitación completa copiada!");
                                        }}
                                        className="w-full bg-slate-900 text-white px-6 py-4 rounded-3xl font-bold flex items-center justify-center gap-3 hover:bg-black active:scale-95 transition-all shadow-xl shadow-slate-200"
                                    >
                                        <Share2 className="w-5 h-5 text-indigo-400" />
                                        Copiar invitación completa
                                    </button>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={() => setIsGuideOpen(true)}
                                        className="text-indigo-600 font-bold text-sm hover:underline flex items-center justify-center gap-2 mx-auto"
                                    >
                                        <Smartphone className="w-4 h-4" /> Ver guía de instalación tipo 'App'
                                    </button>
                                </div>

                                <InstallationGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

                                <button
                                    onClick={() => { setIsInviteModalOpen(false); setCreatedInviteLink(null); }}
                                    className="text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                                >
                                    Cerrar ventana
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* EDIT USER MODAL */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 pb-4 flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Editar Staff</h3>
                                <p className="text-slate-500 font-medium">Actualiza los datos de {editingUser.name}</p>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateUser} className="p-8 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                                <input
                                    required
                                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                                    value={editFormData.name}
                                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                                    value={editFormData.email}
                                    onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Rol</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                                        value={editFormData.role}
                                        onChange={e => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
                                    >
                                        {Object.values(UserRole).filter(r => r !== 'client').map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Pass (Opcional)</label>
                                    <input
                                        type="password"
                                        className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                                        placeholder="Solo si quieres cambiarla"
                                        value={editFormData.password}
                                        onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                disabled={isSubmitting}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-4 animate-spin" /> : "Guardar Cambios"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {showDeleteModal && userToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">¿Eliminar a {userToDelete.name}?</h3>
                        <p className="text-slate-500 mb-8 font-medium">Esta acción quitará al profesional del sistema permanentemente.</p>

                        <div className="space-y-3">
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isDeleting ? "Eliminando..." : "Sí, Eliminar Permanentemente"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setShowReassignModal(true);
                                }}
                                className="w-full py-4 bg-orange-50 text-orange-600 rounded-2xl font-black hover:bg-orange-100 transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" /> Pasar sus clientes a otro coach
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="w-full py-4 text-slate-400 font-bold hover:text-slate-600"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* REASSIGN MODAL */}
            {showReassignModal && userToDelete && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">Traspasar Registros</h3>
                                <p className="text-slate-500 text-sm">Mueve los clientes y ventas antes de eliminar</p>
                            </div>
                            <button onClick={() => setShowReassignModal(false)}>
                                <X className="w-6 h-6 text-slate-300" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-slate-50 rounded-2xl">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Origen (Sale)</p>
                                <p className="font-bold text-slate-700">{userToDelete.name}</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 text-blue-600">Elegir Destinatario</label>
                                <select
                                    className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl font-bold outline-none ring-blue-500/20"
                                    value={reassignTargetId}
                                    onChange={(e) => setReassignTargetId(e.target.value)}
                                >
                                    <option value="">Selecciona quién recibirá todo...</option>
                                    {users.filter(u => u.id !== userToDelete.id && u.role !== 'client').map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleMassReassign}
                                disabled={isReassigning || !reassignTargetId}
                                className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isReassigning ? "Procesando Traspaso..." : "Ejecutar Traspaso"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

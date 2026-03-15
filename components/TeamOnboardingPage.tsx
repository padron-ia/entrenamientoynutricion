import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { UserRole } from '../types';
import {
    User, Mail, Lock, Camera, Loader2, CheckCircle2,
    ArrowRight, Sparkles, Briefcase, Phone, MessageSquare, Smartphone
} from 'lucide-react';
import InstallationGuide from './InstallationGuide';
import { compressTeamPhoto } from '../utils/imageCompression';
import { normalizePhone, isValidPhone, PHONE_HELP_TEXT, PHONE_PLACEHOLDER } from '../utils/phoneUtils';

export default function TeamOnboardingPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(true);
    const [invitation, setInvitation] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        password: '',
        confirmPassword: '',
        phone: '',
        bio: '',
        specialty: '',
        photo_url: ''
    });
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    useEffect(() => {
        if (token) {
            verifyInvitation();
        }
    }, [token]);

    const verifyInvitation = async () => {
        try {
            const { data, error } = await supabase
                .from('team_invitations')
                .select('*')
                .eq('token', token)
                .single();

            if (error || !data) {
                setError("La invitación no es válida o ha expirado.");
            } else if (data.status !== 'pending') {
                setError("Esta invitación ya ha sido utilizada.");
            } else {
                setInvitation(data);
                setFormData(prev => ({ ...prev, name: data.name || '' }));
            }
        } catch (err) {
            setError("Error al verificar la invitación.");
        } finally {
            setLoading(false);
            setVerifying(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        setUploadingPhoto(true);

        try {
            const originalFile = e.target.files[0];

            // 1. Compress Image
            const file = await compressTeamPhoto(originalFile);
            const fileName = `temp-${Date.now()}-${file.name}`;

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.password || formData.password !== formData.confirmPassword) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        if (formData.phone && !isValidPhone(formData.phone)) {
            alert(`Por favor, introduce un teléfono válido.\n${PHONE_HELP_TEXT}`);
            return;
        }

        setLoading(true);
        try {
            // 1. Create User in Supabase Auth with COMPLETE METADATA
            // We send all profile data here so the Trigger can save it automatically
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: invitation.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                        role: invitation.role,
                        phone: formData.phone,
                        bio: formData.bio,
                        specialty: formData.specialty,
                        photo_url: formData.photo_url
                    },
                    emailRedirectTo: window.location.origin
                }
            });

            if (authError) {
                if (authError.message.includes("already registered")) {
                    throw new Error("Este correo ya está registrado. Intenta iniciar sesión directamente.");
                }
                throw authError;
            }

            if (!authData.user) throw new Error("No se pudo crear el usuario.");

            // 2. Mark invitation as accepted
            await supabase
                .from('team_invitations')
                .update({
                    status: 'accepted',
                    accepted_at: new Date().toISOString()
                })
                .eq('id', invitation.id);

            setSuccess(true);
        } catch (err: any) {
            console.error("Error en registro:", err);
            // Si el error contiene "Database error", lo simplificamos para el usuario
            const userFriendlyError = err.message?.includes("Database error")
                ? "Error de conexión con la base de datos. Por favor, asegúrate de haber ejecutado el último script SQL en Supabase."
                : err.message;
            alert("Error: " + userFriendlyError);
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Verificando invitación...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                        <Lock className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso No Válido</h2>
                    <p className="text-slate-500 mb-8">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-100 animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500">
                        <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 mb-4">¡Bienvenido al Equipo!</h2>
                    <p className="text-slate-500 mb-10 leading-relaxed">
                        Tu perfil ha sido creado correctamente. Ahora puedes acceder al CRM con tu email y la contraseña que has configurado.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-3"
                    >
                        Acceder al Portal <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 flex justify-center">
            <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-5 gap-8">

                {/* Lateral Info */}
                <div className="lg:col-span-2 space-y-8 animate-in slide-in-from-left duration-700">
                    <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                        <Sparkles className="absolute top-4 right-4 text-blue-400 w-8 h-8 opacity-20" />
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-4 leading-tight">Únete a Padron Trainer</h1>
                        <p className="text-slate-400 text-base sm:text-lg leading-relaxed mb-6">
                            Estamos felices de tenerte con nosotros como <span className="text-blue-400 font-bold uppercase tracking-wider">{invitation.role}</span>.
                        </p>
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10 overflow-hidden">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Email Invitado</p>
                            <div className="flex items-start gap-3">
                                <Mail className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                                <p className="text-base sm:text-lg font-bold text-white break-all leading-snug">
                                    {invitation.email}
                                </p>
                            </div>
                        </div>
                        <div className="pt-4 flex justify-start">
                            <button
                                onClick={() => setIsGuideOpen(true)}
                                className="text-xs font-bold text-blue-400 hover:text-white flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl transition-all"
                            >
                                <Smartphone className="w-4 h-4" /> Instalar App en mi móvil
                            </button>
                        </div>
                        <InstallationGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
                    </div>

                    <div className="space-y-4 px-2">
                        <div className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Personaliza tu perfil</h3>
                                <p className="text-sm text-slate-500">Sube una foto y cuéntanos un poco sobre ti para que el resto del equipo pueda conocerte.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                                <Lock className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Seguridad</h3>
                                <p className="text-sm text-slate-500">Elige una contraseña robusta para acceder a tus herramientas personales.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Section */}
                <div className="lg:col-span-3 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in slide-in-from-right duration-700">
                    <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-10">
                        {/* Header Mobile Only */}
                        <div className="lg:hidden text-center mb-10">
                            <h2 className="text-2xl font-bold text-slate-900">Completa tu Registro</h2>
                            <p className="text-slate-500 italic">Invitación para {invitation.role}</p>
                        </div>

                        {/* Hidden fields for better browser autofill mapping */}
                        <input type="email" defaultValue={invitation.email} readOnly className="hidden" name="email" autoComplete="username" />

                        {/* Photo & Identity Section */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 border-b border-slate-50 pb-8 sm:pb-10">
                            <div className="relative group shrink-0">
                                {formData.photo_url || uploadingPhoto ? (
                                    <img src={formData.photo_url} className={`w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-2xl ${uploadingPhoto ? 'opacity-50' : ''}`} />
                                ) : (
                                    <div className="w-32 h-32 rounded-3xl bg-slate-100 flex items-center justify-center border-4 border-white shadow-2xl text-slate-300">
                                        <Camera className="w-10 h-10" />
                                    </div>
                                )}
                                <label className="absolute -bottom-2 -right-2 p-4 bg-blue-600 text-white rounded-2xl cursor-pointer hover:bg-blue-700 shadow-xl transition-transform hover:scale-110 active:scale-95 touch-manipulation">
                                    <Camera className="w-5 h-5" />
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                </label>
                                {uploadingPhoto && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>}
                            </div>
                            <div className="flex-1 space-y-4 w-full">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Nombre Completo</label>
                                    <input
                                        required
                                        name="full_name"
                                        autoComplete="name"
                                        className="w-full border-b-2 border-slate-100 p-0 py-2 focus:border-blue-500 outline-none bg-transparent text-xl font-bold placeholder:text-slate-300"
                                        placeholder="Nombre y Apellidos"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <Briefcase className="w-3 h-3" /> Especialidad
                                        </label>
                                        <input
                                            name="specialty"
                                            className="w-full border-b border-slate-100 p-0 py-1 focus:border-blue-500 outline-none bg-transparent text-sm placeholder:text-slate-300"
                                            placeholder="Ej: Nutricionista"
                                            value={formData.specialty}
                                            onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <Phone className="w-3 h-3" /> Teléfono
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            autoComplete="tel"
                                            className="w-full border-b border-slate-100 p-0 py-1 focus:border-blue-500 outline-none bg-transparent text-sm placeholder:text-slate-300"
                                            placeholder={PHONE_PLACEHOLDER}
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: normalizePhone(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Credentials */}
                        <div className="space-y-6">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Lock className="w-4 h-4 text-slate-400" /> Credenciales de Acceso
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        required
                                        type="password"
                                        name="password"
                                        autoComplete="new-password"
                                        className="w-full bg-slate-50 border-none p-4 pl-12 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                        placeholder="Contraseña"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        required
                                        type="password"
                                        name="confirm_password"
                                        autoComplete="new-password"
                                        className="w-full bg-slate-50 border-none p-4 pl-12 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                        placeholder="Confirmar"
                                        value={formData.confirmPassword}
                                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bio / About */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-slate-400" /> Sobre ti (Breve biografía)
                            </h3>
                            <textarea
                                className="w-full bg-slate-50 border-none p-6 rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none leading-relaxed"
                                placeholder="Comparte un mensaje de bienvenida o cuenta tu experiencia profesional..."
                                value={formData.bio}
                                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                            />
                        </div>

                        <button
                            disabled={loading}
                            className="w-full py-4 sm:py-5 bg-blue-600 text-white rounded-3xl font-extrabold text-base sm:text-lg shadow-2xl shadow-blue-600/30 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 touch-manipulation"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Finalizar y Unirse al Equipo"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

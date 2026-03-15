import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, CheckCircle2, AlertTriangle, Activity, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

export const UpdatePasswordPage: React.FC = () => {
    const [initialLoading, setInitialLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        let detected = false;

        // FUNCIÓN CLAVE: Parseo manual de la URL para resolver el conflicto de doble hash (#/#)
        const handleManualToken = async () => {
            const url = window.location.href;
            const hash = window.location.hash;

            // Si detectamos los tokens en cualquier parte de la URL/Hash
            if (url.includes('access_token=') || hash.includes('access_token=')) {
                console.log("Tokens detectados, intentando login manual...");

                // Extraer access_token y refresh_token
                const accessToken = url.match(/access_token=([^&]*)/)?.[1] || hash.match(/access_token=([^&]*)/)?.[1];
                const refreshToken = url.match(/refresh_token=([^&]*)/)?.[1] || hash.match(/refresh_token=([^&]*)/)?.[1];

                if (accessToken) {
                    try {
                        const { error: sessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken || '',
                        });

                        if (!sessionError) {
                            console.log("Sesión forzada con éxito");
                            detected = true;
                            setError(null);
                            setInitialLoading(false);
                            return true;
                        }
                    } catch (e) {
                        console.error("Error al forzar sesión:", e);
                    }
                }
            }
            return false;
        };

        const init = async () => {
            const manualSuccess = await handleManualToken();

            if (!manualSuccess) {
                // Si el manual falla, probamos el flujo estándar de Supabase
                // Comprobación manual inmediata: ¿hay un token de recuperación en la URL?
                const isRecoveryUrl = window.location.href.includes('access_token=') ||
                    window.location.href.includes('type=recovery') ||
                    window.location.hash.includes('type=recovery');

                if (isRecoveryUrl) {
                    console.log("Detección manual: Es una URL de recuperación.");
                    setInitialLoading(true);
                    setError(null);
                }

                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    console.log("Auth Event:", event, session ? "Session exists" : "No session");

                    if (event === 'PASSWORD_RECOVERY' || session) {
                        detected = true;
                        setError(null);
                        setInitialLoading(false);
                    }
                });

                // Esperamos 2.5 segundos antes de dar el error final
                const timer = setTimeout(async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session && !detected) {
                        setError('El enlace de recuperación ha expirado o no es válido. Por favor, solicita uno nuevo.');
                    }
                    setInitialLoading(false);
                }, 2500);

                return () => {
                    subscription.unsubscribe();
                    clearTimeout(timer);
                };
            }
        };

        init();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({ password: password });
            if (updateError) throw updateError;
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.toLowerCase().includes('different from the old password')) {
                setError('La nueva contraseña debe ser diferente a la anterior. Introduce otra.');
            } else {
                setError(msg || 'Error al actualizar la contraseña.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                        Nueva Contraseña
                    </h1>
                    <p className="text-slate-400 font-medium">Crea una clave de acceso segura</p>
                </div>

                <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-8 md:p-10 shadow-2xl min-h-[400px] flex flex-col justify-center">
                    {initialLoading ? (
                        <div className="text-center py-12 animate-pulse">
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                            <p className="text-slate-400 font-medium">Verificando enlace de recuperación...</p>
                        </div>
                    ) : success ? (
                        <div className="text-center py-4 animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/10 rotate-12">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">¡Actualizada!</h2>
                            <p className="text-slate-400 mb-8 text-sm">
                                Tu contraseña se ha cambiado correctamente. Ya puedes iniciar sesion con email y contrasena.
                            </p>
                            <a href="/#/" className="inline-flex items-center justify-center px-4 py-2 mb-6 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 text-sm font-bold">
                                Ir al inicio de sesion
                            </a>
                            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 animate-[progress_3s_linear_forwards]"></div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-2xl flex items-start gap-3">
                                    <Activity className="w-5 h-5 shrink-0" />
                                    <p className="font-medium">{error}</p>
                                </div>
                            )}

                            {/* Solo ocultar campos si el error es de enlace expirado/inválido */}
                            {!(error && error.includes('enlace')) && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            Nueva Contraseña
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="password"
                                                required
                                                className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none font-bold placeholder:text-slate-600"
                                                placeholder="Min. 6 caracteres"
                                                value={password}
                                                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                                            />
                                            <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            Confirmar Contraseña
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="password"
                                                required
                                                className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none font-bold placeholder:text-slate-600"
                                                placeholder="Repite la clave"
                                                value={confirmPassword}
                                                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                                            />
                                            <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                        </div>
                                    </div>
                                </>
                            )}

                            <button
                                type="submit"
                                disabled={loading || initialLoading || !!(error && error.includes('enlace'))}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-blue-600/20 active:scale-95"
                            >
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        Actualizar Contraseña
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>

                            {error && error.includes('enlace') && (
                                <a href="/#/forgot-password" className="w-full bg-white/5 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 hover:bg-white/10">
                                    <ArrowLeft className="w-5 h-5" />
                                    Solicitar nuevo enlace
                                </a>
                            )}
                        </form>
                    )}
                </div>
            </div>
            <p className="mt-12 text-[10px] text-slate-600 font-mono z-10">
                v3.0 SECURITY | PT CORE TECHNOLOGY
            </p>
            <style>{`
                @keyframes progress {
                    from { width: 0%; }
                    to { width: 100%; }
                }
            `}</style>
        </div>
    );
};


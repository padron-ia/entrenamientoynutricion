import React, { useState } from 'react';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, Activity, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });

            if (error) {
                if (error.message.includes('rate limit')) {
                    throw new Error('Has solicitado demasiados correos. Espera un momento.');
                }
                console.warn('Reset password error:', error);
            }

            setSubmitted(true);
        } catch (err: any) {
            setError(err.message || 'Error al enviar el correo.');
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
                    <a href="/#/" className="inline-flex items-center text-sm text-slate-500 hover:text-white transition-colors mb-6 group">
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Volver al inicio de sesion
                    </a>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                        Recuperar Acceso
                    </h1>
                    <p className="text-slate-400 font-medium">Restablece tu contraseña de forma segura</p>
                </div>

                <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-8 md:p-10 shadow-2xl">
                    {submitted ? (
                        <div className="text-center py-4 animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/10 rotate-12">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">¡Comprueba tu correo!</h2>
                            <p className="text-slate-400 mb-8 text-sm">
                                Si el email <strong className="text-white">{email}</strong> está registrado, recibirás un enlace en unos instantes.
                            </p>
                            <a href="/#/" className="w-full bg-white/5 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 hover:bg-white/10">
                                <ArrowLeft className="w-5 h-5" />
                                Volver al inicio de sesion
                            </a>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-2xl flex items-start gap-3">
                                    <Activity className="w-5 h-5 shrink-0" />
                                    <p className="font-medium">{error}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Email de tu cuenta
                                </label>
                                <div className="relative group">
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none font-bold placeholder:text-slate-600"
                                        placeholder="tu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                    <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-70 shadow-xl shadow-blue-600/20 active:scale-95"
                            >
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        Enviar Instrucciones
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
            <p className="mt-12 text-[10px] text-slate-600 font-mono z-10">
                v3.0 SECURITY | PT CORE TECHNOLOGY
            </p>
        </div>
    );
};


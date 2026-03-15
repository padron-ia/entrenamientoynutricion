import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Loader2, Lock, User, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface ClientData {
    id: string;
    property_nombre: string;
    property_apellidos: string;
    property_correo_electr_nico: string;
    activation_token: string;
    user_id?: string;
}

export function ActivateAccountPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [clientData, setClientData] = useState<ClientData | null>(null);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        // Clear any existing session to prevent conflicts
        localStorage.removeItem('pt_crm_session');
        // Also sign out from Supabase Auth to start fresh
        supabase.auth.signOut().then(() => {
            validateToken();
        });
    }, [token]);

    const validateToken = async () => {
        if (!token) {
            setError('Token invalido');
            setLoading(false);
            return;
        }

        try {
            const { data: client, error: clientError } = await supabase
                .from('clientes_pt_notion')
                .select('id, property_nombre, property_apellidos, property_correo_electr_nico, activation_token, user_id')
                .eq('activation_token', token)
                .single();

            if (clientError || !client) {
                setError('Este enlace no es valido o ya fue utilizado');
                setLoading(false);
                return;
            }

            if (client.user_id) {
                setError('Esta cuenta ya ha sido activada. Puedes iniciar sesion normalmente.');
                setLoading(false);
                return;
            }

            setClientData(client);
            setLoading(false);
        } catch (err) {
            console.error('Error validating token:', err);
            setError('Error al validar el enlace');
            setLoading(false);
        }
    };

    const validatePassword = (): string | null => {
        if (password.length < 6) {
            return 'La contrasena debe tener al menos 6 caracteres';
        }
        if (password !== confirmPassword) {
            return 'Las contrasenas no coinciden';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validatePassword();
        if (validationError) {
            setError(validationError);
            return;
        }

        if (!clientData) return;

        setSubmitting(true);
        setError(null);

        try {
            // 1. Create user in auth.users
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: clientData.property_correo_electr_nico,
                password: password,
                options: {
                    data: {
                        name: `${clientData.property_nombre} ${clientData.property_apellidos}`.trim(),
                        role: 'client'
                    }
                }
            });

            if (authError) {
                // Check if user already exists - try to sign in instead
                if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
                    // Try to sign in with provided password
                    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                        email: clientData.property_correo_electr_nico,
                        password: password
                    });

                    if (signInError) {
                        setError('Este email ya tiene una cuenta. Si olvidaste tu contraseña, usa "Recuperar contraseña" en la pagina de inicio.');
                        setSubmitting(false);
                        return;
                    }

                    // Sign in successful - link the account
                    if (signInData.user) {
                        const { error: linkError } = await supabase
                            .from('clientes_pt_notion')
                            .update({
                                user_id: signInData.user.id,
                                activation_token: null,
                                activation_token_created_at: null,
                                onboarding_phase2_completed: true
                            })
                            .eq('id', clientData.id);

                        if (linkError) {
                            console.error('Error linking account:', linkError);
                        }

                        // Mark pending sale as completed if exists
                        try {
                            const { data: pendingSale } = await supabase
                                .from('sales')
                                .select('id')
                                .eq('client_email', clientData.property_correo_electr_nico)
                                .eq('status', 'pending_onboarding')
                                .maybeSingle();

                            if (pendingSale) {
                                await supabase
                                    .from('sales')
                                    .update({
                                        status: 'onboarding_completed',
                                        client_id: clientData.id,
                                        onboarding_completed_at: new Date().toISOString()
                                    })
                                    .eq('id', pendingSale.id);
                            }
                        } catch (saleErr) {
                            console.warn('Could not update sale status:', saleErr);
                        }

                        // Save session for the client
                        const clientSession = {
                            id: signInData.user.id,
                            email: clientData.property_correo_electr_nico,
                            name: `${clientData.property_nombre} ${clientData.property_apellidos || ''}`.trim(),
                            role: 'client',
                            clientId: clientData.id
                        };
                        localStorage.setItem('pt_crm_session', JSON.stringify({
                            user: clientSession,
                            timestamp: Date.now()
                        }));

                        setSuccess(true);
                        setTimeout(() => {
                            window.location.href = '/'; // Full reload to pick up new session
                        }, 2000);
                        return;
                    }
                } else {
                    setError(`Error al crear la cuenta: ${authError.message}`);
                }
                setSubmitting(false);
                return;
            }

            if (!authData.user) {
                setError('No se pudo crear el usuario');
                setSubmitting(false);
                return;
            }

            // 2. Update client record with user_id and clear activation token
            const { error: updateError } = await supabase
                .from('clientes_pt_notion')
                .update({
                    user_id: authData.user.id,
                    activation_token: null,
                    activation_token_created_at: null,
                    onboarding_phase2_completed: true
                })
                .eq('id', clientData.id);

            if (updateError) {
                console.error('Error updating client:', updateError);
                // Don't fail completely - user was created
            }

            // 2b. If there's a pending sale linked to this client, mark it as completed
            try {
                const { data: pendingSale } = await supabase
                    .from('sales')
                    .select('id')
                    .eq('client_email', clientData.property_correo_electr_nico)
                    .eq('status', 'pending_onboarding')
                    .maybeSingle();

                if (pendingSale) {
                    await supabase
                        .from('sales')
                        .update({
                            status: 'onboarding_completed',
                            client_id: clientData.id,
                            onboarding_completed_at: new Date().toISOString()
                        })
                        .eq('id', pendingSale.id);
                }
            } catch (saleErr) {
                console.warn('Could not update sale status:', saleErr);
            }

            // 3. Auto-login
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: clientData.property_correo_electr_nico,
                password: password
            });

            if (loginError) {
                console.error('Auto-login error:', loginError);
                // Don't fail - user can login manually
            }

            // 4. Save session for the client
            const clientSession = {
                id: authData.user.id,
                email: clientData.property_correo_electr_nico,
                name: `${clientData.property_nombre} ${clientData.property_apellidos || ''}`.trim(),
                role: 'client',
                clientId: clientData.id
            };
            localStorage.setItem('pt_crm_session', JSON.stringify({
                user: clientSession,
                timestamp: Date.now()
            }));

            setSuccess(true);

            // 5. Redirect to portal after a brief delay (full reload to pick up new session)
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);

        } catch (err) {
            console.error('Error activating account:', err);
            setError('Error inesperado al activar la cuenta');
            setSubmitting(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Validando enlace...</p>
                </div>
            </div>
        );
    }

    // Error state (invalid token)
    if (error && !clientData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Enlace no valido</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <a
                        href="/"
                        className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                    >
                        Ir al inicio
                    </a>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Cuenta activada</h1>
                    <p className="text-gray-600 mb-4">
                        Tu cuenta ha sido creada correctamente. A partir de ahora entra desde la pantalla normal de inicio de sesion con tu email y contrasena.
                    </p>
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                </div>
            </div>
        );
    }

    // Main form
    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Activa tu cuenta</h1>
                    <p className="text-gray-600">
                        Hola <strong>{clientData?.property_nombre}</strong>, crea tu contrasena para acceder al portal.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={clientData?.property_correo_electr_nico || ''}
                            readOnly
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contrasena
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Minimo 6 caracteres"
                                className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirmar contrasena
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repite la contrasena"
                                className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Activando...
                            </>
                        ) : (
                            'Activar cuenta'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    Al activar tu cuenta, podras acceder al portal de clientes de Padron Trainer.
                </p>
            </div>
        </div>
    );
}

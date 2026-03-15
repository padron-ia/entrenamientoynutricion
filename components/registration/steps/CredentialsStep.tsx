import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

interface Props {
    formData: any;
    updateField: (field: string, value: any) => void;
}

export function CredentialsStep({ formData, updateField }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
    const passwordLongEnough = formData.password && formData.password.length >= 6;

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Crea tus Credenciales</h3>
                <p className="text-slate-600">Con estas credenciales accederás a tu portal personalizado</p>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Correo electrónico de acceso *</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="email"
                            required
                            className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
                            value={formData.email}
                            onChange={(e) => updateField('email', e.target.value)}
                            placeholder="tu@email.com"
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Puedes modificarlo si lo necesitas</p>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña *</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            className="w-full pl-11 pr-12 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
                            value={formData.password}
                            onChange={(e) => updateField('password', e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    {formData.password && !passwordLongEnough && (
                        <p className="text-xs text-red-500 mt-1">La contraseña debe tener al menos 6 caracteres</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Confirmar Contraseña *</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type={showConfirm ? 'text' : 'password'}
                            required
                            className="w-full pl-11 pr-12 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
                            value={formData.confirmPassword}
                            onChange={(e) => updateField('confirmPassword', e.target.value)}
                            placeholder="Repite tu contraseña"
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    {formData.confirmPassword && !passwordsMatch && (
                        <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                    )}
                    {passwordsMatch && passwordLongEnough && (
                        <p className="text-xs text-accent-600 mt-1 font-medium">Las contraseñas coinciden</p>
                    )}
                </div>
            </div>
        </div>
    );
}

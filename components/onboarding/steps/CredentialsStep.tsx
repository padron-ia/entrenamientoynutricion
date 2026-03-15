import React from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface Props {
    formData: any;
    updateField: (field: string, value: any) => void;
}

export function CredentialsStep({ formData, updateField }: Props) {
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Crea tus credenciales de acceso</h3>
                <p className="text-slate-600">Estas credenciales te permitirán acceder a tu portal personal</p>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    Correo Electrónico *
                </label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="email"
                        required
                        className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="tu@email.com"
                        disabled
                    />
                </div>
                <p className="text-xs text-slate-500 mt-1">Este email fue proporcionado al registrarte</p>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    Contraseña *
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        className="w-full pl-11 pr-12 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                        value={formData.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    Confirmar Contraseña *
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        className="w-full pl-11 pr-12 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                        value={formData.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                        placeholder="Repite tu contraseña"
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1">Las contraseñas no coinciden</p>
                )}
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm text-emerald-900">
                    <strong>🔒 Seguridad:</strong> Tu contraseña debe tener al menos 6 caracteres.
                    Te recomendamos usar una combinación de letras y números.
                </p>
            </div>
        </div>
    );
}

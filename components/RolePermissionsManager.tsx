import React, { useState, useEffect } from 'react';
import { Shield, Save, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { UserRole } from '../types';
import { PERMISSIONS } from '../utils/permissions';
import { useToast } from './ToastProvider';

const PERMISSION_LABELS: Record<string, { label: string, category: string }> = {
    'access:accounting': { label: 'Contabilidad y Facturación', category: 'Finanzas' },
    'access:sales': { label: 'Ventas, Leads y Panel de Closer', category: 'Operaciones' },
    'access:clients': { label: 'Cartera de Clientes', category: 'Operaciones' },
    'access:renewals': { label: 'Gestión de Renovaciones', category: 'Operaciones' },
    'access:medical': { label: 'Endocrinología (Ver)', category: 'Programa' },
    'manage:medical': { label: 'Revisiones Médicas (Gestionar)', category: 'Programa' },
    'manage:team': { label: 'Directorio y Gestión de Equipo', category: 'Organización' },
    'access:settings': { label: 'Configuración y Analítica', category: 'Organización' },
    'view:classes': { label: 'Clases y Testimonios', category: 'Programa' },
    'manage:assignments': { label: 'Reasignación de Alumnos', category: 'Operaciones' },
};

export function RolePermissionsManager() {
    const roles = Object.values(UserRole).filter(r => r !== UserRole.ADMIN && r !== UserRole.CLIENT);
    const permissions = Object.values(PERMISSIONS);
    const [registry, setRegistry] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    useEffect(() => {
        loadRegistry();
    }, []);

    const loadRegistry = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('role_permissions_registry')
                .select('*')
                .eq('enabled', true);

            if (error) throw error;

            const mapping: Record<string, string[]> = {};
            data.forEach(item => {
                if (!mapping[item.role]) mapping[item.role] = [];
                mapping[item.role].push(item.permission);
            });
            setRegistry(mapping);
        } catch (err) {
            console.error('Error loading permissions registry:', err);
            toast.error('Error al cargar la matriz de permisos');
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = (role: string, permission: string) => {
        setRegistry(prev => {
            const current = prev[role] || [];
            if (current.includes(permission)) {
                return { ...prev, [role]: current.filter(p => p !== permission) };
            } else {
                return { ...prev, [role]: [...current, permission] };
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates: any[] = [];

            roles.forEach(role => {
                permissions.forEach(perm => {
                    updates.push({
                        role,
                        permission: perm,
                        enabled: (registry[role] || []).includes(perm)
                    });
                });
            });

            const { error } = await supabase
                .from('role_permissions_registry')
                .upsert(updates, { onConflict: 'role,permission' });

            if (error) throw error;
            toast.success('Configuración de permisos guardada correctamente');
        } catch (err) {
            console.error('Error saving permissions:', err);
            toast.error('Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Matriz de Permisos por Rol</h2>
                            <p className="text-sm text-slate-500">Configura qué puede ver y hacer cada rol en el CRM</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar Cambios
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Permiso / Módulo</th>
                                {roles.map(role => (
                                    <th key={role} className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center capitalize">
                                        {role.replace('_', ' ')}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {permissions.map(perm => {
                                const info = PERMISSION_LABELS[perm] || { label: perm, category: 'Otros' };
                                return (
                                    <tr key={perm} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">
                                                {info.category}
                                            </div>
                                            <div className="font-semibold text-slate-700 text-sm">
                                                {info.label}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono italic opacity-0 hover:opacity-100 transition-opacity">
                                                {perm}
                                            </div>
                                        </td>
                                        {roles.map(role => {
                                            const isEnabled = (registry[role] || []).includes(perm);
                                            return (
                                                <td key={`${role}-${perm}`} className="py-4 px-4 text-center">
                                                    <button
                                                        onClick={() => togglePermission(role, perm)}
                                                        className={`w-10 h-10 rounded-xl inline-flex items-center justify-center transition-all ${isEnabled
                                                            ? 'bg-blue-50 text-blue-600 shadow-sm'
                                                            : 'bg-slate-50 text-slate-300 hover:bg-slate-100'
                                                            }`}
                                                    >
                                                        {isEnabled ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                        <strong>Nota Importante:</strong> El rol de <strong>Administrador</strong> mantiene acceso total por defecto e inmutable.
                        Los cambios aquí afectan a la visibilidad del menú y a las protecciones de nivel de componente en tiempo real para el resto de miembros del equipo.
                    </p>
                </div>
            </div>
        </div>
    );
}

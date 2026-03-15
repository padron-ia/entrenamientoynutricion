import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Trash2, Plus, DollarSign, Save, X, Loader2, AlertCircle, Edit2, RotateCw, Check } from 'lucide-react';

interface PaymentMethod {
    id: string;
    name: string;
    platform_fee_percentage: number;
}

export const PaymentMethodsManager: React.FC = () => {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);

    // Create State
    const [isCreating, setIsCreating] = useState(false);
    const [newMethod, setNewMethod] = useState({ name: '', platform_fee_percentage: '' });

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', platform_fee_percentage: '' });

    // Delete Confirmation State (id of the item pending deletion)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        loadMethods();
    }, []);

    const loadMethods = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const { data, error } = await supabase
                .from('payment_methods')
                .select('*')
                .order('name');

            if (error) throw error;
            setMethods(data || []);
        } catch (error: any) {
            console.error('Error loading payment methods:', error);
            setErrorMsg('Error al cargar datos: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newMethod.name || !newMethod.platform_fee_percentage) return;
        setSaving(true);
        setErrorMsg(null);
        try {
            const { error } = await supabase.from('payment_methods').insert({
                name: newMethod.name,
                platform_fee_percentage: parseFloat(newMethod.platform_fee_percentage)
            });

            if (error) throw error;

            setNewMethod({ name: '', platform_fee_percentage: '' });
            setIsCreating(false);
            loadMethods();
        } catch (error: any) {
            setErrorMsg('Error al crear: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const startEditing = (method: PaymentMethod) => {
        setEditingId(method.id);
        setEditForm({
            name: method.name,
            platform_fee_percentage: method.platform_fee_percentage.toString()
        });
        setIsCreating(false);
    };

    const handleUpdate = async () => {
        if (!editingId || !editForm.name || !editForm.platform_fee_percentage) return;
        setSaving(true);
        setErrorMsg(null);
        try {
            const { error } = await supabase
                .from('payment_methods')
                .update({
                    name: editForm.name,
                    platform_fee_percentage: parseFloat(editForm.platform_fee_percentage)
                })
                .eq('id', editingId);

            if (error) throw error;

            setEditingId(null);
            loadMethods();
        } catch (error: any) {
            setErrorMsg('Error al actualizar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const requestDelete = (id: string) => {
        if (deleteConfirmId === id) {
            // Second click: actually delete
            handleDelete(id);
        } else {
            // First click: ask for confirmation
            setDeleteConfirmId(id);
            // Auto-reset confirmation after 3 seconds
            setTimeout(() => setDeleteConfirmId(prev => prev === id ? null : prev), 3000);
        }
    };

    const handleDelete = async (id: string) => {
        setSaving(true); // Show global saving state or local loading could be better, but this is simple
        try {
            const { error } = await supabase.from('payment_methods').delete().eq('id', id);
            if (error) throw error;

            setDeleteConfirmId(null);
            loadMethods();
        } catch (error: any) {
            console.error('Delete error:', error);
            setErrorMsg('No se pudo eliminar. ¿Es posible que haya ventas usando este método?');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        Métodos de Pago y Comisiones
                    </h3>
                    <p className="text-sm text-slate-500">Configura las comisiones que cobran las pasarelas (Stripe, Hotmart, etc.)</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => loadMethods()}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        title="Refrescar lista"
                    >
                        <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {!isCreating && !editingId && (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Método
                        </button>
                    )}
                </div>
            </div>

            {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errorMsg}
                    <button onClick={() => setErrorMsg(null)} className="ml-auto p-1 hover:bg-red-100 rounded">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* CREATE FORM */}
            {isCreating && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-3">Añadir Nuevo Método</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nombre Plataforma</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                placeholder="Ej: Hotmart, Stripe..."
                                value={newMethod.name}
                                onChange={e => setNewMethod({ ...newMethod, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Comisión Plataforma (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                placeholder="Ej: 9.90"
                                value={newMethod.platform_fee_percentage}
                                onChange={e => setNewMethod({ ...newMethod, platform_fee_percentage: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Guardar
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
            ) : methods.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No hay métodos de pago configurados.</div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">Método</th>
                                <th className="px-4 py-3 text-right">Comisión Pasarela</th>
                                <th className="px-4 py-3 text-right">Ejemplo (1000€)</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {methods.map(method => (
                                <tr key={method.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    {editingId === method.id ? (
                                        // EDIT MODE ROW
                                        <>
                                            <td className="px-4 py-3">
                                                <input
                                                    className="w-full px-2 py-1 border rounded"
                                                    value={editForm.name}
                                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                    autoFocus
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <input
                                                    className="w-20 px-2 py-1 border rounded text-right ml-auto"
                                                    type="number"
                                                    step="0.01"
                                                    value={editForm.platform_fee_percentage}
                                                    onChange={e => setEditForm({ ...editForm, platform_fee_percentage: e.target.value })}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-slate-400">
                                                (Editando...)
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={handleUpdate} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        // VIEW MODE ROW
                                        <>
                                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{method.name}</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                                                {method.platform_fee_percentage}%
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-slate-400">
                                                -{1000 * (method.platform_fee_percentage / 100)}€
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => startEditing(method)}
                                                        className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => requestDelete(method.id)}
                                                        className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${deleteConfirmId === method.id
                                                                ? 'bg-red-100 text-red-600 w-auto px-2'
                                                                : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                                                            }`}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        {deleteConfirmId === method.id && <span className="text-xs font-bold">¿Confirmar?</span>}
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100 dark:border-yellow-900/30 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-bold mb-1">Nota importante sobre comisiones:</p>
                    <p>Las comisiones de los Closers se calculan sobre el <strong>Monto Neto</strong> (Venta - Comisión Pasarela).</p>
                    <p className="mt-1 opacity-80 text-xs">Ejemplo: Venta 1000€ - 10% Hotmart = 900€ Neto. Si el closer tiene 10%, gana 90€ (el 10% de 900€).</p>
                </div>
            </div>
        </div>
    );
};

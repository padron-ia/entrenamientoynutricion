import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import {
    Search,
    Plus,
    Filter,
    ExternalLink,
    Calendar,
    Zap,
    Tag,
    Loader2,
    Trash2,
    CheckCircle2,
    Leaf,
    Flame,
    Utensils,
    Waves,
    Wheat,
    WheatOff,
    Beef,
    Fish,
    ChevronDown,
    ChevronRight,
    ArrowLeft,
    Folder,
    LayoutGrid
} from 'lucide-react';

// --- Types ---
interface FoodPlan {
    id: string;
    name: string;
    type: string;
    calories: number;
    url: string;
    month_label: string;
    fortnight_label: string;
    year: number;
    description?: string;
    month_number?: number;
    fortnight_number?: number;
}

export default function FoodPlansLibrary() {
    const [plans, setPlans] = useState<FoodPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // NAVIGATION STATE
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        type: 'Flexible',
        calories: 1400,
        url: '',
        month_label: 'Enero',
        fortnight_label: '1ª Quincena',
        description: '',
        newType: '',
        isCustomType: false
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    async function fetchPlans() {
        try {
            setLoading(true);
            const { data } = await supabase
                .from('food_plans')
                .select('*')
                .order('year', { ascending: false })
                .order('month_number', { ascending: false });
            if (data) setPlans(data);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    }

    // --- LOGIC ---

    // Get Categories (Types) count
    const categories = Array.from(new Set(plans.map(p => p.type))).sort();
    const getCategoryCount = (type: string) => plans.filter(p => p.type === type).length;

    // Get Data for Selected Category
    const filteredPlans = selectedCategory
        ? plans.filter(p => p.type === selectedCategory)
        : [];

    async function handleDelete(id: string) {
        if (!confirm('¿Seguro que quieres borrar este plan?')) return;
        try {
            await supabase.from('food_plans').delete().eq('id', id);
            setPlans(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            alert('Error al borrar');
        }
    }

    async function handleSave() {
        try {
            setSaving(true);
            const monthsMap: Record<string, number> = {
                'Enero': 1, 'Febrero': 2, 'Marzo': 3, 'Abril': 4, 'Mayo': 5, 'Junio': 6,
                'Julio': 7, 'Agosto': 8, 'Septiembre': 9, 'Octubre': 10, 'Noviembre': 11, 'Diciembre': 12
            };

            const monthNum = monthsMap[formData.month_label] || 1;
            const fortnightNum = formData.fortnight_label.includes('1') ? 1 : 2;
            const currentYear = new Date().getFullYear();

            const finalType = formData.isCustomType ? formData.newType : formData.type;
            if (!finalType.trim()) {
                alert("Debes especificar un tipo de plan.");
                setSaving(false);
                return;
            }

            const { error } = await supabase.from('food_plans').insert([
                {
                    name: formData.name,
                    type: finalType,
                    calories: formData.calories,
                    url: formData.url,
                    month_label: formData.month_label,
                    fortnight_label: formData.fortnight_label,
                    description: formData.description,
                    year: currentYear,
                    month_number: monthNum,
                    fortnight_number: fortnightNum
                }
            ]);

            if (error) throw error;
            setIsModalOpen(false);
            setFormData({ ...formData, name: '', description: '', url: '', newType: '', isCustomType: false });
            fetchPlans();
        } catch (error) {
            alert('Error al guardar el plan');
        } finally {
            setSaving(false);
        }
    }

    const allTypes = Array.from(new Set(['Flexible', 'Pescetariano', 'Vegetariano', 'Sin Gluten', 'Keto', ...categories])).sort();

    return (
        <div className="space-y-6 animate-fade-in pb-20 max-w-[1400px] mx-auto">

            {/* --- HEADER --- */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    {selectedCategory && (
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            {selectedCategory || 'Biblioteca de Menús'}
                        </h1>
                        <p className="text-slate-500 text-sm">
                            {selectedCategory ? 'Explora el historial de planes para esta categoría' : 'Selecciona una categoría para empezar'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">Nuevo Plan</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-40"><Loader2 className="w-10 h-10 text-slate-300 animate-spin" /></div>
            ) : !selectedCategory ? (
                // --- VIEW 1: CATEGORY GRID (HOME) ---
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    {allTypes.map(type => {
                        const count = getCategoryCount(type);
                        const Icon = getIconForType(type);

                        return (
                            <div
                                key={type}
                                onClick={() => setSelectedCategory(type)}
                                className="group cursor-pointer bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900 transition-all duration-300 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                                    {/* Big Background Icon */}
                                    {React.cloneElement(Icon as React.ReactElement, { className: 'w-24 h-24' })}
                                </div>

                                <div className="flex items-start justify-between mb-4 relative z-10">
                                    <div className={`p-3 rounded-xl ${getColorForType(type).bg} ${getColorForType(type).text}`}>
                                        {React.cloneElement(Icon as React.ReactElement, { className: 'w-8 h-8' })}
                                    </div>
                                    <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-lg">
                                        {count} planes
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1 group-hover:text-blue-600 transition-colors relative z-10">
                                    {type}
                                </h3>
                                <p className="text-sm text-slate-400 group-hover:text-slate-500 transition-colors relative z-10">
                                    Ver historial completo
                                </p>
                            </div>
                        );
                    })}
                </div>

            ) : (
                // --- VIEW 2: DETAIL LIST (CHRONOLOGICAL) ---
                <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                    <CategoryDetailView plans={filteredPlans} onDelete={handleDelete} />
                </div>
            )}

            {/* Reuse Modal */}
            {isModalOpen && (
                <PlanFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    formData={formData}
                    setFormData={setFormData}
                    saving={saving}
                    types={allTypes}
                />
            )}
        </div>
    );
}

// --- SUB-VIEWS ---

function CategoryDetailView({ plans, onDelete }: { plans: FoodPlan[], onDelete: (id: string) => void }) {
    if (plans.length === 0) {
        return (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <Folder className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-500">Carpeta Vacía</h3>
                <p className="text-slate-400">Aún no hay planes de este tipo.</p>
            </div>
        )
    }

    // Grouping Logic: Year -> Month
    const grouped = plans.reduce((acc, plan) => {
        const y = plan.year || new Date().getFullYear();
        const mKey = `${plan.month_number || 0}-${plan.month_label}`;

        if (!acc[y]) acc[y] = {};
        if (!acc[y][mKey]) acc[y][mKey] = [];
        acc[y][mKey].push(plan);
        return acc;
    }, {} as Record<number, Record<string, FoodPlan[]>>);

    const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);

    return (
        <div className="space-y-8">
            {years.map(year => (
                <div key={year}>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 pl-1">{year}</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {Object.keys(grouped[year]).sort((a, b) => parseInt(b.split('-')[0]) - parseInt(a.split('-')[0])).map(mKey => {
                            const [_, monthLabel] = mKey.split('-');
                            const monthPlans = grouped[year][mKey];

                            // Group by Fortnight
                            const byFortnight = monthPlans.reduce((acc, p) => {
                                const f = p.fortnight_label || 'General';
                                if (!acc[f]) acc[f] = [];
                                acc[f].push(p);
                                return acc;
                            }, {} as Record<string, FoodPlan[]>);

                            const fKeys = Object.keys(byFortnight).sort().reverse(); // 2a before 1a ideally

                            return (
                                <div key={mKey} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 capitalize">{monthLabel}</h4>
                                    </div>

                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {fKeys.map(fLabel => (
                                            <div key={fLabel} className="p-6">
                                                <div className="flex items-center gap-2 mb-4 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                                                    <Calendar className="w-3 h-3" />
                                                    {fLabel}
                                                </div>

                                                <div className="flex flex-wrap gap-3">
                                                    {byFortnight[fLabel].sort((a, b) => a.calories - b.calories).map(plan => (
                                                        <PlanLinkPill key={plan.id} plan={plan} onDelete={onDelete} />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}


// --- HELPERS ---

function PlanLinkPill({ plan, onDelete }: { plan: FoodPlan, onDelete: (id: string) => void }) {
    const getColor = (c: number) => {
        if (c < 1500) return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200';
        if (c < 1900) return 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200';
        return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200';
    };

    return (
        <div className="group relative flex items-center animate-in zoom-in-95 duration-200">
            <a
                href={plan.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md ${getColor(plan.calories)}`}
                title={plan.description || plan.name}
            >
                <Zap className="w-4 h-4" />
                {plan.calories} kcal
                <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 ml-1" />
            </a>
            <button
                onClick={(e) => { e.preventDefault(); onDelete(plan.id); }}
                className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-full shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
                title="Borrar variante"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}

function getIconForType(type: string) {
    const t = type.toLowerCase();
    if (t.includes('pesc')) return <Fish />;
    if (t.includes('veg')) return <Leaf />;
    if (t.includes('keto')) return <Beef />;
    if (t.includes('gluten')) return <WheatOff />;
    if (t.includes('flex')) return <Waves />;
    if (t.includes('carne')) return <Utensils />;
    return <LayoutGrid />;
}

function getColorForType(type: string) {
    const t = type.toLowerCase();
    if (t.includes('pesc')) return { bg: 'bg-blue-100', text: 'text-blue-600' };
    if (t.includes('veg')) return { bg: 'bg-green-100', text: 'text-green-600' };
    if (t.includes('keto')) return { bg: 'bg-red-100', text: 'text-red-600' };
    if (t.includes('gluten')) return { bg: 'bg-amber-100', text: 'text-amber-600' };
    return { bg: 'bg-slate-100', text: 'text-slate-600' };
}

interface PlanFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    formData: any;
    setFormData: (val: any) => void;
    saving: boolean;
    types: string[];
}

function PlanFormModal({ isOpen, onClose, onSave, formData, setFormData, saving, types }: PlanFormModalProps) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold">Nuevo Plan Nutricional</h2>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    {/* Name */}
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Nombre</label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ej: Menú Flexible Enero"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    {/* Type & Calories Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Tipo</label>
                            {formData.isCustomType ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Nuevo Tipo..."
                                        autoFocus
                                        value={formData.newType}
                                        onChange={e => setFormData({ ...formData, newType: e.target.value })}
                                    />
                                    <button
                                        onClick={() => setFormData({ ...formData, isCustomType: false, type: types[0] })}
                                        className="px-3 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200"
                                        title="Cancelar"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <select
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none"
                                    value={formData.type}
                                    onChange={e => {
                                        if (e.target.value === 'custom_option') {
                                            setFormData({ ...formData, isCustomType: true, newType: '' });
                                        } else {
                                            setFormData({ ...formData, type: e.target.value, isCustomType: false });
                                        }
                                    }}
                                >
                                    {types.map((t: string) => <option key={t} value={t}>{t}</option>)}
                                    <option value="custom_option" className="font-bold text-blue-600">+ Nuevo Tipo...</option>
                                </select>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Kcal</label>
                            <select
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none font-mono"
                                value={formData.calories}
                                onChange={e => setFormData({ ...formData, calories: parseInt(e.target.value) })}
                            >
                                {[1200, 1400, 1500, 1600, 1800, 2000, 2200, 2500].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    {/* URL */}
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">URL (PDF/Drive)</label>
                        <input
                            type="url"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://..."
                            value={formData.url}
                            onChange={e => setFormData({ ...formData, url: e.target.value })}
                        />
                    </div>
                    {/* Metadata Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Mes</label>
                            <select
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none"
                                value={formData.month_label}
                                onChange={e => setFormData({ ...formData, month_label: e.target.value })}
                            >
                                {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Quincena</label>
                            <select
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none"
                                value={formData.fortnight_label}
                                onChange={e => setFormData({ ...formData, fortnight_label: e.target.value })}
                            >
                                <option>1ª Quincena</option>
                                <option>2ª Quincena</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-500 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                    <button onClick={onSave} disabled={saving} className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50">
                        {saving ? 'Guardando...' : 'Crear Plan'}
                    </button>
                </div>
            </div>
        </div>
    );
}

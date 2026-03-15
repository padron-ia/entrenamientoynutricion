
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Client, ClientStatus } from '../types';
import {
    Users,
    PauseCircle,
    UserMinus,
    AlertOctagon,
    Search,
    Calendar,
    Filter,
    ArrowRight,
    MessageSquare,
    Clock,
    ChevronRight,
    UserPlus
} from 'lucide-react';

interface StatusHistoryRecord {
    id: string;
    client_id: string;
    old_status: string;
    new_status: string;
    change_date: string;
    reason: string;
    created_at: string;
    client?: any;
}

interface ChurnRetentionViewProps {
    defaultTab?: 'bajas' | 'abandonos' | 'altas' | 'pausas';
}

const ChurnRetentionView: React.FC<ChurnRetentionViewProps> = ({ defaultTab }) => {
    const [activeTab, setActiveTab] = useState<'bajas' | 'abandonos' | 'altas' | 'pausas'>(
        defaultTab || 'bajas'
    );
    const [history, setHistory] = useState<StatusHistoryRecord[]>([]);
    const [pauses, setPauses] = useState<any[]>([]);
    const [newClients, setNewClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);

    useEffect(() => {
        if (defaultTab) {
            setActiveTab(defaultTab);
        }
    }, [defaultTab]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load Status History with Client info
            const { data: historyData, error: historyError } = await supabase
                .from('client_status_history')
                .select('*, client:clientes_pt_notion(property_nombre, property_apellidos, property_correo_electr_nico, property_coach)')
                .order('change_date', { ascending: false });

            if (historyError) throw historyError;
            setHistory(historyData || []);

            // Load Contract Pauses
            const { data: pauseData, error: pauseError } = await supabase
                .from('contract_pauses')
                .select('*, client:clientes_pt_notion(property_nombre, property_apellidos, property_correo_electr_nico, property_coach)')
                .order('start_date', { ascending: false });

            if (pauseError) throw pauseError;
            setPauses(pauseData || []);

            // Load New Clients (Altas)
            const { data: altasData, error: altasError } = await supabase
                .from('clientes_pt_notion')
                .select('id, property_nombre, property_apellidos, property_correo_electr_nico, property_coach, created_at')
                .order('created_at', { ascending: false });

            if (altasError) throw altasError;
            setNewClients(altasData || []);

        } catch (error) {
            console.error("Error loading churn data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        let data = [];
        if (activeTab === 'pausas') {
            data = pauses;
        } else if (activeTab === 'altas') {
            data = newClients;
        } else if (activeTab === 'bajas') {
            data = history.filter(h => h.new_status === ClientStatus.INACTIVE);
        } else if (activeTab === 'abandonos') {
            data = history.filter(h => h.new_status === ClientStatus.DROPOUT);
        }

        // Apply Month/Year Filter
        data = data.filter(item => {
            let dateStr;
            if (activeTab === 'pausas') {
                dateStr = item.start_date;
            } else if (activeTab === 'altas') {
                dateStr = item.created_at;
            } else {
                dateStr = item.change_date;
            }
            if (!dateStr) return false;
            const date = new Date(dateStr);
            return (date.getMonth() + 1) === selectedMonth && date.getFullYear() === selectedYear;
        });

        // Apply Search Filter
        if (searchTerm) {
            data = data.filter(item => {
                const client = item.client || item; // For altas, the item is the client
                const name = `${client.property_nombre || ''} ${client.property_apellidos || ''}`.toLowerCase();
                const email = (client.property_correo_electr_nico || '').toLowerCase();
                return name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
            });
        }

        return data;
    }, [activeTab, history, pauses, searchTerm, selectedMonth, selectedYear]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <Users className="w-8 h-8 text-indigo-600" />
                        Análisis de Retención y Salidas
                    </h1>
                    <p className="text-slate-500 mt-1">Seguimiento diferenciado de altas, bajas, abandonos y pausas.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex gap-2">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold shadow-sm"
                        >
                            {months.map((m, i) => (
                                <option key={i + 1} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold shadow-sm"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full md:w-64 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* SUMMARY CARDS - Filtered by selected month */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                        <UserMinus className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bajas — {months[selectedMonth - 1]}</p>
                        <p className="text-2xl font-black text-slate-900">
                            {history.filter(h =>
                                h.new_status === ClientStatus.INACTIVE &&
                                (() => { const d = new Date(h.change_date); return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear; })()
                            ).length}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                        <AlertOctagon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Abandonos — {months[selectedMonth - 1]}</p>
                        <p className="text-2xl font-black text-slate-900">
                            {history.filter(h =>
                                h.new_status === ClientStatus.DROPOUT &&
                                (() => { const d = new Date(h.change_date); return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear; })()
                            ).length}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Altas — {months[selectedMonth - 1]}</p>
                        <p className="text-2xl font-black text-slate-900">
                            {newClients.filter(c => {
                                const d = new Date(c.created_at);
                                return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
                            }).length}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                        <PauseCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pausas — {months[selectedMonth - 1]}</p>
                        <p className="text-2xl font-black text-slate-900">
                            {pauses.filter(p => {
                                const d = p.start_date ? new Date(p.start_date) : null;
                                return d && (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
                            }).length}
                        </p>
                    </div>
                </div>
            </div>

            {/* TABS */}
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('bajas')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'bajas'
                        ? 'bg-white text-rose-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                >
                    <UserMinus className="w-4 h-4" />
                    Bajas
                </button>
                <button
                    onClick={() => setActiveTab('abandonos')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'abandonos'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                >
                    <AlertOctagon className="w-4 h-4" />
                    Abandonos
                </button>
                <button
                    onClick={() => setActiveTab('altas')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'altas'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                >
                    <UserPlus className="w-4 h-4" />
                    Altas
                </button>
                <button
                    onClick={() => setActiveTab('pausas')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'pausas'
                        ? 'bg-white text-amber-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                >
                    <PauseCircle className="w-4 h-4" />
                    Pausas
                </button>
            </div>

            {/* CONTENT */}
            {isLoading ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Cargando datos históricos...</p>
                </div>
            ) : filteredData.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Filter className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No se encontraron registros</h3>
                    <p className="text-slate-500 mt-1">Intenta con otro término de búsqueda o cambia de pestaña.</p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Coach</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Fecha</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Motivo / Notas</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                {activeTab === 'altas' ? `${item.property_nombre || ''} ${item.property_apellidos || ''}` : `${item.client?.property_nombre || ''} ${item.client?.property_apellidos || ''}`}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {activeTab === 'altas' ? item.property_correo_electr_nico : item.client?.property_correo_electr_nico || '-'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-tight">
                                            {(activeTab === 'altas' ? item.property_coach : item.client?.property_coach) || 'Sin asignar'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex flex-col items-center">
                                            <Calendar className="w-3.5 h-3.5 text-slate-300 mb-1" />
                                            <span className="text-sm font-medium text-slate-700">
                                                {new Date(activeTab === 'pausas' ? (item.start_date) : (activeTab === 'altas' ? item.created_at : item.change_date)).toLocaleDateString('es-ES')}
                                            </span>
                                            {activeTab === 'pausas' && item.end_date && (
                                                <span className="text-[10px] text-emerald-600 font-bold mt-1 uppercase">
                                                    Reanudado: {new Date(item.end_date).toLocaleDateString('es-ES')}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 max-w-md">
                                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex gap-3">
                                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100 shrink-0">
                                                <MessageSquare className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <p className="text-sm text-slate-700 font-medium leading-relaxed">
                                                {activeTab === 'altas' ? 'Alta de nuevo cliente' : (item.reason || 'Sin motivo especificado')}
                                                {activeTab === 'abandonos' && (
                                                    <span className="ml-2 px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded">ABANDONO</span>
                                                )}
                                                {activeTab === 'bajas' && (
                                                    <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">BAJA</span>
                                                )}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

        </div>
    );
};

export default ChurnRetentionView;

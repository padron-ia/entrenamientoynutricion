import React, { useState, useEffect } from 'react';
import { User, MedicalReview } from '../types';
import { mockDb } from '../services/mockSupabase';
import { Stethoscope, ClipboardCheck, CalendarClock, DollarSign, ArrowRight, Activity, AlertTriangle, ClipboardList, FileText, ChevronLeft, ChevronRight, Bell } from 'lucide-react';

interface EndocrinoDashboardHomeProps {
    currentUser: User;
    onNavigate: (view: string) => void;
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const EndocrinoDashboardHome: React.FC<EndocrinoDashboardHomeProps> = ({ currentUser, onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [allReviews, setAllReviews] = useState<MedicalReview[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    const isCurrentMonth = (() => {
        const now = new Date();
        return selectedMonth.getFullYear() === now.getFullYear() && selectedMonth.getMonth() === now.getMonth();
    })();

    const goToPrevMonth = () => {
        setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        if (!isCurrentMonth) {
            setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        }
    };

    const goToToday = () => {
        const now = new Date();
        setSelectedMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    };

    const isInSelectedMonth = (dateStr: string | undefined) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getFullYear() === selectedMonth.getFullYear() && d.getMonth() === selectedMonth.getMonth();
    };

    // Compute stats filtered by selected month
    const stats = (() => {
        const initialAssessments = allReviews.filter(r =>
            r.report_type === 'Valoración Inicial' && isInSelectedMonth(r.submission_date)
        ).length;

        const revisionsReceived = allReviews.filter(r =>
            r.report_type !== 'Valoración Inicial' &&
            r.report_type !== 'Informe Médico' &&
            isInSelectedMonth(r.submission_date)
        ).length;

        const revisionsDone = allReviews.filter(r =>
            r.status === 'reviewed' &&
            r.report_type !== 'Informe Médico' &&
            isInSelectedMonth(r.reviewed_at)
        ).length;

        const medicalReports = allReviews.filter(r =>
            r.report_type === 'Informe Médico' && isInSelectedMonth(r.created_at)
        ).length;

        return { initialAssessments, revisionsReceived, revisionsDone, medicalReports };
    })();

    const pendingInitialReviews = allReviews.filter(r =>
        r.report_type === 'Valoración Inicial' &&
        r.status === 'pending' &&
        isInSelectedMonth(r.submission_date)
    );

    // Global pending counts (not filtered by month) for alert banner
    const globalPendingInitial = allReviews.filter(r =>
        r.report_type === 'Valoración Inicial' && r.status === 'pending'
    ).length;

    const globalPendingReviews = allReviews.filter(r =>
        r.report_type !== 'Valoración Inicial' &&
        r.report_type !== 'Informe Médico' &&
        r.status === 'pending'
    ).length;

    const totalPending = globalPendingInitial + globalPendingReviews;

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const reviews = await mockDb.medical.getAll();
                setAllReviews(reviews);
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [currentUser]);

    return (
        <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-xl text-emerald-700">
                        <LayoutDashboardIcon className="w-8 h-8" />
                    </div>
                    Hola, Dr/a. {currentUser.name.split(' ')[0]}
                </h1>
                <p className="text-slate-500 mt-2 text-lg">Bienvenido a tu panel de control médico.</p>
            </div>

            {/* Pending Items Alert Banner */}
            {!loading && totalPending > 0 && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-5 text-white shadow-xl shadow-amber-200 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shrink-0">
                            <Bell className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">
                                {totalPending} {totalPending === 1 ? 'tarea pendiente' : 'tareas pendientes'}
                            </h2>
                            <p className="text-amber-100 text-sm mt-0.5">
                                {[
                                    globalPendingInitial > 0 && `${globalPendingInitial} valoraci${globalPendingInitial > 1 ? 'ones' : 'ón'} inicial${globalPendingInitial > 1 ? 'es' : ''}`,
                                    globalPendingReviews > 0 && `${globalPendingReviews} revisi${globalPendingReviews > 1 ? 'ones' : 'ón'} médica${globalPendingReviews > 1 ? 's' : ''}`
                                ].filter(Boolean).join(' y ')}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        {globalPendingInitial > 0 && (
                            <button
                                onClick={() => onNavigate('endocrino-initial-reports')}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
                            >
                                Valoraciones <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                        {globalPendingReviews > 0 && (
                            <button
                                onClick={() => onNavigate('medical-reviews')}
                                className="px-4 py-2 bg-white text-amber-600 font-bold rounded-xl text-sm hover:bg-amber-50 transition-colors flex items-center gap-2"
                            >
                                Revisiones <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Month Selector */}
            <div className="flex items-center gap-3 mb-8">
                <button
                    onClick={goToPrevMonth}
                    className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-600"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-lg font-bold text-slate-800 min-w-[180px] text-center">
                    {MONTH_NAMES[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
                </span>
                <button
                    onClick={goToNextMonth}
                    disabled={isCurrentMonth}
                    className={`p-2 rounded-lg bg-white border border-slate-200 transition-all ${isCurrentMonth ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50 hover:border-slate-300 text-slate-600'}`}
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
                {!isCurrentMonth && (
                    <button
                        onClick={goToToday}
                        className="ml-2 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-bold hover:bg-emerald-200 transition-all"
                    >
                        Hoy
                    </button>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {/* Valoraciones Iniciales */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-200 hover:shadow-md transition-shadow relative overflow-hidden group ring-1 ring-indigo-50">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <ClipboardList className="w-5 h-5" />
                            </div>
                            <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider">Valoraciones Iniciales</h3>
                        </div>
                        <p className="text-4xl font-black text-indigo-700 mt-2">{loading ? '-' : stats.initialAssessments}</p>
                        <button
                            onClick={() => onNavigate('endocrino-initial-reports')}
                            className="mt-4 text-indigo-600 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
                        >
                            Ver informes <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Revisiones Recibidas */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider">Revisiones Recibidas</h3>
                        </div>
                        <p className="text-4xl font-black text-slate-800 mt-2">{loading ? '-' : stats.revisionsReceived}</p>
                        <button
                            onClick={() => onNavigate('medical-reviews')}
                            className="mt-4 text-amber-600 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
                        >
                            Ver revisiones <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Revisiones Realizadas */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <ClipboardCheck className="w-5 h-5" />
                            </div>
                            <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider">Revisiones Realizadas</h3>
                        </div>
                        <p className="text-4xl font-black text-slate-800 mt-2">{loading ? '-' : stats.revisionsDone}</p>
                    </div>
                </div>

                {/* Informes Médicos */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200 hover:shadow-md transition-shadow relative overflow-hidden group ring-1 ring-purple-50">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                <FileText className="w-5 h-5" />
                            </div>
                            <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider">Informes Médicos</h3>
                        </div>
                        <p className="text-4xl font-black text-purple-700 mt-2">{loading ? '-' : stats.medicalReports}</p>
                        <button
                            onClick={() => onNavigate('endocrino-medical-reports')}
                            className="mt-4 text-purple-600 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
                        >
                            Ver informes <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Pending Initial Assessments List */}
            {pendingInitialReviews.length > 0 && (
                <div className="mb-10">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-indigo-600" />
                        Informes Iniciales Pendientes
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingInitialReviews.map(review => (
                            <div
                                key={review.id}
                                onClick={() => onNavigate('endocrino-initial-reports')}
                                className="bg-white p-5 rounded-2xl border border-indigo-100 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                        <ClipboardList className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                                            {(review as any).client_name || 'Paciente'}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Recibido: {new Date(review.submission_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 uppercase">Pendiente</span>
                                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions Grid */}
            <h2 className="text-lg font-bold text-slate-800 mb-4">Accesos Rápidos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                    onClick={() => onNavigate('medical-reviews')}
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-emerald-100 hover:shadow-lg transition-all text-left group"
                >
                    <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
                        <Stethoscope className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-emerald-700">Revisiones Médicas</h3>
                    <p className="text-xs text-slate-500 mt-1">Gestionar y responder consultas</p>
                </button>

                <button
                    onClick={() => onNavigate('coach-agenda')}
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-blue-100 hover:shadow-lg transition-all text-left group"
                >
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition-transform">
                        <CalendarClock className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-700">Mi Agenda</h3>
                    <p className="text-xs text-slate-500 mt-1">Ver citas y disponibilidad</p>
                </button>

                <button
                    onClick={() => onNavigate('endocrino-medical-reports')}
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-purple-500 hover:shadow-purple-100 hover:shadow-lg transition-all text-left group"
                >
                    <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 mb-3 group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-purple-700">Mis Informes</h3>
                    <p className="text-xs text-slate-500 mt-1">Ver informes médicos creados</p>
                </button>

                <button
                    onClick={() => onNavigate('coach-tasks')}
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-purple-500 hover:shadow-purple-100 hover:shadow-lg transition-all text-left group"
                >
                    <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 mb-3 group-hover:scale-110 transition-transform">
                        <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-purple-700">Mis Tareas / Notas</h3>
                    <p className="text-xs text-slate-500 mt-1">Organización personal</p>
                </button>

                <button
                    onClick={() => onNavigate('endocrino-invoices')}
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-500 hover:shadow-amber-100 hover:shadow-lg transition-all text-left group"
                >
                    <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 mb-3 group-hover:scale-110 transition-transform">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-amber-700">Mis Facturas</h3>
                    <p className="text-xs text-slate-500 mt-1">Subir y gestionar cobros</p>
                </button>
            </div>

            {/* Recent Activity or Notifications could go here */}
            <div className="mt-8 bg-indigo-50 rounded-2xl p-6 border border-indigo-100 flex items-start gap-4">
                <div className="bg-white p-2 rounded-full text-indigo-600 shadow-sm">
                    <Activity className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-indigo-900">Estado del Sistema</h3>
                    <p className="text-sm text-indigo-700 mt-1">
                        Todos los sistemas funcionan correctamente. Recuerda sincronizar tu agenda semanalmente.
                    </p>
                </div>
            </div>
        </div>
    );
};

// Helper icon
function LayoutDashboardIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
    )
}

export default EndocrinoDashboardHome;

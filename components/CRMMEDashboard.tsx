import React from 'react';
import { Stethoscope, Users, TrendingUp, DollarSign, Calendar, AlertCircle } from 'lucide-react';

interface CRMMEDashboardProps {
    onNavigate?: (view: string) => void;
}

export const CRMMEDashboard: React.FC<CRMMEDashboardProps> = ({ onNavigate }) => {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-100 rounded-xl">
                            <Stethoscope className="w-6 h-6 text-emerald-700" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800">CRM ME</h1>
                            <p className="text-slate-500">Médicos Emprendedores</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Coming Soon Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-8 text-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 text-center py-8">
                    <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-medium mb-6">
                        <AlertCircle className="w-4 h-4" />
                        En Desarrollo
                    </div>

                    <h2 className="text-3xl font-bold mb-4">Dashboard CRM ME</h2>
                    <p className="text-white/80 max-w-md mx-auto mb-8">
                        Esta sección mostrará las métricas y análisis del CRM para Médicos Emprendedores
                        una vez que se configure la base de datos correspondiente.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                        {[
                            { icon: Users, label: 'Cartera de Clientes' },
                            { icon: DollarSign, label: 'Ventas' },
                            { icon: TrendingUp, label: 'Rendimiento' },
                            { icon: Calendar, label: 'Renovaciones' },
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white/10 backdrop-blur rounded-xl p-4">
                                <item.icon className="w-6 h-6 mx-auto mb-2 opacity-70" />
                                <p className="text-sm font-medium opacity-70">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Placeholder Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Clientes Totales', value: '--', icon: Users, color: 'emerald' },
                    { label: 'Ingresos del Mes', value: '--', icon: DollarSign, color: 'blue' },
                    { label: 'Tasa de Renovación', value: '--', icon: TrendingUp, color: 'purple' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 bg-${stat.color}-100 rounded-xl`}>
                                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">{stat.label}</p>
                                <p className="text-2xl font-bold text-slate-300">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Box */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-slate-200 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800 mb-1">Próximos pasos</h3>
                        <p className="text-sm text-slate-600">
                            Para activar el CRM ME, se necesita configurar la base de datos con las tablas
                            correspondientes para leads, clientes y ventas del proyecto Médicos Emprendedores.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CRMMEDashboard;

import React from 'react';
import { Target, TrendingDown, Clock, Activity, FileText, CheckCircle2, Users, BookOpen, MessageSquare, Calendar } from 'lucide-react';

export const MockProgressCard: React.FC = () => {
    return (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl shadow-slate-200/60 p-6 border border-white/60 transform rotate-1 hover:rotate-0 transition-transform duration-500 group">
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-green to-sea-500 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-brand-green/20 group-hover:scale-110 transition-transform duration-500">
                        MG
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Hola, María G.</h3>
                        <p className="text-sm text-slate-500">Semana 12 de tu programa</p>
                    </div>
                </div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    Activa
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                        <TrendingDown className="w-4 h-4 text-brand-green" />
                        Progreso Peso
                    </div>
                    <div className="text-2xl font-black text-slate-800">-8.5 <span className="text-sm font-medium text-slate-500">kg</span></div>
                    <p className="text-[10px] text-green-600 font-medium mt-1">¡Objetivo mensual superado!</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                        <Activity className="w-4 h-4 text-sea-500" />
                        HbA1c Estimada
                    </div>
                    <div className="text-2xl font-black text-slate-800">5.8 <span className="text-sm font-medium text-slate-500">%</span></div>
                    <p className="text-[10px] text-sea-600 font-medium mt-1">En rango óptimo</p>
                </div>
            </div>

            <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand-green" />
                    Tus tareas de hoy
                </h4>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 line-through opacity-70">Registro de glucemia matutina</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div>
                    <span className="text-sm font-medium text-slate-700">Entrenamiento de fuerza (45 min)</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div>
                    <span className="text-sm font-medium text-slate-700">Revisión mensual (Sube tus métricas)</span>
                </div>
            </div>
        </div>
    );
};

export const MockDocCard: React.FC = () => {
    return (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-200/50 p-6 border border-white/50 transform -rotate-2 hover:rotate-0 transition-transform duration-300">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-accent-500" />
                Nuevos Materiales Disponibles
            </h4>
            <div className="space-y-4">
                <div className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-accent-200 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center text-accent-500 group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h5 className="text-sm font-bold text-slate-800">Plan Nutricional Fase 2</h5>
                        <p className="text-xs text-slate-500 mb-1">Tu endocrino ha actualizado tu pauta.</p>
                        <span className="text-[10px] bg-accent-100 text-accent-700 px-2 py-0.5 rounded-full font-bold">Nuevo</span>
                    </div>
                </div>

                <div className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-brand-green/20 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center text-brand-green group-hover:scale-110 transition-transform">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h5 className="text-sm font-bold text-slate-800">Guía: Gestión de Antojos</h5>
                        <p className="text-xs text-slate-500 mb-1">Aprendizaje continuo: Módulo 4.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const MockClassCard: React.FC = () => {
    return (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-200/50 p-5 border border-white/50 transform rotate-2 hover:rotate-0 transition-transform duration-300">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-green" />
                    Clase Grupal en Directo
                </h4>
                <span className="text-[10px] font-bold text-red-500 animate-pulse bg-red-50 px-2 py-0.5 rounded-full border border-red-100">VIVO</span>
            </div>

            <div className="relative rounded-xl overflow-hidden mb-3 aspect-video bg-slate-200 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-3 left-3 text-white">
                    <p className="text-xs font-bold">Dr. Víctor Bravo</p>
                    <p className="text-[10px] opacity-80">Mitos sobre la insulina y peso</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-300"></div>
                    ))}
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-brand-green flex items-center justify-center text-[8px] font-bold text-white">+42</div>
                </div>
                <button className="text-[10px] font-bold text-brand-green hover:underline">Unirse ahora</button>
            </div>
        </div>
    );
};

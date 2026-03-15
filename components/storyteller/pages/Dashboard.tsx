
import React from 'react';
import { SuccessCase, CaseStatus } from '../types';
import { Plus, FolderOpen, Heart, Star } from 'lucide-react';

interface DashboardProps {
    cases: SuccessCase[];
    onNewCase: () => void;
    onViewCase: (id: string) => void;
    canCreate?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ cases, onNewCase, onViewCase, canCreate }) => {
    return (
        <div className="p-8 bg-slate-50 min-h-full">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Mis Casos de Éxito</h2>
                    <p className="text-slate-500 mt-1">Gestiona tus testimonios y genera contenido de impacto.</p>
                </div>
                {canCreate && (
                    <button
                        onClick={onNewCase}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 transition shadow-lg shadow-blue-200"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Nuevo Caso</span>
                    </button>
                )}
            </header>

            {cases.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <FolderOpen className="text-slate-400 w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-slate-800">No hay casos registrados</h3>
                    <p className="text-slate-500 max-w-sm mb-8">Sube tu primer caso de éxito para transformarlo en una narrativa visceral para Instagram.</p>
                    {canCreate && (
                        <button
                            onClick={onNewCase}
                            className="text-blue-600 font-bold hover:underline"
                        >
                            Comenzar ahora &rarr;
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cases.map((c) => (
                        <div
                            key={c.id}
                            onClick={() => onViewCase(c.id)}
                            className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition">{c.patientName}</h3>
                                <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold ${c.status === CaseStatus.READY ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {c.status === CaseStatus.READY ? 'Listo' : 'Borrador'}
                                </span>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center space-x-2 text-sm text-slate-500">
                                    <Heart className="text-rose-400 w-4 h-4" />
                                    <p className="truncate"><span className="text-slate-700 font-medium">Miedo:</span> {c.initialFear}</p>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-slate-500">
                                    <Star className="text-amber-400 w-4 h-4" />
                                    <p className="truncate"><span className="text-slate-700 font-medium">Logro:</span> {c.lifeAchievement}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="flex -space-x-2">
                                    {c.assets.slice(0, 3).map((a, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                                            <img src={a.url} alt="asset" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                    {c.assets.length > 3 && (
                                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                            +{c.assets.length - 3}
                                        </div>
                                    )}
                                </div>
                                <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;

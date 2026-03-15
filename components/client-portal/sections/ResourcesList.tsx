import React from 'react';
import {
    Video, Play, Utensils, FileHeart, FileText, Stethoscope, Heart, ChevronRight, BookOpen, Dumbbell, MessageCircle
} from 'lucide-react';
import { Client } from '../../../types';

interface ResourcesListProps {
    client: Client;
    setActiveView: (view: string) => void;
    unreadReviewsCount: number;
    unreadReportsCount: number;
    onOpenGuide?: () => void;
}

export function ResourcesList({ client, setActiveView, unreadReviewsCount, unreadReportsCount, onOpenGuide }: ResourcesListProps) {
    return (
        <div className="bg-sea-50/50 p-1 md:p-0 rounded-3xl">
            <h3 className="text-lg font-bold text-sea-900 mb-4 px-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sea-600" /> Tus Recursos
            </h3>
            <div className="grid grid-cols-1 gap-3">
                {onOpenGuide && (
                    <div onClick={onOpenGuide} className="group cursor-pointer bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-4 shadow-card border border-indigo-100 flex items-center gap-4 hover:shadow-card-hover transition-all active:scale-[0.98]">
                        <div className="w-12 h-12 rounded-xl bg-white text-indigo-600 flex items-center justify-center shrink-0 shadow-sm"><BookOpen className="w-6 h-6" /></div>
                        <div className="flex-1">
                            <h4 className="font-bold text-indigo-900 text-sm">Como usar mi portal</h4>
                            <p className="text-xs text-indigo-700">Guia visual: check-in, glucosa, pasos, revisiones y clases</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-indigo-400" />
                    </div>
                )}
                <div onClick={() => setActiveView('classes')} className="group cursor-pointer glass rounded-2xl p-4 shadow-card flex items-center gap-4 hover:shadow-card-hover transition-all active:scale-[0.98]">
                    <div className="w-12 h-12 rounded-xl bg-sea-50 text-sea-600 flex items-center justify-center shrink-0"><Video className="w-6 h-6" /></div>
                    <div className="flex-1"><h4 className="font-bold text-sea-900 text-sm">Padron Trainer</h4><p className="text-xs text-sea-400">Clases semanales</p></div><ChevronRight className="w-5 h-5 text-sea-300" />
                </div>
                <div onClick={() => setActiveView('reviews')} className="group cursor-pointer glass rounded-2xl p-4 shadow-card flex items-center gap-4 hover:shadow-card-hover transition-all active:scale-[0.98]">
                    <div className="w-12 h-12 rounded-xl bg-sea-50 text-sea-500 flex items-center justify-center shrink-0 relative">
                        <Play className="w-6 h-6" />
                        {unreadReviewsCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg">
                                {unreadReviewsCount}
                            </span>
                        )}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-sea-900 text-sm">Mis Revisiones</h4>
                        <p className="text-xs text-sea-400">{unreadReviewsCount > 0 ? `${unreadReviewsCount} nueva${unreadReviewsCount > 1 ? 's' : ''} disponible${unreadReviewsCount > 1 ? 's' : ''}` : 'Feedback semanal'}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-sea-300" />
                </div>
                <div onClick={() => setActiveView('nutrition')} className="group cursor-pointer glass rounded-2xl p-4 shadow-card flex items-center gap-4 hover:shadow-card-hover transition-all active:scale-[0.98]">
                    <div className="w-12 h-12 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center shrink-0"><Utensils className="w-6 h-6" /></div>
                    <div className="flex-1"><h4 className="font-bold text-sea-900 text-sm">Plan Nutricional</h4><p className="text-xs text-sea-400">Tu menú</p></div><ChevronRight className="w-5 h-5 text-sea-300" />
                </div>
                <div onClick={() => setActiveView('training')} className="group cursor-pointer glass rounded-2xl p-4 shadow-card flex items-center gap-4 hover:shadow-card-hover transition-all active:scale-[0.98]">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Dumbbell className="w-6 h-6" /></div>
                    <div className="flex-1"><h4 className="font-bold text-sea-900 text-sm">Mi Entrenamiento</h4><p className="text-xs text-sea-400">Registra peso, reps y progreso</p></div><ChevronRight className="w-5 h-5 text-sea-300" />
                </div>
                <div onClick={() => setActiveView('strength')} className="group cursor-pointer glass rounded-2xl p-4 shadow-card flex items-center gap-4 hover:shadow-card-hover transition-all active:scale-[0.98]">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Dumbbell className="w-6 h-6" /></div>
                    <div className="flex-1"><h4 className="font-bold text-sea-900 text-sm">Progreso de Fuerza</h4><p className="text-xs text-sea-400">Tus tests y mejoras</p></div><ChevronRight className="w-5 h-5 text-sea-300" />
                </div>
                <div onClick={() => setActiveView('chat')} className="group cursor-pointer bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-4 shadow-card border border-violet-100 flex items-center gap-4 hover:shadow-card-hover transition-all active:scale-[0.98]">
                    <div className="w-12 h-12 rounded-xl bg-white text-violet-600 flex items-center justify-center shrink-0 shadow-sm"><MessageCircle className="w-6 h-6" /></div>
                    <div className="flex-1"><h4 className="font-bold text-violet-900 text-sm">Chat con tu Coach</h4><p className="text-xs text-violet-600">Mensajes directos</p></div><ChevronRight className="w-5 h-5 text-violet-400" />
                </div>
                <div onClick={() => setActiveView('materials')} className="group cursor-pointer glass rounded-2xl p-4 shadow-card flex items-center gap-4 hover:shadow-card-hover transition-all active:scale-[0.98]">
                    <div className="w-12 h-12 rounded-xl bg-sea-50 text-sea-500 flex items-center justify-center shrink-0"><FileHeart className="w-6 h-6" /></div>
                    <div className="flex-1"><h4 className="font-bold text-sea-900 text-sm">Materiales</h4><p className="text-xs text-sea-400">Recursos extra</p></div><ChevronRight className="w-5 h-5 text-sea-300" />
                </div>
                {client.program?.contract_visible_to_client && (
                    <div onClick={() => setActiveView('contract')} className="group cursor-pointer glass rounded-2xl p-4 shadow-card flex items-center gap-4 hover:shadow-card-hover transition-all active:scale-[0.98]">
                        <div className="w-12 h-12 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center shrink-0"><FileText className="w-6 h-6" /></div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sea-900 text-sm">Mi Contrato</h4>
                            <p className="text-xs text-sea-400">{client.program?.contract_signed ? 'Firmado' : 'Pendiente de firma'}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-sea-300" />
                    </div>
                )}
                {client.allow_endocrine_access && (
                    <div onClick={() => setActiveView('medical')} className="group cursor-pointer bg-gradient-to-r from-accent-50 to-sea-50 rounded-2xl p-4 shadow-card border border-accent-100 flex items-center gap-4 hover:shadow-card-hover transition-all active:scale-[0.98]">
                        <div className="w-12 h-12 rounded-xl bg-white text-accent-600 flex items-center justify-center shrink-0 shadow-sm"><Stethoscope className="w-6 h-6" /></div>
                        <div className="flex-1"><h4 className="font-bold text-accent-800 text-sm">Endocrinología</h4><p className="text-xs text-accent-600">Premium Access</p></div><ChevronRight className="w-5 h-5 text-accent-400" />
                    </div>
                )}
                {['mujer', 'femenino', 'female'].includes(client.gender?.toLowerCase() || '') && (
                    <div onClick={() => setActiveView('cycle')} className="group cursor-pointer bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-4 shadow-card border border-pink-100 flex items-center gap-4 hover:shadow-card-hover transition-all active:scale-[0.98]">
                        <div className="w-12 h-12 rounded-xl bg-white text-pink-600 flex items-center justify-center shrink-0 shadow-sm"><Heart className="w-6 h-6" /></div>
                        <div className="flex-1">
                            <h4 className="font-bold text-pink-900 text-sm">Mi Ciclo</h4>
                            <p className="text-xs text-pink-700">
                                {client.hormonal_status === 'pre_menopausica' ? 'Seguimiento menstrual' :
                                    client.hormonal_status === 'perimenopausica' ? 'Seguimiento perimenopáusico' :
                                        client.hormonal_status === 'menopausica' ? 'Seguimiento menopáusico' :
                                            'Seguimiento hormonal'}
                            </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-pink-400" />
                    </div>
                )}
                <div onClick={() => setActiveView('reports')} className="group cursor-pointer bg-gradient-to-r from-sea-50 to-accent-50 rounded-2xl p-4 shadow-card border border-sea-100 flex items-center gap-4 hover:shadow-card-hover transition-all active:scale-[0.98] relative">
                    <div className="w-12 h-12 rounded-xl bg-white text-sea-600 flex items-center justify-center shrink-0 shadow-sm relative">
                        <FileText className="w-6 h-6" />
                        {unreadReportsCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg">
                                {unreadReportsCount}
                            </span>
                        )}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-sea-900 text-sm">Mis Informes</h4>
                        <p className="text-xs text-sea-600">{unreadReportsCount > 0 ? `${unreadReportsCount} nuevo${unreadReportsCount > 1 ? 's' : ''} disponible${unreadReportsCount > 1 ? 's' : ''}` : 'Informes médicos descargables'}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-sea-400" />
                </div>
            </div>
        </div>
    );
}

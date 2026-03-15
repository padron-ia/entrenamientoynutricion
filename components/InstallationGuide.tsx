import React, { useState, useEffect } from 'react';
import { Smartphone, Apple, Share, MoreVertical, PlusSquare, ArrowDown, X, Monitor } from 'lucide-react';

interface InstallationGuideProps {
    isOpen: boolean;
    onClose: () => void;
    forcePlatform?: 'ios' | 'android';
}

export default function InstallationGuide({ isOpen, onClose, forcePlatform }: InstallationGuideProps) {
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

    useEffect(() => {
        if (forcePlatform) {
            setPlatform(forcePlatform);
            return;
        }

        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setPlatform('ios');
        } else if (/android/.test(userAgent)) {
            setPlatform('android');
        }
    }, [forcePlatform]);

    if (!isOpen) return null;

    const GuideContent = () => {
        if (platform === 'ios') {
            return (
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3">
                        <Apple className="w-6 h-6 text-slate-800" />
                        <p className="text-sm font-bold text-blue-900">Guía para iPhone / iPad (Safari)</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold">1</div>
                            <p className="text-slate-600 text-sm py-1">
                                Toca el botón de <strong>Compartir</strong> en la barra inferior de Safari.
                                <span className="inline-flex items-center justify-center bg-slate-100 p-1 rounded ml-1"><Share className="w-4 h-4 text-blue-500" /></span>
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold">2</div>
                            <p className="text-slate-600 text-sm py-1">
                                Desliza hacia abajo en el menú que aparece hasta encontrar <strong>'Añadir a la pantalla de inicio'</strong>.
                                <span className="inline-flex items-center justify-center bg-slate-100 p-1 rounded ml-1"><PlusSquare className="w-4 h-4 text-slate-700" /></span>
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold">3</div>
                            <p className="text-slate-600 text-sm py-1"> Pulsa en <strong>'Añadir'</strong> arriba a la derecha. </p>
                        </div>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-xs text-emerald-700 font-medium">✨ ¡Listo! Ya tienes el CRM en tu escritorio como una App más.</p>
                    </div>
                </div>
            );
        }

        if (platform === 'android') {
            return (
                <div className="space-y-6">
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                        <Smartphone className="w-6 h-6 text-emerald-600" />
                        <p className="text-sm font-bold text-emerald-900">Guía para Android (Chrome)</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold">1</div>
                            <p className="text-slate-600 text-sm py-1">
                                Toca los <strong>tres puntos (⋮)</strong> en la esquina superior derecha de Chrome.
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold">2</div>
                            <p className="text-slate-600 text-sm py-1">
                                Selecciona la opción <strong>'Instalar aplicación'</strong> o <strong>'Añadir a la pantalla de inicio'</strong>.
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold">3</div>
                            <p className="text-slate-600 text-sm py-1"> Confirma pulsando en <strong>'Instalar'</strong> o <strong>'Añadir'</strong>. </p>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="text-xs text-blue-700 font-medium">🚀 ¡Perfecto! Ahora podrás entrar con un solo toque.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="text-center py-8">
                <Monitor className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Parece que estás en un ordenador.</p>
                <div className="flex justify-center gap-4 mt-6">
                    <button onClick={() => setPlatform('ios')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors">Ver Guía iPhone</button>
                    <button onClick={() => setPlatform('android')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors">Ver Guía Android</button>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="relative p-8">
                    <button
                        onClick={onClose}
                        className="absolute right-6 top-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="mb-6">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Instalar como App</h3>
                        <p className="text-slate-500 text-sm font-medium mt-1">Accede al CRM más fácil desde tu móvil</p>
                    </div>

                    <GuideContent />

                    {platform !== 'other' && (
                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center gap-4">
                            <button
                                onClick={() => setPlatform(platform === 'ios' ? 'android' : 'ios')}
                                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                                Cambiar a {platform === 'ios' ? 'Android' : 'iPhone'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

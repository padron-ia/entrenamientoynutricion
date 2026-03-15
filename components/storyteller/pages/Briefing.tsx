
import React, { useState } from 'react';
import { SuccessCase, AssetType, AssetPeriod, AssetView } from '../types';
import { FileText, Map, PenTool, Image, Copy, ArrowLeftRight, Lightbulb, Zap } from 'lucide-react';

interface BriefingProps {
    successCase: SuccessCase;
}

const Briefing: React.FC<BriefingProps> = ({ successCase }) => {
    const [activeTab, setActiveTab] = useState<'strategy' | 'narrative' | 'evidence'>('strategy');
    const output = successCase.aiOutput;
    if (!output) return null;

    const handleExportPDF = () => {
        // Aseguramos que el layout esté listo para impresión
        window.print();
    };

    // Lógica de emparejamiento para la evidencia de transformación
    const getTransformationPairs = () => {
        const assets = successCase.assets.filter(a => a.type === AssetType.BEFORE_AFTER);
        const pairs: { before: any, after: any, view: AssetView }[] = [];

        const views = [AssetView.FRONT, AssetView.PROFILE, AssetView.BACK, AssetView.CLOSEUP];
        views.forEach(v => {
            const b = assets.find(a => a.period === AssetPeriod.BEFORE && a.view === v);
            const a = assets.find(a => a.period === AssetPeriod.AFTER && a.view === v);
            if (b && a) pairs.push({ before: b, after: a, view: v });
        });

        return pairs;
    };

    const transformationPairs = getTransformationPairs();

    return (
        <div className="min-h-full bg-[#0A0A0A] text-white selection:bg-blue-500 selection:text-black rounded-xl overflow-hidden shadow-2xl m-2">
            {/* Cabecera Estratégica */}
            <header className="p-8 lg:p-12 border-b border-white/5 bg-slate-900 no-print">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center space-x-3 bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Briefing Estratégico Vital</span>
                        </div>
                        <h2 className="text-4xl lg:text-6xl font-black tracking-tighter italic uppercase leading-none">
                            {successCase.patientName}
                        </h2>
                        <p className="text-gray-400 font-medium text-lg max-w-2xl leading-relaxed">
                            Este documento contiene la estrategia narrativa para el editor. El objetivo es contar una historia real, relevante y visceral que conecte con la audiencia.
                        </p>
                    </div>
                    <div className="flex gap-4 w-full lg:w-auto">
                        <button
                            onClick={handleExportPDF}
                            className="flex-1 lg:flex-none bg-blue-600 hover:brightness-110 text-white px-10 py-5 rounded-2xl font-black transition-all shadow-2xl shadow-blue-600/20 flex items-center justify-center space-x-3"
                        >
                            <FileText className="w-5 h-5" />
                            <span>EXPORTAR BRIEFING PARA EDITOR</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Navegación de Secciones (Solo Web) */}
            <nav className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 px-8 no-print">
                <div className="max-w-7xl mx-auto flex space-x-12 overflow-x-auto">
                    {[
                        { id: 'strategy', label: 'Estrategia de Viaje', icon: <Map className="w-4 h-4" /> },
                        { id: 'narrative', label: 'Narrativa & Copy', icon: <PenTool className="w-4 h-4" /> },
                        { id: 'evidence', label: 'Evidencia & Visual', icon: <Image className="w-4 h-4" /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`py-6 text-[10px] font-black uppercase tracking-[0.3em] flex items-center space-x-3 transition-all relative whitespace-nowrap ${activeTab === t.id ? 'text-blue-500' : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            {t.icon}
                            <span>{t.label}</span>
                            {activeTab === t.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-full"></div>}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Contenido del Documento */}
            <main className="max-w-7xl mx-auto p-8 lg:p-12 space-y-24 main-content">

                {/* SECCIÓN 1: EL MAPA EMOCIONAL (VIAJE) */}
                {(activeTab === 'strategy' || true) && (
                    <section id="strategy-section" className={`${activeTab !== 'strategy' ? 'hidden lg:block' : ''} space-y-12`}>
                        <header className="border-l-4 border-blue-500 pl-8">
                            <h3 className="text-sm font-black text-blue-500 uppercase tracking-[0.5em] mb-2">01. El Mapa del Viaje</h3>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Documentando el cambio vital de {successCase.patientName}</p>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="bg-slate-900 border border-white/10 p-10 rounded-[3rem] space-y-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 text-rose-500/10 text-6xl italic font-black">01</div>
                                <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">El Dolor (Antes)</h4>
                                <p className="text-xl font-medium leading-relaxed italic text-gray-200">"{output.journeyNarrative.pain}"</p>
                                <div className="pt-6 border-t border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    Foco: Empatía y vulnerabilidad real.
                                </div>
                            </div>

                            <div className="bg-slate-900 border border-white/10 p-10 rounded-[3rem] space-y-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 text-amber-500/10 text-6xl italic font-black">02</div>
                                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">El Cambio (Revelación)</h4>
                                <p className="text-xl font-medium leading-relaxed italic text-gray-200">"{output.journeyNarrative.turningPoint}"</p>
                                <div className="pt-6 border-t border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    Foco: La prueba de que el método funciona.
                                </div>
                            </div>

                            <div className="bg-slate-900 border border-white/10 p-10 rounded-[3rem] space-y-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 text-blue-500/10 text-6xl italic font-black">03</div>
                                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">La Victoria (Hoy)</h4>
                                <p className="text-xl font-medium leading-relaxed italic text-gray-200">"{output.journeyNarrative.victory}"</p>
                                <div className="pt-6 border-t border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    Foco: Libertad, paz y resultados sostenibles.
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* SECCIÓN 2: LA NARRATIVA (COPY) */}
                {(activeTab === 'narrative' || true) && (
                    <section id="narrative-section" className={`${activeTab !== 'narrative' ? 'hidden lg:block' : ''} space-y-12`}>
                        <header className="border-l-4 border-amber-500 pl-8">
                            <h3 className="text-sm font-black text-amber-500 uppercase tracking-[0.5em] mb-2">02. Narrativa & Copywriting</h3>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">La voz que conecta con el alma de la audiencia</p>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                            <div className="lg:col-span-8 bg-slate-900 border border-white/10 p-12 rounded-[4rem] shadow-2xl relative">
                                <div className="absolute top-10 right-12 text-amber-500/10 text-7xl italic font-black pointer-events-none uppercase">Story</div>
                                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-10">Instagram Caption (Storytelling Completo)</h4>
                                <div className="prose prose-invert max-w-none">
                                    <p className="text-2xl font-serif italic leading-relaxed text-gray-200 whitespace-pre-wrap border-l-4 border-white/5 pl-10 py-4">
                                        {output.generalCopy}
                                    </p>
                                </div>
                                <button
                                    onClick={() => navigator.clipboard.writeText(output.generalCopy)}
                                    className="mt-12 w-full bg-white/5 hover:bg-white/10 border border-white/10 py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all no-print flex items-center justify-center"
                                >
                                    <Copy className="mr-3 text-amber-500 w-5 h-5" /> Copiar Texto Completo
                                </button>
                            </div>

                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 italic">Ganchos Emocionales Detectados</h4>
                                    <div className="flex flex-wrap gap-3">
                                        {output.emotionalTriggers.map((t, i) => (
                                            <span key={i} className="bg-amber-500/10 text-amber-500 text-[10px] font-black px-4 py-2 rounded-xl border border-amber-500/20 uppercase tracking-widest">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-slate-900 border border-white/10 p-8 rounded-[3rem]">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 italic">Métricas de Respaldo</h4>
                                    <div className="space-y-4">
                                        {Object.entries(output.extractedMetrics).map(([key, val]) => val && (
                                            <div key={key} className="flex justify-between items-center border-b border-white/5 pb-2">
                                                <span className="text-[9px] font-black uppercase text-gray-600 tracking-widest">{key}</span>
                                                <span className="font-bold text-white text-sm">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* SECCIÓN 3: EVIDENCIA & VISUAL (EL TRABAJO DEL EDITOR) */}
                {(activeTab === 'evidence' || true) && (
                    <section id="evidence-section" className={`${activeTab !== 'evidence' ? 'hidden lg:block' : ''} space-y-12`}>
                        <header className="border-l-4 border-rose-500 pl-8">
                            <h3 className="text-sm font-black text-rose-500 uppercase tracking-[0.5em] mb-2">03. Estrategia Visual & Evidencia</h3>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Guía de impacto para la producción de activos</p>
                        </header>

                        <div className="grid grid-cols-1 gap-12">
                            {/* Bloque de Transformación Lógica */}
                            <div className="bg-slate-900 border border-white/10 p-12 rounded-[4rem]">
                                <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] mb-10 flex items-center">
                                    <ArrowLeftRight className="mr-3 w-5 h-5" /> Comparativa de Transformación (Lógica de Ángulos)
                                </h4>

                                {transformationPairs.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                        {transformationPairs.map((pair, idx) => (
                                            <div key={idx} className="space-y-6">
                                                <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-[2rem] border-4 border-white/5 shadow-2xl aspect-[4/5]">
                                                    <div className="relative group">
                                                        <img src={pair.before.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest text-white">Antes</div>
                                                    </div>
                                                    <div className="relative group">
                                                        <img src={pair.after.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                        <div className="absolute top-4 right-4 bg-blue-500 px-3 py-1 rounded text-[10px] font-black uppercase text-black tracking-widest font-bold">Después</div>
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Perspectiva: {pair.view}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                                        <p className="text-gray-500 text-sm font-black uppercase tracking-widest">No se detectaron pares exactos. Editor: Buscar contraste visual máximo.</p>
                                    </div>
                                )}
                            </div>

                            {/* Guía Estructural para el Carrusel */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {output.slides.map((slide, i) => (
                                    <div key={i} className="bg-white/5 p-10 rounded-[3rem] border border-white/10 flex gap-8">
                                        <div className="flex-none">
                                            <div className="w-14 h-14 bg-rose-500 text-white rounded-2xl flex items-center justify-center font-black italic text-xl shadow-xl">
                                                D{i + 1}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h5 className="text-xl font-black italic tracking-tighter uppercase text-white">{slide.title}</h5>
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Intención de Impacto:</p>
                                                <p className="text-sm text-gray-300 font-medium leading-relaxed italic">"{slide.designInstructions}"</p>
                                            </div>
                                            <div className="pt-4 border-t border-white/5">
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Concepto Visual Relevante:</p>
                                                <p className="text-xs text-gray-400 leading-relaxed font-bold uppercase tracking-widest">{slide.copy}</p>
                                            </div>
                                            <div className="text-[10px] font-bold text-gray-500 italic mt-2 flex items-center">
                                                <Lightbulb className="mr-1 text-amber-500 w-4 h-4" /> Evidencia sugerida: {slide.visualHook}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
            </main>

            {/* Footer de Impresión */}
            <footer className="mt-20 pt-10 border-t border-white/5 p-12 text-center opacity-30">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center space-x-3">
                        <Zap className="text-blue-500 w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em]">Storyteller AI Strategy Engine</span>
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest">Este documento es confidencial y propiedad estratégica del coach. • 2025</p>
                </div>
            </footer>
        </div>
    );
};

export default Briefing;

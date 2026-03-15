import React from 'react';
import { ChevronRight, Compass } from 'lucide-react';
import { Client } from '../../types';
import { SuccessCompass } from '../SuccessCompass';

interface ClientRoadmapViewProps {
    client: Client;
    onBack: () => void;
}

export function ClientRoadmapView({ client, onBack }: ClientRoadmapViewProps) {
    return (
        <div className="min-h-screen bg-surface font-sans text-sea-900 animate-fade-in relative pb-20">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-0 right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-500/5 rounded-full blur-[120px]"></div>
            </div>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-6">

                {/* Header Actions */}
                <div className="flex items-center justify-between pb-4 border-b border-sea-100">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-sea-500 hover:text-indigo-600 transition-colors font-bold group bg-white/50 backdrop-blur-sm pr-4 pl-3 py-2 rounded-xl border border-sea-100 shadow-sm"
                    >
                        <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                        Volver al Portal
                    </button>

                    <div className="flex items-center gap-2 text-indigo-900 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 shadow-sm font-bold">
                        <Compass className="w-5 h-5 text-indigo-500" />
                        <span>Plan Estratégico</span>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="space-y-8">
                    {/* Intro Section */}
                    <div className="text-center max-w-2xl mx-auto space-y-4">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-sea-900">Tu Brújula del Éxito</h1>
                        <p className="text-sea-500 text-lg">
                            Este es tu mapa de navegación personal. Aquí puedes ver tu progreso actual, la fase en la que te encuentras y tu nivel de alineación con tus objetivos.
                        </p>
                    </div>

                    {/* The Compass Component */}
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                        <SuccessCompass client={client} />
                    </div>

                    {/* Add more sections here in the future if needed, like history or details */}

                </div>

            </main>
        </div>
    );
}

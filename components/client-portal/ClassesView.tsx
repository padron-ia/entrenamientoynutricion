
import React, { useEffect, useState } from 'react';
import {
    Calendar,
    Clock,
    Video,
    User,
    Tag,
    Search,
    Play,
    ArrowLeft,
    ExternalLink
} from 'lucide-react';
import { ClassSession } from '../../types';
import { mockDb } from '../../services/mockSupabase';

interface ClassesViewProps {
    onBack: () => void;
}

export function ClassesView({ onBack }: ClassesViewProps) {
    const [classes, setClasses] = useState<ClassSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState<string>('Todos');
    const [filterSpeaker, setFilterSpeaker] = useState<string>('Todos');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadClasses();
    }, []);

    const loadClasses = async () => {
        try {
            const data = await mockDb.getClasses();
            // Ordenar: Futuras primero (por fecha asc), luego pasadas (por fecha desc)
            const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setClasses(sorted);
        } catch (error) {
            console.error("Error loading classes", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredClasses = classes.filter(c => {
        const matchesCategory = filterCategory === 'Todos' || c.category === filterCategory;
        const matchesSpeaker = filterSpeaker === 'Todos' || c.speaker === filterSpeaker;
        const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSpeaker && matchesSearch;
    });

    // Modificación: Extender visibilidad 1 hora después del inicio
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const now = new Date();

    const upcomingClass = classes.find(c => {
        if (c.is_recorded) return false;
        const classDate = new Date(c.date);
        // Mostrar si es futuro O si empezó hace menos de 1 hora (está en curso/recién acabada)
        return classDate.getTime() + ONE_HOUR_MS > now.getTime();
    });

    const pastClasses = filteredClasses.filter(c => {
        // Excluir la clase que se muestra arriba como "upcoming/live"
        if (upcomingClass && c.id === upcomingClass.id) return false;
        // Incluir si está grabada O si ya pasó la fecha (y no es la "upcoming")
        return c.is_recorded || new Date(c.date) <= now;
    });

    return (
        <div className="min-h-screen bg-gray-50 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-sea-600 to-sea-800 text-white shadow-lg sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-sea-200 hover:text-white transition-colors mb-4 group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        Volver al Dashboard
                    </button>
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <Video className="w-8 h-8" />
                                Clases Semanales
                            </h1>
                            <p className="text-sea-200 mt-2 max-w-2xl">
                                Accede a todas las grabaciones y conéctate en directo a las próximas sesiones de formación.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* UPCOMING CLASS HERO */}
                {upcomingClass && (
                    <div className="mb-12 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-gradient-to-br from-sea-900 to-sea-950 rounded-3xl overflow-hidden shadow-2xl relative">
                            {/* Abstract Shapes Decoration */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-sea-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-sea-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                            <div className="relative p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center">
                                <div className="flex-1 space-y-6">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 rounded-full border border-red-500/30 text-sm font-bold uppercase tracking-wider animate-pulse">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        Próxima Clase en Directo
                                    </div>

                                    <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                                        {upcomingClass.title}
                                    </h2>

                                    <p className="text-lg text-gray-300 max-w-xl">
                                        {upcomingClass.description}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-6 text-gray-300">
                                        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg backdrop-blur-sm">
                                            <Calendar className="w-5 h-5 text-sea-400" />
                                            <span className="font-medium text-white">
                                                {new Date(upcomingClass.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg backdrop-blur-sm">
                                            <Clock className="w-5 h-5 text-sea-300" />
                                            <span className="font-medium text-white my-auto">
                                                {new Date(upcomingClass.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <User className="w-5 h-5" />
                                            <span>Con {upcomingClass.speaker}</span>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <a
                                            href={upcomingClass.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-3 bg-white text-sea-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                        >
                                            <Video className="w-6 h-6" />
                                            Unirme a la Clase
                                        </a>
                                        <p className="mt-3 text-sm text-gray-400">
                                            * El enlace se activará 5 minutos antes
                                        </p>
                                    </div>
                                </div>

                                {/* Visual Decoration / Placeholder for Speaker Image */}
                                <div className="w-full md:w-1/3 aspect-video md:aspect-square bg-gradient-to-br from-gray-700 to-gray-600 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-110 transition-transform duration-700"></div>
                                    <div className="relative text-center p-6">
                                        <div className="w-20 h-20 bg-sea-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-white shadow-xl">
                                            {upcomingClass.speaker.charAt(0)}
                                        </div>
                                        <p className="text-white font-bold text-xl">{upcomingClass.speaker}</p>
                                        <p className="text-sea-200">Coach Experto</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* FILTERS & SEARCH */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-28 z-30">
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-sea-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar clase..."
                                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sea-500 focus:border-sea-500 outline-none w-full sm:w-64 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium focus:ring-2 focus:ring-sea-500 focus:border-sea-500 cursor-pointer hover:bg-gray-100 transition-colors"
                            >
                                <option value="Todos">Todas las temáticas</option>
                                <option value="Entrenamiento">Entrenamiento</option>
                                <option value="Nutrición">Nutrición</option>
                                <option value="Mindset">Mindset</option>
                            </select>

                            <select
                                value={filterSpeaker}
                                onChange={(e) => setFilterSpeaker(e.target.value)}
                                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium focus:ring-2 focus:ring-sea-500 focus:border-sea-500 cursor-pointer hover:bg-gray-100 transition-colors"
                            >
                                <option value="Todos">Todos los ponentes</option>
                                <option value="Jesús">Jesús</option>
                                <option value="Víctor">Víctor</option>
                            </select>
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 font-medium">
                        Mostrando {pastClasses.length} grabaciones
                    </p>
                </div>

                {/* PAST CLASSES GRID */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-96 bg-gray-200 rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {pastClasses.map((session, index) => (
                            <div
                                key={session.id}
                                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full animate-in fade-in zoom-in-50"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-video bg-gray-900 overflow-hidden">
                                    {/* Background Image Placeholder */}
                                    <div className={`absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-60 ${session.category === 'Entrenamiento' ? "bg-[url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80')]" :
                                        session.category === 'Nutrición' ? "bg-[url('https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80')]" :
                                            "bg-[url('https://images.unsplash.com/photo-1544367563-12123d8965cd?auto=format&fit=crop&q=80')]"
                                        }`}></div>

                                    {/* Play Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl transform scale-50 group-hover:scale-100 transition-transform duration-300">
                                            <Play className="w-8 h-8 text-sea-600 ml-1" fill="currentColor" />
                                        </div>
                                    </div>

                                    {/* Badges */}
                                    <div className="absolute top-4 left-4 flex gap-2">
                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold text-white uppercase tracking-wide backdrop-blur-md ${session.category === 'Entrenamiento' ? 'bg-sea-500/80' :
                                            session.category === 'Nutrición' ? 'bg-green-500/80' : 'bg-sea-500/80'
                                            }`}>
                                            {session.category}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-sea-600 transition-colors line-clamp-2">
                                        {session.title}
                                    </h3>

                                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 font-medium uppercase tracking-wider">
                                        <div className="flex items-center gap-1">
                                            <User className="w-3 h-3" /> {session.speaker}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {new Date(session.date).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <p className="text-gray-600 text-sm mb-6 line-clamp-3">
                                        {session.description}
                                    </p>

                                    <div className="mt-auto">
                                        <a
                                            href={session.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-sea-100 text-sea-700 font-bold hover:bg-sea-50 hover:border-sea-200 transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Ver Grabación
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {pastClasses.length === 0 && (
                            <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
                                <Video className="w-12 h-12 mb-4 opacity-50" />
                                <p className="text-lg">No se encontraron clases con estos filtros.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

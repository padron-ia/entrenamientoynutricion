import React, { useState } from 'react';
import { Search, Plus, Filter, Play, Info, X } from 'lucide-react';
import { Exercise } from '../../types';
import { ExerciseMediaUtils } from '../../utils/exerciseMedia';

interface ExerciseLibraryProps {
    exercises: Exercise[];
    onAddExercise: (exercise: Exercise) => void;
    onCreateNew: () => void;
    onPreview: (exercise: Exercise) => void;
}

export function ExerciseLibrary({ exercises, onAddExercise, onCreateNew, onPreview }: ExerciseLibraryProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
    const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);

    const filteredExercises = exercises.filter(ex => {
        const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMuscle = !selectedMuscle || ex.muscle_main === selectedMuscle;
        return matchesSearch && matchesMuscle;
    });

    return (
        <div className="flex flex-col h-full bg-white border-l border-slate-100 w-80 shadow-2xl animate-fade-in relative">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/30">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs">Librería de ejercicios</h3>
                    <div className="flex gap-2">
                        <button className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                            <Filter className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                            onClick={onCreateNew}
                            className="p-1.5 bg-brand-green text-white rounded-lg shadow-sm hover:scale-105 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar un ejercicio..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-mint outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                <div className="px-2 py-1 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>{filteredExercises.length} Ejercicios</span>
                    <select
                        className="bg-transparent outline-none cursor-pointer hover:text-brand-green transition-colors"
                        onChange={(e) => setSelectedMuscle(e.target.value || null)}
                    >
                        <option value="">Todos</option>
                        {[...new Set(exercises.map(e => e.muscle_main).filter(Boolean))].sort().map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                {filteredExercises.map(exercise => (
                    <div
                        key={exercise.id}
                        className="group relative flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all cursor-pointer"
                        onClick={() => onAddExercise(exercise)}
                    >
                        {/* Thumbnail */}
                        <div className="w-16 h-20 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 relative">
                            {ExerciseMediaUtils.getThumbnail(exercise.media_url || '', exercise.media_type || '') ? (
                                <img
                                    src={ExerciseMediaUtils.getThumbnail(exercise.media_url || '', exercise.media_type || '')!}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Play className="w-5 h-5 text-slate-300" />
                                </div>
                            )}
                            {/* Overlay on hover */}
                            <div className="absolute inset-0 bg-brand-green/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Plus className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-700 text-sm truncate leading-tight mb-1 group-hover:text-brand-green transition-colors">
                                {exercise.name}
                            </h4>
                            <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded uppercase">
                                    {exercise.muscle_main || 'General'}
                                </span>
                            </div>
                        </div>

                        {exercise.media_url && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewExercise(exercise);
                                    onPreview(exercise);
                                }}
                                className="p-1.5 text-slate-300 hover:text-brand-green transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Play className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Mini Video Preview Overlay */}
            {previewExercise && (
                <div className="absolute bottom-4 left-4 right-4 bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-white/10 z-50 animate-scale-in">
                    <div className="relative aspect-video bg-black">
                        {ExerciseMediaUtils.getEmbedUrl(previewExercise.media_url || '', previewExercise.media_type || '') ? (
                            <iframe
                                src={ExerciseMediaUtils.getEmbedUrl(previewExercise.media_url || '', previewExercise.media_type || '')!}
                                className="w-full h-full border-0"
                                allow="autoplay; encrypted-media"
                                allowFullScreen
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white/40 p-6 text-center">
                                <Play className="w-10 h-10 mb-2 opacity-20" />
                                <p className="text-xs">No hay video disponible para este ejercicio</p>
                            </div>
                        )}
                        <button
                            onClick={() => setPreviewExercise(null)}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="p-3">
                        <h4 className="text-white font-bold text-xs truncate">{previewExercise.name}</h4>
                        <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">{previewExercise.muscle_main}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

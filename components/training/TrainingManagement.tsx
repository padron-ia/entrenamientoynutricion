import React, { useEffect, useState } from 'react';
import {
    Dumbbell, Calendar, Layout, Plus, Search, ArrowRight, Trash2,
    Edit3, Play, ChevronRight, Sparkles, AlertCircle, BellDot
} from 'lucide-react';
import { WorkoutEditor } from './WorkoutEditor';
import { ProgramDesigner } from './ProgramDesigner';
import { ExerciseEditor } from './ExerciseEditor';
import { AIProgramImporter } from './AIProgramImporter';
import { Exercise, Workout, TrainingProgram } from '../../types';
import { trainingService } from '../../services/trainingService';
import { ExerciseMediaUtils } from '../../utils/exerciseMedia';
import { TrainingSpecialRequests } from './TrainingSpecialRequests';
import { trainingSpecialRequestsService } from '../../services/trainingSpecialRequestsService';

type TrainingView = 'overview' | 'requests' | 'exercises' | 'workouts' | 'programs';

interface TrainingManagementProps {
    currentUser?: any;
}

export function TrainingManagement({ currentUser }: TrainingManagementProps) {
    const [activeView, setActiveView] = useState<TrainingView>('overview');
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [programs, setPrograms] = useState<TrainingProgram[]>([]);
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
    const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
    const [editingExercise, setEditingExercise] = useState<Exercise | null | 'new'>(null);
    const [showAIImporter, setShowAIImporter] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMuscle, setSelectedMuscle] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; name: string } | null>(null);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [exData, wData, pData] = await Promise.all([
                trainingService.getExercises(),
                trainingService.getWorkouts(),
                trainingService.getPrograms()
            ]);
            setExercises(exData);
            setWorkouts(wData);
            setPrograms(pData);
        } catch (error) {
            console.error('Error fetching training data:', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        const loadPending = async () => {
            try {
                const count = await trainingSpecialRequestsService.getPendingCount();
                setPendingRequestsCount(count);
            } catch (error) {
                console.error('Error loading training special requests count:', error);
            }
        };
        loadPending();
    }, []);

    const handleSaveExercise = async (exercise: Partial<Exercise>) => {
        try {
            if (editingExercise && editingExercise !== 'new' && editingExercise.id) {
                await trainingService.updateExercise(editingExercise.id, exercise);
            } else {
                await trainingService.createExercise(exercise);
            }
            await fetchData();
            setEditingExercise(null);
        } catch (error) { console.error('Error saving exercise:', error); }
    };

    const handleSaveWorkout = async (workout: Partial<Workout>): Promise<Workout> => {
        try {
            const saved = await trainingService.saveWorkout(workout);
            await fetchData();
            setSelectedWorkout(null);
            return saved;
        } catch (error) {
            console.error('Error saving workout:', error);
            throw error;
        }
    };

    const handleSaveProgram = async (program: Partial<TrainingProgram>) => {
        try {
            await trainingService.saveProgram(program);
            await fetchData();
            setSelectedProgram(null);
        } catch (error) {
            console.error('Error saving program:', error);
            throw error; // Propagate error
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            if (confirmDelete.type === 'exercise') await trainingService.deleteExercise(confirmDelete.id);
            else if (confirmDelete.type === 'workout') await trainingService.deleteWorkout(confirmDelete.id);
            else if (confirmDelete.type === 'program') await trainingService.deleteProgram(confirmDelete.id);
            await fetchData();
            setConfirmDelete(null);
        } catch (error) { console.error('Error deleting:', error); }
    };

    const muscleGroups = [...new Set(exercises.map(e => e.muscle_main).filter(Boolean))].sort();

    const filteredExercises = exercises.filter(ex => {
        const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMuscle = !selectedMuscle || ex.muscle_main === selectedMuscle;
        return matchesSearch && matchesMuscle;
    });

    const stats = [
        { label: 'Ejercicios', count: exercises.length, icon: Dumbbell, color: 'from-emerald-500 to-teal-600' },
        { label: 'Workouts', count: workouts.length, icon: Layout, color: 'from-orange-500 to-amber-600' },
        { label: 'Programas', count: programs.length, icon: Calendar, color: 'from-sky-500 to-blue-600' },
    ];

    if (selectedWorkout) {
        return (
            <WorkoutEditor
                workout={selectedWorkout}
                availableExercises={exercises}
                onSave={handleSaveWorkout}
                onSaveExercise={handleSaveExercise}
                onClose={() => setSelectedWorkout(null)}
            />
        );
    }

    if (selectedProgram) {
        return (
            <ProgramDesigner
                program={selectedProgram}
                availableWorkouts={workouts}
                availableExercises={exercises}
                onSave={handleSaveProgram}
                onSaveWorkout={handleSaveWorkout}
                onSaveExercise={handleSaveExercise}
                onClose={() => setSelectedProgram(null)}
            />
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">Centro de Entrenamiento</h1>
                    <p className="text-slate-500">Gestiona la librería de ejercicios, sesiones y planificaciones.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setEditingExercise('new')} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" /> Ejercicio
                    </button>
                    <button onClick={() => setSelectedWorkout({ id: '', name: '', blocks: [] } as any)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" /> Workout
                    </button>
                    <button onClick={() => setSelectedProgram({ id: '', name: '', weeks_count: 4, days: [] } as any)} className="px-5 py-2.5 bg-brand-green text-white font-black rounded-xl shadow-lg shadow-brand-green/20 hover:scale-105 transition-all flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Programa
                    </button>
                    <button onClick={() => setShowAIImporter(true)} className="px-5 py-2.5 bg-gradient-to-r from-brand-green to-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-300" /> IA Program
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-6 hover:shadow-lg transition-all">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                            <stat.icon className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{stat.label}</p>
                            <h4 className="text-3xl font-black text-slate-800">{stat.count}</h4>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                {[
                    { id: 'overview', label: 'Dashboard', icon: Sparkles },
                    { id: 'requests', label: 'Solicitudes Especiales', icon: BellDot },
                    { id: 'exercises', label: 'Ejercicios', icon: Dumbbell },
                    { id: 'workouts', label: 'Workouts', icon: Layout },
                    { id: 'programs', label: 'Programas', icon: Calendar }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveView(tab.id as TrainingView)}
                        className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeView === tab.id ? 'bg-white text-brand-green shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <tab.icon className="w-4 h-4" />{tab.label}
                        {tab.id === 'requests' && pendingRequestsCount > 0 && (
                            <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-black ${activeView === tab.id ? 'bg-brand-green text-white' : 'bg-red-100 text-red-700'}`}>
                                {pendingRequestsCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green"></div></div>
            ) : (
                <>
                    {/* OVERVIEW */}
                    {activeView === 'overview' && (
                        <div className="space-y-10">
                            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                <h3 className="text-xl font-black mb-2 relative z-10">¿Cómo funciona?</h3>
                                <p className="text-white/60 text-sm mb-6 relative z-10">Sigue estos 3 pasos para crear programas de entrenamiento completos.</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                                    {[
                                        { step: '1', title: 'Crea Ejercicios', desc: 'Añade ejercicios con vídeo, instrucciones y grupo muscular.', icon: Dumbbell, action: () => setEditingExercise('new') },
                                        { step: '2', title: 'Diseña Workouts', desc: 'Combina ejercicios en bloques para crear sesiones.', icon: Layout, action: () => setSelectedWorkout({ id: '', name: '', blocks: [] } as any) },
                                        { step: '3', title: 'Planifica Programas', desc: 'Organiza workouts por semanas y días.', icon: Calendar, action: () => setSelectedProgram({ id: '', name: '', weeks_count: 4, days: [] } as any) },
                                    ].map((item, i) => (
                                        <button key={i} onClick={item.action} className="text-left p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-8 h-8 bg-brand-mint/20 rounded-lg flex items-center justify-center text-brand-mint font-black text-sm">{item.step}</div>
                                                <item.icon className="w-5 h-5 text-brand-mint" />
                                            </div>
                                            <h4 className="font-black text-white text-sm mb-1">{item.title}</h4>
                                            <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {exercises.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-black text-slate-800 text-lg">Últimos Ejercicios</h3>
                                        <button onClick={() => setActiveView('exercises')} className="text-sm font-bold text-brand-green flex items-center gap-1 hover:underline">Ver todos <ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {exercises.slice(0, 6).map(ex => (
                                            <div key={ex.id} onClick={() => setEditingExercise(ex)} className="bg-white rounded-2xl border border-slate-100 overflow-hidden cursor-pointer group hover:shadow-lg transition-all">
                                                <div className="aspect-square bg-slate-100 relative">
                                                    {ExerciseMediaUtils.getThumbnail(ex.media_url || '', ex.media_type || '') ? (
                                                        <img src={ExerciseMediaUtils.getThumbnail(ex.media_url || '', ex.media_type || '')!} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                    ) : (<div className="w-full h-full flex items-center justify-center"><Dumbbell className="w-8 h-8 text-slate-200" /></div>)}
                                                </div>
                                                <div className="p-3">
                                                    <h4 className="font-bold text-slate-700 text-xs truncate">{ex.name}</h4>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{ex.muscle_main || 'General'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {workouts.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-black text-slate-800 text-lg">Últimos Workouts</h3>
                                        <button onClick={() => setActiveView('workouts')} className="text-sm font-bold text-brand-green flex items-center gap-1 hover:underline">Ver todos <ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {workouts.slice(0, 3).map(w => (
                                            <div key={w.id} className="bg-white p-6 rounded-3xl border border-slate-100 hover:shadow-xl transition-all cursor-pointer group" onClick={() => setSelectedWorkout(w)}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Layout className="w-6 h-6" /></div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{w.blocks?.length || 0} Bloques</span>
                                                </div>
                                                <h4 className="text-lg font-black text-slate-800 mb-1">{w.name}</h4>
                                                <p className="text-sm text-slate-400 mb-4">{w.blocks?.reduce((s, b) => s + (b.exercises?.length || 0), 0) || 0} ejercicios</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {programs.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-black text-slate-800 text-lg">Últimas Planificaciones</h3>
                                        <button onClick={() => setActiveView('programs')} className="text-sm font-bold text-brand-green flex items-center gap-1 hover:underline">Ver todos <ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {programs.slice(0, 3).map(p => (
                                            <div key={p.id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden group cursor-pointer hover:shadow-xl transition-all" onClick={() => setSelectedProgram(p)}>
                                                <div className="h-32 bg-gradient-to-br from-sky-500 to-blue-600 relative p-6 flex flex-col justify-end">
                                                    <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-black rounded uppercase w-fit mb-2">Planificación</span>
                                                    <h5 className="text-white font-black text-lg leading-tight">{p.name}</h5>
                                                </div>
                                                <div className="p-6">
                                                    <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase mb-4">
                                                        <span>{p.weeks_count} Semanas</span>
                                                        <span>{p.days?.length || 0} Días</span>
                                                    </div>
                                                    <button className="w-full py-3 bg-slate-50 text-slate-600 font-black rounded-2xl group-hover:bg-brand-green group-hover:text-white transition-all flex items-center justify-center gap-2">Editar <ArrowRight className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {exercises.length === 0 && workouts.length === 0 && programs.length === 0 && (
                                <div className="text-center py-16">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><Dumbbell className="w-10 h-10 text-slate-300" /></div>
                                    <h3 className="text-xl font-black text-slate-800 mb-2">¡Empieza creando ejercicios!</h3>
                                    <p className="text-slate-500 mb-6 max-w-md mx-auto">Aún no hay contenido. Comienza añadiendo ejercicios a tu librería.</p>
                                    <button onClick={() => setEditingExercise('new')} className="px-8 py-3 bg-brand-green text-white font-black rounded-xl shadow-lg hover:scale-105 transition-all"><Plus className="w-5 h-5 inline mr-2" />Crear primer ejercicio</button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeView === 'requests' && (
                        <TrainingSpecialRequests user={currentUser} onPendingCountChange={setPendingRequestsCount} />
                    )}

                    {/* EXERCISES */}
                    {activeView === 'exercises' && (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar ejercicio..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-brand-mint outline-none shadow-sm" />
                                </div>
                                <select value={selectedMuscle} onChange={e => setSelectedMuscle(e.target.value)} className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 shadow-sm outline-none cursor-pointer">
                                    <option value="">Todos los músculos</option>
                                    {muscleGroups.map(m => (<option key={m} value={m}>{m}</option>))}
                                </select>
                                <button onClick={() => setEditingExercise('new')} className="px-6 py-3 bg-brand-green text-white font-black rounded-2xl shadow-lg hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap"><Plus className="w-5 h-5" /> Nuevo Ejercicio</button>
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{filteredExercises.length} ejercicios</p>
                            {filteredExercises.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                                    {filteredExercises.map(exercise => (
                                        <div key={exercise.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden cursor-pointer group hover:shadow-xl transition-all relative">
                                            <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                                                {ExerciseMediaUtils.getThumbnail(exercise.media_url || '', exercise.media_type || '') ? (
                                                    <img src={ExerciseMediaUtils.getThumbnail(exercise.media_url || '', exercise.media_type || '')!} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100"><Dumbbell className="w-10 h-10 text-slate-200" /></div>)}
                                                {exercise.media_url && exercise.media_type !== 'none' && (
                                                    <div className="absolute top-2 right-2 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"><Play className="w-3.5 h-3.5 text-white fill-white" /></div>
                                                )}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingExercise(exercise); }} className="p-2.5 bg-white rounded-xl shadow-lg hover:scale-110 transition-transform"><Edit3 className="w-4 h-4 text-slate-700" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'exercise', id: exercise.id, name: exercise.name }); }} className="p-2.5 bg-white rounded-xl shadow-lg hover:scale-110 transition-transform"><Trash2 className="w-4 h-4 text-red-500" /></button>
                                                </div>
                                            </div>
                                            <div className="p-4" onClick={() => setEditingExercise(exercise)}>
                                                <h4 className="font-bold text-slate-800 text-sm truncate mb-1.5">{exercise.name}</h4>
                                                <span className="px-2 py-0.5 bg-brand-mint/20 text-brand-green text-[10px] font-black rounded-full uppercase">{exercise.muscle_main || 'General'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8 text-slate-300" /></div>
                                    <h3 className="text-lg font-black text-slate-800 mb-2">{exercises.length === 0 ? 'No hay ejercicios aún' : 'Sin resultados'}</h3>
                                    <p className="text-slate-500 mb-6">{exercises.length === 0 ? 'Crea tu primer ejercicio para empezar.' : 'Prueba con otra búsqueda.'}</p>
                                    {exercises.length === 0 && <button onClick={() => setEditingExercise('new')} className="px-8 py-3 bg-brand-green text-white font-black rounded-xl shadow-lg"><Plus className="w-5 h-5 inline mr-2" />Crear ejercicio</button>}
                                </div>
                            )}
                        </div>
                    )}

                    {/* WORKOUTS */}
                    {activeView === 'workouts' && (
                        <div className="space-y-6">
                            {workouts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <button onClick={() => setSelectedWorkout({ id: '', name: '', blocks: [] } as any)} className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 hover:border-brand-mint hover:bg-brand-mint/5 transition-all group min-h-[220px]">
                                        <div className="w-14 h-14 bg-slate-100 group-hover:bg-brand-mint/20 rounded-2xl flex items-center justify-center transition-colors"><Plus className="w-7 h-7 text-slate-400 group-hover:text-brand-green transition-colors" /></div>
                                        <span className="font-black text-slate-400 group-hover:text-brand-green transition-colors">Nuevo Workout</span>
                                    </button>
                                    {workouts.map(w => (
                                        <div key={w.id} className="bg-white p-6 rounded-3xl border border-slate-100 hover:shadow-xl transition-all cursor-pointer group relative" onClick={() => setSelectedWorkout(w)}>
                                            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'workout', id: w.id, name: w.name }); }} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Layout className="w-6 h-6" /></div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{w.blocks?.length || 0} Bloques</span>
                                            </div>
                                            <h4 className="text-xl font-black text-slate-800 mb-2">{w.name}</h4>
                                            <p className="text-sm text-slate-400 mb-4">{w.blocks?.reduce((s, b) => s + (b.exercises?.length || 0), 0) || 0} ejercicios</p>
                                            <div className="flex gap-2 flex-wrap mb-4">
                                                {w.blocks?.map(b => (<span key={b.id} className="px-2.5 py-1 bg-slate-100 text-[10px] font-bold text-slate-500 rounded-full">{b.name}</span>))}
                                            </div>
                                            <button className="w-full py-3 bg-slate-50 text-slate-600 font-black rounded-2xl group-hover:bg-brand-green group-hover:text-white transition-all flex items-center justify-center gap-2">Abrir Editor <ArrowRight className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4"><Layout className="w-10 h-10 text-orange-300" /></div>
                                    <h3 className="text-xl font-black text-slate-800 mb-2">No hay workouts</h3>
                                    <p className="text-slate-500 mb-6 max-w-md mx-auto">{exercises.length === 0 ? 'Primero crea ejercicios en la pestaña "Ejercicios".' : `Tienes ${exercises.length} ejercicios. ¡Combínalos en un workout!`}</p>
                                    <button onClick={() => exercises.length > 0 ? setSelectedWorkout({ id: '', name: '', blocks: [] } as any) : setActiveView('exercises')} className="px-8 py-3 bg-brand-green text-white font-black rounded-xl shadow-lg hover:scale-105 transition-all">
                                        {exercises.length > 0 ? <><Plus className="w-5 h-5 inline mr-2" />Crear Workout</> : <><Dumbbell className="w-5 h-5 inline mr-2" />Ir a Ejercicios</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PROGRAMS */}
                    {activeView === 'programs' && (
                        <div className="space-y-6">
                            {programs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <button onClick={() => setSelectedProgram({ id: '', name: '', weeks_count: 4, days: [] } as any)} className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 hover:border-brand-mint hover:bg-brand-mint/5 transition-all group min-h-[300px]">
                                        <div className="w-14 h-14 bg-slate-100 group-hover:bg-brand-mint/20 rounded-2xl flex items-center justify-center transition-colors"><Plus className="w-7 h-7 text-slate-400 group-hover:text-brand-green transition-colors" /></div>
                                        <span className="font-black text-slate-400 group-hover:text-brand-green transition-colors">Nuevo Programa</span>
                                    </button>
                                    {programs.map(p => (
                                        <div key={p.id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden group cursor-pointer hover:shadow-xl transition-all relative" onClick={() => setSelectedProgram(p)}>
                                            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'program', id: p.id, name: p.name }); }} className="absolute top-3 right-3 z-10 p-2 text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                            <div className="h-36 bg-gradient-to-br from-sky-500 to-blue-600 relative p-6 flex flex-col justify-end overflow-hidden">
                                                <Calendar className="w-8 h-8 text-white/20 absolute top-4 right-4" />
                                                <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-black rounded uppercase w-fit mb-2">Planificación</span>
                                                <h5 className="text-white font-black text-xl leading-tight">{p.name}</h5>
                                            </div>
                                            <div className="p-6">
                                                <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase mb-4">
                                                    <span>{p.weeks_count} Semanas</span><span>{p.days?.length || 0} Días</span>
                                                </div>
                                                <button className="w-full py-3 bg-slate-50 text-slate-600 font-black rounded-2xl group-hover:bg-brand-green group-hover:text-white transition-all flex items-center justify-center gap-2">Editar <ArrowRight className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-4"><Calendar className="w-10 h-10 text-sky-300" /></div>
                                    <h3 className="text-xl font-black text-slate-800 mb-2">No hay programas</h3>
                                    <p className="text-slate-500 mb-6 max-w-md mx-auto">{workouts.length === 0 ? 'Primero crea workouts para diseñar programas.' : `Tienes ${workouts.length} workouts. ¡Organízalos en un programa!`}</p>
                                    <button onClick={() => workouts.length > 0 ? setSelectedProgram({ id: '', name: '', weeks_count: 4, days: [] } as any) : setActiveView('workouts')} className="px-8 py-3 bg-brand-green text-white font-black rounded-xl shadow-lg hover:scale-105 transition-all">
                                        {workouts.length > 0 ? <><Plus className="w-5 h-5 inline mr-2" />Crear Programa</> : <><Layout className="w-5 h-5 inline mr-2" />Ir a Workouts</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Exercise Editor Modal */}
            {editingExercise && (
                <ExerciseEditor exercise={editingExercise === 'new' ? null : editingExercise} onSave={handleSaveExercise} onClose={() => setEditingExercise(null)} />
            )}

            {/* Delete Confirmation */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scale-in text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8 text-red-500" /></div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">¿Eliminar?</h3>
                        <p className="text-slate-500 text-sm mb-6">Se eliminará <strong>"{confirmDelete.name}"</strong> permanentemente.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                            <button onClick={handleDelete} className="flex-1 py-3 bg-red-500 text-white font-black rounded-xl hover:bg-red-600 transition-colors">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
            {/* AI Program Importer Modal */}
            {showAIImporter && (
                <AIProgramImporter
                    currentUser={currentUser}
                    onSuccess={(program) => {
                        setShowAIImporter(false);
                        fetchData();
                        setSelectedProgram(program);
                    }}
                    onClose={() => setShowAIImporter(false)}
                />
            )}
        </div>
    );
}

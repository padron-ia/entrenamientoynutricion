import React, { useState } from 'react';
import { ExerciseMediaUtils } from '../../utils/exerciseMedia';
import {
    X,
    Plus,
    Trash2,
    Save,
    ChevronDown,
    ChevronUp,
    Activity,
    Calculator,
    Search,
    Play,
    GripVertical,
    Dumbbell,
    Clock,
    Target,
    MoreVertical,
    Layers,
    Zap,
    Flame,
    Edit3,
    Check
} from 'lucide-react';
import { Workout, WorkoutBlock, WorkoutExercise, Exercise } from '../../types';
import { ExerciseEditor } from './ExerciseEditor';

interface WorkoutEditorProps {
    workout: Workout | null;
    onSave: (workout: Partial<Workout>) => Promise<void | Workout>;
    onClose: () => void;
    availableExercises: Exercise[];
    onSaveExercise: (exercise: Partial<Exercise>) => Promise<void>;
}

const BLOCK_ICONS: Record<string, any> = {
    'Calentamiento': Flame,
    'Parte Principal': Target,
    'Finisher': Zap,
};

const BLOCK_COLORS: Record<string, string> = {
    'Calentamiento': 'from-amber-500 to-orange-500',
    'Parte Principal': 'from-brand-green to-emerald-600',
    'Finisher': 'from-rose-500 to-pink-600',
};

const BLOCK_STRUCTURE_OPTIONS = [
    { value: 'lineal', label: 'Lineal' },
    { value: 'superserie', label: 'Superserie' },
    { value: 'circuito', label: 'Circuito' },
] as const;

type BlockStructureType = typeof BLOCK_STRUCTURE_OPTIONS[number]['value'];

export function WorkoutEditor({ workout, onSave, onClose, availableExercises, onSaveExercise }: WorkoutEditorProps) {
    const [name, setName] = useState(workout?.name || '');
    const [blocks, setBlocks] = useState<WorkoutBlock[]>(() => {
        if (workout?.blocks && workout.blocks.length > 0) {
            return workout.blocks.map(block => ({
                ...block,
                structure_type: block.structure_type || 'lineal'
            }));
        }
        return [
            { id: '1', workout_id: '', name: 'Calentamiento', structure_type: 'lineal', position: 0, exercises: [] },
            { id: '2', workout_id: '', name: 'Parte Principal', structure_type: 'lineal', position: 1, exercises: [] },
            { id: '3', workout_id: '', name: 'Finisher', structure_type: 'lineal', position: 2, exercises: [] }
        ];
    });
    const [selectedBlockId, setSelectedBlockId] = useState<string>(() => {
        if (workout?.blocks && workout.blocks.length > 0) return workout.blocks[0].id;
        return '2';
    });
    const [isCreatingExercise, setIsCreatingExercise] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMuscle, setSelectedMuscle] = useState<string>('');
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    const [editingBlockName, setEditingBlockName] = useState('');

    const selectedBlock = blocks.find(b => b.id === selectedBlockId);

    const filteredExercises = availableExercises.filter(ex => {
        const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMuscle = !selectedMuscle || ex.muscle_main === selectedMuscle;
        return matchesSearch && matchesMuscle;
    });

    const muscleGroups = [...new Set(availableExercises.map(e => e.muscle_main).filter(Boolean))].sort();

    const addExerciseToBlock = (exercise: Exercise) => {
        setBlocks(prev => prev.map(block => {
            if (block.id === selectedBlockId) {
                const newExercise: WorkoutExercise = {
                    id: Math.random().toString(),
                    block_id: block.id,
                    exercise_id: exercise.id,
                    exercise: exercise,
                    sets: 3,
                    reps: '12',
                    rest_seconds: 60,
                    position: block.exercises.length
                };
                return { ...block, exercises: [...block.exercises, newExercise] };
            }
            return block;
        }));
    };

    const updateExercise = (blockId: string, exerciseId: string, changes: Partial<WorkoutExercise>) => {
        setBlocks(prev => prev.map(block => {
            if (block.id === blockId) {
                return {
                    ...block,
                    exercises: block.exercises.map(ex => ex.id === exerciseId ? { ...ex, ...changes } : ex)
                };
            }
            return block;
        }));
    };

    const removeExercise = (blockId: string, exerciseId: string) => {
        setBlocks(prev => prev.map(block => {
            if (block.id === blockId) {
                return {
                    ...block,
                    exercises: block.exercises.filter(ex => ex.id !== exerciseId)
                };
            }
            return block;
        }));
    };

    const addBlock = () => {
        const newBlock: WorkoutBlock = {
            id: Math.random().toString(),
            workout_id: '',
            name: `Bloque ${blocks.length + 1}`,
            structure_type: 'lineal',
            position: blocks.length,
            exercises: []
        };
        setBlocks(prev => [...prev, newBlock]);
        setSelectedBlockId(newBlock.id);
    };

    const updateBlockStructure = (blockId: string, structureType: BlockStructureType) => {
        setBlocks(prev => prev.map(block => {
            if (block.id !== blockId) return block;

            const normalizedExercises = structureType === 'superserie'
                ? block.exercises
                : block.exercises.map(ex => {
                    if (!ex.superset_id) return ex;
                    const fallbackSets = ex.superset_rounds || ex.sets || 3;
                    return {
                        ...ex,
                        superset_id: undefined,
                        superset_rounds: undefined,
                        sets: fallbackSets
                    };
                });

            return {
                ...block,
                structure_type: structureType,
                exercises: normalizedExercises
            };
        }));
    };

    const removeBlock = (blockId: string) => {
        setBlocks(prev => {
            const updated = prev.filter(b => b.id !== blockId);
            if (selectedBlockId === blockId && updated.length > 0) {
                setSelectedBlockId(updated[0].id);
            }
            return updated;
        });
    };

    const startEditingBlock = (blockId: string, currentName: string) => {
        setEditingBlockId(blockId);
        setEditingBlockName(currentName);
    };

    const saveBlockName = () => {
        if (editingBlockId && editingBlockName.trim()) {
            setBlocks(prev => prev.map(b =>
                b.id === editingBlockId ? { ...b, name: editingBlockName.trim() } : b
            ));
        }
        setEditingBlockId(null);
        setEditingBlockName('');
    };

    const moveExercise = (blockId: string, exerciseId: string, direction: 'up' | 'down') => {
        setBlocks(prev => prev.map(block => {
            if (block.id === blockId) {
                const idx = block.exercises.findIndex(ex => ex.id === exerciseId);
                if (idx === -1) return block;
                const newIdx = direction === 'up' ? idx - 1 : idx + 1;
                if (newIdx < 0 || newIdx >= block.exercises.length) return block;
                const newExercises = [...block.exercises];
                [newExercises[idx], newExercises[newIdx]] = [newExercises[newIdx], newExercises[idx]];
                return { ...block, exercises: newExercises.map((ex, i) => ({ ...ex, position: i })) };
            }
            return block;
        }));
    };

    const linkExercises = (blockId: string, exerciseId1: string, exerciseId2: string) => {
        setBlocks(prev => prev.map(block => {
            if (block.id === blockId) {
                const ex1 = block.exercises.find(e => e.id === exerciseId1);
                const ex2 = block.exercises.find(e => e.id === exerciseId2);
                const existingSupersetId = ex1?.superset_id || ex2?.superset_id;
                const supersetId = existingSupersetId || crypto.randomUUID();
                // Get existing rounds from the superset or default to 3
                const existingRounds = existingSupersetId
                    ? block.exercises.find(e => e.superset_id === existingSupersetId && e.superset_rounds)?.superset_rounds || 3
                    : 3;
                return {
                    ...block,
                    exercises: block.exercises.map(ex => {
                        if (ex.id === exerciseId1 || ex.id === exerciseId2) {
                            return { ...ex, superset_id: supersetId, superset_rounds: existingRounds };
                        }
                        return ex;
                    })
                };
            }
            return block;
        }));
    };

    const breakSuperset = (blockId: string, supersetId: string) => {
        setBlocks(prev => prev.map(block => {
            if (block.id === blockId) {
                return {
                    ...block,
                    exercises: block.exercises.map(ex =>
                        ex.superset_id === supersetId ? { ...ex, superset_id: undefined, superset_rounds: undefined, sets: 3 } : ex
                    )
                };
            }
            return block;
        }));
    };

    const updateSupersetRounds = (blockId: string, supersetId: string, rounds: number) => {
        setBlocks(prev => prev.map(block => {
            if (block.id === blockId) {
                return {
                    ...block,
                    exercises: block.exercises.map(ex =>
                        ex.superset_id === supersetId ? { ...ex, superset_rounds: rounds } : ex
                    )
                };
            }
            return block;
        }));
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setSaveError('Escribe un nombre para el workout');
            return;
        }
        try {
            setSaving(true);
            setSaveError('');
            await onSave({
                ...(workout?.id ? { id: workout.id } : {}),
                name: name.trim(),
                blocks
            });
            // Parent handles closing via setSelectedWorkout(null)
        } catch (error) {
            setSaveError('Error al guardar. Intenta de nuevo.');
            console.error('Error saving workout:', error);
            setSaving(false);
        }
    };

    const totalExercises = blocks.reduce((sum, b) => sum + b.exercises.length, 0);

    const getBlockIcon = (blockName: string) => {
        const Icon = BLOCK_ICONS[blockName] || Layers;
        return Icon;
    };

    const getBlockColor = (blockName: string) => {
        return BLOCK_COLORS[blockName] || 'from-slate-600 to-slate-700';
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[1200px] h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <X className="w-5 h-5 text-white/70" />
                        </button>
                        <div className="flex-1">
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Nombre del Workout..."
                                className="bg-transparent border-none text-xl font-black text-white placeholder:text-white/30 focus:ring-0 p-0 w-full outline-none"
                            />
                            <div className="flex items-center gap-4 mt-1">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                    Editor de Workout
                                </span>
                                <span className="text-[10px] font-bold text-white/30">•</span>
                                <span className="text-[10px] font-bold text-white/40">
                                    {blocks.length} bloques • {totalExercises} ejercicios
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {saveError && (
                            <span className="text-red-300 text-xs font-bold animate-fade-in">{saveError}</span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-green text-white font-black rounded-xl shadow-lg shadow-brand-green/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>

                {/* Main Content - Two Panels */}
                <div className="flex-1 flex min-h-0">
                    {/* LEFT: Workout Builder (60%) */}
                    <div className="flex-[3] flex flex-col min-w-0 border-r border-slate-100">
                        {/* Block Tabs */}
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100 overflow-x-auto shrink-0">
                            {blocks.map((block) => {
                                const BlockIcon = getBlockIcon(block.name);
                                const isSelected = selectedBlockId === block.id;
                                return (
                                    <button
                                        key={block.id}
                                        onClick={() => setSelectedBlockId(block.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all shrink-0 ${isSelected
                                            ? 'bg-white text-slate-800 shadow-md ring-1 ring-slate-200'
                                            : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
                                            }`}
                                    >
                                        <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${getBlockColor(block.name)} flex items-center justify-center`}>
                                            <BlockIcon className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        {editingBlockId === block.id ? (
                                            <input
                                                type="text"
                                                value={editingBlockName}
                                                onChange={e => setEditingBlockName(e.target.value)}
                                                onBlur={saveBlockName}
                                                onKeyDown={e => e.key === 'Enter' && saveBlockName()}
                                                className="border-none bg-transparent font-bold text-sm p-0 w-28 outline-none focus:ring-0"
                                                autoFocus
                                                onClick={e => e.stopPropagation()}
                                            />
                                        ) : (
                                            <span onDoubleClick={(e) => { e.stopPropagation(); startEditingBlock(block.id, block.name); }}>
                                                {block.name}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-slate-400 ml-1">({block.exercises.length})</span>
                                        {blocks.length > 1 && isSelected && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                                                className="p-0.5 text-slate-300 hover:text-red-500 transition-colors ml-1"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </button>
                                );
                            })}
                            <button
                                onClick={addBlock}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-slate-400 hover:text-brand-green hover:bg-brand-mint/10 rounded-xl transition-all shrink-0"
                            >
                                <Plus className="w-4 h-4" /> Bloque
                            </button>
                        </div>

                        {/* Selected Block Content */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {selectedBlock && (
                                <div className="space-y-4">
                                    {/* Block Header */}
                                    <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getBlockColor(selectedBlock.name)} flex items-center justify-center shadow-lg`}>
                                            {React.createElement(getBlockIcon(selectedBlock.name), { className: "w-5 h-5 text-white" })}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg">{selectedBlock.name}</h3>
                                            <p className="text-xs text-slate-400">{selectedBlock.exercises.length} ejercicios en este bloque</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={selectedBlock.structure_type || 'lineal'}
                                            onChange={(e) => updateBlockStructure(selectedBlock.id, e.target.value as BlockStructureType)}
                                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 outline-none focus:ring-2 focus:ring-brand-mint"
                                        >
                                            {BLOCK_STRUCTURE_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => startEditingBlock(selectedBlock.id, selectedBlock.name)}
                                            className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                    {/* Exercises in Block */}
                                    {selectedBlock.exercises.length === 0 ? (
                                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center bg-slate-50/50">
                                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <Dumbbell className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <h4 className="font-black text-slate-600 mb-2">Bloque vacío</h4>
                                            <p className="text-sm text-slate-400 max-w-sm mx-auto">
                                                Selecciona ejercicios de la librería de la derecha para añadirlos a <strong>{selectedBlock.name}</strong>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            {selectedBlock.exercises.map((item, index) => {
                                                const nextItem = index < selectedBlock.exercises.length - 1 ? selectedBlock.exercises[index + 1] : null;
                                                const prevItem = index > 0 ? selectedBlock.exercises[index - 1] : null;
                                                const isSupersetWithNext = !!item.superset_id && nextItem?.superset_id === item.superset_id;
                                                const isSupersetWithPrev = !!item.superset_id && prevItem?.superset_id === item.superset_id;
                                                const isFirstInSuperset = !!item.superset_id && !isSupersetWithPrev;
                                                const isSupersetBlock = (selectedBlock.structure_type || 'lineal') === 'superserie';
                                                // Show link button if:
                                                // - both free (create new superset)
                                                // - current ends superset and next is free (extend down)
                                                // - current is free and next starts/is-in a superset (extend up)
                                                const canLinkWithNext = isSupersetBlock && !!nextItem && (
                                                    (!item.superset_id && !nextItem.superset_id) ||
                                                    (!!item.superset_id && !isSupersetWithNext && !nextItem.superset_id) ||
                                                    (!item.superset_id && !!nextItem.superset_id)
                                                );
                                                const linkLabel = (!item.superset_id && !nextItem?.superset_id)
                                                    ? 'Crear superserie'
                                                    : 'Añadir a la superserie';

                                                return (
                                                    <React.Fragment key={item.id}>
                                                        <div className={[
                                                            'bg-white border p-4 transition-all group',
                                                            item.superset_id
                                                                ? 'border-amber-300 shadow-sm shadow-amber-50'
                                                                : 'border-slate-100 hover:shadow-lg rounded-2xl mb-3',
                                                            item.superset_id && isSupersetWithPrev && isSupersetWithNext ? 'rounded-none border-y-0' : '',
                                                            item.superset_id && isFirstInSuperset && isSupersetWithNext ? 'rounded-t-2xl rounded-b-none border-b-0' : '',
                                                            item.superset_id && isSupersetWithPrev && !isSupersetWithNext ? 'rounded-b-2xl rounded-t-none mb-3 hover:shadow-lg' : '',
                                                            item.superset_id && !isSupersetWithPrev && !isSupersetWithNext ? 'rounded-2xl mb-3 hover:shadow-lg' : '',
                                                        ].filter(Boolean).join(' ')}>
                                                            {/* Superset Header */}
                                                            {isFirstInSuperset && (
                                                                <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-amber-100">
                                                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 rounded-full">
                                                                        <Zap className="w-3 h-3 text-amber-500" />
                                                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Superserie</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 bg-amber-50 rounded-xl px-3 py-1.5 ml-2">
                                                                        <span className="text-[10px] font-black text-amber-500 uppercase">Rondas</span>
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            value={item.superset_rounds || 3}
                                                                            onChange={(e) => updateSupersetRounds(selectedBlock.id, item.superset_id!, parseInt(e.target.value) || 1)}
                                                                            className="w-10 bg-transparent border-none text-amber-700 text-center text-sm font-bold p-0 focus:ring-0 outline-none"
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        onClick={() => breakSuperset(selectedBlock.id, item.superset_id!)}
                                                                        className="ml-auto text-[10px] text-amber-400 hover:text-red-500 font-bold transition-colors px-2 py-0.5 hover:bg-red-50 rounded-full"
                                                                    >
                                                                        Separar
                                                                    </button>
                                                                </div>
                                                            )}

                                                            <div className="flex items-start gap-4">
                                                                {/* Reorder + Thumbnail */}
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <button
                                                                            onClick={() => moveExercise(selectedBlock.id, item.id, 'up')}
                                                                            disabled={index === 0}
                                                                            className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30 transition-colors"
                                                                        >
                                                                            <ChevronUp className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => moveExercise(selectedBlock.id, item.id, 'down')}
                                                                            disabled={index === selectedBlock.exercises.length - 1}
                                                                            className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30 transition-colors"
                                                                        >
                                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                    <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden">
                                                                        {ExerciseMediaUtils.getThumbnail(item.exercise?.media_url || '', item.exercise?.media_type || '') ? (
                                                                            <img
                                                                                src={ExerciseMediaUtils.getThumbnail(item.exercise?.media_url || '', item.exercise?.media_type || '')!}
                                                                                alt=""
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center">
                                                                                <Activity className="w-5 h-5 text-slate-300" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Exercise Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between mb-3">
                                                                        <div>
                                                                            <h5 className="font-bold text-slate-800 text-sm">{item.exercise?.name}</h5>
                                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{item.exercise?.muscle_main || 'General'}</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => removeExercise(selectedBlock.id, item.id)}
                                                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>

                                                                    {/* Parameters Row */}
                                                                    <div className="flex items-center gap-3">
                                                                        {!item.superset_id && (
                                                                        <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-2">
                                                                            <span className="text-[10px] font-black text-slate-400 uppercase">Series</span>
                                                                            <input
                                                                                type="number"
                                                                                value={item.sets}
                                                                                onChange={(e) => updateExercise(selectedBlock.id, item.id, { sets: parseInt(e.target.value) || 0 })}
                                                                                className="w-10 bg-transparent border-none text-slate-800 text-center text-sm font-bold p-0 focus:ring-0 outline-none"
                                                                            />
                                                                        </div>
                                                                        )}
                                                                        <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-2">
                                                                            <span className="text-[10px] font-black text-slate-400 uppercase">Reps</span>
                                                                            <input
                                                                                type="text"
                                                                                value={item.reps}
                                                                                onChange={(e) => updateExercise(selectedBlock.id, item.id, { reps: e.target.value })}
                                                                                className="w-16 bg-transparent border-none text-slate-800 text-center text-sm font-bold p-0 focus:ring-0 outline-none"
                                                                            />
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-2">
                                                                            <Clock className="w-3 h-3 text-slate-400" />
                                                                            <input
                                                                                type="number"
                                                                                value={item.rest_seconds}
                                                                                onChange={(e) => updateExercise(selectedBlock.id, item.id, { rest_seconds: parseInt(e.target.value) || 0 })}
                                                                                className="w-12 bg-transparent border-none text-slate-800 text-center text-sm font-bold p-0 focus:ring-0 outline-none"
                                                                            />
                                                                            <span className="text-[10px] text-slate-400 font-bold">s</span>
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <input
                                                                                type="text"
                                                                                value={item.notes || ''}
                                                                                onChange={(e) => updateExercise(selectedBlock.id, item.id, { notes: e.target.value })}
                                                                                placeholder="Notas..."
                                                                                className="w-full bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-600 placeholder:text-slate-300 border-none focus:ring-1 focus:ring-brand-mint outline-none"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Superset connector OR link button */}
                                                        {isSupersetWithNext ? (
                                                            <div className="flex items-center gap-2 bg-amber-50 border-x border-amber-300 px-4 py-1.5">
                                                                <div className="flex-1 border-t border-amber-200 border-dashed" />
                                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 rounded-full shrink-0">
                                                                    <Zap className="w-3 h-3 text-amber-500" />
                                                                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">SS</span>
                                                                </div>
                                                                <div className="flex-1 border-t border-amber-200 border-dashed" />
                                                            </div>
                                                        ) : canLinkWithNext ? (
                                                            <div className="flex justify-center my-2">
                                                                <button
                                                                    onClick={() => linkExercises(selectedBlock.id, item.id, nextItem!.id)}
                                                                    className="flex items-center gap-1.5 text-xs text-amber-500 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-4 py-1.5 rounded-full transition-all font-bold shadow-sm hover:shadow"
                                                                >
                                                                    <Layers className="w-3.5 h-3.5" />
                                                                    {linkLabel}
                                                                </button>
                                                            </div>
                                                        ) : null}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Exercise Library (40%) */}
                    <div className="flex-[2] flex flex-col min-w-0 bg-slate-50">
                        {/* Library Header */}
                        <div className="p-4 border-b border-slate-100 bg-white shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                        <Dumbbell className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 text-sm">Librería</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{filteredExercises.length} ejercicios</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsCreatingExercise(true)}
                                    className="px-3 py-1.5 bg-brand-green text-white text-xs font-black rounded-lg shadow-sm hover:scale-105 transition-all flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Nuevo
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Buscar ejercicio..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-mint outline-none transition-all"
                                />
                            </div>

                            {/* Muscle Filter */}
                            {muscleGroups.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        onClick={() => setSelectedMuscle('')}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${!selectedMuscle ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                    >
                                        Todos
                                    </button>
                                    {muscleGroups.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setSelectedMuscle(selectedMuscle === m ? '' : m!)}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${selectedMuscle === m ? 'bg-brand-green text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Exercise List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                            {selectedBlock && (
                                <div className="px-2 py-1.5 bg-brand-mint/10 rounded-lg mb-2">
                                    <p className="text-[10px] font-black text-brand-green uppercase tracking-wider text-center">
                                        👆 Clic para añadir a "{selectedBlock.name}"
                                    </p>
                                </div>
                            )}

                            {filteredExercises.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <Search className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400 mb-1">Sin resultados</p>
                                    <p className="text-xs text-slate-300">
                                        {availableExercises.length === 0
                                            ? 'Crea tu primer ejercicio para empezar'
                                            : 'Prueba con otro término de búsqueda'}
                                    </p>
                                    {availableExercises.length === 0 && (
                                        <button
                                            onClick={() => setIsCreatingExercise(true)}
                                            className="mt-4 px-4 py-2 bg-brand-green text-white text-xs font-black rounded-xl hover:scale-105 transition-all"
                                        >
                                            <Plus className="w-3.5 h-3.5 inline mr-1" /> Crear Ejercicio
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredExercises.map(exercise => {
                                    const isInCurrentBlock = selectedBlock?.exercises.some(ex => ex.exercise_id === exercise.id);
                                    return (
                                        <div
                                            key={exercise.id}
                                            onClick={() => !isInCurrentBlock && addExerciseToBlock(exercise)}
                                            className={`group relative flex items-center gap-3 p-2.5 rounded-xl border transition-all ${isInCurrentBlock
                                                ? 'border-brand-mint/30 bg-brand-mint/5 cursor-default'
                                                : 'border-transparent hover:border-slate-200 hover:bg-white hover:shadow-md cursor-pointer'
                                                }`}
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0 relative">
                                                {ExerciseMediaUtils.getThumbnail(exercise.media_url || '', exercise.media_type || '') ? (
                                                    <img
                                                        src={ExerciseMediaUtils.getThumbnail(exercise.media_url || '', exercise.media_type || '')!}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                                        <Dumbbell className="w-5 h-5 text-slate-300" />
                                                    </div>
                                                )}
                                                {!isInCurrentBlock && (
                                                    <div className="absolute inset-0 bg-brand-green/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Plus className="w-5 h-5 text-white" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-bold text-sm truncate leading-tight mb-0.5 ${isInCurrentBlock ? 'text-brand-green' : 'text-slate-700 group-hover:text-brand-green'
                                                    } transition-colors`}>
                                                    {exercise.name}
                                                </h4>
                                                <span className="px-1.5 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-500 rounded uppercase">
                                                    {exercise.muscle_main || 'General'}
                                                </span>
                                            </div>

                                            {isInCurrentBlock && (
                                                <div className="w-6 h-6 rounded-full bg-brand-green flex items-center justify-center shrink-0">
                                                    <Check className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* New Exercise Modal */}
            {isCreatingExercise && (
                <ExerciseEditor
                    exercise={null}
                    onSave={async (ex) => {
                        await onSaveExercise(ex);
                        setIsCreatingExercise(false);
                    }}
                    onClose={() => setIsCreatingExercise(false)}
                />
            )}
        </div>
    );
}

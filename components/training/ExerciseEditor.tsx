import React, { useState } from 'react';
import { ExerciseMediaUtils } from '../../utils/exerciseMedia';
import {
    X,
    Save,
    Youtube,
    Video,
    Image as ImageIcon,
    ChevronDown,
    ChevronUp,
    Search,
    Check,
    Plus
} from 'lucide-react';
import { Exercise, ExerciseMediaType } from '../../types';

interface ExerciseEditorProps {
    exercise: Exercise | null;
    onSave: (exercise: Partial<Exercise>) => Promise<void>;
    onClose: () => void;
}

const MUSCLE_GROUPS = [
    'abdominales', 'abductores', 'aductores', 'antebrazo', 'bíceps', 'cuello', 'cuádriceps',
    'dorsal', 'espalda', 'flexores de cadera', 'gemelo', 'glúteo', 'hombro', 'isquiotibiales',
    'lumbar', 'oblicuos', 'pecho', 'pectoral', 'tibial', 'trapecio', 'tríceps'
];

const EQUIPMENT = [
    'Barra', 'Mancuernas', 'Kettlebell', 'Polea', 'Máquina', 'Bandas elásticas', 'Peso corporal', 'TRX', 'Pelota'
];

export function ExerciseEditor({ exercise, onSave, onClose }: ExerciseEditorProps) {
    const [name, setName] = useState(exercise?.name || '');
    const [mediaType, setMediaType] = useState<ExerciseMediaType>(exercise?.media_type || 'youtube');
    const [mediaUrl, setMediaUrl] = useState(exercise?.media_url || '');
    const [instructions, setInstructions] = useState(exercise?.instructions || '');
    const [muscleMain, setMuscleMain] = useState(exercise?.muscle_main || '');
    const [muscleSecondary, setMuscleSecondary] = useState<string[]>(exercise?.muscle_secondary || []);
    const [equipment, setEquipment] = useState<string[]>(exercise?.equipment || []);
    const [tags, setTags] = useState<string[]>(exercise?.tags || []);
    const [saving, setSaving] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        muscle: true,
        equipment: false,
        movement: false,
        level: false,
        tags: false
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleMuscleToggle = (muscle: string) => {
        if (muscleMain === muscle) {
            setMuscleMain('');
        } else {
            setMuscleMain(muscle);
        }
    };

    const handleEquipmentToggle = (item: string) => {
        setEquipment(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            setSaving(true);
            await onSave({
                name: name.trim(),
                media_type: mediaType,
                media_url: mediaUrl.trim(),
                instructions: instructions.trim(),
                muscle_main: muscleMain,
                muscle_secondary: muscleSecondary,
                equipment,
                tags
            });
            onClose();
        } catch (error) {
            console.error('Error saving exercise:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800">
                            {exercise ? 'Editar Ejercicio' : 'Crear un ejercicio'}
                        </h2>
                        <p className="text-sm text-slate-500">Configura los detalles técnicos del movimiento</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Nombre */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Nombre del ejercicio</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ej: Remo con barra"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-mint focus:border-brand-mint outline-none transition-all"
                        />
                    </div>

                    {/* Media Selection */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-slate-700">¿Quieres añadir un vídeo o una imagen?</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { id: 'youtube', label: 'YouTube / Vimeo', icon: Youtube },
                                { id: 'image', label: 'Subir imagen', icon: ImageIcon },
                                { id: 'none', label: 'Sin multimedia', icon: X }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setMediaType(type.id as ExerciseMediaType)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${mediaType === type.id
                                        ? 'border-brand-mint bg-brand-mint/5 text-brand-green'
                                        : 'border-slate-100 hover:border-slate-200 text-slate-500'
                                        }`}
                                >
                                    <type.icon className="w-5 h-5" />
                                    <span className="text-sm font-bold">{type.label}</span>
                                </button>
                            ))}
                        </div>

                        {mediaType !== 'none' && (
                            <div className="animate-fade-in">
                                <input
                                    type="text"
                                    value={mediaUrl}
                                    onChange={e => setMediaUrl(e.target.value)}
                                    placeholder={mediaType === 'youtube' ? 'Ej: https://www.youtube.com/watch?v=...' : 'URL de la imagen'}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-mint focus:border-brand-mint outline-none"
                                />

                                {/* Preview Box */}
                                <div className="mt-4 aspect-video bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 relative overflow-hidden group">
                                    {mediaUrl ? (
                                        mediaType === 'youtube' ? (
                                            <div className="w-full h-full">
                                                {ExerciseMediaUtils.getEmbedUrl(mediaUrl, mediaType) ? (
                                                    <iframe
                                                        src={ExerciseMediaUtils.getEmbedUrl(mediaUrl, mediaType)!}
                                                        className="w-full h-full border-0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    />
                                                ) : (
                                                    <div className="text-center p-6">
                                                        <Video className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                                                        <p className="text-xs text-slate-400">URL de vídeo no reconocida</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                                        )
                                    ) : (
                                        <div className="text-center p-6">
                                            <p className="text-sm text-slate-400 font-medium">
                                                {mediaType === 'youtube' ? 'Añade una URL válida de Youtube o Vimeo' : 'Añade una URL de imagen'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Instrucciones */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Instrucciones (opcional)</label>
                        <textarea
                            value={instructions}
                            onChange={e => setInstructions(e.target.value)}
                            rows={4}
                            placeholder="Ej: Inicia el movimiento colocándote de pie..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-mint focus:border-brand-mint outline-none resize-none transition-all text-sm leading-relaxed"
                        />
                    </div>

                    {/* Accordion Sections */}
                    <div className="space-y-2">
                        {/* Músculo Principal */}
                        <div className="border border-slate-100 rounded-2xl overflow-hidden">
                            <button
                                onClick={() => toggleSection('muscle')}
                                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                type="button"
                            >
                                <span className="font-bold text-slate-700 text-sm">Músculo principal</span>
                                {expandedSections.muscle ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </button>
                            {expandedSections.muscle && (
                                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-2 animate-fade-in">
                                    {MUSCLE_GROUPS.map(muscle => (
                                        <button
                                            key={muscle}
                                            onClick={() => handleMuscleToggle(muscle)}
                                            type="button"
                                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${muscleMain === muscle
                                                ? 'bg-brand-green border-brand-green text-white shadow-lg scale-105'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-brand-mint'
                                                }`}
                                        >
                                            {muscle}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Equipamiento */}
                        <div className="border border-slate-100 rounded-2xl overflow-hidden">
                            <button
                                onClick={() => toggleSection('equipment')}
                                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                type="button"
                            >
                                <span className="font-bold text-slate-700 text-sm">Equipamiento</span>
                                {expandedSections.equipment ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </button>
                            {expandedSections.equipment && (
                                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-2 animate-fade-in">
                                    {EQUIPMENT.map(item => (
                                        <button
                                            key={item}
                                            onClick={() => handleEquipmentToggle(item)}
                                            type="button"
                                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${equipment.includes(item)
                                                ? 'bg-brand-mint border-brand-mint text-brand-green shadow-sm'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-brand-mint'
                                                }`}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Other sections could follow here (Movimiento, Nivel, etc) */}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-500 font-bold hover:text-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !name.trim()}
                        className="px-8 py-2.5 bg-brand-green text-white font-black rounded-xl shadow-lg shadow-brand-green/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

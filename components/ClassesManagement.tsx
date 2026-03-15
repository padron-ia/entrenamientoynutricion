
import React, { useState, useEffect } from 'react';
import { mockDb } from '../services/mockSupabase';
import { ClassSession, User } from '../types';
import {
    Calendar, Video, PlayCircle, Plus, Edit, Trash2,
    Save, X, Clock, User as UserIcon, CheckCircle2
} from 'lucide-react';
import { useToast } from './ToastProvider';

interface ClassesManagementProps {
    currentUser: User;
}

const ClassesManagement: React.FC<ClassesManagementProps> = ({ currentUser }) => {
    const [classes, setClasses] = useState<ClassSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentClass, setCurrentClass] = useState<Partial<ClassSession>>({});
    const toast = useToast();

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        setIsLoading(true);
        const data = await mockDb.getClasses();
        setClasses(data);
        setIsLoading(false);
    };

    const handleCreateNew = () => {
        setCurrentClass({
            title: '',
            description: '',
            speaker: currentUser.name || 'Coach',
            date: new Date().toISOString().slice(0, 16), // datetime-local format
            category: 'General',
            is_recorded: false,
            url: ''
        });
        setIsEditing(true);
    };

    const handleEdit = (cls: ClassSession) => {
        setCurrentClass({
            ...cls,
            date: new Date(cls.date).toISOString().slice(0, 16)
        });
        setIsEditing(true);
    };

    const [deleteId, setDeleteId] = useState<string | null>(null);

    const promptDelete = (id: string) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await mockDb.deleteClass(deleteId);
            toast.success('Clase eliminada');
            fetchClasses();
        } catch (e: any) {
            console.error(e);
            toast.error(`Error al eliminar: ${e.message || 'Desconocido'}`);
        } finally {
            setDeleteId(null);
        }
    };

    const handleSave = async () => {
        try {
            if (!currentClass.title || !currentClass.date) {
                toast.error('Título y Fecha son obligatorios');
                return;
            }

            const payload: any = {
                ...currentClass,
                date: new Date(currentClass.date!).toISOString()
            };

            if (currentClass.id) {
                await mockDb.updateClass(payload as ClassSession);
                toast.success('Clase actualizada');
            } else {
                await mockDb.createClass(payload);
                toast.success('Clase creada');
            }
            setIsEditing(false);
            fetchClasses();
        } catch (e: any) {
            console.error(e);
            toast.error(`Error al guardar: ${e.message || 'Desconocido'}`);
        }
    };

    const upcomingClasses = classes.filter(c => !c.is_recorded);
    const recordedClasses = classes.filter(c => c.is_recorded);

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestión de Clases Semanales</h1>
                    <p className="text-slate-500">Programa nuevas clases o sube grabaciones pasadas.</p>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Nueva Clase
                </button>
            </div>

            {/* UPCOMING */}
            <div className="mb-10">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-500" /> Próximas Clases (En Directo)
                </h2>
                {upcomingClasses.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
                        No hay clases programadas próximamente.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {upcomingClasses.map(cls => (
                            <ClassCard key={cls.id} cls={cls} onEdit={handleEdit} onDelete={promptDelete} />
                        ))}
                    </div>
                )}
            </div>

            {/* RECORDED */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <PlayCircle className="w-5 h-5 text-indigo-500" /> Historial de Grabaciones
                </h2>
                {recordedClasses.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
                        No hay grabaciones subidas aún.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {recordedClasses.map(cls => (
                            <ClassCard key={cls.id} cls={cls} onEdit={handleEdit} onDelete={promptDelete} />
                        ))}
                    </div>
                )}
            </div>

            {/* EDIT MODAL */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">
                                {currentClass.id ? 'Editar Clase' : 'Nueva Clase'}
                            </h3>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
                                <input
                                    type="text"
                                    value={currentClass.title}
                                    onChange={e => setCurrentClass({ ...currentClass, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Ej: Estrategias para Navidad..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                                <textarea
                                    value={currentClass.description || ''}
                                    onChange={e => setCurrentClass({ ...currentClass, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                                    placeholder="Breve resumen de la clase..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha y Hora</label>
                                    <input
                                        type="datetime-local"
                                        value={currentClass.date}
                                        onChange={e => setCurrentClass({ ...currentClass, date: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Coach (Speaker)</label>
                                    <input
                                        type="text"
                                        value={currentClass.speaker}
                                        onChange={e => setCurrentClass({ ...currentClass, speaker: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                                <select
                                    value={currentClass.category}
                                    onChange={e => setCurrentClass({ ...currentClass, category: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                >
                                    <option value="General">General</option>
                                    <option value="Entrenamiento">Entrenamiento</option>
                                    <option value="Nutrición">Nutrición</option>
                                    <option value="Mindset">Mindset</option>
                                    <option value="Médico">Médico</option>
                                </select>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="is_recorded"
                                        checked={currentClass.is_recorded}
                                        onChange={e => setCurrentClass({ ...currentClass, is_recorded: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    <label htmlFor="is_recorded" className="font-medium text-slate-700 select-none cursor-pointer">
                                        ¿Es una grabación ya disponible?
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                        {currentClass.is_recorded ? 'URL Grabación (Youtube/Loom)' : 'URL Sala (Meet/Zoom)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={currentClass.url || ''}
                                        onChange={e => setCurrentClass({ ...currentClass, url: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">Cancelar</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200">Guardar Clase</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar Clase?</h3>
                            <p className="text-slate-500 text-sm mb-6">Esta acción no se puede deshacer. La clase desaparecerá del portal de los alumnos.</p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="flex-1 py-2.5 text-slate-700 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-2.5 text-white font-bold bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-200"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ClassCard: React.FC<{ cls: ClassSession, onEdit: (c: ClassSession) => void, onDelete: (id: string) => void }> = ({ cls, onEdit, onDelete }) => {
    return (
        <div className={`p-4 rounded-xl border flex items-center justify-between group transition-all ${cls.is_recorded ? 'bg-white border-slate-200 hover:border-indigo-200' : 'bg-amber-50/50 border-amber-200 hover:border-amber-300'}`}>
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${cls.is_recorded ? 'bg-indigo-50 text-indigo-500' : 'bg-amber-100 text-amber-600'}`}>
                    {cls.is_recorded ? <PlayCircle className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">{cls.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(cls.date).toLocaleDateString()} {new Date(cls.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {cls.speaker}</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs uppercase font-bold">{cls.category}</span>
                    </div>
                </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(cls)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600" title="Editar">
                    <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(cls.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600" title="Borrar">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default ClassesManagement;

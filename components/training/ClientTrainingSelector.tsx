import React, { useState, useEffect } from 'react';
import { Dumbbell, Check, Search, AlertCircle } from 'lucide-react';
import { TrainingProgram, User, ClientTrainingAssignment } from '../../types';
import { trainingService } from '../../services/trainingService';

interface ClientTrainingSelectorProps {
    clientId: string;
    currentUser: User;
    onAssigned?: () => void;
}

export function ClientTrainingSelector({
    clientId,
    currentUser,
    onAssigned
}: ClientTrainingSelectorProps) {
    const [programs, setPrograms] = useState<TrainingProgram[]>([]);
    const [currentAssignment, setCurrentAssignment] = useState<ClientTrainingAssignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAssigning, setIsAssigning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                const [allPrograms, assignment] = await Promise.all([
                    trainingService.getPrograms(),
                    trainingService.getClientAssignment(clientId)
                ]);
                setPrograms(allPrograms);
                setCurrentAssignment(assignment);
            } catch (err: any) {
                console.error('Error loading training data:', err);
                setError(err.message || 'Error al cargar programas');
            } finally {
                setLoading(false);
            }
        };
        if (clientId) loadData();
    }, [clientId]);

    const handleAssign = async (programId: string) => {
        try {
            setIsAssigning(true);
            setError(null);
            await trainingService.assignProgramToClient(clientId, programId, startDate, currentUser.id);
            const newAssignment = await trainingService.getClientAssignment(clientId);
            setCurrentAssignment(newAssignment);
            if (onAssigned) onAssigned();
        } catch (err: any) {
            console.error('Error assigning program:', err);
            setError(err.message || 'Error al asignar programa');
        } finally {
            setIsAssigning(false);
        }
    };

    const handleUnassign = async () => {
        try {
            setIsAssigning(true);
            await trainingService.removeClientAssignment(clientId);
            setCurrentAssignment(null);
            if (onAssigned) onAssigned();
        } catch (err: any) {
            console.error('Error removing assignment:', err);
            setError(err.message || 'Error al quitar asignación');
        } finally {
            setIsAssigning(false);
        }
    };

    const filteredPrograms = programs.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="animate-pulse space-y-3">
            <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
            <div className="h-20 bg-slate-50 rounded-xl w-full"></div>
        </div>
    );

    if (error) return (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <div>
                <p className="text-sm text-rose-700 font-medium">Error al cargar programas</p>
                <p className="text-[10px] text-rose-500">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Estado actual */}
            {currentAssignment ? (
                <div className="bg-brand-mint/30 border border-brand-mint rounded-2xl p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-200">
                            <Check className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-brand-green uppercase tracking-wider">Programa Asignado</p>
                            <h4 className="text-brand-dark font-bold">
                                {programs.find(p => p.id === currentAssignment.program_id)?.name || currentAssignment.program_id}
                            </h4>
                            <p className="text-[10px] text-brand-green font-medium">
                                Desde el {new Date(currentAssignment.start_date).toLocaleDateString('es-ES')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleUnassign}
                        disabled={isAssigning}
                        className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        Quitar asignación
                    </button>
                </div>
            ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <div>
                        <p className="text-sm text-amber-700 font-medium">Sin programa asignado</p>
                        <p className="text-[10px] text-amber-600 mt-0.5">Selecciona un programa de la lista para asignárselo al cliente.</p>
                    </div>
                </div>
            )}

            {/* Fecha de inicio */}
            <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha de inicio</label>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-brand-dark focus:ring-2 focus:ring-brand-green outline-none transition-all"
                />
            </div>

            {/* Buscador */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Buscar programa por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-green outline-none transition-all"
                />
            </div>

            {/* Lista de programas */}
            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {filteredPrograms.map(program => {
                    const isCurrent = currentAssignment?.program_id === program.id;
                    return (
                        <button
                            key={program.id}
                            onClick={() => !isCurrent && handleAssign(program.id)}
                            disabled={isAssigning || isCurrent}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left group ${
                                isCurrent
                                    ? 'border-brand-green bg-brand-mint/20 cursor-default'
                                    : 'border-slate-100 bg-white hover:border-brand-mint hover:shadow-sm'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                    isCurrent
                                        ? 'bg-brand-green text-white'
                                        : 'bg-slate-50 text-slate-400 group-hover:bg-brand-mint group-hover:text-brand-green'
                                }`}>
                                    {isCurrent ? <Check className="w-4 h-4" /> : <Dumbbell className="w-4 h-4" />}
                                </div>
                                <div>
                                    <span className="text-sm font-bold text-slate-700">{program.name}</span>
                                    {program.weeks_count && (
                                        <span className="ml-2 text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                                            {program.weeks_count} sem.
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}

                {filteredPrograms.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        No se encontraron programas
                    </div>
                )}
            </div>
        </div>
    );
}

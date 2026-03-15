import React from 'react';

interface WeightModalProps {
    isOpen: boolean;
    onClose: () => void;
    newWeight: string;
    setNewWeight: (v: string) => void;
    isSubmitting: boolean;
    handleWeightSubmit: (e: React.FormEvent) => void;
}

export function WeightModal({ isOpen, onClose, newWeight, setNewWeight, isSubmitting, handleWeightSubmit }: WeightModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-surface-overlay backdrop-blur-sm sm:p-4 animate-in fade-in">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl p-8 w-full max-w-sm shadow-premium scale-100 animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
                <div className="w-12 h-1 bg-sea-200 rounded-full mx-auto mb-6 sm:hidden"></div>
                <h3 className="text-2xl font-bold mb-2 text-sea-900 text-center">Registrar Peso</h3>
                <p className="text-sea-400 text-center mb-6 text-sm">Introduce tu peso actual para actualizar tu progreso.</p>
                <form onSubmit={handleWeightSubmit}>
                    <div className="relative mb-6">
                        <input
                            type="number"
                            step="0.1"
                            placeholder="00.0"
                            className="w-full py-4 text-center text-4xl font-bold text-sea-900 border-b-2 border-sea-200 focus:border-accent-500 outline-none bg-transparent placeholder:text-sea-200 transition-colors"
                            value={newWeight}
                            onChange={e => setNewWeight(e.target.value)}
                            autoFocus
                        />
                        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-sea-400 font-bold">kg</span>
                    </div>
                    <div className="space-y-3">
                        <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-sea-900 text-white font-bold rounded-2xl hover:bg-sea-800 shadow-lg shadow-sea-200 disabled:opacity-50 transition-all active:scale-95">
                            {isSubmitting ? 'Guardando...' : 'Guardar Peso'}
                        </button>
                        <button type="button" onClick={onClose} className="w-full py-4 text-sea-400 font-bold hover:bg-sea-50 rounded-2xl transition-colors">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

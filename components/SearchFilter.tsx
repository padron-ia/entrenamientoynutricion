/**
 * Search and Filter Component
 * Provides search and filtering capabilities for client lists
 */

import React from 'react';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import { ClientStatus } from '../types';
import { getStatusConfig } from '../utils/statusHelpers';

interface SearchFilterProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    statusFilter: ClientStatus | 'all';
    onStatusFilterChange: (status: ClientStatus | 'all') => void;
    coachFilter: string;
    onCoachFilterChange: (coach: string) => void;
    availableCoaches: string[];
    showFilters: boolean;
    onToggleFilters: () => void;
    resultCount?: number;
}

const SearchFilter: React.FC<SearchFilterProps> = ({
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    coachFilter,
    onCoachFilterChange,
    availableCoaches,
    showFilters,
    onToggleFilters,
    resultCount
}) => {
    const clearSearch = () => {
        onSearchChange('');
    };

    const clearFilters = () => {
        onStatusFilterChange('all');
        onCoachFilterChange('all');
    };

    const hasActiveFilters = statusFilter !== 'all' || coachFilter !== 'all';

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Buscar por nombre, email o teléfono..."
                        className="
              w-full pl-12 pr-12 py-3.5 rounded-xl border-2 border-slate-200
              focus:border-blue-500 focus:ring-4 focus:ring-blue-100
              transition-all duration-300 bg-white shadow-sm
              text-slate-800 placeholder-slate-400
              outline-none
            "
                    />
                    {searchTerm && (
                        <button
                            onClick={clearSearch}
                            className="
                absolute right-4 top-1/2 -translate-y-1/2
                p-1 rounded-full hover:bg-slate-100 transition-colors
                text-slate-400 hover:text-slate-600
              "
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <button
                    onClick={onToggleFilters}
                    className={`
            px-6 py-3.5 rounded-xl font-semibold transition-all duration-300
            flex items-center gap-2 shadow-sm
            ${showFilters
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-300'
                        }
          `}
                >
                    <SlidersHorizontal className="w-5 h-5" />
                    <span className="hidden sm:inline">Filtros</span>
                    {hasActiveFilters && (
                        <span className="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                            {(statusFilter !== 'all' ? 1 : 0) + (coachFilter !== 'all' ? 1 : 0)}
                        </span>
                    )}
                </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="
          bg-white rounded-xl border-2 border-slate-100 p-6 shadow-lg
          animate-in slide-in-from-top-2 duration-300
        ">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Filter className="w-5 h-5 text-blue-600" />
                            Filtros Avanzados
                        </h3>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                            >
                                <X className="w-4 h-4" />
                                Limpiar filtros
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Estado del Cliente
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => onStatusFilterChange(e.target.value as ClientStatus | 'all')}
                                className="
                  w-full px-4 py-3 rounded-xl border-2 border-slate-200
                  focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                  transition-all duration-300 bg-white
                  text-slate-800 font-medium
                  outline-none cursor-pointer
                "
                            >
                                <option value="all">Todos los estados</option>
                                {Object.values(ClientStatus).map(status => {
                                    const config = getStatusConfig(status);
                                    return (
                                        <option key={status} value={status}>
                                            {config.label}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Coach Filter */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Coach Asignado
                            </label>
                            <select
                                value={coachFilter}
                                onChange={(e) => onCoachFilterChange(e.target.value)}
                                className="
                  w-full px-4 py-3 rounded-xl border-2 border-slate-200
                  focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                  transition-all duration-300 bg-white
                  text-slate-800 font-medium
                  outline-none cursor-pointer
                "
                            >
                                <option value="all">Todos los coaches</option>
                                {availableCoaches.map(coach => (
                                    <option key={coach} value={coach}>
                                        {coach || 'Sin asignar'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Results Count */}
                    {resultCount !== undefined && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-sm text-slate-600 font-medium">
                                {resultCount === 0 ? (
                                    <span className="text-amber-600">No se encontraron resultados</span>
                                ) : (
                                    <>
                                        Mostrando <span className="font-bold text-blue-600">{resultCount}</span> {resultCount === 1 ? 'cliente' : 'clientes'}
                                    </>
                                )}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchFilter;

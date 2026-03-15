import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Users,
  Check,
  AlertCircle,
  User as UserIcon,
  Mail
} from 'lucide-react';
import { NutritionPlan, User, ClientNutritionAssignment } from '../../types';
import { nutritionService } from '../../services/nutritionService';

interface PlanAssignerProps {
  plan: NutritionPlan;
  currentUser: User;
  onClose: () => void;
}

interface ClientOption {
  id: string;
  name: string;
  email: string;
  selected: boolean;
  alreadyAssigned: boolean;
}

export function PlanAssigner({ plan, currentUser, onClose }: PlanAssignerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentAssignments, setCurrentAssignments] = useState<ClientNutritionAssignment[]>([]);

  // Load current assignments for this plan
  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const assignments = await nutritionService.getAssignmentsByPlan(plan.id);
        setCurrentAssignments(assignments);
      } catch (err) {
        console.error('Error loading assignments:', err);
      }
    };
    loadAssignments();
  }, [plan.id]);

  // Search clients
  useEffect(() => {
    const search = async () => {
      if (searchQuery.length < 2) {
        setClients([]);
        return;
      }

      try {
        setLoading(true);
        const results = await nutritionService.searchClients(searchQuery);

        // Mark which ones are already assigned to this plan
        const assignedIds = new Set(currentAssignments.map(a => a.client_id));

        setClients(
          results.map(c => ({
            ...c,
            selected: assignedIds.has(c.id),
            alreadyAssigned: assignedIds.has(c.id)
          }))
        );
      } catch (err: any) {
        console.error('Error searching clients:', err);
        setError(err.message || 'Error al buscar clientes');
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, currentAssignments]);

  const toggleClient = (clientId: string) => {
    setClients(prev =>
      prev.map(c =>
        c.id === clientId ? { ...c, selected: !c.selected } : c
      )
    );
  };

  const handleAssign = async () => {
    const toAssign = clients.filter(c => c.selected && !c.alreadyAssigned);
    const toUnassign = clients.filter(c => !c.selected && c.alreadyAssigned);

    if (toAssign.length === 0 && toUnassign.length === 0) {
      setError('No hay cambios que guardar');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Assign new clients
      if (toAssign.length > 0) {
        await nutritionService.assignPlanToMultipleClients(
          toAssign.map(c => c.id),
          plan.id,
          currentUser.id
        );
      }

      // Unassign removed clients
      for (const client of toUnassign) {
        await nutritionService.unassignClient(client.id);
      }

      setSuccess(
        `Asignación actualizada: ${toAssign.length} añadidos, ${toUnassign.length} removidos`
      );

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error assigning plan:', err);
      setError(err.message || 'Error al asignar el plan');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = clients.filter(c => c.selected).length;
  const newAssignments = clients.filter(c => c.selected && !c.alreadyAssigned).length;
  const removals = clients.filter(c => !c.selected && c.alreadyAssigned).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Asignar Plan</h2>
              <p className="text-sm text-slate-500 mt-1">{plan.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Current Assignments Count */}
          <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                {currentAssignments.length} clientes asignados actualmente
              </p>
              {currentAssignments.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  {currentAssignments.slice(0, 3).map(a => a.client_name).join(', ')}
                  {currentAssignments.length > 3 && ` y ${currentAssignments.length - 3} más`}
                </p>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar clientes por nombre o email..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
              autoFocus
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-700 text-sm">
              <Check className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Results */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8 text-slate-500">
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Buscando...
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Escribe al menos 2 caracteres para buscar
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No se encontraron clientes
              </div>
            ) : (
              clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => toggleClient(client.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                    client.selected
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      client.selected ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {client.selected ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <UserIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{client.name}</p>
                    <p className="text-sm text-slate-500 truncate flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {client.email}
                    </p>
                  </div>
                  {client.alreadyAssigned && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                      Asignado
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200">
          {/* Summary */}
          {(newAssignments > 0 || removals > 0) && (
            <div className="mb-4 text-sm text-slate-600">
              {newAssignments > 0 && (
                <span className="text-green-600">+{newAssignments} nuevos</span>
              )}
              {newAssignments > 0 && removals > 0 && ', '}
              {removals > 0 && (
                <span className="text-red-600">-{removals} removidos</span>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleAssign}
              disabled={saving || (newAssignments === 0 && removals === 0)}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar Asignaciones'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

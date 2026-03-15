import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, Copy, Eye, Loader2, User, UserCheck, X } from 'lucide-react';
import { NutritionSpecialRequest, User as CRMUser } from '../../types';
import { nutritionSpecialRequestsService } from '../../services/nutritionSpecialRequestsService';

interface NutritionSpecialRequestsProps {
  user: CRMUser;
  onPendingCountChange?: (count: number) => void;
}

const STATUS_COLUMNS: Array<{ id: NutritionSpecialRequest['status']; label: string; empty: string }> = [
  { id: 'pending', label: 'Pendientes', empty: 'Sin solicitudes pendientes' },
  { id: 'assigned', label: 'Asignadas', empty: 'Sin solicitudes asignadas' },
  { id: 'in_progress', label: 'En Proceso', empty: 'Sin solicitudes en proceso' },
  { id: 'completed', label: 'Realizadas', empty: 'Sin solicitudes realizadas' },
];

const statusLabel: Record<NutritionSpecialRequest['status'], string> = {
  pending: 'Pendiente',
  assigned: 'Asignada',
  in_progress: 'En proceso',
  completed: 'Realizada',
};

const formatRequestForGemini = (request: NutritionSpecialRequest): string => {
  const snapshot = request.profile_snapshot || {};
  return [
    'SOLICITUD ESPECIAL DE PLAN NUTRICIONAL',
    `Cliente: ${request.client_name || snapshot.client_name || 'No indicado'}`,
    `Estado: ${statusLabel[request.status]}`,
    `Prioridad: ${request.priority === 'high' ? 'Alta' : 'Normal'}`,
    `Coach solicitante: ${request.creator_name || 'No indicado'}`,
    `Responsable asignado: ${request.assigned_name || 'Sin asignar'}`,
    `Fecha objetivo: ${request.target_date ? new Date(request.target_date).toLocaleDateString('es-ES') : 'No indicada'}`,
    '',
    'JUSTIFICACION DEL COACH',
    `Motivo de solicitud: ${request.request_reason || 'No indicado'}`,
    `Cambios respecto al plan actual: ${request.requested_changes || 'No indicado'}`,
    `Objetivo del nuevo plan: ${request.requested_goal || 'No indicado'}`,
    `Notas adicionales del coach: ${request.coach_notes || 'No indicado'}`,
    '',
    'PERFIL CLINICO Y NUTRICIONAL (PREFILL EDITADO)',
    `Edad: ${snapshot.age ?? 'No indicada'}`,
    `Enfermedades: ${snapshot.diseases || 'No indicado'}`,
    `Patologias: ${snapshot.pathologies || 'No indicado'}`,
    `Medicación: ${snapshot.medication || 'No indicado'}`,
    `Alergias / Intolerancias: ${snapshot.allergies || 'No indicado'}`,
    `Alimentos vetados: ${snapshot.excluded_foods || 'No indicado'}`,
    `Tipo de alimentacion preferido: ${snapshot.preferred_diet || 'No indicado'}`,
    `Kcal actuales del plan: ${snapshot.current_kcal ?? 'No indicado'}`,
    `Kcal deseadas por coach: ${snapshot.desired_kcal ?? 'No indicado'}`,
    '',
    `Creada: ${new Date(request.created_at).toLocaleString('es-ES')}`,
    `Ultima actualizacion: ${new Date(request.updated_at).toLocaleString('es-ES')}`,
  ].join('\n');
};

export function NutritionSpecialRequests({ user, onPendingCountChange }: NutritionSpecialRequestsProps) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<NutritionSpecialRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<NutritionSpecialRequest | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await nutritionSpecialRequestsService.getAll();
      setRequests(data);
      const pendingCount = data.filter(r => r.status === 'pending').length;
      onPendingCountChange?.(pendingCount);
    } catch (err) {
      console.error('Error loading nutrition special requests:', err);
      setError('No se pudieron cargar las solicitudes especiales.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyForGemini = async (request: NutritionSpecialRequest) => {
    const text = formatRequestForGemini(request);
    try {
      await navigator.clipboard.writeText(text);
      alert('Ficha copiada. Ya puedes pegarla en Gemini.');
    } catch (err) {
      console.error('Error copying request content:', err);
      alert('No se pudo copiar. Intenta de nuevo.');
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const grouped = useMemo(() => {
    return STATUS_COLUMNS.reduce((acc, col) => {
      acc[col.id] = requests.filter(r => r.status === col.id);
      return acc;
    }, {} as Record<NutritionSpecialRequest['status'], NutritionSpecialRequest[]>);
  }, [requests]);

  const handleUpdate = async (requestId: string, updates: Partial<NutritionSpecialRequest>) => {
    setSavingId(requestId);
    try {
      const updated = await nutritionSpecialRequestsService.update(requestId, updates);
      setRequests(prev => {
        const next = prev.map(r => (r.id === requestId ? updated : r));
        onPendingCountChange?.(next.filter(r => r.status === 'pending').length);
        return next;
      });
    } catch (err) {
      console.error('Error updating nutrition request:', err);
      alert('No se pudo actualizar la solicitud.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm text-slate-500">Cargando solicitudes especiales...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 font-medium">{error}</p>
        <button
          onClick={loadRequests}
          className="mt-3 px-4 py-2 text-sm bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-100"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Solicitudes Especiales</h2>
          <p className="text-sm text-slate-500">Control operativo de planes especiales solicitados por coaches.</p>
        </div>
        <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
          Total: {requests.length}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-start">
        {STATUS_COLUMNS.map((column) => {
          const columnRequests = grouped[column.id] || [];
          return (
            <div key={column.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3 min-h-[260px]">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-700">{column.label}</h3>
                <span className="text-xs font-bold bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                  {columnRequests.length}
                </span>
              </div>

              {columnRequests.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-2">{column.empty}</p>
              ) : (
                <div className="space-y-3">
                  {columnRequests.map((request) => {
                    const isMine = request.assigned_to === user.id;
                    const isBusy = savingId === request.id;
                    return (
                      <div key={request.id} className="bg-white rounded-xl border border-slate-200 p-3 space-y-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{request.client_name || request.profile_snapshot?.client_name || 'Cliente'}</p>
                            <p className="text-[11px] text-slate-500">Coach: {request.creator_name || 'Sin identificar'}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${request.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                            {request.priority === 'high' ? 'Alta' : 'Normal'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-3">{request.request_reason}</p>

                        {(request.profile_snapshot?.current_kcal || request.profile_snapshot?.desired_kcal) && (
                          <p className="text-[11px] text-slate-500">
                            Kcal: {request.profile_snapshot?.current_kcal ?? '-'}
                            {request.profile_snapshot?.desired_kcal ? ` -> ${request.profile_snapshot.desired_kcal}` : ''}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {request.assigned_name || 'Sin asignar'}
                          </span>
                          {request.target_date && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="w-3 h-3" />
                              {new Date(request.target_date).toLocaleDateString('es-ES')}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Ver ficha
                          </button>

                          {!request.assigned_to && request.status === 'pending' && (
                            <button
                              onClick={() => handleUpdate(request.id, { assigned_to: user.id, status: 'assigned' })}
                              disabled={isBusy}
                              className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-1"
                            >
                              {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                              Asignarme
                            </button>
                          )}

                          {request.status === 'assigned' && isMine && (
                            <button
                              onClick={() => handleUpdate(request.id, { status: 'in_progress' })}
                              disabled={isBusy}
                              className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
                            >
                              Marcar en proceso
                            </button>
                          )}

                          {(request.status === 'assigned' || request.status === 'in_progress') && isMine && (
                            <button
                              onClick={() => handleUpdate(request.id, { status: 'completed', completed_at: new Date().toISOString() })}
                              disabled={isBusy}
                              className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Marcar realizada
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedRequest(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-emerald-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Ficha de solicitud especial</h3>
                <p className="text-xs text-slate-500 mt-1">{selectedRequest.client_name || selectedRequest.profile_snapshot?.client_name || 'Cliente'} · {statusLabel[selectedRequest.status]}</p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="p-2 rounded-lg hover:bg-white transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(90vh-150px)] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 border rounded-xl bg-slate-50">
                  <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wide">Coach</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{selectedRequest.creator_name || 'No indicado'}</p>
                </div>
                <div className="p-3 border rounded-xl bg-slate-50">
                  <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wide">Prioridad</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{selectedRequest.priority === 'high' ? 'Alta' : 'Normal'}</p>
                </div>
                <div className="p-3 border rounded-xl bg-slate-50">
                  <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wide">Fecha objetivo</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{selectedRequest.target_date ? new Date(selectedRequest.target_date).toLocaleDateString('es-ES') : 'No indicada'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 border border-slate-200 rounded-xl">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Motivo de la solicitud</p>
                  <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{selectedRequest.request_reason || 'No indicado'}</p>
                </div>
                <div className="p-4 border border-slate-200 rounded-xl">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Que cambia respecto al plan actual</p>
                  <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{selectedRequest.requested_changes || 'No indicado'}</p>
                </div>
                <div className="p-4 border border-slate-200 rounded-xl">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Objetivo del nuevo plan</p>
                  <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{selectedRequest.requested_goal || 'No indicado'}</p>
                </div>
                <div className="p-4 border border-slate-200 rounded-xl">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Notas adicionales del coach</p>
                  <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{selectedRequest.coach_notes || 'No indicado'}</p>
                </div>
              </div>

              <div className="p-4 border border-blue-200 bg-blue-50/50 rounded-xl">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">Perfil clinico y nutricional</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                  <p><span className="font-semibold">Edad:</span> {selectedRequest.profile_snapshot?.age ?? 'No indicada'}</p>
                  <p><span className="font-semibold">Enfermedades:</span> {selectedRequest.profile_snapshot?.diseases || 'No indicado'}</p>
                  <p><span className="font-semibold">Patologias:</span> {selectedRequest.profile_snapshot?.pathologies || 'No indicado'}</p>
                  <p><span className="font-semibold">Medicación:</span> {selectedRequest.profile_snapshot?.medication || 'No indicado'}</p>
                  <p><span className="font-semibold">Alergias/intolerancias:</span> {selectedRequest.profile_snapshot?.allergies || 'No indicado'}</p>
                  <p><span className="font-semibold">Alimentos vetados:</span> {selectedRequest.profile_snapshot?.excluded_foods || 'No indicado'}</p>
                  <p><span className="font-semibold">Kcal actuales:</span> {selectedRequest.profile_snapshot?.current_kcal ?? 'No indicado'}</p>
                  <p><span className="font-semibold">Kcal deseadas:</span> {selectedRequest.profile_snapshot?.desired_kcal ?? 'No indicado'}</p>
                  <p className="md:col-span-2"><span className="font-semibold">Tipo de alimentacion preferido:</span> {selectedRequest.profile_snapshot?.preferred_diet || 'No indicado'}</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => handleCopyForGemini(selectedRequest)}
                className="px-3 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar para Gemini
              </button>
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useGymReservations } from '../hooks/useGymReservations';
import { gymService } from '../../../services/gymService';
import { Calendar, Clock, Check, X, AlertCircle } from 'lucide-react';
import { useToast } from '../../ToastProvider';

interface GymReservationsViewProps {
  memberId: string;
  onCreditChange?: () => void;
}

const GymReservationsView: React.FC<GymReservationsViewProps> = ({ memberId, onCreditChange }) => {
  const { upcoming, past, isLoading, refresh } = useGymReservations(memberId);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const toast = useToast();

  const handleCancel = async (reservationId: string) => {
    setCancellingId(reservationId);
    try {
      const result = await gymService.cancelReservation(reservationId, 'client');
      if (result.success) {
        toast.success(result.message || 'Reserva cancelada');
        onCreditChange?.();
        refresh();
      } else {
        toast.error(result.error || 'Error al cancelar');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
    setCancellingId(null);
  };

  const items = tab === 'upcoming' ? upcoming : past;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setTab('upcoming')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'upcoming' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
          Proximas
        </button>
        <button onClick={() => setTab('past')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'past' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
          Historial
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Nada por aqui</h3>
          <p className="text-gray-500 text-sm">
            {tab === 'upcoming' ? 'El listado de reservas esta vacio. Quieres hacer una nueva reserva?' : 'No hay reservas pasadas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(r => {
            const slot = r.class_slot;
            return (
              <div key={r.id} className="p-4 bg-white rounded-xl border">
                <div className="flex items-center gap-3">
                  <div
                    className="w-1 h-10 rounded-full"
                    style={{ backgroundColor: slot?.service_type?.color || '#3B82F6' }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{slot?.title || slot?.service_type?.name || 'Clase'}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span>{slot?.date ? new Date(slot.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}</span>
                      <span><Clock className="w-3 h-3 inline" /> {slot?.start_time?.slice(0, 5)}</span>
                    </div>
                  </div>

                  {tab === 'upcoming' && r.status === 'confirmed' && (
                    <button
                      onClick={() => handleCancel(r.id)}
                      disabled={cancellingId === r.id}
                      className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      {cancellingId === r.id ? '...' : 'Cancelar'}
                    </button>
                  )}
                  {r.status === 'waitlisted' && (
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">En espera #{r.waitlist_position}</span>
                  )}
                  {r.status === 'cancelled' && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full">Cancelada</span>
                  )}
                  {r.status === 'attended' && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full"><Check className="w-3 h-3 inline" /> Asistio</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GymReservationsView;

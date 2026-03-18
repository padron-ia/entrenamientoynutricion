import React, { useState } from 'react';
import { useGymSchedule } from '../hooks/useGymSchedule';
import { gymService } from '../../../services/gymService';
import type { GymClassSlot } from '../../../types';
import { ChevronLeft, ChevronRight, Clock, Users, Check, AlertCircle } from 'lucide-react';
import { useToast } from '../../ToastProvider';

interface GymScheduleViewProps {
  memberId: string;
  onCreditChange?: () => void;
}

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const GymScheduleView: React.FC<GymScheduleViewProps> = ({ memberId, onCreditChange }) => {
  const { weekDates, slotsByDay, isLoading, navigateWeek, goToThisWeek, refresh } = useGymSchedule(memberId);
  const [selectedSlot, setSelectedSlot] = useState<GymClassSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const toast = useToast();

  const today = new Date().toISOString().split('T')[0];

  const handleBook = async () => {
    if (!selectedSlot) return;
    setIsBooking(true);
    try {
      const result = await gymService.bookClass(memberId, selectedSlot.id);
      if (result.success) {
        toast.success(result.message || 'Reserva confirmada');
        onCreditChange?.();
      } else {
        toast.error(result.error || 'Error al reservar');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al reservar');
    }
    setIsBooking(false);
    setSelectedSlot(null);
    refresh();
  };

  const handleCancel = async () => {
    if (!selectedSlot?.user_reservation_id) return;
    setIsCancelling(true);
    try {
      const result = await gymService.cancelReservation(selectedSlot.user_reservation_id, 'client');
      if (result.success) {
        if (result.credit_returned) {
          toast.success('Reserva cancelada. Credito devuelto.');
        } else {
          toast.success('Reserva cancelada. El credito no ha sido devuelto (menos de 5h).');
        }
        onCreditChange?.();
      } else {
        toast.error(result.error || 'Error al cancelar');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al cancelar');
    }
    setIsCancelling(false);
    setSelectedSlot(null);
    refresh();
  };

  const weekLabel = `${weekDates[0].getDate()}/${weekDates[0].getMonth() + 1} - ${weekDates[6].getDate()}/${weekDates[6].getMonth() + 1}`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold">Horario</h2>
          <p className="text-sm text-gray-500">{weekLabel}</p>
        </div>
        <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Selector de dia */}
      <div className="flex gap-2 justify-center mb-4">
        {weekDates.map((d, i) => {
          const dateStr = d.toISOString().split('T')[0];
          const isToday = dateStr === today;
          const daySlots = slotsByDay[dateStr] || [];
          return (
            <button
              key={dateStr}
              onClick={goToThisWeek}
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold transition ${
                isToday
                  ? 'bg-blue-600 text-white'
                  : daySlots.length > 0
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-gray-50 text-gray-400'
              }`}
            >
              {DAYS[i]}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {weekDates.map(d => {
            const dateStr = d.toISOString().split('T')[0];
            const daySlots = slotsByDay[dateStr] || [];
            if (daySlots.length === 0) return null;

            return daySlots.map(slot => {
              const spotsLeft = slot.capacity - (slot.current_bookings || 0);
              const isBooked = slot.user_reservation_status === 'confirmed';
              const isWaitlisted = slot.user_reservation_status === 'waitlisted';
              const isPast = dateStr < today;

              return (
                <div
                  key={slot.id}
                  onClick={() => !isPast && slot.service_type?.is_bookable_by_client !== false && setSelectedSlot(slot)}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition ${
                    isPast ? 'opacity-50 cursor-default' :
                    isBooked ? 'bg-blue-50 border-blue-200 cursor-pointer' :
                    isWaitlisted ? 'bg-yellow-50 border-yellow-200 cursor-pointer' :
                    'bg-white hover:shadow-sm cursor-pointer'
                  }`}
                >
                  <div className="text-center min-w-[50px]">
                    <div className="text-sm font-medium text-gray-900">{slot.start_time?.slice(0, 5)}</div>
                    <div className="text-xs text-gray-400">{slot.end_time?.slice(0, 5)}</div>
                  </div>
                  <div
                    className="w-1 h-10 rounded-full"
                    style={{ backgroundColor: slot.service_type?.color || '#3B82F6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {slot.title || slot.service_type?.name}
                    </div>
                    {slot.coach_name && (
                      <div className="text-xs text-gray-500">{slot.coach_name}</div>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    {isBooked ? (
                      <span className="text-blue-600 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Reservado
                      </span>
                    ) : isWaitlisted ? (
                      <span className="text-yellow-600 font-medium">En espera</span>
                    ) : spotsLeft > 0 ? (
                      <span className={`${spotsLeft <= 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {spotsLeft} {spotsLeft === 1 ? 'plaza' : 'plazas'}
                      </span>
                    ) : (
                      <span className="text-red-500">Lleno</span>
                    )}
                  </div>
                </div>
              );
            });
          })}

          {Object.keys(slotsByDay).every(k => slotsByDay[k].length === 0) && (
            <div className="text-center py-12 text-gray-400">
              <p>No hay clases programadas esta semana</p>
            </div>
          )}
        </div>
      )}

      {/* Modal reservar / cancelar */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">
              {selectedSlot.title || selectedSlot.service_type?.name}
            </h3>
            <div className="text-sm text-gray-500 space-y-1 mb-4">
              <p><Clock className="w-4 h-4 inline mr-1" />{selectedSlot.start_time?.slice(0, 5)} - {selectedSlot.end_time?.slice(0, 5)}</p>
              <p>{new Date(selectedSlot.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <p><Users className="w-4 h-4 inline mr-1" />{selectedSlot.current_bookings || 0} / {selectedSlot.capacity} plazas</p>
              {selectedSlot.coach_name && <p>Entrenador: {selectedSlot.coach_name}</p>}
            </div>

            {selectedSlot.user_reservation_status === 'confirmed' || selectedSlot.user_reservation_status === 'waitlisted' ? (
              <>
                <div className="bg-yellow-50 p-3 rounded-lg mb-4 text-sm">
                  <AlertCircle className="w-4 h-4 inline mr-1 text-yellow-600" />
                  Si cancelas con menos de 5 horas de antelacion, el credito no se devuelve.
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedSlot(null)} className="flex-1 px-4 py-3 border rounded-xl hover:bg-gray-50">
                    Volver
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                  >
                    {isCancelling ? 'Cancelando...' : 'Cancelar Reserva'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => setSelectedSlot(null)} className="flex-1 px-4 py-3 border rounded-xl hover:bg-gray-50">
                  Volver
                </button>
                <button
                  onClick={handleBook}
                  disabled={isBooking}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {isBooking ? 'Reservando...' : selectedSlot.is_full ? 'Unirse a lista de espera' : 'Confirmar Reserva'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GymScheduleView;

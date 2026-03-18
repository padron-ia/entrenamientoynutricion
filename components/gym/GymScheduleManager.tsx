import React, { useState, useEffect, useMemo } from 'react';
import { gymService } from '../../services/gymService';
import type { GymClassSlot, GymServiceType, User } from '../../types';
import {
  Calendar, Plus, Edit, Trash2, Save, X, ChevronLeft, ChevronRight,
  Copy, Users, Clock, AlertCircle
} from 'lucide-react';
import { useToast } from '../ToastProvider';

interface GymScheduleManagerProps {
  currentUser: User;
}

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

const GymScheduleManager: React.FC<GymScheduleManagerProps> = ({ currentUser }) => {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [slots, setSlots] = useState<GymClassSlot[]>([]);
  const [serviceTypes, setServiceTypes] = useState<GymServiceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<GymClassSlot> | null>(null);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [slotDetail, setSlotDetail] = useState<GymClassSlot | null>(null);
  const toast = useToast();

  const weekDates = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart.getTime()]
  );

  useEffect(() => {
    gymService.getServiceTypes().then(setServiceTypes);
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [weekStart.getTime()]);

  const fetchSlots = async () => {
    setIsLoading(true);
    try {
      const data = await gymService.getClassSlotsWithBookings(
        formatDate(weekDates[0]),
        formatDate(weekDates[6])
      );
      setSlots(data);
    } catch (e: any) {
      toast.error('Error cargando horario');
    }
    setIsLoading(false);
  };

  const slotsByDay = useMemo(() => {
    const map: Record<string, GymClassSlot[]> = {};
    weekDates.forEach(d => { map[formatDate(d)] = []; });
    slots.forEach(s => {
      if (map[s.date]) map[s.date].push(s);
    });
    return map;
  }, [slots, weekDates]);

  const navigateWeek = (dir: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d);
  };

  const handleCreateSlot = (date: Date) => {
    setEditing({
      date: formatDate(date),
      start_time: '09:00',
      end_time: '10:00',
      capacity: 6,
      service_type_id: serviceTypes[0]?.id || '',
      coach_id: currentUser.id,
    });
  };

  const handleSaveSlot = async () => {
    if (!editing) return;
    if (!editing.service_type_id || !editing.date || !editing.start_time || !editing.end_time) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    try {
      if (editing.id) {
        await gymService.updateClassSlot(editing.id, editing);
        toast.success('Clase actualizada');
      } else {
        await gymService.createClassSlot(editing);
        toast.success('Clase creada');
      }
      setEditing(null);
      fetchSlots();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      await gymService.deleteClassSlot(id);
      toast.success('Clase eliminada');
      fetchSlots();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar');
    }
  };

  const handleDuplicateWeek = async () => {
    try {
      const nextWeek = new Date(weekStart);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const count = await gymService.duplicateWeekSchedule(formatDate(weekStart), formatDate(nextWeek));
      toast.success(`${count} clases copiadas a la semana siguiente`);
      setShowDuplicate(false);
    } catch (e: any) {
      toast.error(e.message || 'Error al duplicar');
    }
  };

  const weekLabel = `${weekDates[0].getDate()}/${weekDates[0].getMonth() + 1} - ${weekDates[6].getDate()}/${weekDates[6].getMonth() + 1}/${weekDates[6].getFullYear()}`;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horario Semanal</h1>
          <p className="text-gray-500 mt-1">Gestiona las clases de la semana</p>
        </div>
        <button
          onClick={() => setShowDuplicate(true)}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
        >
          <Copy className="w-4 h-4" /> Duplicar semana
        </button>
      </div>

      {/* Navegacion semanal */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-medium text-lg">{weekLabel}</span>
        <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight className="w-5 h-5" />
        </button>
        <button onClick={() => setWeekStart(getMonday(new Date()))} className="text-sm text-blue-600 hover:underline ml-2">
          Hoy
        </button>
      </div>

      {/* Grid semanal */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, i) => {
            const dateStr = formatDate(date);
            const daySlots = slotsByDay[dateStr] || [];
            const isToday = formatDate(new Date()) === dateStr;

            return (
              <div key={dateStr} className={`min-h-[200px] rounded-xl border p-2 ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-center">
                    <div className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>{DAYS[i]}</div>
                    <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>{date.getDate()}</div>
                  </div>
                  <button
                    onClick={() => handleCreateSlot(date)}
                    className="p-1 hover:bg-blue-100 rounded-lg text-blue-600"
                    title="Anadir clase"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  {daySlots.map(s => (
                    <div
                      key={s.id}
                      onClick={() => setSlotDetail(s)}
                      className={`p-2 rounded-lg text-xs cursor-pointer hover:opacity-80 transition ${s.is_cancelled ? 'opacity-40 line-through' : ''}`}
                      style={{ backgroundColor: (s.service_type?.color || '#3B82F6') + '20', borderLeft: `3px solid ${s.service_type?.color || '#3B82F6'}` }}
                    >
                      <div className="font-medium text-gray-900 truncate">
                        {s.title || s.service_type?.name || 'Clase'}
                      </div>
                      <div className="text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                      </div>
                      <div className="text-gray-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {s.current_bookings || 0}/{s.capacity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal edicion de slot */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editing.id ? 'Editar Clase' : 'Nueva Clase'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de servicio</label>
                <select
                  value={editing.service_type_id || ''}
                  onChange={e => setEditing({ ...editing, service_type_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Seleccionar...</option>
                  {serviceTypes.filter(s => s.is_active).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titulo (opcional, sobreescribe nombre del servicio)</label>
                <input
                  type="text"
                  value={editing.title || ''}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Dejar vacio para usar nombre del servicio"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={editing.date || ''}
                  onChange={e => setEditing({ ...editing, date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
                  <input
                    type="time"
                    value={editing.start_time || ''}
                    onChange={e => setEditing({ ...editing, start_time: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin</label>
                  <input
                    type="time"
                    value={editing.end_time || ''}
                    onChange={e => setEditing({ ...editing, end_time: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aforo maximo</label>
                <input
                  type="number"
                  min="1"
                  value={editing.capacity || ''}
                  onChange={e => setEditing({ ...editing, capacity: parseInt(e.target.value) || 1 })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
                <input
                  type="text"
                  value={editing.notes || ''}
                  onChange={e => setEditing({ ...editing, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSaveSlot} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Save className="w-4 h-4 inline mr-1" /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle de slot */}
      {slotDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{slotDetail.title || slotDetail.service_type?.name}</h2>
              <button onClick={() => setSlotDetail(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p><Clock className="w-4 h-4 inline mr-1" />{slotDetail.start_time?.slice(0, 5)} - {slotDetail.end_time?.slice(0, 5)}</p>
              <p><Calendar className="w-4 h-4 inline mr-1" />{slotDetail.date}</p>
              <p><Users className="w-4 h-4 inline mr-1" />{slotDetail.current_bookings || 0} / {slotDetail.capacity} plazas</p>
              {slotDetail.coach_name && <p>Entrenador: {slotDetail.coach_name}</p>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setEditing(slotDetail); setSlotDetail(null); }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1"
              >
                <Edit className="w-4 h-4" /> Editar
              </button>
              <button
                onClick={() => { handleDeleteSlot(slotDetail.id); setSlotDetail(null); }}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal duplicar semana */}
      {showDuplicate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <Copy className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Duplicar semana</h3>
            <p className="text-gray-500 mb-4">Se copiaran {slots.length} clases de esta semana a la semana siguiente.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDuplicate(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleDuplicateWeek} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Duplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GymScheduleManager;

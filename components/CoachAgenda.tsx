import React, { useMemo, useState } from 'react';
import { Client, User, UserRole } from '../types';
import {
  Calendar, Clock, User as UserIcon, ChevronRight, Search, Filter,
  CheckCircle2, XCircle, Video, ExternalLink, ChevronLeft, FileText,
  Phone, AlertTriangle
} from 'lucide-react';
import { normalizeRole } from '../utils/roleUtils';

interface CoachAgendaProps {
  clients: Client[];
  user: User;
  onNavigateToClient: (client: Client) => void;
}

const CoachAgenda: React.FC<CoachAgendaProps> = ({ clients, user, onNavigateToClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCoach, setFilterCoach] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = next, -1 = prev

  const userRole = normalizeRole(user.role);
  const hasFullVisibility = userRole === 'admin' || userRole === 'head_coach';

  // Helper to get YYYY-MM-DD in local timezone (avoids UTC shift from toISOString)
  const toLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Base filtered clients with appointments
  const allAppointmentClients = useMemo(() => {
    let filtered = clients.filter(c => c.next_appointment_date);

    if (!hasFullVisibility) {
      const coachIdOrName = (user.name || '').toLowerCase();
      filtered = filtered.filter(c => {
        const cId = (c.coach_id || '').toLowerCase();
        return cId === coachIdOrName || cId === user.id.toLowerCase();
      });
    }

    if (filterCoach !== 'all') {
      filtered = filtered.filter(c => (c.coach_id || '').toLowerCase() === filterCoach.toLowerCase());
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        filtered = filtered.filter(c => !c.next_appointment_status || c.next_appointment_status === 'scheduled');
      } else {
        filtered = filtered.filter(c => c.next_appointment_status === filterStatus);
      }
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        `${c.firstName} ${c.surname}`.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      const dateA = a.next_appointment_date || '';
      const dateB = b.next_appointment_date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = a.next_appointment_time || '00:00';
      const timeB = b.next_appointment_time || '00:00';
      return timeA.localeCompare(timeB);
    });

    return filtered;
  }, [clients, user, hasFullVisibility, filterCoach, filterStatus, searchTerm]);

  // Coaches list for filter (use property_coach name, fallback to coach_id)
  const coachNameMap = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach(c => {
      if (c.coach_id) {
        map.set(c.coach_id, c.property_coach || c.coach_id);
      }
    });
    return map;
  }, [clients]);

  const resolveCoachName = (client: Client) => client.property_coach || coachNameMap.get(client.coach_id) || client.coach_id;

  const coaches = useMemo(() => {
    if (!hasFullVisibility) return [];
    const map = new Map<string, string>(); // id -> name
    clients.filter(c => c.next_appointment_date && c.coach_id).forEach(c => {
      map.set(c.coach_id!, c.property_coach || c.coach_id!);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [clients, hasFullVisibility]);

  // Date helpers
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayStr = toLocalDateStr(today);

  // Week range based on offset
  const weekRange = useMemo(() => {
    const monday = new Date(today);
    const dayOfWeek = monday.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(monday.getDate() + diff + (weekOffset * 7));

    const days: { date: Date; dateStr: string; isToday: boolean; isPast: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const dateStr = toLocalDateStr(d);
      days.push({
        date: d,
        dateStr,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr
      });
    }
    return days;
  }, [today, todayStr, weekOffset]);

  // Week label
  const weekLabel = useMemo(() => {
    const start = weekRange[0].date;
    const end = weekRange[6].date;
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
      return `${start.getDate()} - ${end.getDate()} ${end.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
    }
    return `${start.getDate()} ${start.toLocaleDateString('es-ES', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;
  }, [weekRange]);

  // Appointments grouped by day for the current week view
  const weekAppointments = useMemo(() => {
    const map = new Map<string, Client[]>();
    for (const day of weekRange) {
      map.set(day.dateStr, []);
    }
    for (const c of allAppointmentClients) {
      const existing = map.get(c.next_appointment_date!);
      if (existing) existing.push(c);
    }
    return map;
  }, [allAppointmentClients, weekRange]);

  // Past unresolved appointments (before this week)
  const overdueAppointments = useMemo(() => {
    const weekStart = weekRange[0].dateStr;
    return allAppointmentClients.filter(c =>
      c.next_appointment_date! < weekStart &&
      (!c.next_appointment_status || c.next_appointment_status === 'scheduled')
    );
  }, [allAppointmentClients, weekRange]);

  // Stats
  const stats = useMemo(() => {
    const todayCount = allAppointmentClients.filter(c => c.next_appointment_date === todayStr && c.next_appointment_status !== 'completed' && c.next_appointment_status !== 'missed').length;
    const weekPending = allAppointmentClients.filter(c => {
      const inWeek = weekRange.some(d => d.dateStr === c.next_appointment_date);
      return inWeek && (!c.next_appointment_status || c.next_appointment_status === 'scheduled');
    }).length;
    const totalCompleted = allAppointmentClients.filter(c => c.next_appointment_status === 'completed').length;
    const totalPending = allAppointmentClients.filter(c => !c.next_appointment_status || c.next_appointment_status === 'scheduled').length;
    return { todayCount, weekPending, totalCompleted, totalPending };
  }, [allAppointmentClients, todayStr, weekRange]);

  const dayNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

  const isPending = (c: Client) => !c.next_appointment_status || c.next_appointment_status === 'scheduled';

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Agenda de Citas</h1>
            <p className="text-sm text-slate-500">{allAppointmentClients.length} citas en total</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-4 text-white shadow-lg">
          <p className="text-rose-200 text-[10px] font-bold uppercase tracking-widest">Hoy</p>
          <p className="text-3xl font-black mt-1">{stats.todayCount}</p>
          <p className="text-rose-200 text-xs mt-0.5">pendientes</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 text-white shadow-lg">
          <p className="text-amber-200 text-[10px] font-bold uppercase tracking-widest">Esta semana</p>
          <p className="text-3xl font-black mt-1">{stats.weekPending}</p>
          <p className="text-amber-200 text-xs mt-0.5">por realizar</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-4 text-white shadow-lg">
          <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-widest">Realizadas</p>
          <p className="text-3xl font-black mt-1">{stats.totalCompleted}</p>
          <p className="text-emerald-200 text-xs mt-0.5">completadas</p>
        </div>
        <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl p-4 text-white shadow-lg">
          <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Pendientes</p>
          <p className="text-3xl font-black mt-1">{stats.totalPending}</p>
          <p className="text-slate-300 text-xs mt-0.5">sin resolver</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'Todas', activeClass: 'bg-slate-800 text-white' },
            { key: 'pending', label: 'Pendientes', activeClass: 'bg-amber-500 text-white' },
            { key: 'completed', label: 'Realizadas', activeClass: 'bg-green-500 text-white' },
            { key: 'missed', label: 'No asistió', activeClass: 'bg-red-500 text-white' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === tab.key ? tab.activeClass : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
            />
          </div>
          {hasFullVisibility && coaches.length > 0 && (
            <select
              value={filterCoach}
              onChange={e => setFilterCoach(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
            >
              <option value="all">Todos</option>
              {coaches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ===== CALENDAR VIEW (for 'all' and 'pending') ===== */}
      {(filterStatus === 'all' || filterStatus === 'pending') ? (
        <>
          {/* Overdue alert */}
          {overdueAppointments.length > 0 && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-sm font-black text-red-800 uppercase tracking-wide">
                  {overdueAppointments.length} cita{overdueAppointments.length > 1 ? 's' : ''} sin resolver
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {overdueAppointments.map(c => (
                  <div
                    key={c.id}
                    onClick={() => onNavigateToClient(c)}
                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-red-100 cursor-pointer hover:shadow-sm transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-black text-sm shrink-0">
                      {(c.firstName || '?')[0]}{(c.surname || '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-red-800 truncate">{c.firstName} {c.surname}</p>
                      <p className="text-[10px] text-red-500">
                        {new Date(c.next_appointment_date!).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        {c.next_appointment_time && ` · ${c.next_appointment_time}h`}
                      </p>
                      {hasFullVisibility && c.coach_id && (
                        <p className="text-[10px] font-bold text-purple-600 flex items-center gap-1 mt-0.5">
                          <UserIcon className="w-3 h-3" /> {resolveCoachName(c)}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-300 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Week navigation */}
          <div className="flex items-center justify-between mb-4 bg-white rounded-xl border border-slate-200 p-2">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="text-center">
              <p className="text-sm font-black text-slate-800 capitalize">{weekLabel}</p>
              {weekOffset !== 0 && (
                <button onClick={() => setWeekOffset(0)} className="text-[10px] text-amber-600 font-bold hover:underline">
                  Ir a esta semana
                </button>
              )}
            </div>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Week day-by-day view */}
          <div className="space-y-3">
            {weekRange.map(day => {
              const appts = weekAppointments.get(day.dateStr) || [];
              const pendingCount = appts.filter(isPending).length;
              const isEmpty = appts.length === 0;
              const dayName = dayNames[day.date.getDay()];

              return (
                <div
                  key={day.dateStr}
                  className={`rounded-2xl border-2 overflow-hidden transition-all ${
                    day.isToday ? 'border-amber-300 shadow-lg shadow-amber-100/50' :
                    day.isPast ? 'border-slate-100 opacity-60' : 'border-slate-200'
                  }`}
                >
                  {/* Day header */}
                  <div className={`flex items-center justify-between px-5 py-3 ${
                    day.isToday ? 'bg-gradient-to-r from-amber-50 to-orange-50' :
                    day.isPast ? 'bg-slate-50' : 'bg-white'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-black leading-none ${
                        day.isToday ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md' :
                        day.isPast ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <span className="text-[9px] uppercase tracking-wider">{dayName}</span>
                        <span className="text-lg">{day.date.getDate()}</span>
                      </div>
                      <div>
                        <p className={`text-sm font-bold capitalize ${day.isToday ? 'text-amber-900' : 'text-slate-700'}`}>
                          {day.date.toLocaleDateString('es-ES', { weekday: 'long' })}
                          {day.isToday && <span className="ml-2 text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase">Hoy</span>}
                        </p>
                        {!isEmpty && (
                          <p className="text-xs text-slate-400">
                            {appts.length} cita{appts.length > 1 ? 's' : ''}
                            {pendingCount > 0 && pendingCount < appts.length && ` · ${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}`}
                          </p>
                        )}
                      </div>
                    </div>
                    {!isEmpty && (
                      <div className="flex gap-1">
                        {appts.filter(isPending).length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        )}
                        {appts.some(c => c.next_appointment_status === 'completed') && (
                          <span className="w-2 h-2 rounded-full bg-green-400"></span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Appointments for this day */}
                  {!isEmpty && (
                    <div className={`border-t ${day.isToday ? 'border-amber-200' : 'border-slate-100'}`}>
                      {appts.map((client, idx) => {
                        const isCompleted = client.next_appointment_status === 'completed';
                        const isMissed = client.next_appointment_status === 'missed';
                        const isScheduled = isPending(client);

                        return (
                          <div
                            key={client.id}
                            onClick={() => onNavigateToClient(client)}
                            className={`flex items-stretch cursor-pointer hover:bg-slate-50/80 transition-colors ${
                              idx < appts.length - 1 ? 'border-b border-slate-100' : ''
                            }`}
                          >
                            {/* Left color bar */}
                            <div className={`w-1 shrink-0 ${
                              isCompleted ? 'bg-green-400' : isMissed ? 'bg-red-400' :
                              day.isToday ? 'bg-amber-400' : 'bg-blue-300'
                            }`}></div>

                            {/* Time block */}
                            <div className={`w-20 shrink-0 flex flex-col items-center justify-center py-4 ${
                              isCompleted ? 'bg-green-50/50' : isMissed ? 'bg-red-50/50' : ''
                            }`}>
                              {client.next_appointment_time ? (
                                <p className={`text-xl font-black leading-none ${
                                  isCompleted ? 'text-green-600' : isMissed ? 'text-red-400 line-through' :
                                  day.isToday ? 'text-amber-600' : 'text-slate-700'
                                }`}>
                                  {client.next_appointment_time.split(':')[0]}
                                  <span className="text-sm">:{client.next_appointment_time.split(':')[1]}</span>
                                </p>
                              ) : (
                                <Clock className="w-4 h-4 text-slate-300" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 py-3 px-4 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                  isCompleted ? 'bg-green-100 text-green-700' :
                                  isMissed ? 'bg-red-100 text-red-600' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {(client.firstName || '?')[0]}{(client.surname || '?')[0]}
                                </div>
                                <p className={`font-bold truncate ${
                                  isCompleted ? 'text-green-800' : isMissed ? 'text-red-700 line-through' : 'text-slate-800'
                                }`}>
                                  {client.firstName} {client.surname}
                                </p>
                                {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                                {isMissed && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                              </div>

                              {client.next_appointment_conclusions ? (
                                <p className="text-xs text-green-600 italic truncate mb-1">"{client.next_appointment_conclusions}"</p>
                              ) : client.next_appointment_note ? (
                                <p className="text-xs text-slate-400 truncate mb-1">{client.next_appointment_note}</p>
                              ) : null}

                              <div className="flex items-center gap-2 flex-wrap">
                                {isScheduled && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">
                                    <Clock className="w-3 h-3" /> Pendiente
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-md">
                                    <CheckCircle2 className="w-3 h-3" /> Realizada
                                  </span>
                                )}
                                {isMissed && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-md">
                                    <XCircle className="w-3 h-3" /> No asistió
                                  </span>
                                )}
                                {client.next_appointment_link && isScheduled && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                                    <Video className="w-3 h-3" /> Con enlace
                                  </span>
                                )}
                                {hasFullVisibility && client.coach_id && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md">
                                    <UserIcon className="w-3 h-3" /> {resolveCoachName(client)}
                                  </span>
                                )}
                              </div>

                              {/* Conclusions in calendar view */}
                              {client.next_appointment_conclusions && (isCompleted || isMissed) && (
                                <div className={`mt-1.5 p-2 rounded-lg text-xs italic ${
                                  isCompleted ? 'bg-green-50 border border-green-100 text-green-700' : 'bg-red-50 border border-red-100 text-red-700'
                                }`}>
                                  <span className="font-bold not-italic text-[10px] uppercase tracking-wide block mb-0.5">
                                    {isCompleted ? 'Conclusiones:' : 'Motivo:'}
                                  </span>
                                  {client.next_appointment_conclusions}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center pr-4 shrink-0">
                              <ChevronRight className="w-4 h-4 text-slate-300" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isEmpty && !day.isPast && (
                    <div className="px-5 py-3 border-t border-slate-100">
                      <p className="text-xs text-slate-300 italic">Sin citas</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ===== LIST VIEW (for 'completed' and 'missed') ===== */
        <div>
          {allAppointmentClients.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              {filterStatus === 'completed' ? (
                <>
                  <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-4" />
                  <p className="text-lg font-bold text-slate-400">No hay citas realizadas</p>
                </>
              ) : (
                <>
                  <XCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
                  <p className="text-lg font-bold text-slate-400">No hay citas con ausencia</p>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className={`px-5 py-3 border-b ${filterStatus === 'completed' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                <p className={`text-sm font-black uppercase tracking-wide ${filterStatus === 'completed' ? 'text-green-800' : 'text-red-800'}`}>
                  {allAppointmentClients.length} {filterStatus === 'completed' ? 'cita' : 'ausencia'}{allAppointmentClients.length > 1 ? 's' : ''}
                </p>
              </div>
              {[...allAppointmentClients].reverse().map((client, idx) => (
                <div
                  key={client.id}
                  onClick={() => onNavigateToClient(client)}
                  className={`flex items-stretch cursor-pointer hover:bg-slate-50 transition-colors ${
                    idx < allAppointmentClients.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  {/* Left bar */}
                  <div className={`w-1 shrink-0 ${filterStatus === 'completed' ? 'bg-green-400' : 'bg-red-400'}`}></div>

                  {/* Date block */}
                  <div className="w-20 shrink-0 flex flex-col items-center justify-center py-4 bg-slate-50/50">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      {new Date(client.next_appointment_date!).toLocaleDateString('es-ES', { weekday: 'short' })}
                    </p>
                    <p className="text-lg font-black text-slate-700 leading-none">
                      {new Date(client.next_appointment_date!).getDate()}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(client.next_appointment_date!).toLocaleDateString('es-ES', { month: 'short' })}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="flex-1 py-3 px-4 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        filterStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {(client.firstName || '?')[0]}{(client.surname || '?')[0]}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold truncate ${filterStatus === 'completed' ? 'text-slate-800' : 'text-slate-600'}`}>
                          {client.firstName} {client.surname}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(client.next_appointment_date!).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                          {client.next_appointment_time && ` · ${client.next_appointment_time}h`}
                        </p>
                      </div>
                    </div>

                    {client.next_appointment_conclusions && (
                      <div className={`mt-2 p-2.5 rounded-lg ${filterStatus === 'completed' ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                        <p className={`text-xs italic ${filterStatus === 'completed' ? 'text-green-700' : 'text-red-700'}`}>
                          "{client.next_appointment_conclusions}"
                        </p>
                      </div>
                    )}

                    {!client.next_appointment_conclusions && client.next_appointment_note && (
                      <p className="text-xs text-slate-400 mt-1">{client.next_appointment_note}</p>
                    )}

                    {hasFullVisibility && client.coach_id && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md mt-1.5">
                        <UserIcon className="w-3 h-3" /> {resolveCoachName(client)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center pr-4 shrink-0">
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CoachAgenda;

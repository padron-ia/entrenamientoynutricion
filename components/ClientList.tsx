
import React, { useState, useMemo, useEffect } from 'react';
import { Client, ClientStatus, UserRole, User } from '../types';
import {
  Search, Filter, PlayCircle, PauseCircle, XCircle, ChevronRight,
  Users, UserCheck, UserMinus, Clock, AlertOctagon, TrendingUp,
  Activity, Briefcase, Calendar, Heart, LayoutGrid, List,
  Droplets, Scale, ClipboardCheck, AlertCircle, Sparkles
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import ClientCard from './ClientCard';

interface ClientListProps {
  clients: Client[];
  currentUser: User;
  onUpdateStatus: (clientId: string, status: ClientStatus, additionalData?: Partial<Client>) => void;
  onSelectClient: (client: Client) => void;
  isLoading: boolean;
  initialFilter?: string | null;
  onFilterChange?: () => void;
  coaches?: User[];
}

const ClientList: React.FC<ClientListProps> = ({ clients, currentUser, onUpdateStatus, onSelectClient, isLoading, initialFilter, onFilterChange, coaches = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [coachFilter, setCoachFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Helper to resolve coach name
  const getCoachName = (id: string | null | undefined): string => {
    if (!id || id === 'Sin Asignar') return 'Sin Asignar';

    // 1. Buscar en la lista de coaches (source of truth)
    const coach = coaches.find(u => u.id === id);
    if (coach) return coach.name;

    // 2. Mapa estático de emergencia para IDs conocidos
    const coachNameMap: Record<string, string> = {
      'dec087e2-3bf5-43c7-8561-d22c049948db': 'Jesús',
      '0cfcb072-ae4c-4b33-a96d-f3aa8b5aeb62': 'Helena',
      '5d5bbbed-cbc0-495c-ac6f-3e56bf5ffe54': 'Álvaro',
      'e59de5e3-f962-48be-8392-04d9d59ba87d': 'Esperanza',
      'a2911cd6-e5c0-4fd3-8047-9f7f003e1d28': 'Juan',
      '19657835-6fb4-4783-9b37-1be1d556c42d': 'Victoria'
    };

    if (coachNameMap[id]) return coachNameMap[id];

    // 3. Si el ID no parece un UUID, tratarlo como nombre (denormalizado)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUUID) return id;

    return 'Sin Asignar';
  };

  const [clientsWithPendingSurvey, setClientsWithPendingSurvey] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initialFilter) {
      const filterMap: Record<string, ClientStatus | 'all'> = {
        'active': ClientStatus.ACTIVE,
        'paused': ClientStatus.PAUSED,
        'inactive': ClientStatus.INACTIVE,
        'dropout': ClientStatus.DROPOUT,
        'all': 'all'
      };
      setStatusFilter(filterMap[initialFilter] || 'all');
    }
  }, [initialFilter]);

  useEffect(() => {
    const loadPendingSurveys = async () => {
      const { data } = await supabase
        .from('optimization_surveys')
        .select('client_id')
        .is('reviewed_at', null);
      if (data) setClientsWithPendingSurvey(new Set(data.map(s => s.client_id)));
    };
    loadPendingSurveys();
  }, []);

  const handleStatusFilterChange = (newFilter: ClientStatus | 'all') => {
    setStatusFilter(newFilter);
    if (onFilterChange) onFilterChange();
  };

  const uniqueCoaches = useMemo(() => {
    // Usar coach_id (UUID) para el filtrado, es más estable que el nombre
    const coachSet = new Set(clients.map(c => c.coach_id).filter(Boolean));
    return Array.from(coachSet).sort();
  }, [clients]);

  const baseFilteredClients = useMemo(() => {
    const filtered = clients.filter(client => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCoach =
        currentUser.role === UserRole.COACH
          ? true
          : coachFilter === 'all' || client.coach_id === coachFilter;

      return matchesSearch && matchesCoach;
    });

    return filtered.sort((a, b) => {
      const aIsActive = a.status === ClientStatus.ACTIVE;
      const bIsActive = b.status === ClientStatus.ACTIVE;
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      const dateA = new Date(a.start_date || a.created_at || 0).getTime();
      const dateB = new Date(b.start_date || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [clients, searchTerm, coachFilter, currentUser.role]);

  const stats = useMemo(() => {
    const calculationDate = new Date();
    const currentMonth = calculationDate.getMonth();
    const currentYear = calculationDate.getFullYear();

    const isCurrentMonth = (dateStr?: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };

    return {
      active: baseFilteredClients.filter(c => c.status === ClientStatus.ACTIVE).length,
      paused: baseFilteredClients.filter(c => c.status === ClientStatus.PAUSED).length,
      inactive: baseFilteredClients.filter(c => c.status === ClientStatus.INACTIVE && isCurrentMonth(c.inactiveDate)).length,
      dropout: baseFilteredClients.filter(c => c.status === ClientStatus.DROPOUT && isCurrentMonth(c.abandonmentDate)).length,
      total: baseFilteredClients.length
    };
  }, [baseFilteredClients]);

  const finalDisplayClients = baseFilteredClients.filter(client => {
    return statusFilter === 'all' || client.status === statusFilter;
  });

  const getStatusColor = (status: ClientStatus) => {
    switch (status) {
      case ClientStatus.ACTIVE: return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      case ClientStatus.INACTIVE: return 'bg-slate-100 text-slate-600 ring-slate-500/10';
      case ClientStatus.PAUSED: return 'bg-amber-50 text-amber-700 ring-amber-600/20';
      case ClientStatus.DROPOUT: return 'bg-rose-50 text-rose-700 ring-rose-600/20';
      case ClientStatus.COMPLETED: return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: ClientStatus) => {
    switch (status) {
      case ClientStatus.ACTIVE: return 'Activo';
      case ClientStatus.INACTIVE: return 'Baja';
      case ClientStatus.PAUSED: return 'Pausado';
      case ClientStatus.DROPOUT: return 'Abandono';
      case ClientStatus.COMPLETED: return 'Completado';
    }
  };

  // --- Helpers for enriched columns ---
  const getCyclePhase = (client: Client) => {
    if (!client.hormonal_status || client.hormonal_status === 'menopausica') return null;
    if (!client.last_period_start_date) return null;
    const cycleLength = client.average_cycle_length || 28;
    const daysSince = Math.floor((Date.now() - new Date(client.last_period_start_date).getTime()) / (1000 * 60 * 60 * 24));
    const dayInCycle = (daysSince % cycleLength) + 1;
    if (dayInCycle <= 5) return { name: 'Menstrual', color: 'bg-red-100 text-red-700', day: dayInCycle };
    if (dayInCycle <= Math.floor(cycleLength * 0.46)) return { name: 'Folicular', color: 'bg-green-100 text-green-700', day: dayInCycle };
    if (dayInCycle <= Math.floor(cycleLength * 0.57)) return { name: 'Ovulación', color: 'bg-blue-100 text-blue-700', day: dayInCycle };
    return { name: 'Lútea', color: 'bg-amber-100 text-amber-700', day: dayInCycle };
  };

  const getCheckinInfo = (client: Client) => {
    if (!client.last_checkin_submitted) return { label: 'Sin envíos', dot: 'bg-slate-300', text: 'text-slate-400' };
    const d = new Date(client.last_checkin_submitted);
    const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    if (client.last_checkin_status === 'pending_review') return { label, dot: 'bg-amber-400', text: 'text-amber-600' };
    return { label, dot: 'bg-green-400', text: 'text-green-600' };
  };

  // Premium Stat Card Component
  const StatCard = ({
    label,
    count,
    icon: Icon,
    filterValue,
    gradient,
    isActive
  }: {
    label: string,
    count: number,
    icon: any,
    filterValue: ClientStatus | 'all',
    gradient: string,
    isActive: boolean
  }) => {
    return (
      <button
        onClick={() => handleStatusFilterChange(filterValue)}
        className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 transform hover:scale-[1.02] ${isActive
          ? `bg-gradient-to-br ${gradient} text-white shadow-lg`
          : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md'
          }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
              {label}
            </p>
            <p className={`text-3xl font-black ${isActive ? 'text-white' : 'text-slate-800'}`}>
              {count}
            </p>
          </div>
          <div className={`p-3 rounded-xl ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
          </div>
        </div>
        {isActive && (
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      {/* Premium Header */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-white flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                  <Users className="w-7 h-7" />
                </div>
                Cartera de Clientes
              </h1>
              <p className="text-slate-400 mt-2 text-sm">
                Gestiona y visualiza todos tus clientes en un solo lugar
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10">
                <p className="text-xs text-slate-400 font-medium">Total Cartera</p>
                <p className="text-2xl font-black text-white">{stats.total}</p>
              </div>
              <div className="bg-emerald-500/20 backdrop-blur-sm rounded-2xl px-5 py-3 border border-emerald-500/30">
                <p className="text-xs text-emerald-300 font-medium">Tasa Retención</p>
                <p className="text-2xl font-black text-emerald-400">
                  {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-6 bg-slate-50/50">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Activos"
              count={stats.active}
              icon={UserCheck}
              filterValue={ClientStatus.ACTIVE}
              gradient="from-emerald-500 to-emerald-600"
              isActive={statusFilter === ClientStatus.ACTIVE}
            />
            <StatCard
              label="En Pausa"
              count={stats.paused}
              icon={Clock}
              filterValue={ClientStatus.PAUSED}
              gradient="from-amber-500 to-orange-500"
              isActive={statusFilter === ClientStatus.PAUSED}
            />
            <StatCard
              label="Bajas (Mes)"
              count={stats.inactive}
              icon={UserMinus}
              filterValue={ClientStatus.INACTIVE}
              gradient="from-slate-500 to-slate-600"
              isActive={statusFilter === ClientStatus.INACTIVE}
            />
            <StatCard
              label="Abandonos (Mes)"
              count={stats.dropout}
              icon={AlertOctagon}
              filterValue={ClientStatus.DROPOUT}
              gradient="from-rose-500 to-rose-600"
              isActive={statusFilter === ClientStatus.DROPOUT}
            />
          </div>
        </div>
      </div>

      {/* Filters & Table Container */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        {/* Filters Bar */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
            <div className="flex items-center gap-3">
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              <span className="text-sm text-slate-500 font-medium">
                {finalDisplayClients.length} clientes
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
              {/* Search */}
              <div className="relative group flex-1 sm:flex-none">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-72 pl-11 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                />
              </div>

              {/* Coach Filter */}
              {currentUser.role === UserRole.ADMIN && (
                <div className="relative flex-1 sm:flex-none">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={coachFilter}
                    onChange={(e) => setCoachFilter(e.target.value)}
                    className="w-full sm:w-48 pl-11 pr-4 py-3 text-sm border border-slate-200 rounded-xl appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer font-medium"
                  >
                    <option value="all">Todos los Coaches</option>
                    {uniqueCoaches.map(coachId => (
                      <option key={coachId} value={coachId}>{getCoachName(coachId)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Filter */}
              <div className="relative flex-1 sm:flex-none">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value as ClientStatus | 'all')}
                  className="w-full sm:w-48 pl-11 pr-4 py-3 text-sm border border-slate-200 rounded-xl appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer font-medium"
                >
                  <option value="all">Todos los estados</option>
                  <option value={ClientStatus.ACTIVE}>Activos</option>
                  <option value={ClientStatus.PAUSED}>Pausados</option>
                  <option value={ClientStatus.INACTIVE}>De Baja</option>
                  <option value={ClientStatus.DROPOUT}>Abandonos</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                  {currentUser.role === UserRole.ADMIN && (
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Coach</th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contrato</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Salud</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Seguimiento</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={currentUser.role === UserRole.ADMIN ? 7 : 6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-500 font-medium">Cargando clientes...</p>
                      </div>
                    </td>
                  </tr>
                ) : finalDisplayClients.length === 0 ? (
                  <tr>
                    <td colSpan={currentUser.role === UserRole.ADMIN ? 7 : 6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-100 rounded-full">
                          <Users className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-500 font-medium">No se encontraron clientes</p>
                        <p className="text-slate-400 text-sm">Prueba ajustando los filtros de búsqueda</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  finalDisplayClients.map(client => (
                    <tr
                      key={client.id}
                      className={`group hover:bg-emerald-50/50 transition-all cursor-pointer ${client.status === ClientStatus.INACTIVE || client.status === ClientStatus.DROPOUT
                        ? 'opacity-60'
                        : ''
                        }`}
                      onClick={() => onSelectClient(client)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ${client.status === ClientStatus.ACTIVE ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                            client.status === ClientStatus.PAUSED ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                              'bg-gradient-to-br from-slate-400 to-slate-500'
                            }`}>
                            {(client.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                              {client.name}
                            </p>
                            <p className="text-xs text-slate-500">{client.email}</p>
                          </div>
                        </div>
                      </td>

                      {currentUser.role === UserRole.ADMIN && (
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                            <Briefcase className="w-3 h-3" />
                            {getCoachName(client.coach_id) || client.property_coach || 'Sin Asignar'}
                          </span>
                        </td>
                      )}

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold ring-1 ring-inset ${getStatusColor(client.status)}`}>
                          {getStatusLabel(client.status)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className={`text-sm font-medium ${client.contract_end_date && new Date(client.contract_end_date) < new Date() && client.status === ClientStatus.ACTIVE
                            ? 'text-rose-600'
                            : 'text-slate-600'
                            }`}>
                            {client.contract_end_date
                              ? new Date(client.contract_end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                              : <span className="text-slate-400 italic">Sin definir</span>
                            }
                          </span>
                        </div>
                      </td>

                      {/* Salud (enriched) */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="text-xs text-slate-600 font-medium">
                              {client.medical.diabetesType === 'N/A' ? 'No Diabético' : client.medical.diabetesType}
                            </span>
                          </div>
                          {client.medical.lastHba1c && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${parseFloat(client.medical.lastHba1c) <= 7 ? 'bg-green-100 text-green-700' :
                                parseFloat(client.medical.lastHba1c) <= 8 ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                              }`}>
                              HbA1c: {client.medical.lastHba1c}%
                            </span>
                          )}
                          {(() => {
                            const phase = getCyclePhase(client);
                            if (!phase) {
                              if (client.hormonal_status === 'menopausica') return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Menopáusica</span>;
                              return null;
                            }
                            return (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${phase.color}`}>
                                <Droplets className="w-3 h-3" /> {phase.name} (d{phase.day})
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Seguimiento */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          {(() => {
                            const ci = getCheckinInfo(client);
                            return (
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${ci.dot} shrink-0`} />
                                <span className={`text-xs font-medium ${ci.text}`}>
                                  {client.last_checkin_status === 'pending_review' ? 'Pendiente' : ci.label}
                                </span>
                              </div>
                            );
                          })()}
                          {clientsWithPendingSurvey.has(client.id) && (
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />
                              <span className="text-[10px] font-bold text-purple-600">Encuesta pendiente</span>
                            </div>
                          )}
                          {client.current_weight && (
                            <div className="flex items-center gap-1.5">
                              <Scale className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="text-xs text-slate-600 font-medium">
                                {client.current_weight}kg
                                {client.target_weight && (
                                  <span className={`ml-1 ${client.current_weight <= client.target_weight ? 'text-green-600' : 'text-slate-400'}`}>
                                    → {client.target_weight}
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectClient(client)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-medium">Cargando clientes...</p>
              </div>
            ) : finalDisplayClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="p-4 bg-slate-100 rounded-full">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">No se encontraron clientes</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {finalDisplayClients.map(client => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    currentUser={currentUser}
                    onSelectClient={onSelectClient}
                    onUpdateStatus={onUpdateStatus}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                    coachName={getCoachName(client.coach_id) || client.property_coach || 'Sin Asignar'}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Mostrando <strong className="text-slate-700">{finalDisplayClients.length}</strong> de <strong className="text-slate-700">{stats.total}</strong> clientes
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            {currentUser.role === UserRole.COACH ? '👤 Vista Coach' : '👑 Vista Administrador'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ClientList;

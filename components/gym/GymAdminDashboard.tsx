import React, { useState, useEffect } from 'react';
import { gymService } from '../../services/gymService';
import type { GymClassSlot, GymMember, User } from '../../types';
import {
  Calendar, Users, CreditCard, Clock, TrendingUp,
  ChevronRight, AlertCircle
} from 'lucide-react';

interface GymAdminDashboardProps {
  currentUser: User;
  onNavigate?: (view: string) => void;
}

const GymAdminDashboard: React.FC<GymAdminDashboardProps> = ({ currentUser, onNavigate }) => {
  const [todaySlots, setTodaySlots] = useState<(GymClassSlot & { confirmed_count: number; waitlisted_count: number })[]>([]);
  const [members, setMembers] = useState<GymMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      gymService.getOccupancyReport(today),
      gymService.getMembers(),
    ]).then(([slots, m]) => {
      setTodaySlots(slots);
      setMembers(m);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const activeMembers = members.filter(m => m.status === 'active').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Centro Presencial</h1>
        <p className="text-gray-500 mt-1">Panel de gestion del gimnasio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-white rounded-xl border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{todaySlots.length}</div>
              <div className="text-sm text-gray-500">Clases hoy</div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{activeMembers}</div>
              <div className="text-sm text-gray-500">Miembros activos</div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {todaySlots.reduce((sum, s) => sum + s.confirmed_count, 0)}
              </div>
              <div className="text-sm text-gray-500">Reservas hoy</div>
            </div>
          </div>
        </div>
      </div>

      {/* Clases de hoy */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Clases de hoy</h2>
          {onNavigate && (
            <button onClick={() => onNavigate('gym-schedule')} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Ver horario completo <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {todaySlots.length === 0 ? (
          <div className="p-8 bg-white rounded-xl border text-center text-gray-500">
            <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>No hay clases programadas para hoy</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySlots.map(s => {
              const pct = s.capacity > 0 ? Math.round((s.confirmed_count / s.capacity) * 100) : 0;
              return (
                <div key={s.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border">
                  <div
                    className="w-1 h-12 rounded-full"
                    style={{ backgroundColor: s.service_type?.color || '#3B82F6' }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{s.title || s.service_type?.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-3">
                      <span><Clock className="w-3 h-3 inline mr-1" />{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}</span>
                      {s.coach_name && <span>{s.coach_name}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${pct >= 100 ? 'text-red-600' : pct >= 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {s.confirmed_count}/{s.capacity}
                    </div>
                    <div className="text-xs text-gray-500">
                      {s.waitlisted_count > 0 && `+${s.waitlisted_count} espera`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Accesos rapidos */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Acciones rapidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Horario', icon: Calendar, view: 'gym-schedule' },
            { label: 'Bonos', icon: CreditCard, view: 'gym-bonos' },
            { label: 'Miembros', icon: Users, view: 'gym-members' },
            { label: 'Servicios', icon: AlertCircle, view: 'gym-service-types' },
          ].map(item => (
            <button
              key={item.view}
              onClick={() => onNavigate?.(item.view)}
              className="p-4 bg-white rounded-xl border hover:shadow-sm transition text-left"
            >
              <item.icon className="w-6 h-6 text-blue-600 mb-2" />
              <span className="font-medium text-gray-900">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GymAdminDashboard;

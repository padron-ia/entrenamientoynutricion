

import React, { useMemo, useState, useEffect } from 'react';
import { Client, ClientStatus, User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import {
   Users, UserPlus, UserMinus, AlertOctagon, UserCheck,
   Clock, CheckCircle2, AlertTriangle, X,
   Target, TrendingUp, TrendingDown, Activity,
   Sparkles, Zap, Award, Bell, FileText, MessageSquare, Loader, Eye, ChevronRight, Calendar, Phone, BarChart3,
   ClipboardCheck, Lightbulb, Shield, Crosshair
} from 'lucide-react';
import { CreateAnnouncement } from './MassCommunication';
import { mapRowToClient } from '../services/mockSupabase';
import { CoachTasksDashboard } from './CoachTasksDashboard';
import { StaffPerformance } from './StaffPerformance';
import { getMissingMandatoryClientFields, isMandatoryClientOnboardingEnforced } from '../utils/clientOnboardingRequirements';

interface DashboardProps {
   clients: Client[];
   user: User;
   onNavigateToClient: (client: Client) => void;
   onNavigateToView?: (view: string, filter?: string) => void;
   onRefreshData?: () => void;
}

// --- CLOCK COMPONENT ---
const ClockWidget = () => {
   const [time, setTime] = useState(new Date());

   useEffect(() => {
      const timer = setInterval(() => setTime(new Date()), 1000);
      return () => clearInterval(timer);
   }, []);

   return (
      <div className="text-right hidden sm:block bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-slate-100/50 hover:shadow-md transition-all duration-500">
         <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            {time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
         </p>
         <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 tabular-nums leading-none mt-1">
            {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
         </p>
      </div>
   );
};

const Dashboard: React.FC<DashboardProps> = ({ clients, user, onNavigateToClient, onRefreshData, onNavigateToView }) => {
   // Estado para el modal de detalle
   const [activeDetail, setActiveDetail] = useState<'expired' | 'signups' | 'churn' | 'dropouts' | 'renewals_pending' | 'renewals_done' | null>(null);
   // Estado para el modal de anuncios
   const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

   // --- NEW ASSIGNMENTS NOTIFICATION ---
   const [newAssignments, setNewAssignments] = useState<any[]>([]);
   const [dueAlerts, setDueAlerts] = useState<{ tasks: any[], tickets: any[], rejectedInvoices: any[], pendingCalls: number, pendingMonthlyReviews: number, pendingSurveys: number }>({ tasks: [], tickets: [], rejectedInvoices: [], pendingCalls: 0, pendingMonthlyReviews: 0, pendingSurveys: 0 });
   const [recentPreps, setRecentPreps] = useState<any[]>([]);

   useEffect(() => {
      if (!user?.id) return;

      // Initial check
      checkNewAssignments();
      checkDeadlines();

      // Real-time subscription for new sales
      const salesChannel = supabase
         .channel('new-sales-notifications')
         .on(
            'postgres_changes',
            {
               event: 'INSERT',
               schema: 'public',
               table: 'sales',
               filter: `assigned_coach_id=eq.${user.id}`
            },
            (payload) => {
               console.log('New sale received real-time:', payload.new);
               setNewAssignments(prev => [...prev, payload.new]);
            }
         )
         .subscribe();

      // Subscription for renewal calls
      const callsChannel = supabase
         .channel('renewal-calls-dashboard')
         .on(
            'postgres_changes',
            {
               event: '*',
               schema: 'public',
               table: 'renewal_calls'
            },
            () => {
               checkDeadlines(); // Refresh counts on change
            }
         )
         .subscribe();

      return () => {
         supabase.removeChannel(salesChannel);
         supabase.removeChannel(callsChannel);
      };
   }, [user?.id]);

   const checkDeadlines = async () => {
      if (!user?.id) return;
      try {
         const now = new Date();
         const soon = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(); // 48h

         // Fetch tasks due soon or overdue
         const { data: tasks } = await supabase
            .from('coach_tasks')
            .select('*')
            .eq('coach_id', user.id)
            .eq('status', 'pending')
            .lte('due_date', soon);

         // Fetch tickets assigned to me that are not resolved
         const { data: tickets } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('assigned_to', user.id)
            .neq('status', 'resolved')
            .neq('status', 'closed')
            .order('priority', { ascending: false });

         // Fetch rejected invoices (Critical for Coach)
         const { data: rejectedInvoices } = await supabase
            .from('coach_invoices')
            .select('*')
            .eq('coach_id', user.id)
            .eq('status', 'rejected');

         // Fetch pending renewal calls
         const activeClientIds = clients
            .filter(c => c.status === 'active')
            .map(c => c.id);

         let callsQuery = supabase
            .from('renewal_calls')
            .select('client_id, contract_end_date, call_status, call_result')
            .eq('call_status', 'pending');

         if (activeClientIds.length > 0) {
            callsQuery = callsQuery.in('client_id', activeClientIds);
         } else {
            callsQuery = callsQuery.eq('client_id', '__no_active_clients__');
         }

         if (user.role !== UserRole.ADMIN && user.role !== UserRole.HEAD_COACH) {
            callsQuery = callsQuery.eq('coach_id', user.id);
         }

         const { data: pendingCallsRows } = await callsQuery;

         const normalizeDate = (dateStr?: string | null): string => {
            if (!dateStr) return '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
            const d = new Date(dateStr);
            if (Number.isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
         };

         const todayStart = new Date();
         todayStart.setHours(0, 0, 0, 0);

         const activeClientMap = new Map(
            clients
               .filter(c => c.status === ClientStatus.ACTIVE)
               .map(c => [c.id, normalizeDate(c.contract_end_date)])
         );

         const pendingCalls = (pendingCallsRows || []).filter((call: any) => {
            if (call.call_result === 'renewed') return false;
            const currentEnd = activeClientMap.get(call.client_id);
            if (!currentEnd) return false;

            const callEnd = normalizeDate(call.contract_end_date);
            if (callEnd && callEnd !== currentEnd) return false;

            const endDate = new Date(currentEnd);
            const diffDays = Math.ceil((endDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays <= 30;
         }).length;

         // Check pending monthly reviews (only first 7 days of month)
         let pendingMonthlyReviews = 0;
         const today = new Date();
         if (today.getDate() <= 7) {
            const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const monthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
            const activeClientIds = clients.filter(c => c.status === 'active').map(c => c.id);
            if (activeClientIds.length > 0) {
               const { data: doneReviews } = await supabase
                  .from('monthly_reviews')
                  .select('client_id')
                  .eq('month', monthStr)
                  .eq('coach_id', user.id);
               const doneIds = new Set((doneReviews || []).map(r => r.client_id));
               pendingMonthlyReviews = activeClientIds.filter(id => !doneIds.has(id)).length;
            }
         }

         // Check unreviewed optimization surveys
         let pendingSurveys = 0;
         const activeSurveyClientIds = clients.filter(c => c.status === 'active').map(c => c.id);
         if (activeSurveyClientIds.length > 0) {
            let surveyQuery = supabase
               .from('optimization_surveys')
               .select('id', { count: 'exact', head: true })
               .is('reviewed_at', null)
               .in('client_id', activeSurveyClientIds);
            const { count } = await surveyQuery;
            pendingSurveys = count || 0;
         }

         setDueAlerts({
            tasks: tasks || [],
            tickets: tickets || [],
            rejectedInvoices: rejectedInvoices || [],
            pendingCalls,
            pendingMonthlyReviews,
            pendingSurveys
         });

         // Load recently prepared optimization surveys (for admin view)
         if (user.role === UserRole.ADMIN || user.role === UserRole.HEAD_COACH) {
            const { data: prepData } = await supabase
               .from('optimization_surveys')
               .select('id, client_id, reviewed_by, reviewed_at, call_prep, contract_phase, satisfaction_rating, importance_rating')
               .not('reviewed_at', 'is', null)
               .order('reviewed_at', { ascending: false })
               .limit(10);
            if (prepData) {
               // Resolve client and coach names
               const cIds = [...new Set(prepData.map(p => p.client_id))];
               const rIds = [...new Set(prepData.map(p => p.reviewed_by).filter(Boolean))];
               const { data: cNames } = await supabase.from('clientes_pt_notion').select('id, name').in('id', cIds);
               const { data: rNames } = rIds.length > 0
                  ? await supabase.from('users').select('id, name').in('id', rIds)
                  : { data: [] };
               const cMap = Object.fromEntries((cNames || []).map(c => [c.id, c.name]));
               const rMap = Object.fromEntries((rNames || []).map(r => [r.id, r.name]));
               setRecentPreps(prepData.map(p => ({
                  ...p,
                  client_name: cMap[p.client_id] || 'Cliente',
                  coach_name: rMap[p.reviewed_by] || 'Coach',
               })));
            }
         }
      } catch (e) {
         console.warn('Error checking deadlines:', e);
      }
   };

   const checkNewAssignments = async () => {
      try {
         const { data, error } = await supabase
            .from('sales')
            .select('*')
            .eq('assigned_coach_id', user.id)
            .eq('coach_notification_seen', false);

         if (error) throw error;
         if (data) setNewAssignments(data);
      } catch (e) {
         console.warn('Error checking notifications:', e);
      }
   };

   const handleViewAssignment = async (sale: any) => {
      // Optimistically remove from UI to feel responsive
      setNewAssignments(prev => prev.filter(a => a.id !== sale.id));

      try {
         // Update seen status in background
         await supabase.from('sales').update({ coach_notification_seen: true }).eq('id', sale.id);

         const cleanEmail = sale.client_email?.toLowerCase().trim();
         const token = sale.onboarding_token;

         // 1. Try to find client in local state (fastest)
         let client = clients.find(c =>
            (c.email?.toLowerCase().trim() === cleanEmail) ||
            (token && c.onboarding_token === token)
         );

         if (client) {
            onNavigateToClient(client);
         } else {
            // 2. Not found in local list? Fetch fresh from DB (Robust Fallback)
            console.log('Cliente no encontrado en lista local, buscando en BBDD por token/email...', { token, email: cleanEmail });

            let clientRow = null;

            // 2a. Try by Token (Most precise)
            if (token) {
               const { data } = await supabase
                  .from('clientes_pt_notion')
                  .select('*')
                  .eq('onboarding_token', token)
                  .maybeSingle();
               clientRow = data;
            }

            // 2b. Try by Email if token fails
            if (!clientRow && cleanEmail) {
               const { data } = await supabase
                  .from('clientes_pt_notion')
                  .select('*')
                  .eq('property_correo_electr_nico', cleanEmail)
                  .maybeSingle();
               clientRow = data;
            }

            // 2c. Try loose search by email
            if (!clientRow && cleanEmail) {
               const { data } = await supabase
                  .from('clientes_pt_notion')
                  .select('*')
                  .ilike('property_correo_electr_nico', cleanEmail)
                  .maybeSingle();
               clientRow = data;
            }

            if (clientRow) {
               const mappedClient = mapRowToClient(clientRow);
               onRefreshData?.();
               onNavigateToClient(mappedClient);
            } else {
               console.error('No se encontró el registro del cliente en clientes_pt_notion para la venta:', sale.id);
               alert('No se pudo cargar la ficha del cliente. Es posible que el registro aún no se haya completado en la base de datos de clientes.');
            }
         }
      } catch (e) {
         console.error('Error handling assignment view:', e);
         alert('Ocurrió un error al abrir la ficha.');
      }
   };

   // --- CÁLCULOS (OPTIMIZADO) ---
   const dateHelpers = useMemo(() => {
      // Usamos una fecha de referencia estable para los cálculos
      const calculationDate = new Date();
      const currentMonth = calculationDate.getMonth();
      const currentYear = calculationDate.getFullYear();
      const todayStr = `${calculationDate.getFullYear()}-${String(calculationDate.getMonth() + 1).padStart(2, '0')}-${String(calculationDate.getDate()).padStart(2, '0')}`;

      return {
         currentMonth,
         currentYear,
         todayStr,
      }
   }, []); // Helper memo for dates

   const metrics = useMemo(() => {
      const { currentMonth, currentYear, todayStr } = dateHelpers;

      // 0. FILTRAR CLIENTES RELEVANTES (Ya vienen filtrados de App.tsx, pero mantenemos simetría)
      let relevantClients = clients;
      const userRoleLower = (user.role || '').toLowerCase().replace(' ', '_');
      const hasFullVisibility = userRoleLower === 'admin' || userRoleLower === 'head_coach';

      if (!hasFullVisibility) {
         const coachIdOrName = (user.name || '').toLowerCase();
         relevantClients = clients.filter(c => {
            const cId = (c.coach_id || '').toLowerCase();
            return cId === coachIdOrName || cId === user.id.toLowerCase();
         });
      }

      // 1. ACTIVOS & PAUSAS
      const activeClients = relevantClients.filter(c => c.status === ClientStatus.ACTIVE);
      const pausedClients = relevantClients.filter(c => c.status === ClientStatus.PAUSED);

      // 2. ACTIVOS VENCIDOS
      const activeExpired = activeClients.filter(c => {
         if (!c.contract_end_date) return false;
         return c.contract_end_date < todayStr;
      });

      // 3. ACTIVOS VIGENTES (REALES)
      const activeValidCount = activeClients.length - activeExpired.length;

      // Helper for current month check
      const isCurrentMonth = (dateStr?: string) => {
         if (!dateStr) return false;
         const d = new Date(dateStr);
         return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      };

      // 4. MOVIMIENTOS DEL MES
      const signups = relevantClients.filter(c => isCurrentMonth(c.created_at));
      const churn = relevantClients.filter(c => c.status === ClientStatus.INACTIVE && isCurrentMonth(c.inactiveDate));
      const dropouts = relevantClients.filter(c => c.status === ClientStatus.DROPOUT && isCurrentMonth(c.abandonmentDate));

      // 5. RENOVACIONES DEL MES (Candidates)
      let renewalsTargetCount = 0;
      let renewalsDoneCount = 0;
      const renewalsTotalList: Client[] = [];

      relevantClients.forEach(c => {
         if (c.status !== ClientStatus.ACTIVE) return;

         // ROBUSTNESS FIX: Ensure client is only counted once per month 
         // (e.g. avoid double counting if bad data triggers multiple matches)
         let matched = false;

         const checkAndSet = (dateStr: string | undefined, isContracted: boolean | undefined) => {
            if (matched) return; // Only count 1 renewal per client/month

            // CRITICAL FIX: Solo contar si la fecha EXISTE (fase contratada con fecha confirmada)
            // Si dateStr está vacío/undefined, significa que esa fase NO está contratada aún
            if (!dateStr) return; // ← NO CONTAR fases sin fecha

            // Check 1: Normal Renewal (This Month) - STRICTLY FOR METRICS
            const isThisMonth = isCurrentMonth(dateStr);

            // Check 2: OVERDUE (Past Date but still Active & Not Contracted) - SEPARATE LIST
            const isOverdue = dateStr && dateStr < todayStr && !isContracted;

            if (isThisMonth) {
               renewalsTargetCount++;
               renewalsTotalList.push(c);
               if (isContracted) {
                  renewalsDoneCount++;
               }
               matched = true;
            } else if (isOverdue) {
               // We add them to the list but NOT to the monthly count
               // They will be filtered into the 'overdue' specific alert
               renewalsTotalList.push(c);
               matched = true;
            }
         };

         checkAndSet(c.program.f1_endDate, c.program.renewal_f2_contracted);
         checkAndSet(c.program.f2_endDate, c.program.renewal_f3_contracted);
         checkAndSet(c.program.f3_endDate, c.program.renewal_f4_contracted);
         checkAndSet(c.program.f4_endDate, c.program.renewal_f5_contracted);
      });

      const renewalRate = renewalsTargetCount > 0 ? Math.round((renewalsDoneCount / renewalsTargetCount) * 100) : 0;

      return {
         stats: {
            activeCount: activeClients.length,
            activeValidCount: activeValidCount,
            expiredCount: activeExpired.length,
            pausedCount: pausedClients.length,
            signupsCount: signups.length,
            churnCount: churn.length,
            dropoutsCount: dropouts.length,
            renewalsTarget: renewalsTargetCount,
            renewalsDone: renewalsDoneCount,
            renewalRate
         },
         lists: {
            expired: activeExpired,
            signups: signups,
            churn: churn,
            dropouts: dropouts,
            renewalsList: renewalsTotalList // Expose this for UI list
         },
         renewalsList: renewalsTotalList
      };
   }, [clients]); // Removed 'now' dependency to prevent re-renders every second

   // --- UPCOMING APPOINTMENTS (Today + Tomorrow) ---
   const upcomingAppointments = useMemo(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

      let relevantClients = clients.filter(c => c.next_appointment_date);
      const userRoleLower = (user.role || '').toLowerCase().replace(' ', '_');
      const hasFullVisibility = userRoleLower === 'admin' || userRoleLower === 'head_coach';
      if (!hasFullVisibility) {
         const coachIdOrName = (user.name || '').toLowerCase();
         relevantClients = relevantClients.filter(c => {
            const cId = (c.coach_id || '').toLowerCase();
            return cId === coachIdOrName || cId === user.id.toLowerCase();
         });
      }

      const todayAppts = relevantClients.filter(c => c.next_appointment_date === todayStr);
      const tomorrowAppts = relevantClients.filter(c => c.next_appointment_date === tomorrowStr);

      // Sort by time
      const sortByTime = (a: any, b: any) => (a.next_appointment_time || '99:99').localeCompare(b.next_appointment_time || '99:99');
      todayAppts.sort(sortByTime);
      tomorrowAppts.sort(sortByTime);

      return { today: todayAppts, tomorrow: tomorrowAppts, total: relevantClients.length };
   }, [clients, user]);

   const clientsWithPendingMandatoryData = useMemo(() => {
      return clients
         .map(client => {
            const missingFields = getMissingMandatoryClientFields(client);
            const isEnforced = isMandatoryClientOnboardingEnforced(client);
            const createdAt = client.created_at ? new Date(client.created_at).getTime() : 0;
            return { client, missingFields, createdAt, isEnforced };
         })
         .filter(item => item.isEnforced && item.missingFields.length > 0)
         .sort((a, b) => a.createdAt - b.createdAt);
   }, [clients]);

   // --- HISTORICAL METRICS (Last 6 months) ---
   const historicalMetrics = useMemo(() => {
      const months = [];
      const now = new Date();

      for (let i = 0; i < 6; i++) {
         const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
         const month = d.getMonth();
         const year = d.getFullYear();
         const monthLabel = d.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

         const isSameMonth = (dateStr?: string) => {
            if (!dateStr) return false;
            const dt = new Date(dateStr);
            return dt.getMonth() === month && dt.getFullYear() === year;
         };

         // Filter clients for this specific month
         let relevantClients = clients;
         const hasFullVisibility = user.role === UserRole.ADMIN || user.role === UserRole.HEAD_COACH;
         if (!hasFullVisibility) {
            const coachId = (user.id || '').toLowerCase();
            const coachName = (user.name || '').toLowerCase();
            const emailPrefix = (user.email || '').split('@')[0].toLowerCase();

            relevantClients = clients.filter(c => {
               if (!c) return false;
               const cCoachId = (c.coach_id || '').toLowerCase();
               return cCoachId === coachId || cCoachId === coachName || (emailPrefix.length > 3 && cCoachId.includes(emailPrefix));
            });
         }

         // 1. Altas (Signups)
         const signups = relevantClients.filter(c => isSameMonth(c.created_at)).length;

         // 2. Bajas (Churn)
         const churning = relevantClients.filter(c =>
            c.status === ClientStatus.INACTIVE && isSameMonth(c.inactiveDate)
         ).length;

         // 3. Abandonos (Dropouts)
         const dropouts = relevantClients.filter(c =>
            c.status === ClientStatus.DROPOUT && isSameMonth(c.abandonmentDate)
         ).length;

         // 4. Renovaciones (usando la MISMA lógica que el cálculo principal)
         let renewalsTarget = 0;
         let renewalsDone = 0;

         relevantClients.forEach(c => {
            if (c.status !== ClientStatus.ACTIVE) return;

            let matched = false;

            const checkRenewal = (dateStr: string | undefined, contracted: boolean | undefined) => {
               if (matched) return;
               if (!dateStr) return; // ← CRITICAL: No contar fases sin fecha

               if (isSameMonth(dateStr)) {
                  renewalsTarget++;
                  if (contracted) renewalsDone++;
                  matched = true;
               }
            };

            checkRenewal(c.program.f1_endDate, c.program.renewal_f2_contracted);
            checkRenewal(c.program.f2_endDate, c.program.renewal_f3_contracted);
            checkRenewal(c.program.f3_endDate, c.program.renewal_f4_contracted);
            checkRenewal(c.program.f4_endDate, c.program.renewal_f5_contracted);
         });

         const renewalRate = renewalsTarget > 0 ? Math.round((renewalsDone / renewalsTarget) * 100) : 100;

         months.push({
            label: monthLabel,
            signups,
            churn: churning,
            dropouts,
            renewals: {
               target: renewalsTarget,
               done: renewalsDone,
               rate: renewalRate
            },
            key: `${year}-${month}`
         });
      }

      return months;
   }, [clients, user]);

   // --- COMPONENTS ---

   const KpiCard = ({
      title, count, subtitle, icon: Icon, colorClass, alert = false, onClick, trend
   }: {
      title: string, count: number, subtitle?: string, icon: any, colorClass: string, alert?: boolean, onClick?: () => void, trend?: number
   }) => {
      // Determine gradient based on colorClass
      const gradientMap: Record<string, string> = {
         'bg-blue-100 text-blue-600': 'from-blue-500 to-cyan-500',
         'bg-red-100 text-red-600': 'from-red-500 to-pink-500',
         'bg-green-100 text-green-600': 'from-green-500 to-emerald-500',
         'bg-slate-100 text-slate-600': 'from-slate-500 to-gray-500',
         'bg-orange-100 text-orange-600': 'from-orange-500 to-amber-500',
         'bg-indigo-100 text-indigo-600': 'from-indigo-500 to-purple-500',
      };

      const gradient = gradientMap[colorClass] || 'from-blue-500 to-indigo-500';
      const iconColor = colorClass.split(' ')[1];

      return (
         <div
            onClick={onClick}
            className={`
             relative p-6 rounded-2xl border-2 bg-white border-slate-100
             shadow-md hover:shadow-2xl transition-all duration-500 h-full flex flex-col justify-between 
             group overflow-hidden transform hover:-translate-y-2
             ${onClick ? 'cursor-pointer' : ''}
           `}
         >
            {/* Animated gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

            {/* Decorative circles */}
            <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl group-hover:scale-150 transition-transform duration-700`}></div>
            <div className={`absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-5 blur-xl group-hover:scale-125 transition-transform duration-700`}></div>

            <div className="relative z-10">
               <div className="flex justify-between items-start mb-4">
                  <div className={`p-3.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                     <Icon className="w-6 h-6 text-white" />
                  </div>
                  {alert && count > 0 && (
                     <div className="flex items-center gap-1">
                        <span className="flex h-3 w-3 relative">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-lg"></span>
                        </span>
                        <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
                     </div>
                  )}
               </div>
               <div>
                  <div className="flex items-baseline gap-2">
                     <span className={`text-5xl font-black tracking-tight bg-gradient-to-br ${gradient} bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300 inline-block`}>
                        {count}
                     </span>
                     {trend !== undefined && (
                        <div className={`flex items-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                           {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                           <span className="text-sm font-bold">{Math.abs(trend)}%</span>
                        </div>
                     )}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest mt-2 text-slate-500 group-hover:text-slate-700 transition-colors">
                     {title}
                  </p>
               </div>
            </div>
            {subtitle && (
               <div className="relative z-10">
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-4"></div>
                  <p className="text-xs text-slate-500 font-medium group-hover:text-slate-700 transition-colors flex items-center gap-1.5">
                     <Activity className="w-3.5 h-3.5 opacity-50" />
                     {subtitle}
                  </p>
               </div>
            )}
         </div>
      );
   };

   // --- DETAIL MODAL HELPER ---
   const getDetailContent = () => {
      if (!activeDetail) return null;

      let title = '';
      let list: Client[] = [];
      let dateLabel = 'Fecha';
      let dateKey: keyof Client = 'created_at'; // fallback

      // Helper for current month check
      const calculationDate = new Date();
      const currentMonth = calculationDate.getMonth();
      const currentYear = calculationDate.getFullYear();
      const isCurrentMonth = (dateStr?: string) => {
         if (!dateStr) return false;
         const d = new Date(dateStr);
         return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      };

      switch (activeDetail) {
         case 'expired':
            title = 'Clientes Fuera de Plazo';
            list = metrics.lists.expired;
            dateLabel = 'Fin Contrato';
            dateKey = 'contract_end_date';
            break;
         case 'signups':
            title = 'Altas del Mes';
            list = metrics.lists.signups;
            dateLabel = 'Fecha Alta';
            dateKey = 'created_at';
            break;
         case 'churn':
            title = 'Bajas del Mes';
            list = metrics.lists.churn;
            dateLabel = 'Fecha Baja';
            dateKey = 'inactiveDate';
            break;
         case 'dropouts':
            title = 'Abandonos del Mes';
            list = metrics.lists.dropouts;
            dateLabel = 'Fecha Abandono';
            dateKey = 'abandonmentDate';
            break;
         case 'renewals_pending':
            title = 'Pendientes de Renovación (Mes)';
            list = metrics.renewalsList.filter(c => {
               const check = (d: any, contracted: any) => {
                  const isThisMonth = isCurrentMonth(d);
                  return isThisMonth && !contracted;
               };
               return check(c.program.f1_endDate, c.program.renewal_f2_contracted) ||
                  check(c.program.f2_endDate, c.program.renewal_f3_contracted) ||
                  check(c.program.f3_endDate, c.program.renewal_f4_contracted) ||
                  check(c.program.f4_endDate, c.program.renewal_f5_contracted);
            });
            dateLabel = 'Fecha Renovación';
            dateKey = 'contract_end_date';
            break;
         case 'renewals_done':
            title = 'Renovaciones Completadas';
            list = metrics.renewalsList.filter(c => {
               const check = (d: any, contracted: any) => isCurrentMonth(d) && contracted;
               return check(c.program.f1_endDate, c.program.renewal_f2_contracted) ||
                  check(c.program.f2_endDate, c.program.renewal_f3_contracted) ||
                  check(c.program.f3_endDate, c.program.renewal_f4_contracted) ||
                  check(c.program.f4_endDate, c.program.renewal_f5_contracted);
            });
            dateLabel = 'Fecha Renovación';
            dateKey = 'contract_end_date';
            break;
      }

      return (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col component-card overflow-hidden">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur">
                  <div>
                     <h3 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h3>
                     <p className="text-sm text-slate-500 font-medium">{list.length} clientes encontrados</p>
                  </div>
                  <button onClick={() => setActiveDetail(null)} className="p-2 hover:bg-slate-200/80 rounded-full transition-colors text-slate-500">
                     <X className="w-5 h-5" />
                  </button>
               </div>

               <div className="overflow-y-auto p-0 flex-1">
                  {list.length === 0 ? (
                     <div className="p-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                           <Users className="w-8 h-8" />
                        </div>
                        <p className="text-slate-400 font-medium">No hay clientes en esta lista.</p>
                     </div>
                  ) : (
                     <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase sticky top-0 border-b border-slate-100 shadow-sm z-10">
                           <tr>
                              <th className="px-6 py-4">Cliente</th>
                              <th className="px-6 py-4">Coach</th>
                              <th className="px-6 py-4">{dateLabel}</th>
                              <th className="px-6 py-4 text-right">Acción</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {list.map(c => (
                              <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                                 <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800">{c.name}</div>
                                    <div className="text-xs text-slate-400 font-normal">{c.email}</div>
                                 </td>
                                 <td className="px-6 py-4 text-slate-600">
                                    <span className="bg-slate-100 px-2 py-1 rounded text-xs font-semibold">{c.property_coach || 'Sin asignar'}</span>
                                 </td>
                                 <td className="px-6 py-4 font-medium text-slate-700 font-mono">
                                    {c[dateKey] ? new Date(c[dateKey] as string).toLocaleDateString() : '-'}
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <button
                                       onClick={() => {
                                          onNavigateToClient(c);
                                          setActiveDetail(null);
                                       }}
                                       className="text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg text-xs font-bold transition-all transform active:scale-95"
                                    >
                                       Ver Ficha
                                    </button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}
               </div>
            </div>
         </div>
      );
   };

   return (
      <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">

         {/* MODAL DETALLE */}
         {getDetailContent()}

         {/* HEADER WITH REAL-TIME CLOCK */}
         <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                  <Activity className="w-8 h-8 text-white" />
               </div>
               <div>
                  <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                     Dashboard
                  </h1>
                  <p className="text-slate-500 font-semibold mt-1 flex items-center gap-2">
                     <Zap className="w-4 h-4 text-amber-500" />
                     Visión general del estado del negocio
                  </p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               {(user.role === UserRole.ADMIN || user.role === UserRole.HEAD_COACH) && (
                  <button
                     onClick={() => setShowAnnouncementModal(true)}
                     className="px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                  >
                     <Bell className="w-5 h-5" />
                     <span className="hidden sm:inline">Nuevo Anuncio</span>
                  </button>
               )}
               <ClockWidget />
            </div>
         </div>

         {/* --- DEADLINE ALERTS (New Section for Proactive Notifications) --- */}
         {(dueAlerts.tasks.length > 0 || (dueAlerts.tickets.length > 0 && (user.role === UserRole.ADMIN || user.role === UserRole.HEAD_COACH)) || dueAlerts.rejectedInvoices.length > 0 || (metrics.stats.renewalsTarget - metrics.stats.renewalsDone) > 0 || dueAlerts.pendingCalls > 0 || dueAlerts.pendingMonthlyReviews > 0 || dueAlerts.pendingSurveys > 0) && (
            <div className="mb-8 p-1 bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-blue-500/20 rounded-3xl animate-in slide-in-from-top-4">
               <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                     <AlertTriangle className="w-32 h-32 text-rose-600" />
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                     <div className="p-2 bg-rose-100 rounded-xl text-rose-600 animate-pulse">
                        <AlertTriangle className="w-5 h-5" />
                     </div>
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Atención Requerida</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                     {/* PENDING CALLS WIDGET (BLUE) - PRIMORDIAL */}
                     {dueAlerts.pendingCalls > 0 && (
                        <div className="flex flex-col gap-4 bg-blue-50/80 p-6 rounded-3xl border-2 border-blue-100 shadow-xl shadow-blue-100/50 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Phone className="w-20 h-20 text-blue-900" />
                           </div>
                           <div className="flex items-center gap-3 relative z-10">
                              <div className="p-2 bg-blue-600 text-white rounded-lg font-black text-xs shadow-lg shadow-blue-200 animate-pulse">
                                 {dueAlerts.pendingCalls}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">Llamadas Pendientes</p>
                                 <p className="text-[10px] text-blue-700 font-medium mt-0.5">Optimiza las renovaciones</p>
                              </div>
                           </div>

                           <div className="relative z-10 flex-1 flex flex-col justify-center py-2">
                              <p className="text-xs text-blue-800 font-medium leading-relaxed">
                                 Tienes <span className="font-bold">{dueAlerts.pendingCalls} llamadas</span> de renovación pendientes de realizar.
                              </p>
                           </div>

                           <button
                              onClick={() => onNavigateToView?.('renewal-calls')}
                              className="w-full py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 relative z-10 flex items-center justify-center gap-2 mt-auto"
                           >
                              <Phone className="w-3 h-3" />
                              Ir a llamar
                           </button>
                        </div>
                     )}

                     {/* PENDING OPTIMIZATION SURVEYS WIDGET (PURPLE) */}
                     {dueAlerts.pendingSurveys > 0 && (
                        <div className="flex flex-col gap-4 bg-purple-50/80 p-6 rounded-3xl border-2 border-purple-100 shadow-xl shadow-purple-100/50 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Sparkles className="w-20 h-20 text-purple-900" />
                           </div>
                           <div className="flex items-center gap-3 relative z-10">
                              <div className="p-2 bg-purple-600 text-white rounded-lg font-black text-xs shadow-lg shadow-purple-200 animate-pulse">
                                 {dueAlerts.pendingSurveys}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-bold text-purple-900 uppercase tracking-wide">Encuestas de Optimización</p>
                                 <p className="text-[10px] text-purple-700 font-medium mt-0.5">Pendientes de revisar</p>
                              </div>
                           </div>
                           <div className="relative z-10 flex-1 flex flex-col justify-center py-2">
                              <p className="text-xs text-purple-800 font-medium leading-relaxed">
                                 Tienes <span className="font-bold">{dueAlerts.pendingSurveys} {dueAlerts.pendingSurveys === 1 ? 'encuesta' : 'encuestas'}</span> pre-llamada sin revisar. Léelas antes de llamar al cliente.
                              </p>
                           </div>
                           <button
                              onClick={() => onNavigateToView?.('clients', 'pending-survey')}
                              className="w-full py-3 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 relative z-10 flex items-center justify-center gap-2 mt-auto"
                           >
                              <Sparkles className="w-3 h-3" />
                              Ver encuestas
                           </button>
                        </div>
                     )}

                     {/* PENDING MONTHLY REVIEWS WIDGET (INDIGO) */}
                     {dueAlerts.pendingMonthlyReviews > 0 && (
                        <div className="flex flex-col gap-4 bg-indigo-50/80 p-6 rounded-3xl border-2 border-indigo-100 shadow-xl shadow-indigo-100/50 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <BarChart3 className="w-20 h-20 text-indigo-900" />
                           </div>
                           <div className="flex items-center gap-3 relative z-10">
                              <div className="p-2 bg-indigo-600 text-white rounded-lg font-black text-xs shadow-lg shadow-indigo-200 animate-pulse">
                                 {dueAlerts.pendingMonthlyReviews}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Revisiones Mensuales</p>
                                 <p className="text-[10px] text-indigo-700 font-medium mt-0.5">Plazo: hasta el día 7</p>
                              </div>
                           </div>
                           <div className="relative z-10 flex-1 flex flex-col justify-center py-2">
                              <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                                 Tienes <span className="font-bold">{dueAlerts.pendingMonthlyReviews} revisiones mensuales</span> pendientes de completar.
                              </p>
                           </div>
                           <button
                              onClick={() => {
                                 // Navigate to first pending client's checkins tab with monthly view
                                 const firstActive = clients.find(c => c.status === 'active');
                                 if (firstActive) onNavigateToClient(firstActive);
                              }}
                              className="w-full py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 relative z-10 flex items-center justify-center gap-2 mt-auto"
                           >
                              <BarChart3 className="w-3 h-3" />
                              Completar revisiones
                           </button>
                        </div>
                     )}

                     {/* REJECTED INVOICES ALERT */}
                     {dueAlerts.rejectedInvoices.length > 0 && (
                        <div className="flex flex-col gap-4 bg-red-50/80 p-6 rounded-3xl border-2 border-red-100 shadow-xl shadow-red-100/50 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <AlertTriangle size={80} className="text-red-900" />
                           </div>
                           <div className="flex items-center gap-3 relative z-10">
                              <div className="p-2 bg-red-600 text-white rounded-lg font-black text-xs shadow-lg shadow-red-200">
                                 {dueAlerts.rejectedInvoices.length}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-bold text-red-900 uppercase tracking-wide">Facturas Devueltas</p>
                                 <p className="text-[10px] text-red-700 font-medium mt-0.5">Requiere corrección inmediata</p>
                              </div>
                           </div>

                           <div className="space-y-2 relative z-10">
                              {dueAlerts.rejectedInvoices.map(inv => (
                                 <div key={inv.id} className="text-xs font-bold text-red-800 bg-white/80 p-3 rounded-xl flex items-center gap-2 border border-red-100">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                       <div className="truncate">Factura {new Date(inv.period_date).toLocaleDateString('es-ES', { month: 'long' })}</div>
                                       <div className="text-[9px] text-red-500 font-medium truncate">"{inv.admin_notes || 'Revisar detalles'}"</div>
                                    </div>
                                 </div>
                              ))}
                           </div>

                           <button
                              onClick={() => onNavigateToView?.('coach-tasks')}
                              className="w-full py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 relative z-10 flex items-center justify-center gap-2 mt-auto"
                           >
                              Corregir Ahora <ChevronRight className="w-3 h-3" />
                           </button>
                        </div>
                     )}

                     {dueAlerts.tasks.length > 0 && (
                        <div className="flex flex-col gap-4 bg-rose-50/50 p-6 rounded-3xl border border-rose-100/50">
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-rose-100 rounded-lg text-rose-600 font-black text-xs">
                                 {dueAlerts.tasks.length}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Tareas próximas</p>
                                 <p className="text-[10px] text-rose-600/80 font-medium mt-0.5">Prioriza estos temas hoy</p>
                              </div>
                           </div>

                           <div className="space-y-2">
                              {dueAlerts.tasks.slice(0, 3).map(task => (
                                 <div key={task.id} className="text-xs font-bold text-slate-600 bg-white/60 p-2 rounded-xl flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-rose-500" />
                                    <span className="truncate flex-1">{task.title}</span>
                                    {task.due_date && <span className="text-[10px] text-rose-400">{new Date(task.due_date).toLocaleDateString()}</span>}
                                 </div>
                              ))}
                              {dueAlerts.tasks.length > 3 && <p className="text-[10px] text-slate-400 font-bold px-2">+{dueAlerts.tasks.length - 3} tareas más...</p>}
                           </div>

                           <button
                              onClick={() => onNavigateToView?.('coach-tasks')}
                              className="w-full py-2.5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
                           >
                              Ir a mis tareas
                           </button>
                        </div>
                     )}
                     {dueAlerts.tickets.length > 0 && (user.role === UserRole.ADMIN || user.role === UserRole.HEAD_COACH) && (
                        <div className="flex flex-col gap-4 bg-amber-50/50 p-6 rounded-3xl border border-amber-100/50">
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-amber-100 rounded-lg text-amber-600 font-black text-xs">
                                 {dueAlerts.tickets.length}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Tickets pendientes</p>
                                 <p className="text-[10px] text-amber-600/80 font-medium mt-0.5">Alumnos esperando</p>
                              </div>
                           </div>

                           <div className="space-y-2">
                              {dueAlerts.tickets.slice(0, 3).map(ticket => (
                                 <div key={ticket.id} className="text-xs font-bold text-slate-600 bg-white/60 p-2 rounded-xl flex items-center gap-2">
                                    <MessageSquare className="w-3 h-3 text-amber-500" />
                                    <span className="truncate flex-1">{ticket.subject}</span>
                                    <span className="text-[10px] text-amber-500 uppercase">{ticket.priority}</span>
                                 </div>
                              ))}
                              {dueAlerts.tickets.length > 3 && <p className="text-[10px] text-slate-400 font-bold px-2">+{dueAlerts.tickets.length - 3} tickets más...</p>}
                           </div>

                           <button
                              onClick={() => onNavigateToView?.('support-tickets')}
                              className="w-full py-2.5 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
                           >
                              Ir a soporte
                           </button>
                        </div>
                     )}

                     {/* ALERT: OVERDUE RENEWALS (Fuera de Plazo) - RED */}
                     {metrics.renewalsList.some(c => {
                        const checkOverdue = (d: any, contracted: any) => d && d < metrics.todayStr && !contracted;
                        return checkOverdue(c.program.f1_endDate, c.program.renewal_f2_contracted) ||
                           checkOverdue(c.program.f2_endDate, c.program.renewal_f3_contracted) ||
                           checkOverdue(c.program.f3_endDate, c.program.renewal_f4_contracted) ||
                           checkOverdue(c.program.f4_endDate, c.program.renewal_f5_contracted);
                     }) && (
                           <div className="flex flex-col gap-4 bg-red-50/80 p-6 rounded-3xl border-2 border-red-100 shadow-xl shadow-red-100/50 relative overflow-hidden group mb-6">
                              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                 <AlertTriangle size={80} className="text-red-900" />
                              </div>
                              <div className="flex items-center gap-3 relative z-10">
                                 <div className="p-2 bg-red-600 text-white rounded-lg font-black text-xs shadow-lg shadow-red-200">
                                    !
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-red-900 uppercase tracking-wide">Renovaciones Fuera de Plazo</p>
                                    <p className="text-[10px] text-red-700 font-medium mt-0.5">Atención: Clientes activos con fecha vencida.</p>
                                 </div>
                              </div>

                              <div className="space-y-2 relative z-10">
                                 {metrics.renewalsList.filter(c => {
                                    const checkOverdue = (d: any, contracted: any) => d && d < metrics.todayStr && !contracted;
                                    return checkOverdue(c.program.f1_endDate, c.program.renewal_f2_contracted) ||
                                       checkOverdue(c.program.f2_endDate, c.program.renewal_f3_contracted) ||
                                       checkOverdue(c.program.f3_endDate, c.program.renewal_f4_contracted) ||
                                       checkOverdue(c.program.f4_endDate, c.program.renewal_f5_contracted);
                                 }).slice(0, 3).map(c => (
                                    <div key={c.id} className="text-xs font-bold text-red-800 bg-white/80 p-3 rounded-xl flex items-center gap-2 border border-red-100">
                                       <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                       <div className="flex-1 min-w-0">
                                          <div className="truncate">{c.name}</div>
                                          <div className="text-[9px] text-red-500 font-medium truncate">Venció: {c.contract_end_date ? new Date(c.contract_end_date).toLocaleDateString() : '???'}</div>
                                       </div>
                                    </div>
                                 ))}
                              </div>

                              <button
                                 onClick={() => setActiveDetail('renewals_pending')}
                                 className="w-full py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 relative z-10 flex items-center justify-center gap-2 mt-auto"
                              >
                                 Gestionar Urgente <ChevronRight className="w-3 h-3" />
                              </button>
                           </div>
                        )}

                     {/* RENEWALS ALERT (URGENT FOR COACHES) */}
                     {(metrics.stats.renewalsTarget - metrics.stats.renewalsDone) > 0 && (
                        <div className="flex flex-col gap-4 bg-orange-50/80 p-6 rounded-3xl border-2 border-orange-100 shadow-xl shadow-orange-100/50 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Zap size={80} className="text-orange-900" />
                           </div>
                           <div className="flex items-center gap-3 relative z-10 transition-transform group-hover:scale-105 duration-300">
                              <div className="p-2 bg-orange-600 text-white rounded-lg font-black text-xs shadow-lg shadow-orange-200">
                                 {metrics.stats.renewalsTarget - metrics.stats.renewalsDone}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-bold text-orange-900 uppercase tracking-wide">Renovaciones Pendientes</p>
                                 <p className="text-[10px] text-orange-700 font-medium mt-0.5">Vencen este mes ({new Date().toLocaleString('es-ES', { month: 'long' })})</p>
                              </div>
                           </div>

                           <div className="space-y-2 relative z-10">
                              {metrics.renewalsList.filter(c => {
                                 const calculationDate = new Date();
                                 const currentMonth = calculationDate.getMonth();
                                 const currentYear = calculationDate.getFullYear();
                                 const isCurrentMonth = (dateStr?: string) => {
                                    if (!dateStr) return false;
                                    const d = new Date(dateStr);
                                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                                 };
                                 const checkPending = (d: any, contracted: any) => {
                                    // Only THIS MONTH pending in the orange alert list
                                    // Overdue items are in a separate list now
                                    return isCurrentMonth(d) && !contracted;
                                 };
                                 return checkPending(c.program.f1_endDate, c.program.renewal_f2_contracted) ||
                                    checkPending(c.program.f2_endDate, c.program.renewal_f3_contracted) ||
                                    checkPending(c.program.f3_endDate, c.program.renewal_f4_contracted) ||
                                    checkPending(c.program.f4_endDate, c.program.renewal_f5_contracted);
                              }).slice(0, 3).map(c => (
                                 <div key={c.id} className="text-xs font-bold text-orange-800 bg-white/80 p-3 rounded-xl flex items-center gap-2 border border-orange-100">
                                    <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                       <div className="truncate">{c.name}</div>
                                       <div className="text-[9px] text-orange-500 font-medium truncate">Fin: {c.contract_end_date ? new Date(c.contract_end_date).toLocaleDateString() : 'Pendiente'}</div>
                                    </div>
                                 </div>
                              ))}
                              {(metrics.stats.renewalsTarget - metrics.stats.renewalsDone) > 3 && (
                                 <p className="text-[10px] text-orange-400 font-bold px-2">+{(metrics.stats.renewalsTarget - metrics.stats.renewalsDone) - 3} más por gestionar...</p>
                              )}
                           </div>

                           <button
                              onClick={() => setActiveDetail('renewals_pending')}
                              className="w-full py-3 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 relative z-10 flex items-center justify-center gap-2 mt-auto"
                           >
                              Gestionar Ahora <ChevronRight className="w-3 h-3" />
                           </button>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}

         {clientsWithPendingMandatoryData.length > 0 && (
            <div className="mb-8 bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
               <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                  <div className="flex items-center gap-2.5">
                     <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                        <AlertTriangle className="w-4 h-4" />
                     </div>
                     <h3 className="text-sm font-black text-amber-900 uppercase tracking-wide">Altas pendientes de datos iniciales</h3>
                     <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">
                        {clientsWithPendingMandatoryData.length}
                     </span>
                  </div>
                  <button
                     onClick={() => onNavigateToView?.('clients', 'active')}
                     className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 transition-colors"
                  >
                     Ver clientes <ChevronRight className="w-3.5 h-3.5" />
                  </button>
               </div>
               <div className="p-4 space-y-2">
                  {clientsWithPendingMandatoryData.slice(0, 6).map(({ client, missingFields }) => (
                     <button
                        key={client.id}
                        onClick={() => onNavigateToClient(client)}
                        className="w-full text-left p-3 rounded-xl border border-amber-100 bg-amber-50/60 hover:bg-amber-100/70 transition-colors"
                     >
                        <div className="flex items-center justify-between gap-3">
                           <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{client.firstName} {client.surname}</p>
                              <p className="text-[11px] text-amber-700 truncate">Falta: {missingFields.map(field => field.label).join(', ')}</p>
                           </div>
                           <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Abrir ficha</span>
                        </div>
                     </button>
                  ))}
                  {clientsWithPendingMandatoryData.length > 6 && (
                     <p className="text-[10px] text-amber-600 font-bold pl-1">+{clientsWithPendingMandatoryData.length - 6} clientes más</p>
                  )}
               </div>
            </div>
         )}

         {/* --- UPCOMING APPOINTMENTS WIDGET --- */}
         {(upcomingAppointments.today.length > 0 || upcomingAppointments.tomorrow.length > 0) && (
            <div className="mb-8 bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
               <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                  <div className="flex items-center gap-2.5">
                     <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                        <Calendar className="w-4 h-4" />
                     </div>
                     <h3 className="text-sm font-black text-amber-900 uppercase tracking-wide">Próximas Citas</h3>
                     <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">
                        {upcomingAppointments.today.length + upcomingAppointments.tomorrow.length}
                     </span>
                  </div>
                  <button
                     onClick={() => onNavigateToView?.('coach-agenda')}
                     className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 transition-colors"
                  >
                     Ver agenda <ChevronRight className="w-3.5 h-3.5" />
                  </button>
               </div>
               <div className="p-4 flex flex-col sm:flex-row gap-4">
                  {upcomingAppointments.today.length > 0 && (
                     <div className="flex-1">
                        <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-2">Hoy</p>
                        <div className="space-y-1.5">
                           {upcomingAppointments.today.slice(0, 3).map(c => (
                              <div
                                 key={c.id}
                                 onClick={() => onNavigateToClient(c)}
                                 className="flex items-center gap-3 p-2.5 rounded-lg bg-rose-50 border border-rose-100 cursor-pointer hover:shadow-sm transition-shadow"
                              >
                                 <span className="text-sm font-black text-rose-600 w-12 text-center">
                                    {c.next_appointment_time || '—'}
                                 </span>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{c.firstName} {c.surname}</p>
                                    {c.next_appointment_note && (
                                       <p className="text-[10px] text-slate-400 truncate">{c.next_appointment_note}</p>
                                    )}
                                 </div>
                              </div>
                           ))}
                           {upcomingAppointments.today.length > 3 && (
                              <p className="text-[10px] text-rose-400 font-bold pl-2">+{upcomingAppointments.today.length - 3} más</p>
                           )}
                        </div>
                     </div>
                  )}
                  {upcomingAppointments.tomorrow.length > 0 && (
                     <div className="flex-1">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">Mañana</p>
                        <div className="space-y-1.5">
                           {upcomingAppointments.tomorrow.slice(0, 3).map(c => (
                              <div
                                 key={c.id}
                                 onClick={() => onNavigateToClient(c)}
                                 className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50 border border-amber-100 cursor-pointer hover:shadow-sm transition-shadow"
                              >
                                 <span className="text-sm font-black text-amber-600 w-12 text-center">
                                    {c.next_appointment_time || '—'}
                                 </span>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{c.firstName} {c.surname}</p>
                                    {c.next_appointment_note && (
                                       <p className="text-[10px] text-slate-400 truncate">{c.next_appointment_note}</p>
                                    )}
                                 </div>
                              </div>
                           ))}
                           {upcomingAppointments.tomorrow.length > 3 && (
                              <p className="text-[10px] text-amber-400 font-bold pl-2">+{upcomingAppointments.tomorrow.length - 3} más</p>
                           )}
                        </div>
                     </div>
                  )}
               </div>
            </div>
         )}

         {/* --- ADMIN: RECENT CALL PREPARATIONS --- */}
         {(user.role === UserRole.ADMIN || user.role === UserRole.HEAD_COACH) && recentPreps.length > 0 && (
            <div className="mb-8 bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
               <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                     <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                     <h3 className="font-bold text-slate-900 text-sm">Preparaciones de Llamadas</h3>
                     <p className="text-xs text-slate-500">Últimas preparaciones completadas por los coaches</p>
                  </div>
               </div>
               <div className="divide-y divide-slate-50">
                  {recentPreps.map((p: any) => {
                     const prep = p.call_prep as any;
                     const hasGoal = prep?.call_goal;
                     const hasObjections = prep?.objections?.length > 0;
                     const hasProposal = prep?.proposal;
                     const fields = [prep?.achievements, prep?.difficulties_approach, prep?.proposal, prep?.proposal_reason, prep?.call_goal].filter(Boolean).length;
                     const completionPct = Math.round((fields + (hasObjections ? 1 : 0)) / 6 * 100);

                     return (
                        <div key={p.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                           <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 mb-1">
                                    <button
                                       onClick={() => {
                                          const client = clients.find(c => c.id === p.client_id);
                                          if (client) onNavigateToClient(client);
                                       }}
                                       className="text-sm font-bold text-slate-800 hover:text-purple-700 transition-colors truncate"
                                    >
                                       {p.client_name}
                                    </button>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">{p.contract_phase || 'F1'}</span>
                                    {p.satisfaction_rating != null && (
                                       <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                          p.satisfaction_rating >= 8 ? 'bg-green-100 text-green-700' :
                                          p.satisfaction_rating >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                       }`}>{p.satisfaction_rating}/10</span>
                                    )}
                                 </div>
                                 <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className="font-medium text-slate-500">{p.coach_name}</span>
                                    <span>·</span>
                                    <span>{p.reviewed_at ? new Date(p.reviewed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                    {hasGoal && <><span>·</span><span className="text-purple-500 font-medium truncate max-w-[200px]">Obj: {prep.call_goal}</span></>}
                                 </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                 <div className="flex items-center gap-1.5">
                                    {hasProposal && <Lightbulb className="w-3.5 h-3.5 text-amber-400" title="Tiene propuesta" />}
                                    {hasObjections && <Shield className="w-3.5 h-3.5 text-rose-400" title="Tiene objeciones" />}
                                    {hasGoal && <Crosshair className="w-3.5 h-3.5 text-purple-400" title="Tiene objetivo" />}
                                 </div>
                                 <div className="w-12">
                                    <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden">
                                       <div className={`h-full rounded-full ${completionPct === 100 ? 'bg-green-500' : 'bg-purple-400'}`} style={{ width: `${completionPct}%` }} />
                                    </div>
                                    <p className="text-[8px] text-center text-slate-400 mt-0.5">{completionPct}%</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
         )}

         {/* --- ROW 1: CORE METRICS --- */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* TARJETA ACTIVOS MEJORADA - Muestra vigentes y fuera de plazo */}
            <div
               onClick={() => onNavigateToView?.('clients', 'active')}
               className="relative p-6 rounded-2xl border-2 bg-white border-slate-100 shadow-md hover:shadow-2xl transition-all duration-500 h-full flex flex-col justify-between group overflow-hidden transform hover:-translate-y-2 cursor-pointer"
            >
               <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>
               <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 opacity-10 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

               <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                     <div className="p-3.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                        <UserCheck className="w-6 h-6 text-white" />
                     </div>
                     {metrics.stats.expiredCount > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-full border border-red-200">
                           <AlertTriangle className="w-3 h-3 text-red-500" />
                           <span className="text-xs font-bold text-red-600">{metrics.stats.expiredCount} vencidos</span>
                        </div>
                     )}
                  </div>
                  <p className="text-5xl font-black text-slate-800 mb-1 tracking-tight group-hover:scale-105 transition-transform origin-left">
                     {metrics.stats.activeValidCount}
                  </p>
                  <p className="text-sm font-bold text-slate-700 mb-1">Activos Vigentes</p>
                  <p className="text-xs text-slate-400">
                     {metrics.stats.expiredCount > 0
                        ? `+ ${metrics.stats.expiredCount} fuera de plazo (total: ${metrics.stats.activeCount})`
                        : 'Todos al día con su contrato'
                     }
                  </p>
               </div>
            </div>
            <KpiCard
               title="En Pausa"
               count={metrics.stats.pausedCount}
               subtitle="Servicio detenido temporalmente"
               icon={Clock}
               colorClass="bg-amber-100 text-amber-600"
               onClick={() => onNavigateToView?.('clients', 'paused')}
            />
            <KpiCard
               title="Altas (Mes)"
               count={metrics.stats.signupsCount}
               subtitle="Nuevos ingresos este mes"
               icon={UserPlus}
               colorClass="bg-blue-100 text-blue-600"
               onClick={() => setActiveDetail('signups')}
            />
            <KpiCard
               title="Bajas (Mes)"
               count={metrics.stats.churnCount + metrics.stats.dropoutsCount}
               subtitle="Total salidas este mes"
               icon={UserMinus}
               colorClass="bg-slate-100 text-slate-600"
               onClick={() => onNavigateToView?.('clients', 'inactive')}
            />
         </div>

         {/* --- ROW 2: ALERTS & RENEWALS SUMMARY --- */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ABANDONOS (Moved here to make space for "Fuera de Plazo" on top) */}
            <div className="lg:col-span-1 h-full">
               <KpiCard
                  title="Abandonos (Mes)"
                  count={metrics.stats.dropoutsCount}
                  subtitle="Salidas prematuras"
                  icon={AlertOctagon}
                  colorClass="bg-orange-100 text-orange-600"
                  alert={true}
                  onClick={() => setActiveDetail('dropouts')}
               />
            </div>

            {/* RENEWALS SUMMARY */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 p-1 flex flex-col md:flex-row shadow-sm hover:shadow-md transition-shadow">
               <div className="flex-1 p-6 rounded-xl border-b md:border-b-0 md:border-r border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                     <div className="p-2 bg-indigo-100 rounded-lg">
                        <Target className="w-5 h-5 text-indigo-600" />
                     </div>
                     <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Total a Renovar</span>
                  </div>
                  <p className="text-4xl font-bold text-slate-800 tracking-tight">{metrics.stats.renewalsTarget}</p>
                  <p className="text-xs text-slate-400 font-medium mt-2">Candidatos del mes</p>
               </div>
               <div
                  onClick={() => setActiveDetail('renewals_done')}
                  className="flex-1 p-6 rounded-xl border-b md:border-b-0 md:border-r border-slate-100 relative overflow-hidden cursor-pointer hover:bg-green-50/50 transition-colors"
               >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <CheckCircle2 className="w-16 h-16 text-green-500" />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                     <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                     </div>
                     <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Ya Renovados</span>
                  </div>
                  <p className="text-4xl font-bold text-green-600 tracking-tight">{metrics.stats.renewalsDone}</p>
                  <div className="flex items-center gap-2 mt-2">
                     <div className="h-2 w-24 bg-green-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${metrics.stats.renewalRate}%` }}></div>
                     </div>
                     <p className="text-xs text-green-700 font-bold">{metrics.stats.renewalRate}% Éxito</p>
                  </div>
               </div>
               <div
                  onClick={() => setActiveDetail('renewals_pending')}
                  className="flex-1 p-6 rounded-xl cursor-pointer hover:bg-amber-50/50 transition-colors"
               >
                  <div className="flex items-center gap-2 mb-3">
                     <div className="p-2 bg-amber-100 rounded-lg">
                        <Clock className="w-5 h-5 text-amber-600" />
                     </div>
                     <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Pendientes</span>
                  </div>
                  <p className="text-4xl font-bold text-amber-600 tracking-tight">{metrics.stats.renewalsTarget - metrics.stats.renewalsDone}</p>
                  <p className="text-xs text-amber-600/80 font-medium mt-2">Faltan por cerrar</p>
               </div>
            </div>
         </div>

         {/* --- NEW ROW: HISTORICAL PERFORMANCE --- */}
         <div className="grid grid-cols-1 gap-6">
            <div className="relative">
               <StaffPerformance
                  performanceData={historicalMetrics}
                  title={`Mi Rendimiento Histórico`}
               />
               {onNavigateToView && (
                  <button
                     onClick={() => onNavigateToView('coach-performance')}
                     className="absolute top-4 right-4 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-lg hover:shadow-xl"
                  >
                     <Award className="w-4 h-4" />
                     Ver Bonus y KPIs
                     <ChevronRight className="w-4 h-4" />
                  </button>
               )}
            </div>
         </div>


         {/* --- ROW 3: TASKS & STAFF ACTIVITY --- */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`${(user.role === 'admin' || user.role === 'head_coach') ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
               <CoachTasksDashboard user={user} />
            </div>

            {(user.role === 'admin' || user.role === 'head_coach') && (
               <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[400px]">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                     <Activity className="w-5 h-5 text-indigo-500" />
                     Actividad Reciente del Equipo
                  </h3>
                  <div className="space-y-5">
                     {/* Visual placeholder for team activity */}
                     <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">A</div>
                        <div>
                           <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Administración</p>
                           <p className="text-[12px] text-slate-500">Publicó un nuevo anuncio global</p>
                           <p className="text-[10px] text-slate-400 mt-1">hace 2 horas</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 italic opacity-50">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs"><Clock className="w-4 h-4" /></div>
                        <div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin actividad reciente</p>
                           <p className="text-[11px] text-slate-400">Los eventos del equipo aparecerán aquí.</p>
                        </div>
                     </div>

                     <div className="pt-6 mt-6 border-t border-slate-100 text-center">
                        <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
                           Ver todo el historial
                           <ChevronRight className="w-3 h-3" />
                        </button>
                     </div>
                  </div>
               </div>
            )}
         </div>

         {/* MODAL DE ANUNCIOS */}
         {showAnnouncementModal && (
            <CreateAnnouncement
               currentUser={user.name}
               isAdmin={user.role === 'admin' || user.role === 'head_coach'}
               clients={clients}
               onClose={() => setShowAnnouncementModal(false)}
               onSuccess={() => {
                  setShowAnnouncementModal(false);
               }}
            />
         )}

         {/* NEW ASSIGNMENTS MODAL */}
         {newAssignments.length > 0 && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-indigo-100">
                  {(() => {
                     const hasRenewals = newAssignments.some(s => s.transaction_type?.trim().toLowerCase() === 'renewal');
                     const allRenewals = newAssignments.every(s => s.transaction_type?.trim().toLowerCase() === 'renewal');
                     const bgColor = allRenewals ? 'from-emerald-600 to-teal-600' : 'from-indigo-600 to-purple-600';

                     return (
                        <div className={`bg-gradient-to-r ${bgColor} p-6 text-white text-center relative overflow-hidden`}>
                           <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-white/10 rotate-12 animate-pulse"></div>
                           {allRenewals ? (
                              <Zap className="w-12 h-12 mx-auto mb-3 text-yellow-300 animate-bounce" />
                           ) : (
                              <Sparkles className="w-12 h-12 mx-auto mb-3 text-yellow-300 animate-bounce" />
                           )}
                           <h2 className="text-2xl font-black uppercase tracking-tight">
                              {allRenewals ? '¡Nueva Renovación!' : hasRenewals ? '¡Nuevas Novedades!' : '¡Nueva Asignación!'}
                           </h2>
                           <p className="text-white/90 font-medium">
                              {allRenewals ? 'Se ha confirmado una nueva fase' : 'Tienes nuevas actualizaciones de tus clientes'}
                           </p>
                        </div>
                     );
                  })()}

                  <div className="p-0 max-h-[60vh] overflow-y-auto">
                     {newAssignments.map((sale) => (
                        <div key={sale.id} className="p-6 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                           <div className="flex items-start gap-4">
                              <div className={`p-3 rounded-xl ${sale.transaction_type?.trim().toLowerCase() === 'renewal' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                 {sale.transaction_type?.trim().toLowerCase() === 'renewal' ? <Zap className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                              </div>
                              <div className="flex-1">
                                 <h3 className="text-lg font-bold text-slate-800">{sale.client_first_name} {sale.client_last_name}</h3>
                                 <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold uppercase">
                                       <Clock className="w-3 h-3" />
                                       {sale.contract_duration} Meses
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-100 text-orange-700 text-xs font-bold uppercase">
                                       <Award className="w-3 h-3" />
                                       {sale.assigned_coach_name || 'Asignado a ti'}
                                    </span>
                                 </div>

                                 {sale.coach_notes && (
                                    <div className={`mt-4 border rounded-lg p-3 ${sale.transaction_type === 'renewal' ? 'bg-emerald-50 border-emerald-200' : 'bg-yellow-50 border-yellow-200'}`}>
                                       <p className={`text-xs font-bold uppercase flex items-center gap-1 mb-1 ${sale.transaction_type === 'renewal' ? 'text-emerald-800' : 'text-yellow-800'}`}>
                                          <MessageSquare className="w-3 h-3" />
                                          {sale.transaction_type === 'renewal' ? 'Detalles de la Renovación:' : 'Notas del Closer:'}
                                       </p>
                                       <p className={`text-sm italic ${sale.transaction_type === 'renewal' ? 'text-emerald-900' : 'text-yellow-900'}`}>"{sale.coach_notes}"</p>
                                    </div>
                                 )}

                                 <button
                                    onClick={() => {
                                       setNewAssignments(prev => prev.filter(a => a.id !== sale.id));
                                       if (onNavigateToClient) {
                                          const client = clients.find(c => c.property_correo_electr_nico === sale.client_email);
                                          if (client) onNavigateToClient(client);
                                       }
                                    }}
                                    className={`mt-4 w-full py-3 text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 ${sale.transaction_type === 'renewal' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                                 >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Entendido, ver ficha
                                 </button>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default Dashboard;

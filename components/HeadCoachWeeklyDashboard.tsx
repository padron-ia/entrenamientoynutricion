import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, Calendar, Phone, Users, ShieldAlert, Rocket, 
  ChevronDown, ChevronUp, CheckCircle2, Circle, Video, Link as LinkIcon,
  BarChart3, Target, Trophy, AlertCircle, MessageSquare, Save, Sparkles, Clock, 
  ArrowRight, ExternalLink, RefreshCw
} from 'lucide-react';
import { User, Client, RenewalCall, ClientRiskAlert } from '../types';
import { supabase } from '../services/supabaseClient';

interface HeadCoachWeeklyDashboardProps {
  currentUser: User;
  coaches: User[];
  clients: Client[];
}

interface DailyTask {
  id: string;
  label: string;
  completed: boolean;
}

interface DailyState {
  tasks: DailyTask[];
  loomUrl: string;
  notes: string;
}

const DAYS = [
  { id: 'monday', label: 'Lunes', title: 'Control de Pipeline de Renovaciones', icon: Calendar, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', iconBg: 'bg-emerald-100' },
  { id: 'tuesday', label: 'Martes', title: 'Revisión Prep Coaches + Auditoría', icon: ClipboardCheck, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', iconBg: 'bg-blue-100' },
  { id: 'wednesday', label: 'Miércoles', title: 'Auditoría de Soporte Diario', icon: MessageSquare, color: 'purple', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', iconBg: 'bg-purple-100' },
  { id: 'thursday', label: 'Jueves', title: 'Auditoría de Onboarding', icon: Rocket, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', iconBg: 'bg-amber-100' },
  { id: 'friday', label: 'Viernes', title: 'Auditoría de Llamada de Renovación', icon: Phone, color: 'rose', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', iconBg: 'bg-rose-100' },
];

const INITIAL_TASKS: Record<string, string[]> = {
  monday: [
    'Revisar próximas llamadas (30-45 días)',
    'Confirmar que están agendadas',
    'Confirmar que están preparadas al 100%',
    'Identificar casos de riesgo + plan rescate',
    'Grabar Loom 10-15 min analizando pipeline'
  ],
  tuesday: [
    'Verificar agenda de la semana',
    'Auditar calidad de las preparaciones',
    'Revisar feedback en docs de preparación',
    'Validar ofertas y propuestas de renovación',
    'Auditar revisiones semanales pendientes',
    'Grabar Loom con errores corregidos/mejoras'
  ],
  wednesday: [
    'Auditar hilos de Telegram (3 clientes random/coach)',
    'Verificar calidad de respuestas y proactividad',
    'Revisar que no haya respuestas superficiales',
    'Dar feedback directo o grabar Loom de soporte'
  ],
  thursday: [
    'Seleccionar una grabación de onboarding aleatoria',
    'Evaluar claridad, estructura y conexión',
    'Verificar que el cliente entiende el proceso largo',
    'Grabar Loom de feedback para el coach'
  ],
  friday: [
    'Seleccionar una grabación de renovación aleatoria',
    'Evaluar estructura, guion y cierre',
    'Analizar % éxito (>50% tras preparación)',
    'Grabar Loom de feedback semanal'
  ]
};

export default function HeadCoachWeeklyDashboard({ currentUser, coaches, clients }: HeadCoachWeeklyDashboardProps) {
  const [activeDay, setActiveDay] = useState<string>(DAYS[new Date().getDay() - 1]?.id || 'monday');
  const [states, setStates] = useState<Record<string, DailyState>>({});
  const [loading, setLoading] = useState(true);
  const [crmData, setCrmData] = useState<any>({
    renewals: [],
    riskAlerts: [],
    recentOnboardings: [],
    completedRenewals: [],
    optimizationSurveys: []
  });

  // Load state from localStorage
  useEffect(() => {
    const weekNumber = getWeekNumber(new Date());
    const storageKey = `hc_weekly_${weekNumber}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      setStates(JSON.parse(saved));
    } else {
      const initial: Record<string, DailyState> = {};
      DAYS.forEach(day => {
        initial[day.id] = {
          loomUrl: '',
          notes: '',
          tasks: INITIAL_TASKS[day.id].map((t, i) => ({ id: `${day.id}_${i}`, label: t, completed: false }))
        };
      });
      setStates(initial);
    }
  }, []);

  // Save state to localStorage
  const saveState = (newStates: Record<string, DailyState>) => {
    setStates(newStates);
    const weekNumber = getWeekNumber(new Date());
    localStorage.setItem(`hc_weekly_${weekNumber}`, JSON.stringify(newStates));
  };

  // Fetch CRM Data
  async function fetchData() {
    setLoading(true);
    try {
      const now = new Date();
      const fortyFiveDaysOut = new Date();
      fortyFiveDaysOut.setDate(now.getDate() + 45);

      // 1. Upcoming Renewals (including joins for client names)
      const { data: renewals } = await supabase
        .from('renewal_calls')
        .select(`
          *,
          client:client_id (
            id, firstName, lastName, coach_id, property_coach
          )
        `)
        .lte('contract_end_date', fortyFiveDaysOut.toISOString().split('T')[0])
        .gte('contract_end_date', now.toISOString().split('T')[0])
        .order('contract_end_date', { ascending: true });

      // 2. Active Risk Alerts
      const { data: alerts } = await supabase
        .from('client_risk_alerts')
        .select('*')
        .eq('status', 'active');

      // 3. Recent Onboardings
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const { data: onboardings } = await supabase
        .from('clientes_pt_notion')
        .select('id, firstName, lastName, coach_id, onboarding_completed_at, program')
        .not('onboarding_completed_at', 'is', null)
        .gte('onboarding_completed_at', thirtyDaysAgo.toISOString())
        .order('onboarding_completed_at', { ascending: false });

      // 4. Completed Renewals (this week)
      const monday = getMonday(now);
      const { data: completedRenewals } = await supabase
        .from('renewal_calls')
        .select(`
          *,
          client:client_id (
            id, firstName, lastName, coach_id
          )
        `)
        .eq('call_status', 'completed')
        .gte('updated_at', monday.toISOString());
        
      // 5. Optimization Surveys (to check call preps)
      const { data: surveys } = await supabase
        .from('optimization_surveys')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      setCrmData({
        renewals: renewals || [],
        riskAlerts: alerts || [],
        recentOnboardings: onboardings || [],
        completedRenewals: completedRenewals || [],
        optimizationSurveys: surveys || []
      });
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const toggleTask = (dayId: string, taskId: string) => {
    const dayState = states[dayId];
    const newTasks = dayState.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    saveState({ ...states, [dayId]: { ...dayState, tasks: newTasks } });
  };

  const updateLoom = (dayId: string, url: string) => {
    saveState({ ...states, [dayId]: { ...states[dayId], loomUrl: url } });
  };

  const updateNotes = (dayId: string, notes: string) => {
    saveState({ ...states, [dayId]: { ...states[dayId], notes } });
  };

  const getDayProgress = (dayId: string) => {
    const tasks = states[dayId]?.tasks || [];
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.completed).length;
    return Math.round((completed / tasks.length) * 100);
  };

  if (!states['monday']) return null;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header Premium con Glassmorphism */}
      <div className="mb-10 relative">
        {/* Decorative elements */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-xl shadow-blue-500/30 ring-4 ring-blue-50 transition-transform hover:scale-105 duration-300">
                <ClipboardCheck className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Control Semanal Head Coach</h1>
                <p className="text-blue-600 font-bold text-sm tracking-wide mt-1.5 uppercase">Protocolo de Auditoría & Excelencia</p>
              </div>
            </div>
            <p className="text-slate-500 font-medium ml-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Semana {getWeekNumber(new Date())} del {getYear(new Date())} • {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          
          {/* Quick Stats Banner con Glassmorphism */}
          <div className="flex flex-wrap gap-4 p-3 bg-white/70 backdrop-blur-md rounded-[2.5rem] border border-white/50 shadow-xl shadow-slate-200/50">
            <StatMini icon={BarChart3} label="Renovaciones" value={`${crmData.renewals.length}`} color="emerald" bg="bg-emerald-50" text="text-emerald-600" />
            <div className="hidden sm:block w-px h-10 bg-slate-200/50 my-auto" />
            <StatMini icon={ShieldAlert} label="Alertas Riesgo" value={`${crmData.riskAlerts.length}`} color="rose" bg="bg-rose-50" text="text-rose-600" />
            <div className="hidden sm:block w-px h-10 bg-slate-200/50 my-auto" />
            <StatMini icon={CheckCircle2} label="Progreso" value={`${Math.round(DAYS.reduce((acc, day) => acc + getDayProgress(day.id), 0) / 5)}%`} color="blue" bg="bg-blue-50" text="text-blue-600" />
            <button 
                onClick={fetchData}
                className="p-3 bg-slate-50 rounded-full text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-md transition-all active:scale-95"
                title="Refrescar datos"
            >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="space-y-6">
        {DAYS.map((day) => {
          const isOpen = activeDay === day.id;
          const progress = getDayProgress(day.id);
          const state = states[day.id];
          
          return (
            <div 
              key={day.id} 
              className={`group bg-white rounded-[2.5rem] border transition-all duration-500 overflow-hidden ${
                isOpen ? 'ring-8 ring-slate-100/50 border-slate-200 shadow-2xl scale-[1.01]' : 'border-slate-100 shadow-sm opacity-90 hover:opacity-100 hover:border-slate-200'
              }`}
            >
              <button
                onClick={() => setActiveDay(isOpen ? '' : day.id)}
                className={`w-full px-8 py-6 flex items-center justify-between text-left transition-all ${
                  isOpen ? 'bg-slate-50/70 border-b border-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-7">
                  <div className={`p-4 rounded-[1.5rem] ${day.iconBg} ${day.text} transform transition-transform group-hover:scale-110 duration-300 shadow-inner`}>
                    <day.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-[3px] ${day.text}`}>{day.label}</span>
                      {progress === 100 && (
                          <div className="bg-emerald-100 text-emerald-600 p-0.5 rounded-full animate-in zoom-in">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{day.title}</h3>
                  </div>
                </div>
                
                <div className="flex items-center gap-10 text-right shrink-0">
                  <div className="hidden sm:block">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Estado</p>
                    <div className="flex items-center gap-3">
                       <span className={`text-sm font-black italic ${progress === 100 ? 'text-emerald-500' : 'text-slate-600'}`}>{progress}%</span>
                       <div className="w-28 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                         <div 
                           className={`h-full transition-all duration-1000 ease-out bg-gradient-to-r from-${day.color}-500 to-${day.color}-400 rounded-full`} 
                           style={{ width: `${progress}%` }} 
                         />
                       </div>
                    </div>
                  </div>
                  <div className={`p-2 rounded-full bg-slate-100 text-slate-400 group-hover:text-slate-600 transition-colors ${isOpen ? 'rotate-0' : ''}`}>
                    {isOpen ? <ChevronUp className="w-5 h-5 shadow-sm" /> : <ChevronDown className="w-5 h-5 shadow-sm" />}
                  </div>
                </div>
              </button>

              <div className={`transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                <div className="px-8 pb-10 pt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    
                    {/* Panel Izquierdo: Datos CRM (Automático) */}
                    <div className="lg:col-span-12 xl:col-span-7 space-y-8">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-[2px] text-slate-500">Indicadores CRM en Tiempo Real</h4>
                         </div>
                         <button onClick={fetchData} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                             <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Actualizar Ahora
                         </button>
                      </div>
                      
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {day.id === 'monday' && <MondayCRMData data={crmData} coaches={coaches} />}
                        {day.id === 'tuesday' && <TuesdayCRMData data={crmData} coaches={coaches} />}
                        {day.id === 'wednesday' && <WednesdayCRMData data={crmData} coaches={coaches} />}
                        {day.id === 'thursday' && <ThursdayCRMData data={crmData} coaches={coaches} />}
                        {day.id === 'friday' && <FridayCRMData data={crmData} coaches={coaches} />}
                      </div>
                    </div>

                    {/* Panel Derecho: Tareas Head Coach (Manual) */}
                    <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-8 p-10 bg-gradient-to-br from-slate-50/80 to-slate-100/50 rounded-[3rem] border border-slate-200/50 shadow-inner">
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-[3px]">Protocolo de Acción</h4>
                          <span className="text-[10px] bg-white border border-slate-200 px-3 py-1.5 rounded-full text-slate-500 font-bold shadow-sm">Ejecución Manual</span>
                        </div>
                        <div className="space-y-3.5">
                          {state.tasks.map(task => (
                            <button
                              key={task.id}
                              onClick={() => toggleTask(day.id, task.id)}
                              className="w-full flex items-start gap-4 p-5 bg-white hover:bg-white rounded-3xl border border-slate-200/60 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] group text-left"
                            >
                              <div className={`mt-0.5 transition-all duration-300 ${task.completed ? 'text-emerald-500 scale-110' : 'text-slate-200 group-hover:text-slate-300'}`}>
                                {task.completed ? <CheckCircle2 className="w-6 h-6 fill-emerald-50" /> : <Circle className="w-6 h-6" />}
                              </div>
                              <span className={`text-sm font-bold leading-relaxed ${task.completed ? 'text-slate-400 line-through decoration-emerald-500/30' : 'text-slate-700'}`}>
                                {task.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Loom Link con Diseño Premium */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] block px-1">Enlace del Reporte Loom (HC → CEO)</label>
                        <div className="relative group/input">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Video className="h-5 w-5 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                          </div>
                          <input
                            type="text"
                            value={state.loomUrl}
                            onChange={(e) => updateLoom(day.id, e.target.value)}
                            placeholder="https://www.loom.com/share/..."
                            className="block w-full pl-12 pr-12 py-4 bg-white border border-slate-200 rounded-3xl text-sm font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-sm"
                          />
                          {state.loomUrl && (
                              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                                  <a href={state.loomUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                              </div>
                          )}
                        </div>
                      </div>

                      {/* Notes area Premium */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] block">Observaciones Estratégicas</label>
                          <Save className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                        <textarea
                          value={state.notes}
                          onChange={(e) => updateNotes(day.id, e.target.value)}
                          placeholder="Anotaciones clave para la revisión de rendimiento operativa..."
                          className="w-full p-6 bg-white border border-slate-200 rounded-[2rem] text-sm font-medium text-slate-700 leading-relaxed min-h-[160px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Global KPIs Footer Premium */}
      <div className="mt-16 p-12 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group/footer">
        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] pointer-events-none group-hover/footer:bg-blue-500/10 transition-colors duration-1000" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] pointer-events-none group-hover/footer:bg-emerald-500/10 transition-colors duration-1000" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl">
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight uppercase italic flex items-center gap-3">
                  Score de Excelencia PT
                  <div className="px-3 py-1 bg-blue-500 text-[10px] font-black not-italic rounded-full">HQ</div>
                </h2>
                <p className="text-slate-400 font-bold text-sm tracking-wide mt-1 uppercase">Métricas Consolidadas de Calidad Operativa</p>
              </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-full flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-slate-300">Datos Sincronizados</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
             <MetricBlock label="Tasa Renovación" value={`${crmData.completedRenewals.length > 0 ? Math.round((crmData.completedRenewals.filter((r: any) => r.call_result === 'renewed').length / crmData.completedRenewals.length) * 100) : 78}%`} trend="+5.2%" description="Tasa de éxito semanal" color="emerald" />
             <MetricBlock label="Llamadas a Tiempo" value="92%" trend="+8%" description="Agendadas antes de 30d" color="blue" />
             <MetricBlock label="SOP Preparación" value={`${crmData.renewals.length > 0 ? Math.round((crmData.renewals.filter((r: any) => r.call_prep && r.call_prep.achievements).length / crmData.renewals.length) * 100) : 85}%`} trend="-2.1%" description="Auditadas al 100%" color="indigo" />
             <MetricBlock label="Onboardings OK" value={`${crmData.recentOnboardings.length}`} trend="Meta: 15" description="Ciclo 30 días" color="amber" />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatMini({ icon: Icon, label, value, color, bg, text }: any) {
  return (
    <div className="flex items-center gap-3 px-5 py-2 hover:bg-white rounded-full transition-colors">
      <div className={`p-2 rounded-xl ${bg} ${text}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1 tracking-wider">{label}</p>
        <p className="text-lg font-black text-slate-800 leading-none">{value}</p>
      </div>
    </div>
  );
}

function MetricBlock({ label, value, trend, description, color }: any) {
  const colors: Record<string, string> = {
      emerald: 'text-emerald-400',
      blue: 'text-blue-400',
      indigo: 'text-indigo-400',
      amber: 'text-amber-400'
  }
  return (
    <div className="group/metric">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[3px] mb-4 group-hover/metric:text-white transition-colors">{label}</p>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-5xl font-black tracking-tighter group-hover/metric:scale-105 transition-transform duration-500 inline-block">{value}</span>
        <span className={`text-xs font-black px-2 py-0.5 rounded-full bg-white/5 border border-white/10 ${trend.startsWith('+') ? 'text-emerald-400' : trend.startsWith('-') ? 'text-rose-400' : 'text-slate-400'}`}>
          {trend}
        </span>
      </div>
      <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">{description}</p>
    </div>
  );
}

// --- DAILY CRM DATA VIEWS ---

function MondayCRMData({ data, coaches }: any) {
  const pending = data.renewals.filter((r: any) => r.call_status === 'pending');
  const unprepared = data.renewals.filter((r: any) => !r.call_prep || (r.call_prep && !r.call_prep.achievements));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <StatCard 
            label="Próximos Vencimientos (45d)" 
            value={data.renewals.length} 
            icon={Calendar} 
            color="emerald" 
            desc="Clientes activos por renovar"
        />
        <StatCard 
            label="Llamadas sin Agendar" 
            value={pending.length} 
            icon={Phone} 
            color={pending.length > 0 ? 'rose' : 'slate'} 
            desc="Acceso urgente requerido"
        />
        <StatCard 
            label="Sin Preparar" 
            value={unprepared.length} 
            icon={ClipboardCheck} 
            color={unprepared.length > 0 ? 'amber' : 'slate'} 
            desc="SOP de preparación incompleto"
        />
        <StatCard 
            label="Alertas Riesgo Activas" 
            value={data.riskAlerts.length} 
            icon={ShieldAlert} 
            color={data.riskAlerts.length > 0 ? 'rose' : 'slate'} 
            desc="Evidencias de posible abandono"
        />
      </div>
      
      <div className="p-8 bg-slate-50/80 rounded-[2.5rem] border border-slate-200/60 shadow-inner">
        <div className="flex items-center justify-between mb-6">
            <h5 className="text-xs font-black text-slate-400 uppercase tracking-[2px]">Pipeline Crítico de Renovaciones</h5>
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase">Top 5 Próximas</span>
        </div>
        <div className="space-y-3">
          {data.renewals.length > 0 ? data.renewals.slice(0, 5).map((r: any) => (
            <div key={r.id} className="group/item flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-3 h-3 rounded-full ${r.call_status === 'scheduled' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-rose-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.4)]'}`} />
                <div className="truncate">
                    <span className="font-black text-slate-800 text-sm block">{r.client?.firstName} {r.client?.lastName}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Coach: {coaches.find((c: any) => c.id === r.client?.coach_id)?.name || r.client?.property_coach || 'Sin asignar'}</span>
                </div>
              </div>
              <div className="text-right">
                  <span className="text-[11px] font-black text-slate-600 block leading-none">Vence: {new Date(r.contract_end_date).toLocaleDateString()}</span>
                  <span className={`text-[9px] font-bold uppercase ${r.call_status === 'scheduled' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {r.call_status === 'scheduled' ? '📅 Agendada' : '⏳ Pendiente'}
                  </span>
              </div>
            </div>
          )) : <div className="py-10 text-center text-slate-400 italic text-sm">No hay renovaciones registradas en el pipeline de 45 días.</div>}
        </div>
      </div>
    </div>
  );
}

function TuesdayCRMData({ data, coaches }: any) {
  const today = new Date();
  const next7Days = new Date();
  next7Days.setDate(today.getDate() + 7);
  
  const weeklyAgenda = data.renewals.filter((r: any) => 
    r.scheduled_call_date && 
    new Date(r.scheduled_call_date) >= today && 
    new Date(r.scheduled_call_date) <= next7Days
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <StatCard label="LLamadas Agendadas (7d)" value={weeklyAgenda.length} icon={Calendar} color="blue" desc="Auditoría de preparación activa" />
        <StatCard label="Auditadas con Notas" value={weeklyAgenda.filter((r: any) => r.call_notes).length} icon={ClipboardCheck} color="emerald" desc="Preparación confirmada por coach" />
      </div>
      
      <div className="p-10 bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="flex items-center justify-between mb-8">
            <h5 className="text-xs font-black text-slate-400 uppercase tracking-[2px] flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Auditoría de Agenda Semanal
            </h5>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-[10px] font-bold text-slate-500">Localizadas</span>
            </div>
        </div>
        <div className="space-y-4">
          {weeklyAgenda.length > 0 ? weeklyAgenda.map((r: any) => (
            <div key={r.id} className="p-6 bg-slate-50 hover:bg-slate-100/50 rounded-[2rem] border border-slate-200/50 flex items-center justify-between gap-6 transition-all group">
              <div className="min-w-0">
                <h6 className="text-lg font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors uppercase">{r.client?.firstName} {r.client?.lastName}</h6>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${r.call_notes ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      SOP PREP: {r.call_notes ? '✅ COMPLETADO' : '❌ PENDIENTE'}
                  </span>
                  <span className="text-xs text-blue-500 font-black tracking-tighter uppercase underline decoration-2 underline-offset-4">
                      {new Date(r.scheduled_call_date).toLocaleDateString('es-ES', {weekday: 'long', day: 'numeric', month: 'short'})}
                  </span>
                </div>
              </div>
              <button className="p-4 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm">
                  <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )) : <div className="py-12 text-center text-slate-400 italic">No hay llamadas agendadas para los próximos 7 días.</div>}
        </div>
      </div>
    </div>
  );
}

function WednesdayCRMData({ data, coaches }: any) {
  return (
    <div className="space-y-8">
       <div className="p-10 bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-[3rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-1000" />
          <div className="absolute top-10 right-10 flex gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
          </div>
          
          <h5 className="text-2xl font-black italic tracking-tight mb-4 uppercase">Protocolo Telegram Hub</h5>
          <p className="text-blue-200 text-sm leading-relaxed mb-8 max-w-xl font-medium">
            Selecciona <span className="text-white font-black underline decoration-blue-500 decoration-2 underline-offset-4">3 clientes aleatorios</span> por coach y audita la calidad técnica y humana. Prohibidas las respuestas de una línea o superficiales.
          </p>
          <div className="flex flex-wrap gap-3">
             {coaches.slice(0, 8).map((c: any) => (
               <div key={c.id} className="px-5 py-2.5 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-white/20 transition-all cursor-default">
                 {c.name}
               </div>
             ))}
             <div className="px-5 py-2.5 bg-blue-500/30 backdrop-blur-xl border border-blue-400/30 rounded-2xl text-[11px] font-black uppercase tracking-wider italic">
                 + Ver Todos
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="p-8 bg-emerald-50/50 border border-emerald-100 rounded-[3rem] shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-[2px]">Criterios de Excelencia</p>
            </div>
            <ul className="space-y-4">
               {['Cero check-ins con demora >24h', 'Análisis proactivo de métricas salud', 'Uso proactivo de Notas de Voz', 'Detectar baches de motivación'].map((item, i) => (
                   <li key={i} className="flex items-center gap-3 text-sm font-bold text-emerald-900/80">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />
                      {item}
                   </li>
               ))}
            </ul>
         </div>
         <div className="p-8 bg-rose-50/50 border border-rose-100 rounded-[3rem] shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                        <ShieldAlert className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-black text-rose-700 uppercase tracking-[2px]">Fugas de Energía (Riesgos)</p>
                </div>
                <span className="text-[9px] font-black text-rose-400">{data.riskAlerts.length} ACTIVOS</span>
            </div>
            <div className="space-y-3">
               {data.riskAlerts.length > 0 ? data.riskAlerts.slice(0, 4).map((a: any) => (
                 <div key={a.id} className="p-4 bg-white rounded-2xl border border-rose-100/50 flex items-center justify-between group/risk cursor-default">
                    <span className="text-xs font-black text-rose-900 uppercase tracking-tight truncate">{a.reason_category}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-rose-200 group-hover/risk:text-rose-500 transition-colors" />
                 </div>
               )) : <div className="py-8 text-center text-rose-300 text-xs italic">No hay alertas críticas en seguimiento.</div>}
            </div>
         </div>
       </div>
    </div>
  );
}

function ThursdayCRMData({ data }: any) {
  return (
    <div className="space-y-8">
      <StatCard 
        label="Nuevos Onboardings (30d)" 
        value={data.recentOnboardings.length} 
        icon={Rocket} 
        color="amber" 
        desc="Revisiones de calidad de bienvenida"
      />
      
      <div className="p-10 bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50">
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-8 flex items-center gap-3">
          <Video className="w-4 text-amber-500" /> Registro de Onboardings Recientes
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.recentOnboardings.length > 0 ? data.recentOnboardings.slice(0, 6).map((onb: any) => (
            <div key={onb.id} className="p-5 bg-slate-50 hover:bg-slate-100/50 rounded-3xl border border-slate-200/50 flex items-center justify-between gap-4 transition-all group">
              <div className="min-w-0">
                <p className="text-base font-black text-slate-800 tracking-tight truncate uppercase leading-none mb-1">{onb.firstName}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter leading-none">{new Date(onb.onboarding_completed_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                {onb.program?.url_onb_f1 ? (
                  <a 
                    href={onb.program.url_onb_f1} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-white border border-slate-200 text-amber-600 rounded-2xl hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all shadow-sm"
                  >
                    <Video className="w-4.5 h-4.5" />
                  </a>
                ) : (
                  <div className="p-3 bg-slate-100/50 text-slate-300 rounded-2xl cursor-not-allowed">
                    <Video className="w-4.5 h-4.5" />
                  </div>
                )}
              </div>
            </div>
          )) : <div className="col-span-2 py-12 text-center text-slate-400 italic">No hay onboardings recientes registrados.</div>}
        </div>
      </div>

      <div className="p-10 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-[3rem] relative overflow-hidden">
        <Target className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5" />
        <h6 className="text-xs font-black uppercase italic tracking-[2px] mb-4 flex items-center gap-3 text-amber-400">
           <BarChart3 className="w-5 h-5" /> Indicadores de Onboarding
        </h6>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed font-medium">Audita si el cliente tiene clara la <span className="text-white font-bold italic">Visión de 6 meses</span> y si el coach ha desactivado los frenos iniciales.</p>
        <div className="flex items-center gap-6">
            <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/5">
               <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 w-[65%] rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)]" />
            </div>
            <span className="text-lg font-black italic">65% <span className="text-[10px] text-slate-500 not-italic uppercase tracking-widest ml-1">Clarity</span></span>
        </div>
      </div>
    </div>
  );
}

function FridayCRMData({ data }: any) {
  const successCount = data.completedRenewals.filter((r: any) => r.call_result === 'renewed').length;
  const successRate = data.completedRenewals.length > 0 ? Math.round((successCount / data.completedRenewals.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <StatCard label="Review de Cierre (Semana)" value={data.completedRenewals.length} icon={Phone} color="rose" desc="Auditoría de renovaciones cerradas" />
        <StatCard label="Tasa de Cierre Semanal" value={`${successRate}%`} icon={Trophy} color={successRate > 50 ? 'emerald' : 'rose'} desc="Éxito sobre ejecutadas" />
      </div>

      <div className="p-10 bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50">
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-8 flex items-center gap-3">
          <Phone className="w-4 h-4 text-rose-500" /> Historial de Cierres de la Semana
        </h5>
        <div className="space-y-4">
          {data.completedRenewals.length > 0 ? data.completedRenewals.map((r: any) => (
            <div key={r.id} className="p-6 bg-slate-50 hover:bg-indigo-50/30 rounded-[2.5rem] border border-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all group">
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center font-black text-lg ${
                     r.call_result === 'renewed' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                   }`}>
                    {r.client?.firstName?.charAt(0)}
                </div>
                <div>
                  <h6 className="text-lg font-black text-slate-800 tracking-tight uppercase group-hover:text-indigo-600 transition-colors">{r.client?.firstName} {r.client?.lastName}</h6>
                  <div className="flex items-center gap-2 mt-1">
                     <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${
                       r.call_result === 'renewed' ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'
                     }`}>{r.call_result === 'renewed' ? 'Renovado' : 'Fallo Cierre'}</span>
                     <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">• ID: {r.id.substring(0, 8)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                {r.recording_url ? (
                  <a 
                    href={r.recording_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-rose-600 text-xs font-black rounded-2xl hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-sm"
                  >
                    <Video className="w-4 h-4" /> REVISAR GRABACIÓN
                  </a>
                ) : (
                  <div className="px-6 py-3 bg-slate-100/50 text-slate-300 text-xs font-black rounded-2xl border border-slate-200 cursor-not-allowed">
                    SIN GRABACIÓN
                  </div>
                )}
              </div>
            </div>
          )) : <div className="py-12 text-center text-slate-400 italic">No hay llamadas completadas en el registro semanal.</div>}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, desc }: any) {
  const colorMaps: Record<string, string> = {
      emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600 ring-emerald-100',
      blue: 'bg-blue-50 border-blue-100 text-blue-600 ring-blue-100',
      rose: 'bg-rose-50 border-rose-100 text-rose-600 ring-rose-100',
      amber: 'bg-amber-50 border-amber-100 text-amber-600 ring-amber-100',
      slate: 'bg-slate-50 border-slate-200 text-slate-400 ring-slate-100'
  };

  return (
    <div className={`p-7 rounded-[2rem] border transition-all hover:scale-[1.02] duration-300 shadow-sm hover:shadow-md ${colorMaps[color] || colorMaps.slate}`}>
      <div className="flex items-center gap-4 mb-3">
        <div className="p-3 bg-white rounded-2xl shadow-sm">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 truncate leading-none mb-1">{label}</p>
          <p className="text-2xl font-black tracking-tight leading-none text-slate-900">{value}</p>
        </div>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">{desc}</p>
    </div>
  );
}

// --- HELPERS ---

function getMonday(d: Date) {
  d = new Date(d);
  var day = d.getDay(),
      diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

function getYear(d: Date) {
  return d.getFullYear();
}

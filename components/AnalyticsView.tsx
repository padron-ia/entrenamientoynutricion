
import React, { useMemo, useState } from 'react';
import { Client, ClientStatus, User, UserRole } from '../types';
import {
   Users, TrendingUp, TrendingDown, Activity,
   UserPlus, UserMinus, BarChart3, Clock,
   ChevronLeft, ChevronRight, PieChart, Heart, Utensils, Dumbbell, Briefcase, Target, BrainCircuit, MapPin, Filter
} from 'lucide-react';
import {
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, Legend, PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';

interface AnalyticsViewProps {
   clients: Client[];
   user: User;
}

// --- COLORS ---
const COLORS = {
   primary: '#3b82f6',
   success: '#22c55e',
   warning: '#f59e0b',
   danger: '#ef4444',
   slate: '#64748b',
   purple: '#8b5cf6',
   pink: '#ec4899',
   cyan: '#06b6d4',
   indigo: '#6366f1'
};

const PIE_COLORS = [COLORS.primary, COLORS.pink, COLORS.slate, COLORS.warning, COLORS.purple, COLORS.success];

// --- HELPER COMPONENTS ---

const TabButton = ({ active, label, icon: Icon, onClick }: any) => (
   <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all border ${active
         ? 'bg-slate-800 text-white border-slate-800 shadow-md'
         : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
         }`}
   >
      <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
      {label}
   </button>
);

const ScopeToggle = ({ scope, setScope }: { scope: 'active' | 'all', setScope: (s: 'active' | 'all') => void }) => (
   <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
      <button
         onClick={() => setScope('active')}
         className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${scope === 'active'
            ? 'bg-white text-green-700 shadow-sm border border-slate-200'
            : 'text-slate-500 hover:text-slate-700'
            }`}
      >
         <div className={`w-2 h-2 rounded-full ${scope === 'active' ? 'bg-green-500' : 'bg-slate-300'}`} />
         Solo Activos
      </button>
      <button
         onClick={() => setScope('all')}
         className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${scope === 'all'
            ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
            : 'text-slate-500 hover:text-slate-700'
            }`}
      >
         <div className={`w-2 h-2 rounded-full ${scope === 'all' ? 'bg-blue-500' : 'bg-slate-300'}`} />
         Histórico Total
      </button>
   </div>
);

const SectionHeader = ({ title, subtitle, count }: { title: string, subtitle: string, count?: number }) => (
   <div className="mb-6 flex justify-between items-end">
      <div>
         <h3 className="text-lg font-bold text-slate-800">{title}</h3>
         <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {count !== undefined && (
         <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">
            n={count}
         </span>
      )}
   </div>
);

const StatCard = ({ title, value, subtitle, trend, trendColor = 'green', icon, colorClass, onClick }: any) => (
   <div
      onClick={onClick}
      className={`p-5 rounded-2xl shadow-sm border bg-white border-slate-200 hover:shadow-md transition-all flex flex-col justify-between h-full ${onClick ? 'cursor-pointer' : ''}`}
   >
      <div className="flex justify-between items-start mb-2">
         <div className={`p-2.5 rounded-xl ${colorClass.bg} ${colorClass.text}`}>
            {icon}
         </div>
         {trend && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 ${trendColor === 'green' ? 'bg-green-100 text-green-700' :
               trendColor === 'red' ? 'bg-red-100 text-red-700' :
                  trendColor === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
               }`}>
               {trendColor === 'green' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
               {trend}
            </span>
         )}
      </div>
      <div>
         <h3 className="text-2xl font-bold text-slate-800 mb-0.5">{value}</h3>
         <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100" dangerouslySetInnerHTML={{ __html: subtitle }}></p>}
   </div>
);

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ clients, user }) => {
   const [activeTab, setActiveTab] = useState<'business' | 'profile' | 'habits' | 'team'>('business');
   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
   const [dataScope, setDataScope] = useState<'active' | 'all'>('active');

   // --- FILTERED DATASET BASED ON SCOPE ---
   // This dataset is used for Profile and Habits tabs to allow toggling between Active vs All History
   const scopeClients = useMemo(() => {
      if (dataScope === 'all') return clients;
      return clients.filter(c => c.status === ClientStatus.ACTIVE);
   }, [clients, dataScope]);

   // --- TAB 1: BUSINESS LOGIC (Yearly Evolution) ---
   const businessData = useMemo(() => {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

      return months.map((monthName, idx) => {
         const startOfMonth = new Date(selectedYear, idx, 1);
         const endOfMonth = new Date(selectedYear, idx + 1, 0, 23, 59, 59);

         // 1. New Clients (Altas) in this month
         const newClients = clients.filter(c => {
            if (!c.start_date) return false;
            const d = new Date(c.start_date);
            return d.getMonth() === idx && d.getFullYear() === selectedYear;
         }).length;

         // 2. Churn (Bajas + Abandonos) in this month
         const churn = clients.filter(c => {
            // Check Inactive Date (Baja normal)
            if (c.inactiveDate) {
               const d = new Date(c.inactiveDate);
               if (d.getMonth() === idx && d.getFullYear() === selectedYear) return true;
            }
            // Check Abandonment Date (Abandono)
            if (c.abandonmentDate) {
               const d = new Date(c.abandonmentDate);
               if (d.getMonth() === idx && d.getFullYear() === selectedYear) return true;
            }
            return false;
         }).length;

         // 3. Active Snapshot (Active Inventory at end of month)
         const activeAtEnd = clients.filter(c => {
            const startStr = c.start_date || c.registration_date;
            if (!startStr) return false;
            const start = new Date(startStr);
            if (start > endOfMonth) return false;

            const isCurrentlyActive = c.status === ClientStatus.ACTIVE || c.status === ClientStatus.PAUSED;
            const leaveDateStr = c.abandonmentDate || c.inactiveDate;

            // Si es activo hoy: lo contamos (porque ya verificamos que empezó antes del fin de este mes)
            if (isCurrentlyActive) return true;

            // Si NO es activo hoy: solo lo contamos si tenemos su fecha de salida
            // y esta es POSTERIOR al fin del mes que estamos analizando.
            if (leaveDateStr) {
               const leaveDate = new Date(leaveDateStr);
               return !isNaN(leaveDate.getTime()) && leaveDate > endOfMonth;
            }

            // Si es una Baja sin fecha demostrable, no lo contamos para no inflar la gráfica.
            return false;
         }).length;

         return {
            name: monthName,
            active: activeAtEnd,
            new: newClients,
            churn: churn,
            growth: newClients - churn
         };
      });
   }, [clients, selectedYear]);

   // --- TAB 2: PROFILE LOGIC (Demographics & Health) ---
   const profileData = useMemo(() => {
      const dataset = scopeClients; // Uses filtered data
      const total = dataset.length || 1;

      // 1. Gender Distribution
      const genderStats = { 'Hombre': 0, 'Mujer': 0, 'Otro/Sin especificar': 0 };
      dataset.forEach(c => {
         const g = (c.gender || '').toLowerCase().trim();
         if (g === 'hombre' || g === 'masculino' || g === 'male') genderStats['Hombre']++;
         else if (g === 'mujer' || g === 'femenino' || g === 'female') genderStats['Mujer']++;
         else genderStats['Otro/Sin especificar']++;
      });

      const genderData = [
         { name: 'Hombres', value: genderStats['Hombre'] },
         { name: 'Mujeres', value: genderStats['Mujer'] },
         { name: 'Otros', value: genderStats['Otro/Sin especificar'] }
      ].filter(d => d.value > 0);

      const percentWomen = Math.round((genderStats['Mujer'] / total) * 100);
      const percentMen = Math.round((genderStats['Hombre'] / total) * 100);

      // 2. Age Ranges & Average Calculation (Corrected)
      const ageRanges = { '18-30': 0, '31-40': 0, '41-50': 0, '51-60': 0, '+60': 0 };
      let ageSum = 0;
      let ageCount = 0;

      dataset.forEach(c => {
         // FILTRO MEJORADO: Usamos 'age' o 'ageVisual' como fallback
         // Y bajamos el umbral mínimo a 5 años (Diabetes Tipo 1 infantil)
         const val = (c.age && c.age > 0) ? c.age : (c.ageVisual && c.ageVisual > 0 ? c.ageVisual : 0);

         if (val && val >= 5 && val < 100) {
            ageSum += val;
            ageCount++;

            if (val <= 30) ageRanges['18-30']++;
            else if (val <= 40) ageRanges['31-40']++;
            else if (val <= 50) ageRanges['41-50']++;
            else if (val <= 60) ageRanges['51-60']++;
            else ageRanges['+60']++;
         }
      });
      const avgAge = ageCount > 0 ? (ageSum / ageCount).toFixed(1) : "N/A";
      const ageData = Object.entries(ageRanges).map(([name, value]) => ({ name, value }));

      // 3. Geographic Distribution (Provinces)
      const geoStats: Record<string, number> = {};
      dataset.forEach(c => {
         let p = c.province ? c.province.trim().toLowerCase() : 'sin especificar';
         if (!p || p === '') p = 'sin especificar';
         // Capitalize
         p = p.charAt(0).toUpperCase() + p.slice(1);
         geoStats[p] = (geoStats[p] || 0) + 1;
      });

      const geoData = Object.entries(geoStats)
         .map(([name, value]) => ({ name, value }))
         .sort((a, b) => b.value - a.value)
         .slice(0, 10); // Top 10 Provinces

      // 4. Diabetes Type (UPDATED LOGIC)
      const diabetesStats = { 'Tipo 1': 0, 'Tipo 2': 0, 'No Diabético': 0, 'Otros': 0 };
      dataset.forEach(c => {
         const type = c.medical.diabetesType;
         if (type === 'Type 1') diabetesStats['Tipo 1']++;
         else if (type === 'Type 2') diabetesStats['Tipo 2']++;
         else if (type === 'N/A') diabetesStats['No Diabético']++;
         else diabetesStats['Otros']++; // Gestational, Prediabetes
      });
      const diabetesData = Object.entries(diabetesStats).map(([name, value]) => ({ name, value }));
      const t1Count = diabetesStats['Tipo 1'];
      const t2Count = diabetesStats['Tipo 2'];
      const t1Percent = Math.round((t1Count / total) * 100);
      const t2Percent = Math.round((t2Count / total) * 100);

      // 5. Pathologies (Simple Keyword Match)
      const pathologyKeywords = ['tiroides', 'hipotiroidismo', 'hipertensión', 'colesterol', 'sop', 'ansiedad', 'depresión', 'obesidad'];
      const pathStats: Record<string, number> = {};
      dataset.forEach(c => {
         const text = (c.medical.pathologies || '').toLowerCase() + ' ' + (c.medical.otherConditions || '').toLowerCase();
         pathologyKeywords.forEach(k => {
            if (text.includes(k)) pathStats[k] = (pathStats[k] || 0) + 1;
         });
      });
      const pathData = Object.entries(pathStats)
         .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
         .sort((a, b) => b.value - a.value);

      return {
         genderData, percentWomen, percentMen,
         ageData, avgAge, ageCount,
         geoData,
         diabetesData, t1Count, t2Count, t1Percent, t2Percent,
         pathData,
         total
      };
   }, [scopeClients, dataScope]); // Added explicit dataScope dependency

   // --- TAB 3: HABITS & RISK LOGIC ---
   const habitsData = useMemo(() => {
      const dataset = scopeClients; // Uses filtered data
      const total = dataset.length || 1;

      // 1. Steps Distribution
      const stepsStats = { 'Sedentario (<3k)': 0, 'Bajo (3-7k)': 0, 'Moderado (7-10k)': 0, 'Activo (>10k)': 0 };
      let stepsSum = 0;
      let stepsCount = 0;
      dataset.forEach(c => {
         const s = c.training.stepsGoal || 0;
         if (s > 0) {
            stepsSum += s;
            stepsCount++;
            if (s < 3000) stepsStats['Sedentario (<3k)']++;
            else if (s < 7500) stepsStats['Bajo (3-7k)']++;
            else if (s < 10000) stepsStats['Moderado (7-10k)']++;
            else stepsStats['Activo (>10k)']++;
         }
      });
      const avgSteps = stepsCount > 0 ? Math.round(stepsSum / stepsCount) : 0;
      const stepsData = Object.entries(stepsStats).map(([name, value]) => ({ name, value }));

      // 2. Nutrition Habits (Boolean Flags)
      const habits = {
         'Pica entre horas': 0,
         'Cocina propia': 0,
         'Come con pan': 0,
         'Pesa comida': 0,
         'Come fuera (>2/sem)': 0
      };

      dataset.forEach(c => {
         if (c.nutrition.snacking) habits['Pica entre horas']++;
         if (c.nutrition.cooksForSelf) habits['Cocina propia']++;
         if (c.nutrition.eatsWithBread) habits['Come con pan']++;
         if (c.nutrition.willingToWeighFood) habits['Pesa comida']++;
         if ((c.nutrition.mealsOutPerWeek || 0) > 2) habits['Come fuera (>2/sem)']++;
      });

      const habitsChartData = Object.entries(habits).map(([name, value]) => ({
         name,
         value,
         percent: Math.round((value / total) * 100)
      })).sort((a, b) => b.value - a.value);

      return { stepsData, avgSteps, habitsChartData, total };
   }, [scopeClients, dataScope]);

   // --- TAB 4: TEAM PERFORMANCE LOGIC ---
   // Team stats usually need FULL history to calculate Churn vs Active correctly
   const teamData = useMemo(() => {
      const stats: Record<string, { active: number, renewals: number, totalCandidates: number, churn: number }> = {};

      // Initialize stats
      clients.forEach(c => {
         const coach = c.property_coach || 'Sin Asignar';
         if (!stats[coach]) stats[coach] = { active: 0, renewals: 0, totalCandidates: 0, churn: 0 };

         // Active Count
         if (c.status === ClientStatus.ACTIVE) stats[coach].active++;

         // Churn Count (Historical)
         if (c.status === ClientStatus.INACTIVE || c.status === ClientStatus.DROPOUT) stats[coach].churn++;

         // Renewal Rate
         if (c.program_duration_months) {
            stats[coach].totalCandidates++;
            if (c.program.renewal_f2_contracted) stats[coach].renewals++;
         }
      });

      return Object.entries(stats).map(([name, data]) => ({
         name,
         active: data.active,
         churn: data.churn,
         retentionRate: data.totalCandidates > 0 ? Math.round((data.renewals / data.totalCandidates) * 100) : 0,
         workload: Math.round((data.active / (clients.filter(cl => cl.status === ClientStatus.ACTIVE).length || 1)) * 100)
      })).sort((a, b) => b.active - a.active);

   }, [clients]);


   // --- RENDER ---
   return (
      <div className="space-y-6 pb-20 font-sans">

         {/* HEADER & TABS */}
         <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div>
               <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-indigo-600" />
                  Cuadro de Mando
               </h1>
               <p className="text-sm text-slate-500 mt-1">Inteligencia de negocio y análisis de cartera.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
               {/* DATA SCOPE TOGGLE (Only relevant for Profile/Habits) */}
               {(activeTab === 'profile' || activeTab === 'habits') && (
                  <ScopeToggle scope={dataScope} setScope={setDataScope} />
               )}

               <div className="flex flex-wrap gap-2">
                  <TabButton active={activeTab === 'business'} label="Negocio" icon={TrendingUp} onClick={() => setActiveTab('business')} />
                  <TabButton active={activeTab === 'profile'} label="Perfil Cliente" icon={Users} onClick={() => setActiveTab('profile')} />
                  <TabButton active={activeTab === 'habits'} label="Hábitos & Riesgo" icon={BrainCircuit} onClick={() => setActiveTab('habits')} />
                  <TabButton active={activeTab === 'team'} label="Equipo" icon={Briefcase} onClick={() => setActiveTab('team')} />
               </div>
            </div>
         </div>

         {/* --- CONTENT AREA --- */}

         {/* TAB 1: BUSINESS */}
         {activeTab === 'business' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               {/* Business KPIs */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard
                     title="Crecimiento Neto (Año)"
                     value={businessData.reduce((acc, m) => acc + m.growth, 0)}
                     icon={<TrendingUp className="w-6 h-6" />}
                     colorClass={{ bg: 'bg-green-100', text: 'text-green-600' }}
                     subtitle="Nuevos - Bajas"
                  />
                  <StatCard
                     title="Tasa de Captación"
                     value={`${businessData.reduce((acc, m) => acc + m.new, 0)}`}
                     icon={<UserPlus className="w-6 h-6" />}
                     colorClass={{ bg: 'bg-blue-100', text: 'text-blue-600' }}
                     subtitle="Clientes Nuevos totales"
                  />
                  <StatCard
                     title="Bajas Totales"
                     value={businessData.reduce((acc, m) => acc + m.churn, 0)}
                     icon={<UserMinus className="w-6 h-6" />}
                     colorClass={{ bg: 'bg-red-50', text: 'text-red-600' }}
                     subtitle="Clientes perdidos"
                     trendColor="red"
                  />
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <SectionHeader title="Evolución de Cartera Activa" subtitle="Clientes activos al cierre de cada mes (Histórico)" />
                  <div className="h-80 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={businessData}>
                           <defs>
                              <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.2} />
                                 <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                           <RechartsTooltip contentStyle={{ borderRadius: '12px' }} />
                           <Area type="monotone" dataKey="active" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorActive)" name="Activos" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <SectionHeader title="Flujo de Entradas vs Salidas" subtitle="Comparativa mensual de altas vs bajas" />
                  <div className="h-80 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={businessData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                           <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px' }} />
                           <Legend />
                           <Bar dataKey="new" name="Altas" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                           <Bar dataKey="churn" name="Bajas" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
         )}

         {/* TAB 2: PROFILE */}
         {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               {/* KPI ROW */}
               <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex flex-col justify-center items-center text-center relative overflow-hidden">
                     <span className="text-3xl font-bold text-indigo-700 relative z-10">{profileData.avgAge}</span>
                     <span className="text-xs uppercase font-bold text-indigo-400 mt-1 relative z-10">Edad Media</span>
                     <span className="text-[10px] text-indigo-300 relative z-10 mt-0.5">Basado en {profileData.ageCount} clientes</span>
                     <Activity className="absolute -bottom-4 -right-4 w-20 h-20 text-indigo-100 z-0" />
                  </div>

                  {/* Gender KPIs Breakdown */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col justify-center gap-2">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Users className="w-4 h-4" /></div>
                           <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-700">Hombres</span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                 {profileData.genderData.find(d => d.name === 'Hombres')?.value || 0} alumnos
                              </span>
                           </div>
                        </div>
                        <span className="text-xl font-bold text-blue-600">{profileData.percentMen}%</span>
                     </div>
                     <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${profileData.percentMen}%` }}></div>
                     </div>

                     <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                           <div className="p-2 bg-pink-100 text-pink-600 rounded-lg"><Users className="w-4 h-4" /></div>
                           <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-700">Mujeres</span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                 {profileData.genderData.find(d => d.name === 'Mujeres')?.value || 0} alumnas
                              </span>
                           </div>
                        </div>
                        <span className="text-xl font-bold text-pink-600">{profileData.percentWomen}%</span>
                     </div>
                     <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-pink-500 h-full rounded-full" style={{ width: `${profileData.percentWomen}%` }}></div>
                     </div>
                  </div>

                  {/* DIABETES T1 CARD */}
                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col justify-center items-center text-center">
                     <span className="text-lg font-bold text-blue-700 uppercase leading-tight mb-2">Diabetes Tipo 1</span>
                     <span className="text-3xl font-bold text-blue-600">{profileData.t1Count}</span>
                     <span className="text-sm font-bold text-blue-400">alumnos ({profileData.t1Percent}%)</span>
                  </div>

                  {/* DIABETES T2 CARD (NEW) */}
                  <div className="bg-cyan-50 p-6 rounded-2xl border border-cyan-100 flex flex-col justify-center items-center text-center">
                     <span className="text-lg font-bold text-cyan-700 uppercase leading-tight mb-2">Diabetes Tipo 2</span>
                     <span className="text-3xl font-bold text-cyan-600">{profileData.t2Count}</span>
                     <span className="text-sm font-bold text-cyan-400">alumnos ({profileData.t2Percent}%)</span>
                  </div>

                  {/* TOP PATHOLOGY */}
                  <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 flex flex-col justify-center items-center text-center">
                     {(() => {
                        const topPath = profileData.pathData.length > 0 ? profileData.pathData[0] : null;
                        return (
                           <>
                              <span className="text-2xl font-bold text-purple-700 truncate w-full px-2">
                                 {topPath ? topPath.name : '-'}
                              </span>
                              {topPath && (
                                 <span className="text-sm font-bold text-purple-600/80 mb-1">
                                    {topPath.value} casos ({Math.round((topPath.value / profileData.total) * 100)}%)
                                 </span>
                              )}
                              <span className="text-xs uppercase font-bold text-purple-400">Top Patología</span>
                           </>
                        );
                     })()}
                  </div>
               </div>

               {/* CHARTS ROW 1: GENDER & AGE */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <SectionHeader title="Distribución por Sexo" subtitle={`Composición de género (${dataScope === 'active' ? 'Activos' : 'Histórico'})`} count={profileData.total} />
                     <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                           <RechartsPieChart>
                              <Pie
                                 data={profileData.genderData}
                                 dataKey="value"
                                 nameKey="name"
                                 cx="50%" cy="50%"
                                 innerRadius={60}
                                 outerRadius={80}
                                 paddingAngle={5}
                              >
                                 <Cell fill={COLORS.primary} />
                                 <Cell fill={COLORS.pink} />
                                 <Cell fill={COLORS.slate} />
                              </Pie>
                              <RechartsTooltip contentStyle={{ borderRadius: '12px' }} />
                              <Legend verticalAlign="bottom" height={36} />
                           </RechartsPieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <SectionHeader title="Grupos de Edad" subtitle="Distribución demográfica por rangos" />
                     <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={profileData.ageData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" width={50} tick={{ fontSize: 12 }} />
                              <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px' }} />
                              <Bar dataKey="value" fill={COLORS.indigo} radius={[0, 4, 4, 0]} barSize={24} name="Clientes" />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>

               {/* CHARTS ROW 2: GEOGRAPHY (NEW) */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                     <SectionHeader title="Distribución Geográfica (Top 10)" subtitle="Provincias con mayor número de clientes" />
                     <div className="p-2 bg-slate-100 rounded-full text-slate-500">
                        <MapPin className="w-5 h-5" />
                     </div>
                  </div>

                  <div className="h-72">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={profileData.geoData} layout="vertical" margin={{ left: 20 }}>
                           <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                           <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px' }} />
                           <Bar dataKey="value" fill={COLORS.cyan} radius={[0, 4, 4, 0]} barSize={20} name="Clientes" />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* CHARTS ROW 3: HEALTH */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <SectionHeader title="Patologías Frecuentes" subtitle="Condiciones asociadas detectadas en la ficha médica" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {profileData.pathData.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                           <span className="font-medium text-slate-700 text-sm">{p.name}</span>
                           <span className="bg-white px-2 py-1 rounded text-xs font-bold text-slate-500 border border-slate-200 shadow-sm">{p.value}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}

         {/* TAB 3: HABITS & RISK */}
         {activeTab === 'habits' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard
                     title="Promedio Pasos"
                     value={habitsData.avgSteps.toLocaleString()}
                     icon={<Dumbbell className="w-6 h-6" />}
                     colorClass={{ bg: 'bg-emerald-100', text: 'text-emerald-600' }}
                     subtitle="Media diaria reportada"
                  />
                  <StatCard
                     title="Sedentarismo Crítico"
                     value={`${Math.round(((habitsData.stepsData.find(s => s.name.includes('<3k'))?.value || 0) / habitsData.total) * 100)}%`}
                     icon={<Activity className="w-6 h-6" />}
                     colorClass={{ bg: 'bg-red-50', text: 'text-red-600' }}
                     subtitle="Clientes con < 3.000 pasos"
                     trendColor="red"
                  />
                  <StatCard
                     title="Riesgo Nutricional"
                     value={`${Math.round(((habitsData.habitsChartData.find(h => h.name === 'Pica entre horas')?.value || 0) / habitsData.total) * 100)}%`}
                     icon={<Utensils className="w-6 h-6" />}
                     colorClass={{ bg: 'bg-amber-100', text: 'text-amber-600' }}
                     subtitle="Pican entre horas"
                     trendColor="amber"
                  />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <SectionHeader title="Nivel de Actividad (Pasos)" subtitle="Segmentación por movimiento diario" count={habitsData.total} />
                     <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={habitsData.stepsData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                              <YAxis hide />
                              <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px' }} />
                              <Bar dataKey="value" fill={COLORS.success} radius={[4, 4, 0, 0]} name="Clientes" />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <SectionHeader title="Hábitos de Riesgo" subtitle="Frecuencia de conductas reportadas" />
                     <div className="space-y-4">
                        {habitsData.habitsChartData.map((h, idx) => (
                           <div key={idx} className="relative">
                              <div className="flex justify-between text-sm mb-1">
                                 <span className="font-medium text-slate-700">{h.name}</span>
                                 <span className="font-bold text-slate-900">{h.percent}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                 <div
                                    className={`h-2.5 rounded-full ${h.percent > 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                    style={{ width: `${h.percent}%` }}
                                 ></div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* TAB 4: TEAM */}
         {activeTab === 'team' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                     <SectionHeader title="Rendimiento del Equipo" subtitle="Carga de trabajo y métricas de retención por Coach" />
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                              <th className="px-6 py-4 font-semibold">Coach</th>
                              <th className="px-6 py-4 font-semibold text-center">Clientes Activos</th>
                              <th className="px-6 py-4 font-semibold text-center">Carga (%)</th>
                              <th className="px-6 py-4 font-semibold text-center">Tasa Renovación</th>
                              <th className="px-6 py-4 font-semibold text-center">Bajas Históricas</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {teamData.map((coach, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                 <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                                          {coach.name.charAt(0)}
                                       </div>
                                       <span className="font-medium text-slate-800">{coach.name}</span>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                    <span className="font-bold text-lg text-slate-800">{coach.active}</span>
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                       <div className="w-16 bg-slate-100 rounded-full h-1.5">
                                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(coach.workload, 100)}%` }}></div>
                                       </div>
                                       <span className="text-xs text-slate-500">{coach.workload}%</span>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${coach.retentionRate >= 80 ? 'bg-green-100 text-green-700' :
                                       coach.retentionRate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                       }`}>
                                       {coach.retentionRate}%
                                    </span>
                                 </td>
                                 <td className="px-6 py-4 text-center text-slate-500">
                                    {coach.churn}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}

      </div>
   );
};

export default AnalyticsView;

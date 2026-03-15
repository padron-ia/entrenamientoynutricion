import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { nutritionService } from '../services/nutritionService';
import { nutritionSpecialRequestsService } from '../services/nutritionSpecialRequestsService';
import { trainingSpecialRequestsService } from '../services/trainingSpecialRequestsService';
import { Client, ClientStatus, WeeklyCheckin, User as CRMUser, UserRole, CoachGoal, GoalCompletionStatus, WeeklyCoachReview, MonthlyReview, QuarterlyReview } from '../types';
import WeeklyAssessmentSection, { WeeklyAssessmentData, GoalAssessment } from './WeeklyAssessmentSection';
import ProcessDataCard from './ProcessDataCard';
import QuarterlyReviewPanel from './QuarterlyReviewPanel';
import { saveWeeklyCoachReview, updateGoalAssessment as updateGoalAssessmentDB, getWeekNumber, formatWeekStart, getMonthlyReviews, getQuarterlyReviews, getWeeklyCoachReviews } from '../services/processTrackingService';
import { mockAdmin, mockDb } from '../services/mockSupabase';
import PerformanceReviewDashboard from './PerformanceReviewDashboard';
import { PERMISSIONS, checkPermission } from '../utils/permissions';
import { ClientTestimonialManager } from './ClientTestimonialManager';
import {
   ArrowLeft, User, MapPin,
   Activity, Target,
   Utensils, Dumbbell, AlertCircle, HeartPulse,
   Save, X, Edit3, Clock, Briefcase,
   TrendingDown, TrendingUp, Calendar, CheckCircle2, Circle, PauseCircle, AlertOctagon,
   Quote, Zap, Award, Flame, ChevronRight, Droplets, Droplet, Moon, Video, PlayCircle, Lock,
   FileText, ExternalLink, Trophy, Stethoscope, CreditCard, Image as ImageIcon,
   Loader2, Upload, History, Play, UserPlus, FileCheck, FileX, Rocket, MessageSquare,
   MoreVertical, ChevronDown, Phone, Send, Eye, EyeOff, RefreshCw, UserX, XCircle, Scale, ClipboardCheck, CalendarCheck, Footprints, RotateCcw, ShieldAlert, Apple, Ban, Heart, StickyNote, ClipboardList, Brain, Pill, Trash2, BarChart3, Sparkles
} from 'lucide-react';
import { pauseService } from '../services/pauseService';
import { normalizePhone, isValidPhone, PHONE_HELP_TEXT, PHONE_PLACEHOLDER } from '../utils/phoneUtils';
import {
   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area, BarChart, Bar
} from 'recharts';
import { useToast } from './ToastProvider';
import MedicalReviews from './MedicalReviews';
import EndocrinoAssessmentSection from './EndocrinoAssessmentSection';
import MonthlyReviewPanel from './MonthlyReviewPanel';
import { checkAndUnlockAchievements } from '../services/achievementService';
import { GlucoseHistoryTable } from './GlucoseHistoryTable';
import { InvitationLinkModal } from './InvitationLinkModal';
import { ClientImportantNotes } from './ClientImportantNotes';
import { ClientRiskAlertSection } from './ClientRiskAlertSection';
import RenewalTimeline from './RenewalTimeline';
import { ClientNutritionSelector } from './nutrition/ClientNutritionSelector';
import { generateContractHTML, calculateDaysFromMonths, getMesesList, ContractData } from '../utils/contractTemplate';
import { getContractHistory, saveContractToHistory, deleteContractFromHistory, ContractHistoryRecord } from '../services/contractHistoryService';
import { StepsCard, StepsSummary } from './client-portal/StepsCard';
import ClientMaterials from './ClientMaterials';
import { SuccessRoadmapEditor, SuccessRoadmapEditorRef } from './SuccessRoadmapEditor';
import { SuccessCompass } from './SuccessCompass';
import { OptimizationSurveyCard } from './OptimizationSurveyCard';
import { ClientTrainingSelector } from './training/ClientTrainingSelector';
import { ClientWorkoutHistory } from './training/ClientWorkoutHistory';
import { StrengthBenchmarksManager } from './training/StrengthBenchmarksManager';
import { getMissingMandatoryClientFields, isMandatoryClientOnboardingEnforced } from '../utils/clientOnboardingRequirements';

interface ClientDetailProps {
   client: Client;
   onBack: () => void;
   onUpdateStatus: (clientId: string, status: ClientStatus, additionalData?: Partial<Client>) => void;
   onSave: (client: Client) => Promise<void>;
   readOnly?: boolean;
   onViewAsClient?: () => void;
   currentUser?: CRMUser;
   coaches: CRMUser[];
   initialTab?: 'overview' | 'seguimiento' | 'performance' | 'health' | 'program' | 'contract' | 'materials';
}

interface NutritionSpecialRequestFormData {
   priority: 'normal' | 'high';
   target_date: string;
   current_kcal: string;
   desired_kcal: string;
   request_reason: string;
   requested_changes: string;
   requested_goal: string;
   diseases: string;
   pathologies: string;
   medication: string;
   allergies: string;
   excluded_foods: string;
   preferred_diet: string;
   coach_notes: string;
   confirmation_checked: boolean;
}

interface NutritionSpecialRequestValidationErrors {
   request_reason?: string;
   requested_changes?: string;
   requested_goal?: string;
   confirmation_checked?: string;
}

interface TrainingSpecialRequestFormData {
   priority: 'normal' | 'high';
   target_date: string;
   current_sessions_per_week: string;
   desired_sessions_per_week: string;
   request_reason: string;
   requested_changes: string;
   requested_goal: string;
   activity_level: string;
   steps_goal: string;
   strength_experience: string;
   training_location: string;
   availability: string;
   limitations: string;
   equipment: string;
   coach_notes: string;
   confirmation_checked: boolean;
}

interface TrainingSpecialRequestValidationErrors {
   request_reason?: string;
   requested_changes?: string;
   requested_goal?: string;
   confirmation_checked?: string;
}

// --- HELPER FUNCTIONS ---

const getStatusColor = (status: ClientStatus) => {
   switch (status) {
      case ClientStatus.ACTIVE: return 'bg-green-100 text-green-700';
      case ClientStatus.INACTIVE: return 'bg-slate-100 text-slate-600';
      case ClientStatus.PAUSED: return 'bg-amber-100 text-amber-700';
      case ClientStatus.DROPOUT: return 'bg-red-100 text-red-700';
      case ClientStatus.COMPLETED: return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
   }
};

const getStatusLabel = (status: ClientStatus) => {
   switch (status) {
      case ClientStatus.ACTIVE: return 'Activo';
      case ClientStatus.INACTIVE: return 'Baja';
      case ClientStatus.PAUSED: return 'Pausa';
      case ClientStatus.DROPOUT: return 'Abandono';
      case ClientStatus.COMPLETED: return 'Completado';
      default: return status;
   }
};



const MetricCard = ({ label, value, sub }: { label: string, value: any, sub?: React.ReactNode }) => (
   <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</span>
      <span className="text-lg font-bold text-slate-800">{value}</span>
      {sub && <span className="text-xs text-slate-500 mt-1">{sub}</span>}
   </div>
);

const StressBar = ({ value }: { value: any }) => {
   const level = Number(value) || 0;
   return (
      <div className="space-y-1.5">
         <div className="flex justify-between text-xs font-medium text-slate-500">
            <span>Nivel de estrés</span>
            <span className="font-bold text-slate-800">{level}/10</span>
         </div>
         <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div className={`h-full ${level > 7 ? 'bg-red-500' : level > 4 ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${(level / 10) * 100}%` }} />
         </div>
      </div>
   );
};

const BoolChip = ({ value, label, type = 'danger' }: { value?: boolean | null | string, label: string, type?: 'danger' | 'warning' | 'success' | 'neutral' }) => {
   const isTrue = value === true || value === 'true' || value === 'Sí' || value === 'Si' || value === 'Yes' || value === 'yes';
   const isFalse = value === false || value === 'false' || value === 'No' || value === 'no';
   if (!isTrue && !isFalse) return null;

   let colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
   if (isTrue) {
      if (type === 'danger') colorClass = 'bg-red-50 text-red-700 border-red-200 font-medium';
      if (type === 'warning') colorClass = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
      if (type === 'success') colorClass = 'bg-green-50 text-green-700 border-green-200 font-medium';
   }

   return (
      <div className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${colorClass}`}>
         <span>{label}</span>
         <span className="font-bold ml-2">{isTrue ? 'SÍ' : 'NO'}</span>
      </div>
   );
};

const CollapsibleText = ({ title, text, lines = 2 }: { title?: string, text: string, lines?: number }) => {
   const [open, setOpen] = useState(false);
   if (!text) return null;
   return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
         <button onClick={() => setOpen(!open)} className="w-full px-4 py-3 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <span className="font-semibold text-sm text-slate-700">{title || 'Ver detalles'}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
         </button>
         {open && <div className="p-4 text-sm text-slate-600 border-t border-slate-100 bg-white whitespace-pre-wrap">{text}</div>}
      </div>
   );
};

const MedChips = ({ text }: { text?: string }) => {
   if (!text) return <span className="text-slate-400 italic text-sm">Ninguna</span>;
   const chips = text.split(',').map(s => s.trim()).filter(Boolean);
   return (
      <div className="flex flex-wrap gap-2">
         {chips.map((c, i) => (
            <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium border border-slate-200">
               {c}
            </span>
         ))}
      </div>
   );
};


// --- DATA FIELD COMPONENT (CRM VIEW) ---
interface DataFieldProps {
   label: string;
   value: any;
   path?: string;
   type?: string;
   options?: any[];
   className?: string;
   isTextArea?: boolean;
   onChange?: (val: any) => void;
   readOnly?: boolean;
   isEditing: boolean;
   onUpdate: (path: string, value: any) => void;
   onQuickSave?: (path: string, value: any) => Promise<void>;
}

const DataField: React.FC<DataFieldProps> = ({
   label, value, path, type = "text", options = [], className = "", isTextArea = false, onChange, readOnly = false, isEditing, onUpdate, onQuickSave
}) => {
   const [isQuickEditing, setIsQuickEditing] = useState(false);
   const [tempValue, setTempValue] = useState(value);
   const [isSaving, setIsSaving] = useState(false);

   // Sincronizar tempValue cuando cambia el valor real
   useEffect(() => {
      if (!isQuickEditing) {
         setTempValue(value);
      }
   }, [value, isQuickEditing]);

   const handleChange = (e: any) => {
      let val = type === 'checkbox' ? e.target.checked : (type === 'number' ? Number(e.target.value) : e.target.value);

      // Auto-normalization for phone fields
      if (label === 'Teléfono' && typeof val === 'string') {
         val = normalizePhone(val);
      }

      // Convert to number for duration fields
      if (type === 'select' && path && (path.includes('duration') || path === 'program_duration_months')) {
         val = val ? parseInt(val, 10) : 0;
      }

      if (isQuickEditing) {
         setTempValue(val);
      } else {
         if (onChange) onChange(val);
         else if (path) onUpdate(path, val);
      }
   };

   const handleStartQuickEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      setTempValue(value);
      setIsQuickEditing(true);
   };

   const handleCancelQuickEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      setTempValue(value);
      setIsQuickEditing(false);
   };

   const handleSaveQuickEdit = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onQuickSave && path) {
         setIsSaving(true);
         try {
            await onQuickSave(path, tempValue);
            setIsQuickEditing(false);
         } finally {
            setIsSaving(false);
         }
      }
   };

   // Premium input styles
   const inputBaseStyle = "w-full text-sm p-3 border border-slate-200 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200 hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm";
   const selectStyle = "w-full text-sm p-3 border border-slate-200 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200 hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm cursor-pointer";
   const checkboxStyle = "w-5 h-5 text-blue-600 rounded-lg focus:ring-2 focus:ring-blue-200 border-slate-300 transition-all duration-200 cursor-pointer";

   if ((isEditing || isQuickEditing) && (path || onChange) && !readOnly) {
      const currentVal = isQuickEditing ? tempValue : value;

      if (type === 'checkbox') {
         return (
            <div className={`mb-4 flex items-center justify-between group ${className}`}>
               <div className="flex items-center gap-3">
                  <input type="checkbox" checked={!!currentVal} onChange={handleChange} className={checkboxStyle} />
                  <label className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors cursor-pointer select-none">{label}</label>
               </div>
               {isQuickEditing && (
                  <div className="flex items-center gap-1">
                     <button
                        onClick={handleSaveQuickEdit}
                        disabled={isSaving}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50"
                        title="Guardar"
                     >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                     </button>
                     <button
                        onClick={handleCancelQuickEdit}
                        disabled={isSaving}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
                        title="Cancelar"
                     >
                        <X className="w-3.5 h-3.5" />
                     </button>
                  </div>
               )}
            </div>
         );
      }
      return (
         <div className={`mb-4 ${className}`}>
            <div className="flex justify-between items-center mb-1.5">
               <label className="block text-[11px] text-slate-500 uppercase font-bold tracking-wider">{label}</label>
               {isQuickEditing && (
                  <div className="flex items-center gap-1">
                     <button
                        onClick={handleSaveQuickEdit}
                        disabled={isSaving}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50"
                        title="Guardar"
                     >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                     </button>
                     <button
                        onClick={handleCancelQuickEdit}
                        disabled={isSaving}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
                        title="Cancelar"
                     >
                        <X className="w-3.5 h-3.5" />
                     </button>
                  </div>
               )}
            </div>
            {type === 'select' ? (
               <select value={String(currentVal || '')} onChange={handleChange} className={selectStyle}>
                  <option value="">- Seleccionar -</option>
                  {options.map((opt: any) => {
                     const optValue = typeof opt === 'string' ? opt : opt.value;
                     const optLabel = typeof opt === 'string' ? opt : opt.label;
                     return <option key={optValue} value={optValue}>{optLabel}</option>;
                  })}
               </select>
            ) : isTextArea ? (
               <textarea value={String(currentVal || '')} onChange={handleChange} rows={3} className={`${inputBaseStyle} resize-none`} autoFocus={isQuickEditing} />
            ) : type === 'date' ? (
               <input
                  type="date"
                  value={currentVal === null || currentVal === undefined ? '' : String(currentVal)}
                  onChange={handleChange}
                  className={`${inputBaseStyle} cursor-pointer ${!currentVal ? 'text-slate-400' : ''}`}
                  style={{ minHeight: '44px' }}
                  autoFocus={isQuickEditing}
               />
            ) : (
               <input
                  type={type}
                  value={currentVal === null || currentVal === undefined ? '' : String(currentVal)}
                  onChange={handleChange}
                  className={inputBaseStyle}
                  placeholder={label === 'Teléfono' ? PHONE_PLACEHOLDER : ''}
                  autoFocus={isQuickEditing}
               />
            )}
            {label === 'Teléfono' && !isQuickEditing && <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{PHONE_HELP_TEXT}</p>}
         </div>
      );
   }

   let displayValue = value;
   if (type === 'select' && label === 'Estado') displayValue = getStatusLabel(value as ClientStatus);
   if (type === 'select' && options && options.length > 0 && displayValue === value) {
      const matchedOpt = options.find((opt: any) => (typeof opt === 'string' ? opt : opt.value) === value);
      if (matchedOpt && typeof matchedOpt !== 'string' && matchedOpt.label) displayValue = matchedOpt.label;
   }
   if (label === 'Tipo Diabetes' && value === 'N/A') displayValue = 'No Diabético';

   return (
      <div className={`mb-3 ${className} group relative`}>
         <div className="flex justify-between items-start">
            <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">{label}</p>
            {!readOnly && !isEditing && onQuickSave && path && (
               <button
                  onClick={handleStartQuickEdit}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                  title="Edición rápida"
               >
                  <Edit3 className="w-3 h-3" />
               </button>
            )}
         </div>
         <div className={`text-sm text-slate-800 break-words whitespace-pre-line leading-relaxed py-1 ${readOnly ? 'text-slate-600' : ''}`}>
            {type === 'checkbox' ? (
               <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${value ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                  {value ? '✓ Sí' : '✗ No'}
               </span>
            ) : ((displayValue === 0 && !label.toLowerCase().includes('duración') && !label.toLowerCase().includes('importe')) ? <span className="text-slate-300 italic">-</span> : displayValue || (displayValue === 0 ? '0' : <span className="text-slate-300 italic">-</span>))}
            {label.toLowerCase().includes('duración') && value && value !== '-' ? ' meses' : ''}
            {type === 'number' && label.toLowerCase().includes('altura') && value ? ' cm' : ''}
            {type === 'number' && label.toLowerCase().includes('peso') && value ? ' kg' : ''}
         </div>
      </div>
   );
};

import ClientPortalView from './ClientPortalView';

// --- RENEWAL CARD (CRM VIEW) ---
const RenewalCard = ({
   phase,
   title,
   contractedPath,
   durationPath,
   startDate,
   endDate,
   isLast = false,
   formData,
   isEditing,
   onUpdate,
   // Nuevos campos financieros
   paymentMethod,
   amount,
   receiptUrl,
   amountPath,
   paymentMethodPath,
   receiptUrlPath
}: any) => {
   const isContracted = formData.program[contractedPath as keyof typeof formData.program];
   const duration = formData.program[durationPath as keyof typeof formData.program];
   const hasStartDate = !!startDate;

   const getPaymentMethodLabel = (method: string) => {
      switch (method) {
         case 'stripe': return 'Stripe';
         case 'hotmart': return 'Hotmart';
         case 'transferencia': return 'Transferencia';
         case 'paypal': return 'PayPal';
         case 'bizum': return 'Bizum';
         default: return method || '-';
      }
   };

   if (!hasStartDate) {
      return (
         <div className="relative pl-10 pb-8">
            {!isLast && <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 to-slate-100"></div>}
            <div className="absolute left-0 top-1 w-8 h-8 rounded-xl border-2 border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
               <Circle className="w-4 h-4 text-slate-300" />
            </div>

            <div className="p-5 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/50 opacity-60 hover:opacity-100 transition-all duration-300 shadow-sm">
               <div className="flex items-center gap-2 mb-3">
                  <h4 className="font-bold text-slate-500">{title}</h4>
                  <div className="ml-auto">
                     {isEditing ? (
                        <span className="text-xs font-bold text-amber-600 bg-white px-3 py-1.5 border border-amber-200 rounded-lg shadow-sm">Calculando fechas...</span>
                     ) : (
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendiente Fase Anterior</span>
                     )}
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <DataField label="Fecha Renovación" value="-" readOnly isEditing={isEditing} onUpdate={onUpdate} />
                  <DataField label="Duración (Meses)" value="-" readOnly isEditing={isEditing} onUpdate={onUpdate} />
                  <DataField label="Fin Contrato (Calc)" value="-" readOnly isEditing={isEditing} onUpdate={onUpdate} />
                  <DataField label="Estado" value="Pendiente" readOnly isEditing={isEditing} onUpdate={onUpdate} />
               </div>
            </div>
         </div>
      );
   }

   return (
      <div className="relative pl-10 pb-8">
         {!isLast && <div className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${isContracted ? 'bg-gradient-to-b from-emerald-300 to-emerald-200' : 'bg-gradient-to-b from-blue-200 to-slate-200'}`}></div>}
         <div className={`absolute left-0 top-1 w-8 h-8 rounded-xl flex items-center justify-center z-10 shadow-md border-2 border-white ${isContracted ? 'bg-gradient-to-br from-emerald-400 to-emerald-500' : 'bg-gradient-to-br from-blue-400 to-blue-500'}`}>
            {isContracted ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Circle className="w-4 h-4 text-white" />}
         </div>

         <div className={`p-5 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${isContracted ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white' : 'border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-white'}`}>
            <div className="flex items-center gap-2 mb-3 border-b border-black/5 pb-2">
               <h4 className={`font-bold ${isContracted ? 'text-green-800' : 'text-blue-700'}`}>{title}</h4>

               <div className="ml-auto flex items-center gap-2">
                  {isEditing && (
                     <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1 rounded border border-slate-300 shadow-sm hover:bg-slate-50">
                        <input
                           type="checkbox"
                           checked={!!isContracted}
                           onChange={(e) => onUpdate(`program.${contractedPath}`, e.target.checked)}
                           className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-xs font-bold text-slate-700">MARCAR CONTRATADO</span>
                     </label>
                  )}
                  {!isEditing && isContracted && <span className="text-xs font-bold text-green-600 uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> CONTRATADO</span>}
                  {!isEditing && !isContracted && <span className="text-xs font-bold text-slate-400 uppercase">PENDIENTE</span>}
               </div>
            </div>

            {/* Datos de Fechas y Duración */}
            <div className="grid grid-cols-2 gap-4">
               <DataField label="Fecha Renovación (Inicio)" value={startDate} readOnly isEditing={isEditing} onUpdate={onUpdate} />
               <DataField
                  label="Duración (Meses)"
                  value={duration}
                  path={`program.${durationPath}`}
                  type="select"
                  options={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']}
                  isEditing={isEditing} onUpdate={onUpdate}
               />
               <DataField label="Fin Contrato (Calc)" value={endDate} readOnly className={endDate ? 'font-semibold text-slate-800' : ''} isEditing={isEditing} onUpdate={onUpdate} />
               <DataField label="Estado Llamada" value={isContracted ? 'Realizada' : 'Pendiente'} readOnly isEditing={isEditing} onUpdate={onUpdate} />
               {formData.program[`contract${phase}_name` as keyof typeof formData.program] && (
                  <div className="col-span-2">
                     <DataField label="Servicio Contratado" value={formData.program[`contract${phase}_name` as keyof typeof formData.program]} readOnly className="font-semibold text-slate-700" isEditing={isEditing} onUpdate={onUpdate} />
                  </div>
               )}
            </div>

            {/* Sección de Información Financiera - Siempre visible si está contratado o se está editando */}
            {(isContracted || isEditing) && (
               <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1">
                     <CreditCard className="w-3 h-3" /> Información de Pago
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                     {/* Método de Pago */}
                     <div>
                        <p className="text-xs text-slate-400 font-medium mb-1">Método</p>
                        {isEditing && paymentMethodPath ? (
                           <select
                              value={paymentMethod || 'stripe'}
                              onChange={(e) => onUpdate(paymentMethodPath, e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                           >
                              <option value="stripe">Stripe</option>
                              <option value="hotmart">Hotmart</option>
                              <option value="transferencia">Transferencia</option>
                              <option value="paypal">PayPal</option>
                              <option value="bizum">Bizum</option>
                           </select>
                        ) : (
                           <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold ${paymentMethod === 'hotmart' ? 'bg-orange-100 text-orange-700' :
                              paymentMethod === 'stripe' ? 'bg-purple-100 text-purple-700' :
                                 'bg-slate-100 text-slate-600'
                              }`}>
                              {getPaymentMethodLabel(paymentMethod)}
                           </span>
                        )}
                     </div>

                     {/* Importe */}
                     <div>
                        <p className="text-xs text-slate-400 font-medium mb-1">Importe</p>
                        {isEditing && amountPath ? (
                           <input
                              type="number"
                              value={amount || ''}
                              onChange={(e) => onUpdate(amountPath, parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                           />
                        ) : (
                           <span className="text-lg font-black text-slate-800">
                              {amount ? `${amount.toLocaleString()}€` : <span className="text-slate-300 text-sm">-</span>}
                           </span>
                        )}
                     </div>

                     {/* Comprobante */}
                     <div>
                        <p className="text-xs text-slate-400 font-medium mb-1">Comprobante</p>
                        {receiptUrl ? (
                           <a
                              href={receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                           >
                              <FileCheck className="w-3 h-3" /> Ver Documento
                           </a>
                        ) : (
                           <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 bg-slate-50 rounded-lg">
                              <FileX className="w-3 h-3" /> Sin documento
                           </span>
                        )}
                     </div>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
};

interface PaymentLink {
   id: string;
   name: string;
   price: number;
   url: string;
   duration_months?: number;
}

// --- HELPER COMPONENTS ---

// Premium color variants for section icons
const getSectionIconStyle = (icon: React.ReactNode): string => {
   const iconType = (icon as any)?.type?.displayName || (icon as any)?.type?.name || '';
   const colorMap: Record<string, string> = {
      'User': 'from-blue-50 to-blue-100 text-blue-600 shadow-blue-100',
      'MapPin': 'from-emerald-50 to-emerald-100 text-emerald-600 shadow-emerald-100',
      'Briefcase': 'from-indigo-50 to-indigo-100 text-indigo-600 shadow-indigo-100',
      'Activity': 'from-red-50 to-red-100 text-red-600 shadow-red-100',
      'HeartPulse': 'from-pink-50 to-pink-100 text-pink-500 shadow-pink-100',
      'Clock': 'from-amber-50 to-amber-100 text-amber-600 shadow-amber-100',
      'Zap': 'from-blue-50 to-blue-100 text-blue-600 shadow-blue-100',
      'Utensils': 'from-green-50 to-green-100 text-green-600 shadow-green-100',
      'AlertCircle': 'from-indigo-50 to-indigo-100 text-indigo-500 shadow-indigo-100',
      'TrendingUp': 'from-blue-50 to-blue-100 text-blue-600 shadow-blue-100',
      'Dumbbell': 'from-slate-100 to-slate-200 text-slate-700 shadow-slate-200',
      'Target': 'from-indigo-50 to-indigo-100 text-indigo-500 shadow-indigo-100',
      'FileText': 'from-slate-100 to-slate-200 text-slate-700 shadow-slate-200',
      'CheckCircle2': 'from-emerald-50 to-emerald-100 text-emerald-500 shadow-emerald-100',
   };
   return colorMap[iconType] || 'from-slate-50 to-slate-100 text-slate-600 shadow-slate-100';
};

const SectionTitle = ({ title, icon, subtitle, className = "" }: { title: string, icon: React.ReactNode, subtitle?: string, className?: string }) => (
   <div className={`flex items-start gap-4 mb-6 pb-3 border-b border-slate-100/80 ${className}`}>
      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${getSectionIconStyle(icon)} shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105 mt-1 shrink-0`}>
         {icon}
      </div>
      <div className="flex-1 min-w-0">
         <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider truncate">{title}</h3>
         {subtitle ? (
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{subtitle}</p>
         ) : (
            <div className="h-0.5 w-12 bg-gradient-to-r from-slate-300 to-transparent rounded-full mt-1"></div>
         )}
      </div>
   </div>
);

const TabButton = ({ id, label, icon, isActive, onClick }: { id: string, label: string, icon: React.ReactNode, isActive: boolean, onClick: (id: any) => void }) => (
   <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${isActive
         ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg shadow-slate-900/25 transform scale-[1.02] ring-2 ring-slate-900/10 ring-offset-2'
         : 'bg-white/80 backdrop-blur-sm text-slate-500 hover:bg-white hover:text-slate-700 border border-slate-200/80 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
         }`}
   >
      <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>{icon}</span>
      <span>{label}</span>
   </button>
);

// --- ACTION PLAN SUMMARY COMPONENT ---
const ReviewActionPlanSummary = ({ reviews, goals }: { reviews: WeeklyCoachReview[], goals: CoachGoal[] }) => {
   const lastReview = reviews.length > 0 ? reviews[reviews.length - 1] : null;
   // Filtrar objetivos no conseguidos recientemente
   const failedGoals = goals.filter(g =>
      (g.status === 'failed' || g.completion_status === 'not_fulfilled' || g.completion_status === 'partial') &&
      g.goal_type === 'weekly'
   ).slice(0, 3);

   if (!lastReview && failedGoals.length === 0) return null;

   return (
      <div className="mt-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-2">
         <div className="flex items-center gap-2 mb-3 text-indigo-700">
            <ClipboardList className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Plan de Acción & Pendientes</h4>
         </div>

         <div className="space-y-3">
            {failedGoals.length > 0 && (
               <div>
                  <p className="text-[10px] font-bold text-rose-500 uppercase mb-1">Por completar / Revisar:</p>
                  <div className="space-y-1">
                     {failedGoals.map(g => (
                        <div key={g.id} className="flex items-start gap-2 text-xs text-slate-600 bg-white/60 p-2 rounded-lg border border-slate-100">
                           <Target className="w-3 h-3 mt-0.5 text-rose-400 shrink-0" />
                           <span className="font-medium">{g.title}</span>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {lastReview && lastReview.coach_note && (
               <div>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase mb-1">Notas del Coach (Semanal):</p>
                  <div className="text-xs text-slate-700 bg-white/80 p-3 rounded-lg border border-indigo-100 italic leading-relaxed shadow-sm">
                     {lastReview.coach_note}
                  </div>
               </div>
            )}
         </div>
      </div>
   );
};

// --- REVIEW COMPLIANCE COMPONENT ---
const ReviewComplianceSummary = ({ checkins, missedCount = 0 }: { checkins: WeeklyCheckin[], missedCount?: number }) => {
   const getCheckinDeadlines = (count: number = 5) => {
      const deadlines = [];
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      // Calculate days since Friday (0 if today is Friday, 1 if Sat, 2 if Sun, 3 if Mon, etc.)
      const daysSinceFriday = (currentDay + 7 - 5) % 7;
      const lastFriday = new Date(now);
      lastFriday.setDate(now.getDate() - daysSinceFriday);
      lastFriday.setHours(0, 0, 0, 0);

      // We include the NEXT upcoming Friday (i = -1) to show "Upcoming"
      for (let i = -1; i < count - 1; i++) {
         const friday = new Date(lastFriday);
         friday.setDate(lastFriday.getDate() - (i * 7));

         const nextThursday = new Date(friday);
         nextThursday.setDate(friday.getDate() + 6);
         nextThursday.setHours(23, 59, 59, 999);

         const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
         deadlines.push({
            start: friday,
            end: nextThursday,
            label: `${friday.getDate()} ${monthNames[friday.getMonth()]}`,
            isFuture: friday > now,
            isCurrent: now >= friday && now <= nextThursday
         });
      }
      return deadlines;
   };

   const deadlines = getCheckinDeadlines();

   return (
      <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-4">
         <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <History className="w-3.5 h-3.5" />
               Seguimiento de Revisiones
            </h4>
            {missedCount > 0 && (
               <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-100 rounded-full animate-pulse">
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                  <span className="text-[10px] font-black text-rose-600 uppercase">{missedCount} FALLOS</span>
               </div>
            )}
         </div>

         <div className="flex gap-2">
            {deadlines.map((dl, i) => {
               const hasCheckin = checkins.some(c => {
                  const d = new Date(c.created_at);
                  return d >= dl.start && d <= dl.end;
               });

               const today = new Date();
               // A revision is considered "Pending" if it's the current week and deadline hasn't fully passed
               // or if it's in the future.
               const isPending = dl.isFuture || (dl.isCurrent && !hasCheckin);

               return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                     <div
                        title={`${dl.label}: ${hasCheckin ? 'Enviada' : isPending ? 'Próximamente' : 'No enviada'}`}
                        className={`w-full h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm ${hasCheckin
                           ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-emerald-100'
                           : isPending
                              ? 'bg-white border-2 border-dashed border-slate-200 text-slate-400 shadow-none'
                              : 'bg-gradient-to-br from-rose-400 to-rose-500 text-white shadow-rose-100'
                           }`}
                     >
                        {hasCheckin ? (
                           <CheckCircle2 className="w-4 h-4" />
                        ) : isPending ? (
                           <Clock className="w-3.5 h-3.5 opacity-50" />
                        ) : (
                           <FileX className="w-4 h-4" />
                        )}
                     </div>
                     <span className={`text-[9px] font-bold ${dl.isCurrent ? 'text-blue-600' : 'text-slate-500'}`}>
                        {dl.label}
                     </span>
                  </div>
               );
            })}
         </div>
         <p className="text-[9px] text-slate-400 mt-4 italic leading-tight bg-white/50 p-2 rounded-lg border border-slate-100">
            * El contador de fallos indica cuántas veces el sistema ha generado una alerta por falta de revisión.
         </p>
      </div>
   );
};

// --- QUICK METRICS PANEL FOR OVERVIEW ---
interface QuickMetricCardProps {
   icon: React.ReactNode;
   label: string;
   value: string | number | null | undefined;
   subValue?: string;
   trend?: 'up' | 'down' | 'neutral';
   color: 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'orange';
   alert?: boolean;
}

const QuickMetricCard = ({ icon, label, value, subValue, trend, color, alert }: QuickMetricCardProps) => {
   const colorClasses = {
      blue: 'from-blue-50 to-indigo-50 border-blue-100 text-blue-600',
      emerald: 'from-emerald-50 to-teal-50 border-emerald-100 text-emerald-600',
      amber: 'from-amber-50 to-orange-50 border-amber-100 text-amber-600',
      red: 'from-red-50 to-rose-50 border-red-100 text-red-600',
      purple: 'from-purple-50 to-indigo-50 border-purple-100 text-purple-600',
      orange: 'from-orange-50 to-amber-50 border-orange-100 text-orange-600'
   };

   const iconBgClasses = {
      blue: 'bg-blue-500',
      emerald: 'bg-emerald-500',
      amber: 'bg-amber-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500'
   };

   return (
      <div className={`relative bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 border transition-all hover:shadow-md ${alert ? 'ring-2 ring-red-400 ring-offset-2' : ''}`}>
         {alert && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
         )}
         <div className="flex items-start gap-3">
            <div className={`p-2 ${iconBgClasses[color]} rounded-lg text-white shadow-sm`}>
               {icon}
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
               <p className="text-xl font-black text-slate-800 truncate">
                  {value ?? '-'}
                  {trend && (
                     <span className={`ml-1 text-xs ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400'}`}>
                        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                     </span>
                  )}
               </p>
               {subValue && (
                  <p className="text-[10px] text-slate-500 truncate">{subValue}</p>
               )}
            </div>
         </div>
      </div>
   );
};

// --- MAIN COMPONENT ---
const ClientDetail: React.FC<ClientDetailProps> = ({
   client,
   onBack,
   onUpdateStatus,
   onSave,
   readOnly = false,
   onViewAsClient,
   currentUser,
   coaches = [],
   initialTab
}) => {
   const [activeTab, setActiveTab] = useState<'overview' | 'seguimiento' | 'performance' | 'health' | 'program' | 'contract' | 'materials'>(initialTab || 'overview');
   const [isEditing, setIsEditing] = useState(false);
   const [formData, setFormData] = useState<Client>(client);
   const { toast } = useToast();
   const [isSaving, setIsSaving] = useState(false);
   const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
   const roadmapEditorRef = useRef<SuccessRoadmapEditorRef>(null);
   const firstAccessHandledRef = useRef<string | null>(null);
   const [contractHistory, setContractHistory] = useState<ContractHistoryRecord[]>([]);
   const [isLoadingHistory, setIsLoadingHistory] = useState(false);

   // Performance Data States
   const [weeklyReviews, setWeeklyReviews] = useState<WeeklyCoachReview[]>([]);
   const [monthlyReviews, setMonthlyReviews] = useState<MonthlyReview[]>([]);
   const [quarterlyReviews, setQuarterlyReviews] = useState<QuarterlyReview[]>([]);
   const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);

   // Sincronizar formData cuando el prop client cambie (ej: tras un onSave exitoso)
   useEffect(() => {
      // Si cambia el cliente (navegación), actualizar siempre y salir de edición
      if (client.id !== formData.id) {
         setFormData(client);
         if (isEditing) setIsEditing(false);
         return;
      }

      // Si es el mismo cliente, solo actualizar si NO estamos editando
      // Esto evita que actualizaciones en segundo plano sobrescriban lo que el usuario está escribiendo
      if (!isEditing) {
         setFormData(client);
      }
   }, [client, isEditing]);

   // Load contract history when contract tab is active
   useEffect(() => {
      if (activeTab === 'contract' && formData.id) {
         setIsLoadingHistory(true);
         getContractHistory(formData.id)
            .then(setContractHistory)
            .finally(() => setIsLoadingHistory(false));
      }
   }, [activeTab, formData.id]);

   // Load performance data when performance tab is active
   useEffect(() => {
      if (activeTab === 'performance' && formData.id) {
         const fetchPerformanceData = async () => {
            setIsLoadingPerformance(true);
            try {
               const [weekly, monthly, quarterly] = await Promise.all([
                  getWeeklyCoachReviews(formData.id),
                  getMonthlyReviews(formData.id),
                  getQuarterlyReviews(formData.id)
               ]);
               setWeeklyReviews(weekly);
               setMonthlyReviews(monthly);
               setQuarterlyReviews(quarterly);
            } catch (error) {
               console.error('Error fetching performance data:', error);
               toast({
                  title: 'Error',
                  description: 'No se pudo cargar el historial de rendimiento',
                  variant: 'destructive',
               });
            } finally {
               setIsLoadingPerformance(false);
            }
         };
         fetchPerformanceData();
      }
   }, [activeTab, formData.id, toast]);

   const isCoach = currentUser?.role === UserRole.COACH || currentUser?.role === UserRole.HEAD_COACH || currentUser?.role === UserRole.ADMIN;
   const canManageMedical = currentUser ? checkPermission(currentUser, PERMISSIONS.MANAGE_MEDICAL) : false;
   const readOnlyMedical = isCoach && !canManageMedical;
   const [isFirstCoachAccessPrompt, setIsFirstCoachAccessPrompt] = useState(false);
   const [isSavingMandatoryData, setIsSavingMandatoryData] = useState(false);

   const isMandatoryOnboardingEnforced = useMemo(() => isMandatoryClientOnboardingEnforced(formData), [formData]);
   const missingMandatoryFields = useMemo(() => getMissingMandatoryClientFields(formData), [formData]);
   const hasMandatoryFieldsPending = isMandatoryOnboardingEnforced && missingMandatoryFields.length > 0;
   const missingMandatoryFieldsLabel = missingMandatoryFields.map(field => field.label).join(', ');

   const isAssignedCoachOpeningClient = useMemo(() => {
      if (!currentUser || !formData) return false;
      const role = (currentUser.role || '').toLowerCase();
      if (role !== 'coach' && role !== 'head_coach' && role !== 'admin') return false;

      const coachId = (formData.coach_id || '').toLowerCase();
      const userId = (currentUser.id || '').toLowerCase();
      const userName = (currentUser.name || '').toLowerCase();
      const emailPrefix = (currentUser.email || '').split('@')[0].toLowerCase();
      const propertyCoach = (formData.property_coach || '').toLowerCase();

      return coachId === userId ||
         coachId === userName ||
         propertyCoach === userName ||
         (emailPrefix.length > 3 && coachId.includes(emailPrefix));
   }, [currentUser, formData]);

   useEffect(() => {
      const markAndDetectFirstAccess = async () => {
         if (!currentUser || !formData?.id || !isAssignedCoachOpeningClient) {
            setIsFirstCoachAccessPrompt(false);
            return;
         }

         const alreadyRegisteredFirstAccess = !!formData.first_opened_by_assigned_coach_at;
         const firstAccessKey = `ado_required_onboarding_seen:${currentUser.id}:${formData.id}`;
         const alreadySeenLocally = localStorage.getItem(firstAccessKey) === '1';
         const shouldShowFirstAccessPrompt = hasMandatoryFieldsPending && !alreadyRegisteredFirstAccess && !alreadySeenLocally;

         setIsFirstCoachAccessPrompt(shouldShowFirstAccessPrompt);

         if (!alreadyRegisteredFirstAccess && firstAccessHandledRef.current !== `${currentUser.id}:${formData.id}`) {
            firstAccessHandledRef.current = `${currentUser.id}:${formData.id}`;
            localStorage.setItem(firstAccessKey, '1');

            const firstOpenTimestamp = new Date().toISOString();

            setFormData(prev => {
               if (prev.first_opened_by_assigned_coach_at) return prev;
               return {
                  ...prev,
                  first_opened_by_assigned_coach_at: firstOpenTimestamp
               };
            });

            try {
               const { error } = await supabase
                  .from('clientes_pt_notion')
                  .update({ first_opened_by_assigned_coach_at: firstOpenTimestamp })
                  .eq('id', formData.id)
                  .is('first_opened_by_assigned_coach_at', null);

               if (error) {
                  console.warn('No se pudo registrar first_opened_by_assigned_coach_at:', error.message);
               }
            } catch (error: any) {
               console.warn('Fallo al registrar primer acceso del coach:', error?.message || error);
            }
         }
      };

      markAndDetectFirstAccess();
   }, [currentUser, formData?.id, formData?.first_opened_by_assigned_coach_at, isAssignedCoachOpeningClient, hasMandatoryFieldsPending]);

   // Status Change Modal State
   const [showStatusModal, setShowStatusModal] = useState(false);
   const [targetStatus, setTargetStatus] = useState<ClientStatus | null>(null);
   const [statusData, setStatusData] = useState({
      date: new Date().toISOString().split('T')[0],
      reason: ''
   });

   // Pause Logic State
   const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
   const [pauseReason, setPauseReason] = useState('');
   const [pauseDateInput, setPauseDateInput] = useState(new Date().toISOString().split('T')[0]);
   const [showPauseHistory, setShowPauseHistory] = useState(false);

   const clientLoginUrl = `${window.location.origin}/#/`;

   const handleCopyClientAccessMessage = async () => {
      const message = [
         `Hola ${formData.firstName || ''},`,
         '',
         'Este es el acceso al portal de clientes:',
         clientLoginUrl,
         '',
         'Primera vez: usa el enlace de invitacion que te envio tu coach para activar tu cuenta.',
         'Siguientes veces: entra aqui con email + contrasena.',
         'Si olvidas contrasena: pulsa "Has olvidado la contrasena?" en el login.'
      ].join('\n');

      try {
         await navigator.clipboard.writeText(message);
         toast({ title: 'Mensaje copiado', description: 'Ya puedes pegarlo en WhatsApp al cliente.' });
      } catch {
         toast({
            title: 'No se pudo copiar',
            description: 'Copia manualmente el enlace de acceso.',
            variant: 'destructive'
         });
      }
   };

   // Invitation Modal State
   const [showInvitationModal, setShowInvitationModal] = useState(false);
   const [invitationLink, setInvitationLink] = useState('');
   const [isGeneratingInvitation, setIsGeneratingInvitation] = useState(false);
   const [isResettingAccess, setIsResettingAccess] = useState(false);

   // Actions Modal State
   const [showActionsModal, setShowActionsModal] = useState(false);

   const [showNutritionSpecialRequestModal, setShowNutritionSpecialRequestModal] = useState(false);
   const [isSubmittingNutritionRequest, setIsSubmittingNutritionRequest] = useState(false);
   const [showNutritionRequestValidation, setShowNutritionRequestValidation] = useState(false);
   const [nutritionSpecialRequestForm, setNutritionSpecialRequestForm] = useState<NutritionSpecialRequestFormData>({
      priority: 'normal',
      target_date: '',
      current_kcal: '',
      desired_kcal: '',
      request_reason: '',
      requested_changes: '',
      requested_goal: '',
      diseases: '',
      pathologies: '',
      medication: '',
      allergies: '',
      excluded_foods: '',
      preferred_diet: '',
      coach_notes: '',
      confirmation_checked: false,
   });

   const nutritionSpecialRequestErrors = useMemo<NutritionSpecialRequestValidationErrors>(() => {
      const errors: NutritionSpecialRequestValidationErrors = {};
      const reasonLength = nutritionSpecialRequestForm.request_reason.trim().length;
      const changesLength = nutritionSpecialRequestForm.requested_changes.trim().length;
      const goalLength = nutritionSpecialRequestForm.requested_goal.trim().length;

      if (reasonLength < 120) {
         errors.request_reason = `El motivo debe tener al menos 120 caracteres (${reasonLength}/120).`;
      }
      if (changesLength < 80) {
         errors.requested_changes = `Explica los cambios con al menos 80 caracteres (${changesLength}/80).`;
      }
      if (goalLength < 40) {
         errors.requested_goal = `Define el objetivo con al menos 40 caracteres (${goalLength}/40).`;
      }
      if (!nutritionSpecialRequestForm.confirmation_checked) {
         errors.confirmation_checked = 'Debes confirmar que has revisado la ficha clínica y nutricional.';
      }

      return errors;
   }, [nutritionSpecialRequestForm]);

   const [showTrainingSpecialRequestModal, setShowTrainingSpecialRequestModal] = useState(false);
   const [isSubmittingTrainingRequest, setIsSubmittingTrainingRequest] = useState(false);
   const [showTrainingRequestValidation, setShowTrainingRequestValidation] = useState(false);
   const [trainingSpecialRequestForm, setTrainingSpecialRequestForm] = useState<TrainingSpecialRequestFormData>({
      priority: 'normal',
      target_date: '',
      current_sessions_per_week: '',
      desired_sessions_per_week: '',
      request_reason: '',
      requested_changes: '',
      requested_goal: '',
      activity_level: '',
      steps_goal: '',
      strength_experience: '',
      training_location: '',
      availability: '',
      limitations: '',
      equipment: '',
      coach_notes: '',
      confirmation_checked: false,
   });

   const trainingSpecialRequestErrors = useMemo<TrainingSpecialRequestValidationErrors>(() => {
      const errors: TrainingSpecialRequestValidationErrors = {};
      const reasonLength = trainingSpecialRequestForm.request_reason.trim().length;
      const changesLength = trainingSpecialRequestForm.requested_changes.trim().length;
      const goalLength = trainingSpecialRequestForm.requested_goal.trim().length;

      if (reasonLength < 120) {
         errors.request_reason = `El motivo debe tener al menos 120 caracteres (${reasonLength}/120).`;
      }
      if (changesLength < 80) {
         errors.requested_changes = `Explica qué no funciona con al menos 80 caracteres (${changesLength}/80).`;
      }
      if (goalLength < 40) {
         errors.requested_goal = `Define el objetivo con al menos 40 caracteres (${goalLength}/40).`;
      }
      if (!trainingSpecialRequestForm.confirmation_checked) {
         errors.confirmation_checked = 'Debes confirmar que has revisado la ficha de entrenamiento.';
      }

      return errors;
   }, [trainingSpecialRequestForm]);

   // Sub-tabs for consolidated views
   const [healthSubTab, setHealthSubTab] = useState<'clinical' | 'nutrition' | 'training' | 'hormonal' | 'endocrino'>('clinical');
   const [programSubTab, setProgramSubTab] = useState<'renovaciones' | 'camino_exito' | 'objetivos' | 'testimonios'>('renovaciones');
   const [seguimientoSubTab, setSeguimientoSubTab] = useState<'semanal' | 'mensual' | 'trimestral'>('semanal');

   // Appointment Modal State
   const [showAppointmentModal, setShowAppointmentModal] = useState(false);
   const [appointmentDate, setAppointmentDate] = useState('');
   const [appointmentTime, setAppointmentTime] = useState('');
   const [appointmentNote, setAppointmentNote] = useState('');
   const [appointmentLink, setAppointmentLink] = useState('');
   const [isSavingAppointment, setIsSavingAppointment] = useState(false);
   const [showCompletionModal, setShowCompletionModal] = useState(false);
   const [completionConclusions, setCompletionConclusions] = useState('');
   const [completionStatus, setCompletionStatus] = useState<'completed' | 'missed'>('completed');

   // Check-ins State
   // Check-ins State
   const [checkins, setCheckins] = useState<WeeklyCheckin[]>([]);
   const [medicalReviews, setMedicalReviews] = useState<any[]>([]);
   const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
   const [paymentMethods, setPaymentMethods] = useState<any[]>([]); // New state for payment methods
   const [nutritionVerification, setNutritionVerification] = useState<{ status: 'loading' | 'found' | 'not-found' | 'idle', message: string }>({ status: 'idle', message: '' });
   const [approvingNutrition, setApprovingNutrition] = useState(false);
   const [activePeriod, setActivePeriod] = useState<{ month: number; fortnight: number } | null>(null);
   const [weightHistory, setWeightHistory] = useState<Array<{ date: string, weight: number }>>([]);
   const [stepsHistory, setStepsHistory] = useState<Array<{ date: string, steps: number }>>([]);
   const [menstrualCycles, setMenstrualCycles] = useState<any[]>([]);
   const [hormonalSymptoms, setHormonalSymptoms] = useState<any[]>([]);
   const [loadingHormonal, setLoadingHormonal] = useState(false);
   const [loadingCheckins, setLoadingCheckins] = useState(false);
   const [checkinViewMode, setCheckinViewMode] = useState<'cards' | 'table'>('cards');
   const [coachCommission, setCoachCommission] = useState(0); // Porcentaje de comisión del Coach asignado

   // Weekly Objectives State
   const [weeklyGoals, setWeeklyGoals] = useState<CoachGoal[]>([]);
   const [loadingGoals, setLoadingGoals] = useState(false);
   const [newObjective, setNewObjective] = useState({ title: '', description: '', startDate: new Date().toISOString().split('T')[0], deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })() });
   const [failingPrevGoalId, setFailingPrevGoalId] = useState<string | null>(null);
   const [prevGoalFailureReason, setPrevGoalFailureReason] = useState('');

   // Weekly Assessment State (new - integrated into review flow)
   const [weeklyAssessment, setWeeklyAssessment] = useState<WeeklyAssessmentData>({
      goalAssessments: [],
      feeling: null,
      nextWeekDecision: null,
      coachNote: '',
   });
   const [newObjectives, setNewObjectives] = useState<Array<{ title: string; description: string; startDate: string; deadline: string }>>([]);
   const [reviewVideoUrl, setReviewVideoUrl] = useState('');
   const [reviewNotes, setReviewNotes] = useState('');
   const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

   const getCoachName = (idOrName: string | null | undefined): string => {
      if (!idOrName || idOrName === 'Sin Asignar' || idOrName === 'Coach') return 'Sin Asignar';
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrName);
      if (!isUUID) return idOrName;

      const coach = coaches.find(u => u.id === idOrName);
      if (coach) return coach.name;

      const coachNameMap: Record<string, string> = {
         'dec087e2-3bf5-43c7-8561-d22c049948db': 'Jesús',
         '0cfcb072-ae4c-4b33-a96d-f3aa8b5aeb62': 'Helena',
         '5d5bbbed-cbc0-495c-ac6f-3e56bf5ffe54': 'Álvaro',
         'e59de5e3-f962-48be-8392-04d9d59ba87d': 'Esperanza',
         'a2911cd6-e5c0-4fd3-8047-9f7f003e1d28': 'Juan',
         '19657835-6fb4-4783-9b37-1be1d556c42d': 'Victoria'
      };
      return coachNameMap[idOrName] || idOrName;
   };

   const coachDisplayName = useMemo(() => getCoachName(formData.coach_id), [formData.coach_id, coaches]);

   // Nutrition Plan Options
   const [nutritionTypes, setNutritionTypes] = useState<string[]>(['Flexible', 'Pescetariano', 'Vegetariano', 'Sin Gluten', 'Sin Lactosa', 'Keto', 'Low Carb', 'Protección Digestiva']);

   // Calculate Days Remaining and Progress - USANDO CONTRATO ACTIVO ACTUAL
   const { daysRemaining, progressPercent } = useMemo(() => {
      const program = formData.program || {};

      // Construir array de contratos con sus datos
      const contracts = [
         {
            phase: 'F1',
            startDate: formData.start_date,
            endDate: program.f1_endDate,
            duration: formData.program_duration_months || 0,
            isRenewed: true // F1 siempre está activo si existe
         },
         {
            phase: 'F2',
            startDate: program.f2_renewalDate,
            endDate: program.f2_endDate,
            duration: program.f2_duration || 0,
            isRenewed: program.renewal_f2_contracted
         },
         {
            phase: 'F3',
            startDate: program.f3_renewalDate,
            endDate: program.f3_endDate,
            duration: program.f3_duration || 0,
            isRenewed: program.renewal_f3_contracted
         },
         {
            phase: 'F4',
            startDate: program.f4_renewalDate,
            endDate: program.f4_endDate,
            duration: program.f4_duration || 0,
            isRenewed: program.renewal_f4_contracted
         },
         {
            phase: 'F5',
            startDate: program.f5_renewalDate,
            endDate: program.f5_endDate,
            duration: program.f5_duration || 0,
            isRenewed: program.renewal_f5_contracted
         }
      ];

      // Filtrar solo contratos renovados/activos con fechas válidas
      const activeContracts = contracts.filter(contract =>
         contract.isRenewed &&
         contract.startDate &&
         contract.endDate &&
         !isNaN(new Date(contract.startDate).getTime()) &&
         !isNaN(new Date(contract.endDate).getTime())
      );

      if (activeContracts.length === 0) {
         // Fallback: si no hay contratos válidos, intentar con datos base
         if (!formData.start_date || !formData.program_duration_months) {
            return { daysRemaining: null, progressPercent: null };
         }
         // Usar lógica original como fallback
         const start = new Date(formData.start_date);
         const end = new Date(start);
         end.setMonth(start.getMonth() + (formData.program_duration_months || 0));

         const now = new Date();
         const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
         const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
         const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

         const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
         const daysPassed = (today.getTime() - startDate.getTime()) / (1000 * 3600 * 24);

         const remaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
         const percent = totalDays > 0 ? Math.min(100, Math.max(0, (daysPassed / totalDays) * 100)) : 0;

         return { daysRemaining: remaining, progressPercent: percent };
      }

      // Encontrar el contrato VIGENTE (donde hoy está entre start y end)
      const today = new Date();
      const currentContract = activeContracts.find(contract => {
         const start = new Date(contract.startDate);
         const end = new Date(contract.endDate);
         return today >= start && today <= end;
      });

      // Si no hay contrato vigente actualmente, tomar el último contrato renovado
      const activeContract = currentContract || activeContracts[activeContracts.length - 1];

      // Calcular días restantes y progreso del contrato activo
      const start = new Date(activeContract.startDate);
      const end = new Date(activeContract.endDate);
      const now = new Date();

      const startNormalized = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endNormalized = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const todayNormalized = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const totalDays = (endNormalized.getTime() - startNormalized.getTime()) / (1000 * 3600 * 24);
      const daysPassed = (todayNormalized.getTime() - startNormalized.getTime()) / (1000 * 3600 * 24);

      const remaining = Math.ceil((endNormalized.getTime() - todayNormalized.getTime()) / (1000 * 3600 * 24));
      const percent = totalDays > 0 ? Math.min(100, Math.max(0, (daysPassed / totalDays) * 100)) : 0;

      return { daysRemaining: remaining, progressPercent: percent };
   }, [
      formData.start_date,
      formData.program_duration_months,
      formData.program?.f1_endDate,
      formData.program?.f2_renewalDate,
      formData.program?.f2_endDate,
      formData.program?.f2_duration,
      formData.program?.renewal_f2_contracted,
      formData.program?.f3_renewalDate,
      formData.program?.f3_endDate,
      formData.program?.f3_duration,
      formData.program?.renewal_f3_contracted,
      formData.program?.f4_renewalDate,
      formData.program?.f4_endDate,
      formData.program?.f4_duration,
      formData.program?.renewal_f4_contracted,
      formData.program?.f5_renewalDate,
      formData.program?.f5_endDate,
      formData.program?.f5_duration,
      formData.program?.renewal_f5_contracted
   ]);

   useEffect(() => {
      const loadLinks = async () => {
         const { data } = await supabase.from('payment_links').select('*');
         if (data) setPaymentLinks(data);
      };

      const loadPaymentMethods = async () => {
         const { data } = await supabase.from('payment_methods').select('*');
         if (data) setPaymentMethods(data);
      };

      const fetchCoachData = async () => {
         if (client.coach_id) {
            const coach = coaches.find(u => u.id === client.coach_id);
            if (coach) {
               setCoachCommission(Number(coach.commission_percentage) || 0);
            } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(client.coach_id)) {
               const { data } = await supabase
                  .from('users')
                  .select('commission_percentage')
                  .eq('id', client.coach_id)
                  .single();
               if (data) {
                  setCoachCommission(Number(data.commission_percentage) || 0);
               }
            }
         }
      };

      loadLinks();
      loadPaymentMethods();
      fetchCoachData();

      const fetchPlansData = async () => {
         try {
            const { data } = await supabase.from('food_plans').select('*');
            if (data) {
               // 1. Extract types
               const types = Array.from(new Set(data.map((p: any) => p.type)));
               // @ts-ignore
               setNutritionTypes(prev => Array.from(new Set([...prev, ...types])).sort());

               // 2. Verify current assignment compliance
               if (activeTab === 'health' && formData.nutrition.assigned_nutrition_type) {
                  const type = formData.nutrition.assigned_nutrition_type;
                  const cals = formData.nutrition.assigned_calories;

                  if (!type || !cals) {
                     setNutritionVerification({ status: 'idle', message: '' });
                     return;
                  }

                  const matchingPlan = await nutritionService.getAutoPlanForClient(type, Number(cals));
                  const period = await nutritionService.getActivePeriod();
                  setActivePeriod(period);

                  if (matchingPlan) {
                     setNutritionVerification({
                        status: 'found',
                        message: `✅ Plan VIGENTE disponible: ${matchingPlan.name}`
                     });
                  } else {
                     setNutritionVerification({
                        status: 'not-found',
                        message: `⚠️ NO existe plan para el periodo activo (${type} ${cals} kcal, Mes ${period.month} Q${period.fortnight}). El cliente verá un error.`
                     });
                  }
               }
            }
         } catch (e) {
            console.error("Error checking plans", e);
         }
      };

      if (activeTab === 'health') {
         fetchPlansData();
      }
   }, [activeTab, formData.nutrition.assigned_nutrition_type, formData.nutrition.assigned_calories]);

   useEffect(() => {
      const loadData = async () => {
         // Load weight history
         const { data: wData } = await supabase
            .from('weight_history')
            .select('*')
            .eq('client_id', client.id)
            .order('date', { ascending: true });
         if (wData) setWeightHistory(wData);

         // Load steps history
         const { data: sData } = await supabase
            .from('steps_history')
            .select('date, steps')
            .eq('client_id', client.id)
            .order('date', { ascending: true });
         if (sData) setStepsHistory(sData);

         // Load check-ins and reviews
         const { data: chkData } = await supabase
            .from('weekly_checkins')
            .select('*')
            .eq('client_id', client.id)
            .order('created_at', { ascending: false });
         if (chkData) setCheckins(chkData);

         const reviewsData = await getWeeklyCoachReviews(client.id);
         setWeeklyReviews(reviewsData);

         // Load Payment Links
         const { data: pLinks } = await supabase
            .from('payment_links')
            .select('id, name, price, url, duration_months')
            .order('name');

         if (pLinks && pLinks.length > 0) {
            setPaymentLinks(pLinks);
         } else {
            // Fallback Mock Data if DB is empty
            setPaymentLinks([
               { id: '1', name: 'Renovación Trimestral', price: 297, url: 'https://stripe.com/fake-link-1', duration_months: 3 },
               { id: '2', name: 'Renovación Semestral', price: 497, url: 'https://stripe.com/fake-link-2', duration_months: 6 },
               { id: '3', name: 'Mantenimiento Mensual', price: 97, url: 'https://stripe.com/fake-link-3', duration_months: 1 }
            ]);
         }
      };
      loadData();
   }, [client.id]);

   // Fetch weekly goals for objectives tab
   useEffect(() => {
      if (activeTab !== 'seguimiento') return;
      const fetchWeeklyGoals = async () => {
         setLoadingGoals(true);
         try {
            const { data, error } = await supabase
               .from('coach_goals')
               .select('*')
               .eq('client_id', client.id)
               .order('created_at', { ascending: false });
            if (!error && data) setWeeklyGoals(data);
         } catch (e) { console.warn('Error fetching weekly goals:', e); }
         finally { setLoadingGoals(false); }
      };
      fetchWeeklyGoals();
   }, [client.id, activeTab]);

   // Fetch hormonal data when hormonal sub-tab is active
   useEffect(() => {
      if (healthSubTab !== 'hormonal') return;
      const isFemale = ['mujer', 'femenino', 'female'].includes(formData.gender?.toLowerCase() || '');
      if (!isFemale) return;

      const fetchHormonalData = async () => {
         setLoadingHormonal(true);
         try {
            const { data: cycles } = await supabase
               .from('menstrual_cycles')
               .select('*')
               .eq('client_id', client.id)
               .order('period_start_date', { ascending: false })
               .limit(12);
            if (cycles) setMenstrualCycles(cycles);

            const { data: symptoms } = await supabase
               .from('hormonal_symptoms')
               .select('*')
               .eq('client_id', client.id)
               .order('date', { ascending: false })
               .limit(30);
            if (symptoms) setHormonalSymptoms(symptoms);
         } catch (e) {
            console.error('Error fetching hormonal data:', e);
         } finally {
            setLoadingHormonal(false);
         }
      };
      fetchHormonalData();
   }, [healthSubTab, client.id, formData.gender]);

   // Sync latest weight from DB when viewing training tab
   useEffect(() => {
      if (activeTab === 'health') {
         const syncLatestWeight = async () => {
            try {
               const { data } = await supabase
                  .from('weight_history')
                  .select('weight, date')
                  .eq('client_id', client.id)
                  .order('date', { ascending: false })
                  .limit(1)
                  .single();

               if (data?.weight) {
                  setFormData(prev => ({
                     ...prev,
                     current_weight: data.weight
                  }));
               }
            } catch (err) {
               // No weight history yet, that's ok
               console.log('No weight history found for sync');
            }
         };
         syncLatestWeight();
      }
   }, [activeTab, client.id]);

   // ============ CALCULATED METRICS FOR HEADER ============
   // Weight change desde peso inicial
   const weightChange = useMemo(() => {
      if (formData.initial_weight && formData.current_weight) {
         return Math.round((formData.current_weight - formData.initial_weight) * 10) / 10;
      }
      return 0;
   }, [formData.initial_weight, formData.current_weight]);

   // Progreso hacia objetivo de peso (%)
   const weightProgress = useMemo(() => {
      if (formData.initial_weight && formData.target_weight && formData.current_weight) {
         const totalToLose = formData.initial_weight - formData.target_weight;
         if (totalToLose === 0) return 100;
         const lost = formData.initial_weight - formData.current_weight;
         return Math.min(100, Math.max(0, Math.round((lost / totalToLose) * 100)));
      }
      return 0;
   }, [formData.initial_weight, formData.target_weight, formData.current_weight]);

   // Días de pausa acumulados
   const pausedDays = useMemo(() => {
      return (formData.weeks_paused || 0) * 7;
   }, [formData.weeks_paused]);

   // Fecha de fin ajustada (sumando pausas)
   const adjustedEndDate = useMemo(() => {
      const baseDate = formData.contract_end_date;
      if (!baseDate) return null;
      if (pausedDays === 0) return baseDate;
      const end = new Date(baseDate);
      end.setDate(end.getDate() + pausedDays);
      return end.toISOString().split('T')[0];
   }, [formData.contract_end_date, pausedDays]);

   // Progreso del contrato (%)
   const contractProgress = useMemo(() => {
      const startDate = formData.start_date;
      const endDate = adjustedEndDate || formData.contract_end_date;
      if (!startDate || !endDate) return 0;
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      const now = new Date().getTime();
      if (now >= end) return 100;
      if (now <= start) return 0;
      return Math.round(((now - start) / (end - start)) * 100);
   }, [formData.start_date, adjustedEndDate, formData.contract_end_date]);

   // --- RENDER CLIENT PORTAL IF READ ONLY ---
   if (readOnly) {
      return <ClientPortalView client={client} />;
   }

   // --- REST OF THE COMPONENT (ADMIN/COACH VIEW) ---
   useEffect(() => {
      setFormData(client);
   }, [client]);


   // ... existing imports

   // --- PHASE Q: COACH REASSIGNMENT ---
   const canAssignCoach = currentUser ? checkPermission(currentUser, PERMISSIONS.ASSIGN_COACH) : false;

   // CÁLCULO EN CASCADA DE FECHAS DE RENOVACIÓN
   useEffect(() => {
      // Recalcular siempre que cambien las dependencias para mantener consistencia
      setFormData(prev => {
         // Clonado profundo para evitar mutaciones directas que rompen el renderizado de React
         const d = JSON.parse(JSON.stringify(prev));

         const calculateNextPhase = (startDateStr: string, durationMonths: number) => {
            if (!startDateStr || !durationMonths) return { start: '', end: '' };
            const start = new Date(startDateStr);
            // El inicio de la fase es el día siguiente al fin de la anterior si viene de una cascada,
            // pero aquí startDateStr ya es el inicio calculado.
            const end = new Date(start);
            end.setMonth(end.getMonth() + Number(durationMonths));
            end.setDate(end.getDate() - 1);
            return {
               start: startDateStr,
               end: end.toISOString().split('T')[0]
            };
         };

         // 1. FASE 1 (Basada en start_date y program_duration_months)
         if (d.start_date && d.program_duration_months) {
            const f1 = calculateNextPhase(d.start_date, d.program_duration_months);
            d.program.f1_endDate = f1.end;
         }

         // 2. FASE 2
         if (d.program.f1_endDate) {
            const nextStart = new Date(d.program.f1_endDate);
            nextStart.setDate(nextStart.getDate() + 1);
            d.program.f2_renewalDate = nextStart.toISOString().split('T')[0];

            const f2 = calculateNextPhase(d.program.f2_renewalDate, d.program.f2_duration);
            d.program.f2_endDate = f2.end;
         }

         // 3. FASE 3
         if (d.program.f2_endDate) {
            const nextStart = new Date(d.program.f2_endDate);
            nextStart.setDate(nextStart.getDate() + 1);
            d.program.f3_renewalDate = nextStart.toISOString().split('T')[0];

            const f3 = calculateNextPhase(d.program.f3_renewalDate, d.program.f3_duration);
            d.program.f3_endDate = f3.end;
         }

         // 4. FASE 4
         if (d.program.f3_endDate) {
            const nextStart = new Date(d.program.f3_endDate);
            nextStart.setDate(nextStart.getDate() + 1);
            d.program.f4_renewalDate = nextStart.toISOString().split('T')[0];

            const f4 = calculateNextPhase(d.program.f4_renewalDate, d.program.f4_duration);
            d.program.f4_endDate = f4.end;
         }

         // 5. FASE 5
         if (d.program.f4_endDate) {
            const nextStart = new Date(d.program.f4_endDate);
            nextStart.setDate(nextStart.getDate() + 1);
            d.program.f5_renewalDate = nextStart.toISOString().split('T')[0];

            const f5 = calculateNextPhase(d.program.f5_renewalDate, d.program.f5_duration);
            d.program.f5_endDate = f5.end;
         }

         // DETERMINAR FECHA FIN DE CONTRATO ACTIVO
         let activeEnd = d.program.f1_endDate;
         if (d.program.renewal_f5_contracted && d.program.f5_endDate) activeEnd = d.program.f5_endDate;
         else if (d.program.renewal_f4_contracted && d.program.f4_endDate) activeEnd = d.program.f4_endDate;
         else if (d.program.renewal_f3_contracted && d.program.f3_endDate) activeEnd = d.program.f3_endDate;
         else if (d.program.renewal_f2_contracted && d.program.f2_endDate) activeEnd = d.program.f2_endDate;

         d.contract_end_date = activeEnd;

         return d;
      });
   }, [
      isEditing,
      formData.start_date,
      formData.program_duration_months,
      formData.program.f2_duration,
      formData.program.f3_duration,
      formData.program.f4_duration,
      formData.program.f5_duration,
      formData.program.renewal_f2_contracted,
      formData.program.renewal_f3_contracted,
      formData.program.renewal_f4_contracted,
      formData.program.renewal_f5_contracted
   ]);

   // NOTE: adjustedEndDate, pausedDays, weightChange, weightProgress, contractProgress 
   // are now calculated with useMemo at the top of the component


   const handleCoachUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingReceipt(true);
      try {
         const fileExt = file.name.split('.').pop();
         // Estructura: receipts/client_id/timestamp.ext
         const fileName = `${formData.id}/${Date.now()}.${fileExt}`;
         const filePath = fileName; // En el bucket 'receipts'

         const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(filePath, file, {
               upsert: true
            });

         if (uploadError) throw uploadError;

         const { data: { publicUrl } } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath);

         updateField('renewal_receipt_url', publicUrl);
         updateField('renewal_payment_status', 'uploaded');
         toast.success("Comprobante subido correctamente (Pendiente de guardar cambios)");
      } catch (error: any) {
         console.error(error);
         toast.error("Error al subir comprobante: " + error.message);
      } finally {
         setIsUploadingReceipt(false);
      }
   };

   const handleAutoActivateRenewal = async (phase: string) => {
      // Robust phase key extraction (e.g. "Renovación F2" -> "f2", "Fase 2" -> "f2", "F2" -> "f2")
      const match = phase.match(/f\d+/i);
      const phaseKey = match ? match[0].toLowerCase() : phase.toLowerCase().trim();

      // 1. Encontrar la fecha de fin de la fase anterior
      let previousEnd: string | undefined;
      if (phaseKey === 'f2') previousEnd = formData.program.f1_endDate;
      else if (phaseKey === 'f3') previousEnd = formData.program.f2_endDate;
      else if (phaseKey === 'f4') previousEnd = formData.program.f3_endDate;
      else if (phaseKey === 'f5') previousEnd = formData.program.f4_endDate;

      if (!previousEnd) {
         alert(`No se puede activar ${phase} porque la fase anterior no tiene fecha de fin.`);
         return;
      }

      // 2. Determinar duración e importe
      const selectedLink = paymentLinks.find(pl => pl.url === formData.renewal_payment_link);
      const cardDurationValue = formData.program[`${phaseKey}_duration` as keyof typeof formData.program];

      // Prioridad Duración: 1. Valor manual en el panel de pago > 2. Valor manual en la ficha > 3. Valor del link > 4. Default 3 meses
      const parsedManualDur = formData.renewal_duration ? parseInt(String(formData.renewal_duration)) : 0;
      const parsedCardDur = cardDurationValue ? parseInt(String(cardDurationValue)) : 0;
      const duration = parsedManualDur || parsedCardDur || selectedLink?.duration_months || 3;

      // Prioridad Importe: 1. Valor manual en el panel > 2. Valor del link
      let amount = formData.renewal_amount || 0;
      if (!amount && selectedLink) {
         const rawPrice = selectedLink.price;
         amount = typeof rawPrice === 'string'
            ? parseFloat(rawPrice.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, ''))
            : (rawPrice || 0);
      }

      console.log(`[AUTO-ACTIVATE] Phase: ${phase}, Duration: ${duration}, Amount: ${amount}`);

      // 3. Calcular fechas
      const startDate = new Date(previousEnd);
      startDate.setDate(startDate.getDate() + 1);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + duration);
      endDate.setDate(endDate.getDate() - 1);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // 4. Actualizar todo en UN solo paso para evitar race-conditions
      const finalData = JSON.parse(JSON.stringify(formData));
      finalData.program[`${phaseKey}_renewalDate`] = startDateStr;
      finalData.program[`${phaseKey}_duration`] = duration;
      finalData.program[`${phaseKey}_endDate`] = endDateStr;
      finalData.program[`renewal_${phaseKey}_contracted`] = true;

      // Asegurar que el importe queda guardado
      if (amount > 0) {
         finalData.renewal_amount = amount;
         // Persist payment info to historical phase data immediately
         finalData.program[`${phaseKey}_amount`] = amount;
         finalData.program[`${phaseKey}_payment_method`] = formData.renewal_payment_method || 'stripe';
      }

      // 5. DETERMINAR FECHA FIN DE CONTRATO GLOBAL (Actualizado)
      let activeEnd = finalData.program.f1_endDate;
      if (finalData.program.renewal_f5_contracted && finalData.program.f5_endDate) activeEnd = finalData.program.f5_endDate;
      else if (finalData.program.renewal_f4_contracted && finalData.program.f4_endDate) activeEnd = finalData.program.f4_endDate;
      else if (finalData.program.renewal_f3_contracted && finalData.program.f3_endDate) activeEnd = finalData.program.f3_endDate;
      else if (finalData.program.renewal_f2_contracted && finalData.program.f2_endDate) activeEnd = finalData.program.f2_endDate;

      finalData.contract_end_date = activeEnd;

      // 6. Lógica de limpieza y avance para el siguiente ciclo
      // Resetear campos de firma para la DE NUEVA FASE
      finalData.program.contract_signed = false;
      finalData.program.contract_signed_at = null;
      finalData.program.contract_signature_image = null;

      // Definir la siguiente fase lógica
      const nextPhases: Record<string, string | null> = {
         'f2': 'F3',
         'f3': 'F4',
         'f4': 'F5',
         'f5': null // No hay más fases después de F5
      };

      const nextPhase = nextPhases[phaseKey] || null;

      // Resetear campos temporales de gestión pero dejar 'verified' para el banner del cliente
      finalData.renewal_phase = nextPhase;
      finalData.renewal_payment_status = 'verified';
      finalData.renewal_verified_at = new Date().toISOString();
      finalData.renewal_receipt_url = null;
      finalData.renewal_amount = 0;
      finalData.renewal_duration = 0;
      finalData.renewal_payment_link = null;

      setFormData(finalData);

      // 6. Autoguardar para que los cambios persistan inmediatamente
      try {
         setIsSaving(true);
         await onSave(finalData);

         // --- ELITE ACCOUNTING: Registrar la renovación como una VENTA ---
         if (amount > 0) {
            console.log('[FINANCE] Registrando renovación en tabla sales...');

            // a. Detectar comisión pasarela
            // Usar el método de pago seleccionado por el coach
            // Fees: Hotmart = 6.4%, Stripe = 4%, Transferencia = 0%
            const selectedPaymentMethod = formData.renewal_payment_method || 'stripe';

            // Mapeo directo de fees según método seleccionado
            const feeMap: Record<string, number> = {
               'hotmart': 6.4,
               'stripe': 4.0,
               'transferencia': 0.0
            };

            // Intentar obtener fee de paymentMethods de BD, o usar el mapeo directo
            let feePercentage = feeMap[selectedPaymentMethod] ?? 4.0;
            const matchingMethod = paymentMethods.find(pm =>
               pm.name.toLowerCase().includes(selectedPaymentMethod)
            );
            if (matchingMethod?.platform_fee_percentage !== undefined) {
               feePercentage = Number(matchingMethod.platform_fee_percentage);
            }

            const paymentMethodLabel = selectedPaymentMethod === 'hotmart' ? 'Hotmart'
               : selectedPaymentMethod === 'stripe' ? 'Stripe'
                  : 'Transferencia Bancaria';

            console.log(`[FINANCE] Método de pago: ${paymentMethodLabel} - Fee: ${feePercentage}%`);

            const grossAmount = amount;
            const feeAmount = grossAmount * (feePercentage / 100);
            const netAmount = grossAmount - feeAmount;

            // Calcular comisión coach (Dinámico desde perfil del coach)
            const commissionPercent = coachCommission;
            const commissionAmount = netAmount * (commissionPercent / 100);

            console.log(`[FINANCE] Bruto: ${grossAmount}€ - Fee: ${feeAmount.toFixed(2)}€ - Neto: ${netAmount.toFixed(2)}€`);
            console.log(`[FINANCE] Comisión Coach (${commissionPercent}%): ${commissionAmount.toFixed(2)}€`);

            const { data: saleId, error: rpcError } = await supabase.rpc('register_sale_safe', {
               p_client_first_name: client.firstName,
               p_client_last_name: client.surname,
               p_client_email: client.email,
               p_client_phone: client.phone || '',
               p_client_dni: client.idNumber || '',
               p_client_address: client.address || '',
               p_contract_duration: duration,
               p_hotmart_payment_link: formData.renewal_payment_link || 'manual_renewal',
               p_payment_receipt_url: formData.renewal_receipt_url || '',
               p_coach_id_or_name: client.coach_id || '',
               p_closer_id_or_name: client.coach_id || '',
               p_status: 'active',
               p_transaction_type: 'renewal',
               p_renewal_phase: phase,
               p_sale_amount: grossAmount,
               p_net_amount: netAmount,
               p_platform_fee_amount: feeAmount,
               p_commission_amount: commissionAmount,
               p_sale_date: new Date().toISOString(),
               p_coach_notes: `Renovación automática desde ficha cliente: ${phase}`,
               p_payment_method: paymentMethodLabel
            });

            if (rpcError) {
               console.error('[FINANCE CRITICAL] Error al registrar venta vía RPC:', rpcError);
               toast.error('Renovación guardada, pero hubo un error registrando la venta financiera.');
            } else {
               console.log('[FINANCE] Venta registrada correctamente con ID:', saleId);
            }
         }

         toast.success(`${phase} Activada, Guardada y Contabilizada Correctamente`);
      } catch (err: any) {
         console.error('[ACTIVATION ERROR]', err);
         toast.error(`Error al guardar la activación de ${phase}: ${err?.message || 'Error desconocido'}`);
      } finally {
         setIsSaving(false);
      }
   };

   const handleQuickSave = async (path: string, value: any) => {
      try {
         const newData = JSON.parse(JSON.stringify(formData));
         setNestedValue(newData, path, value);
         setFormData(newData);
         await onSave(newData);
         toast.success('Dato actualizado correctamente');
      } catch (err: any) {
         console.error('[QUICK-SAVE ERROR]', err);
         toast.error('Error al actualizar: ' + (err.message || 'Error desconocido'));
         // Revertir cambios locales en caso de error
         setFormData(client);
      }
   };

   const handleSave = async () => {
      if (formData.phone && !isValidPhone(formData.phone)) {
         toast.error(`Teléfono no válido. ${PHONE_HELP_TEXT}`);
         return;
      }
      if (hasMandatoryFieldsPending) {
         toast.error(`Faltan datos obligatorios: ${missingMandatoryFieldsLabel}`);
         return;
      }
      console.log('[SAVE DEBUG] target_weight:', formData.target_weight, '| initial_weight:', formData.initial_weight, '| current_weight:', formData.current_weight);
      setIsSaving(true);
      await onSave(formData);

      // Check for unlocked achievements (e.g. Weight Loss)
      await checkAndUnlockAchievements(formData);

      setIsSaving(false);
      setIsEditing(false);
   };

   const handleCancel = () => {
      setFormData(client);
      setIsEditing(false);
   };

   const guardCriticalAction = (): boolean => {
      if (!hasMandatoryFieldsPending) return true;
      toast.error(`Antes de continuar, completa: ${missingMandatoryFieldsLabel}`);
      setActiveTab('overview');
      return false;
   };

   const handleSaveMandatoryData = async () => {
      const pending = getMissingMandatoryClientFields(formData);
      if (pending.length > 0) {
         toast.error(`Faltan datos obligatorios: ${pending.map(field => field.label).join(', ')}`);
         return;
      }

      try {
         setIsSavingMandatoryData(true);
         await onSave(formData);
         setIsFirstCoachAccessPrompt(false);
         toast.success('Datos iniciales guardados correctamente');
      } catch (err: any) {
         toast.error(`No se pudieron guardar los datos iniciales: ${err?.message || 'Error desconocido'}`);
      } finally {
         setIsSavingMandatoryData(false);
      }
   };

   // Handle appointment save from modal
   const handleSaveAppointment = async () => {
      if (!appointmentDate) {
         toast.error('Selecciona una fecha para la cita');
         return;
      }
      setIsSavingAppointment(true);
      try {
         const updatedData = {
            ...formData,
            next_appointment_date: appointmentDate,
            next_appointment_time: appointmentTime || null,
            next_appointment_note: appointmentNote || null,
            next_appointment_link: appointmentLink || null,
            next_appointment_status: 'scheduled',
            next_appointment_conclusions: null
         };
         setFormData(updatedData);
         await onSave(updatedData);
         toast.success('Cita programada correctamente');
         setShowAppointmentModal(false);
         setAppointmentDate('');
         setAppointmentTime('');
         setAppointmentNote('');
         setAppointmentLink('');
      } catch (err: any) {
         toast.error('Error al guardar la cita: ' + err.message);
      } finally {
         setIsSavingAppointment(false);
      }
   };

   // Handle appointment deletion
   const handleDeleteAppointment = async () => {
      if (!window.confirm('¿Eliminar esta cita programada?')) return;
      setIsSavingAppointment(true);
      try {
         const updatedData = {
            ...formData,
            next_appointment_date: null,
            next_appointment_time: null,
            next_appointment_note: null,
            next_appointment_link: null,
            next_appointment_status: null,
            next_appointment_conclusions: null
         };
         setFormData(updatedData as any);
         await onSave(updatedData as any);
         toast.success('Cita eliminada');
      } catch (err: any) {
         toast.error('Error al eliminar la cita');
      } finally {
         setIsSavingAppointment(false);
      }
   };

   // Handle marking appointment as completed/missed
   const handleCompleteAppointment = async () => {
      setIsSavingAppointment(true);
      try {
         const updatedData = {
            ...formData,
            next_appointment_status: completionStatus,
            next_appointment_conclusions: completionConclusions || null
         };
         setFormData(updatedData);
         await onSave(updatedData);
         toast.success(completionStatus === 'completed' ? 'Cita marcada como realizada' : 'Cita marcada como no asistió');
         setShowCompletionModal(false);
         setCompletionConclusions('');
         setCompletionStatus('completed');
      } catch (err: any) {
         toast.error('Error al actualizar la cita: ' + err.message);
      } finally {
         setIsSavingAppointment(false);
      }
   };

   const handlePauseClient = async () => {
      if (!guardCriticalAction()) return;
      if (!pauseDateInput) {
         toast.error('Debes seleccionar una fecha de pausa');
         return;
      }
      if (!pauseReason.trim()) {
         toast.error('Debes indicar un motivo para la pausa');
         return;
      }
      setIsSaving(true);
      try {
         await pauseService.startPause(client.id, pauseReason, currentUser?.id);
         const pauseDateISO = new Date(pauseDateInput).toISOString();
         setFormData(prev => ({ ...prev, status: ClientStatus.PAUSED, pauseDate: pauseDateISO, pauseReason }));

         // Fix: explicitly call onUpdateStatus so parent lists update immediately without refresh
         onUpdateStatus(client.id, ClientStatus.PAUSED, { pauseDate: pauseDateISO, pauseReason });

         toast.success('Cliente pausado correctamente. El tiempo de contrato se ha congelado.');
         setIsPauseModalOpen(false);
         setPauseReason('');
         setPauseDateInput(new Date().toISOString().split('T')[0]);
      } catch (error: any) {
         console.error(error);
         toast.error('Error al pausar cliente: ' + error.message);
      } finally {
         setIsSaving(false);
      }
   };

   const handleReactivateClient = async () => {
      if (!guardCriticalAction()) return;
      if (!window.confirm('¿Seguro que quieres reactivar al cliente? Se calcularán los días de pausa y se sumarán al final del contrato.')) return;

      setIsSaving(true);
      try {
         const days = await pauseService.endPause(client.id, client.contract_end_date);

         let newEndDate = client.contract_end_date;
         if (client.contract_end_date) {
            const d = new Date(client.contract_end_date);
            d.setDate(d.getDate() + days); // This might need robust date arithmetic helper if spanning months/leaps, but StartDate+Days usually ok
            newEndDate = d.toISOString().split('T')[0];
         }

         setFormData(prev => ({
            ...prev,
            status: ClientStatus.ACTIVE,
            pauseDate: '',
            contract_end_date: newEndDate
         }));

         // Notify parent
         onUpdateStatus(client.id, ClientStatus.ACTIVE);

         toast.success(`Cliente reactivado. Se han añadido ${days} días al contrato.`);
      } catch (error: any) {
         console.error(error);
         toast.error('Error al reactivar: ' + error.message);
      } finally {
         setIsSaving(false);
      }
   };

   // Generate invitation link for client activation
   const handleGenerateInvitation = async () => {
      if (formData.user_id) {
         toast.error('Este cliente ya tiene una cuenta activa');
         return;
      }

      setIsGeneratingInvitation(true);
      try {
         // Generate unique token
         const token = crypto.randomUUID();

         // Save token to database
         const { error } = await supabase
            .from('clientes_pt_notion')
            .update({
               activation_token: token,
               activation_token_created_at: new Date().toISOString()
            })
            .eq('id', client.id);

         if (error) throw error;

         // Generate link
         const baseUrl = window.location.origin;
         const link = `${baseUrl}/#/activar-cuenta/${token}`;

         setInvitationLink(link);
         setShowInvitationModal(true);

         // Update local form data
         setFormData(prev => ({
            ...prev,
            activation_token: token,
            activation_token_created_at: new Date().toISOString()
         }));

         toast.success('Enlace de invitacion generado');
      } catch (error: any) {
         console.error('Error generating invitation:', error);
         toast.error('Error al generar el enlace: ' + error.message);
      } finally {
         setIsGeneratingInvitation(false);
      }
   };

   // Reset client access - for stuck clients
   const handleResetAccess = async () => {
      const confirmed = window.confirm(
         '¿Estás seguro de resetear el acceso de este cliente?\n\n' +
         'Esto permitirá generar un nuevo enlace de invitación.\n' +
         'Si el cliente ya tenía cuenta, deberá usar "Recuperar contraseña" en el login.'
      );

      if (!confirmed) return;

      setIsResettingAccess(true);
      try {
         // Generate new token
         const token = crypto.randomUUID();

         // Clear user_id and set new activation token
         const { error } = await supabase
            .from('clientes_pt_notion')
            .update({
               user_id: null,
               activation_token: token,
               activation_token_created_at: new Date().toISOString()
            })
            .eq('id', client.id);

         if (error) throw error;

         // Generate link
         const baseUrl = window.location.origin;
         const link = `${baseUrl}/#/activar-cuenta/${token}`;

         setInvitationLink(link);
         setShowInvitationModal(true);

         // Update local form data
         setFormData(prev => ({
            ...prev,
            user_id: undefined,
            activation_token: token,
            activation_token_created_at: new Date().toISOString()
         }));

         toast.success('Acceso reseteado. Nuevo enlace generado.');
      } catch (error: any) {
         console.error('Error resetting access:', error);
         toast.error('Error al resetear acceso: ' + error.message);
      } finally {
         setIsResettingAccess(false);
      }
   };

   const openStatusModal = (status: ClientStatus) => {
      if (!guardCriticalAction()) return;
      setTargetStatus(status);
      setStatusData({
         date: new Date().toISOString().split('T')[0],
         reason: ''
      });
      setShowStatusModal(true);
   };

   const confirmStatusChange = async () => {
      if (!statusData.date) {
         toast.error("Por favor selecciona una fecha.");
         return;
      }
      if (!statusData.reason.trim()) {
         toast.error("Por favor indica el motivo del cambio de estado.");
         return;
      }
      if (!targetStatus) return;

      const updatePayload: Partial<Client> = {};

      if (targetStatus === ClientStatus.INACTIVE) {
         updatePayload.inactiveDate = statusData.date;
         updatePayload.inactiveReason = statusData.reason;
      } else if (targetStatus === ClientStatus.DROPOUT) {
         updatePayload.abandonmentDate = statusData.date;
         updatePayload.abandonmentReason = statusData.reason;
      } else if (targetStatus === ClientStatus.PAUSED) {
         updatePayload.pauseDate = statusData.date;
         updatePayload.pauseReason = statusData.reason;
      }

      try {
         // 1. Registrar en el historial para análisis (Churn & Retention)
         // First remove any existing record for same client+status+date to prevent duplicates
         await supabase
            .from('client_status_history')
            .delete()
            .eq('client_id', client.id)
            .eq('new_status', targetStatus)
            .eq('change_date', statusData.date);

         const { error: historyError } = await supabase
            .from('client_status_history')
            .insert({
               client_id: client.id,
               old_status: client.status,
               new_status: targetStatus,
               change_date: statusData.date,
               reason: statusData.reason,
               created_by: currentUser?.id
            });

         if (historyError) {
            console.error("Error logging status history:", historyError);
         }

         // 2. Ejecutar la actualización del cliente
         onUpdateStatus(client.id, targetStatus, updatePayload);

         setShowStatusModal(false);
         setTargetStatus(null);

         toast.success(`Estado actualizado correctamente.`);
      } catch (err: any) {
         console.error("Error confirmStatusChange:", err);
         toast.error("Error al actualizar el estado");
      }
   };

   const setNestedValue = (obj: any, path: string, value: any) => {
      const keys = path.split('.');
      let current = obj;
      for (let i = 0; i < keys.length - 1; i++) {
         if (!current[keys[i]]) current[keys[i]] = {};
         current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
   };

   const updateField = useCallback((path: string, value: any) => {
      setFormData(prev => {
         const newData = JSON.parse(JSON.stringify(prev));
         setNestedValue(newData, path, value);
         return newData;
      });
   }, []);

   const openNutritionSpecialRequestModal = () => {
      setNutritionSpecialRequestForm({
         priority: 'normal',
         target_date: '',
         current_kcal: formData.nutrition?.assigned_calories ? String(formData.nutrition.assigned_calories) : '',
         desired_kcal: '',
         request_reason: '',
         requested_changes: '',
         requested_goal: '',
         diseases: formData.medical?.diabetesType || '',
         pathologies: [formData.medical?.pathologies, formData.medical?.otherConditions].filter(Boolean).join(' | '),
         medication: formData.medical?.medication || '',
         allergies: [formData.nutrition?.allergies, formData.nutrition?.otherAllergies].filter(Boolean).join(' | '),
         excluded_foods: formData.nutrition?.dislikes || '',
         preferred_diet: formData.nutrition?.assigned_nutrition_type || formData.nutrition?.preferences || '',
         coach_notes: '',
         confirmation_checked: false,
      });
      setShowNutritionRequestValidation(false);
      setShowNutritionSpecialRequestModal(true);
   };

   const handleSubmitNutritionSpecialRequest = async () => {
      const reason = nutritionSpecialRequestForm.request_reason.trim();
      const changes = nutritionSpecialRequestForm.requested_changes.trim();
      const goal = nutritionSpecialRequestForm.requested_goal.trim();

      setShowNutritionRequestValidation(true);
      if (Object.keys(nutritionSpecialRequestErrors).length > 0) {
         return;
      }
      if (!currentUser?.id) {
         toast.error('No se pudo identificar el usuario actual.');
         return;
      }

      try {
         setIsSubmittingNutritionRequest(true);
         await nutritionSpecialRequestsService.create({
            client_id: client.id,
            created_by: currentUser.id,
            status: 'pending',
            priority: nutritionSpecialRequestForm.priority,
            request_reason: reason,
            requested_changes: changes,
            requested_goal: goal,
            target_date: nutritionSpecialRequestForm.target_date || null,
            coach_notes: nutritionSpecialRequestForm.coach_notes.trim() || null,
            profile_snapshot: {
               client_name: formData.name,
               age: formData.age || null,
               diseases: nutritionSpecialRequestForm.diseases,
               pathologies: nutritionSpecialRequestForm.pathologies,
               medication: nutritionSpecialRequestForm.medication,
               allergies: nutritionSpecialRequestForm.allergies,
               excluded_foods: nutritionSpecialRequestForm.excluded_foods,
               preferred_diet: nutritionSpecialRequestForm.preferred_diet,
               current_kcal: nutritionSpecialRequestForm.current_kcal ? Number(nutritionSpecialRequestForm.current_kcal) : null,
               desired_kcal: nutritionSpecialRequestForm.desired_kcal ? Number(nutritionSpecialRequestForm.desired_kcal) : null,
            },
         });
         setShowNutritionRequestValidation(false);
         setShowNutritionSpecialRequestModal(false);
         toast.success('Solicitud de plan especial enviada correctamente.');
      } catch (err) {
         console.error('Error creating nutrition special request:', err);
         toast.error('No se pudo enviar la solicitud especial.');
      } finally {
         setIsSubmittingNutritionRequest(false);
      }
   };

   const openTrainingSpecialRequestModal = () => {
      setTrainingSpecialRequestForm({
         priority: 'normal',
         target_date: '',
         current_sessions_per_week: '',
         desired_sessions_per_week: '',
         request_reason: '',
         requested_changes: '',
         requested_goal: '',
         activity_level: formData.training?.activityLevel || '',
         steps_goal: formData.training?.stepsGoal ? String(formData.training.stepsGoal) : '',
         strength_experience: formData.training?.strengthTraining ? 'Sí' : 'No o no definido',
         training_location: formData.training?.trainingLocation || '',
         availability: formData.training?.availability || '',
         limitations: [formData.training?.injuries, formData.training?.notes, formData.training?.sensations_report].filter(Boolean).join(' | '),
         equipment: formData.training?.trainingLocation || '',
         coach_notes: '',
         confirmation_checked: false,
      });
      setShowTrainingRequestValidation(false);
      setShowTrainingSpecialRequestModal(true);
   };

   const handleSubmitTrainingSpecialRequest = async () => {
      const reason = trainingSpecialRequestForm.request_reason.trim();
      const changes = trainingSpecialRequestForm.requested_changes.trim();
      const goal = trainingSpecialRequestForm.requested_goal.trim();

      setShowTrainingRequestValidation(true);
      if (Object.keys(trainingSpecialRequestErrors).length > 0) {
         return;
      }
      if (!currentUser?.id) {
         toast.error('No se pudo identificar el usuario actual.');
         return;
      }

      try {
         setIsSubmittingTrainingRequest(true);
         await trainingSpecialRequestsService.create({
            client_id: client.id,
            created_by: currentUser.id,
            status: 'pending',
            priority: trainingSpecialRequestForm.priority,
            request_reason: reason,
            requested_changes: changes,
            requested_goal: goal,
            target_date: trainingSpecialRequestForm.target_date || null,
            coach_notes: trainingSpecialRequestForm.coach_notes.trim() || null,
            profile_snapshot: {
               client_name: formData.name,
               age: formData.age || null,
               activity_level: trainingSpecialRequestForm.activity_level,
               steps_goal: trainingSpecialRequestForm.steps_goal ? Number(trainingSpecialRequestForm.steps_goal) : null,
               strength_experience: trainingSpecialRequestForm.strength_experience,
               training_location: trainingSpecialRequestForm.training_location,
               availability: trainingSpecialRequestForm.availability,
               limitations: trainingSpecialRequestForm.limitations,
               equipment: trainingSpecialRequestForm.equipment,
               current_sessions_per_week: trainingSpecialRequestForm.current_sessions_per_week ? Number(trainingSpecialRequestForm.current_sessions_per_week) : null,
               desired_sessions_per_week: trainingSpecialRequestForm.desired_sessions_per_week ? Number(trainingSpecialRequestForm.desired_sessions_per_week) : null,
            },
         });
         setShowTrainingRequestValidation(false);
         setShowTrainingSpecialRequestModal(false);
         toast.success('Solicitud de ajuste de entrenamiento enviada correctamente.');
      } catch (err) {
         console.error('Error creating training special request:', err);
         toast.error('No se pudo enviar la solicitud de entrenamiento.');
      } finally {
         setIsSubmittingTrainingRequest(false);
      }
   };



   return (
      <div className="space-y-6 pb-20">

         {/* --- STATUS CHANGE MODAL --- */}
         {showStatusModal && targetStatus && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className={`p-6 border-b flex items-start gap-4 ${targetStatus === ClientStatus.INACTIVE ? 'bg-slate-50 border-slate-100' :
                     targetStatus === ClientStatus.DROPOUT ? 'bg-red-50 border-red-100' :
                        'bg-amber-50 border-amber-100'
                     }`}>
                     <div className={`p-3 rounded-full ${targetStatus === ClientStatus.INACTIVE ? 'bg-slate-200 text-slate-600' :
                        targetStatus === ClientStatus.DROPOUT ? 'bg-red-100 text-red-600' :
                           'bg-amber-100 text-amber-600'
                        }`}>
                        {targetStatus === ClientStatus.INACTIVE && <AlertCircle className="w-6 h-6" />}
                        {targetStatus === ClientStatus.DROPOUT && <AlertOctagon className="w-6 h-6" />}
                        {targetStatus === ClientStatus.PAUSED && <PauseCircle className="w-6 h-6" />}
                     </div>
                     <div>
                        <h3 className={`text-lg font-bold ${targetStatus === ClientStatus.INACTIVE ? 'text-slate-800' :
                           targetStatus === ClientStatus.DROPOUT ? 'text-red-800' :
                              'text-amber-800'
                           }`}>
                           {targetStatus === ClientStatus.INACTIVE ? 'Confirmar Baja' :
                              targetStatus === ClientStatus.DROPOUT ? 'Registrar Abandono' :
                                 'Pausar Cliente'}
                        </h3>
                        <p className="text-sm opacity-80 mt-1">
                           Estás cambiando el estado de {client.firstName} a <span className="font-bold">{getStatusLabel(targetStatus)}</span>.
                        </p>
                     </div>
                  </div>

                  <div className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                           Fecha {targetStatus === ClientStatus.INACTIVE ? 'de Baja' : targetStatus === ClientStatus.PAUSED ? 'de Pausa' : 'del Abandono'}
                        </label>
                        <input
                           type="date"
                           required
                           value={statusData.date}
                           onChange={(e) => setStatusData(prev => ({ ...prev, date: e.target.value }))}
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Motivo / Notas</label>
                        <textarea
                           required
                           rows={3}
                           value={statusData.reason}
                           onChange={(e) => setStatusData(prev => ({ ...prev, reason: e.target.value }))}
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                           placeholder="Explica brevemente la razón..."
                        />
                     </div>
                  </div>

                  <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                     <button
                        onClick={() => setShowStatusModal(false)}
                        className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                     >
                        Cancelar
                     </button>
                     <button
                        onClick={confirmStatusChange}
                        className={`px-4 py-2 text-white rounded-lg font-medium shadow-sm ${targetStatus === ClientStatus.INACTIVE ? 'bg-slate-700 hover:bg-slate-800' :
                           targetStatus === ClientStatus.DROPOUT ? 'bg-red-600 hover:bg-red-700' :
                              'bg-amber-500 hover:bg-amber-600'
                           }`}
                     >
                        Confirmar Cambio
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* --- PAUSE MODAL --- */}
         {isPauseModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-amber-100 bg-amber-50 flex items-start gap-4">
                     <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                        <PauseCircle className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-amber-900">Pausar Servicio</h3>
                        <p className="text-sm text-amber-700/80 mt-1">
                           El contrato se congelará desde hoy. Al reactivar, se sumarán los días pausados al final del contrato.
                        </p>
                     </div>
                  </div>

                  <div className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Pausa</label>
                        <input
                           type="date"
                           required
                           value={pauseDateInput}
                           onChange={(e) => setPauseDateInput(e.target.value)}
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Motivo de la pausa</label>
                        <textarea
                           required
                           rows={3}
                           value={pauseReason}
                           onChange={(e) => setPauseReason(e.target.value)}
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                           placeholder="Ej: Viaje, enfermedad, motivos personales..."
                        />
                     </div>
                  </div>

                  <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                     <button
                        onClick={() => setIsPauseModalOpen(false)}
                        className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                     >
                        Cancelar
                     </button>
                     <button
                        onClick={handlePauseClient}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 shadow-sm disabled:opacity-50 transition-all"
                     >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />}
                        Confirmar Pausa
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* --- APPOINTMENT MODAL --- */}
         {showAppointmentModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-start gap-4">
                     <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                        <Calendar className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-amber-900">Programar Cita</h3>
                        <p className="text-sm text-amber-700/80 mt-1">
                           Esta cita será visible para el cliente en su portal.
                        </p>
                     </div>
                  </div>

                  <div className="p-6 space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-bold text-slate-700 mb-2">Fecha de la cita *</label>
                           <input
                              type="date"
                              value={appointmentDate}
                              onChange={(e) => setAppointmentDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-lg"
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-slate-700 mb-2">Hora</label>
                           <input
                              type="time"
                              value={appointmentTime}
                              onChange={(e) => setAppointmentTime(e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-lg"
                           />
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Motivo / Descripción</label>
                        <textarea
                           rows={3}
                           value={appointmentNote}
                           onChange={(e) => setAppointmentNote(e.target.value)}
                           className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                           placeholder="Ej: Revisión semanal, ajuste de dieta, consulta médica..."
                        />
                        <p className="text-xs text-slate-400 mt-1">Este motivo también será visible para el cliente</p>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Enlace de reunión</label>
                        <input
                           type="url"
                           value={appointmentLink}
                           onChange={(e) => setAppointmentLink(e.target.value)}
                           className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                           placeholder="https://meet.google.com/... o https://zoom.us/j/..."
                        />
                        <p className="text-xs text-slate-400 mt-1">El cliente verá un botón para unirse directamente</p>
                     </div>
                  </div>

                  <div className="p-4 bg-slate-50 flex justify-between items-center gap-3 border-t border-slate-100">
                     <div>
                        {formData.next_appointment_date && (
                           <button
                              onClick={handleDeleteAppointment}
                              disabled={isSavingAppointment}
                              className="text-red-500 hover:text-red-600 text-sm font-medium hover:underline"
                           >
                              Eliminar cita
                           </button>
                        )}
                     </div>
                     <div className="flex gap-3">
                        <button
                           onClick={() => setShowAppointmentModal(false)}
                           className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                        >
                           Cancelar
                        </button>
                        <button
                           onClick={handleSaveAppointment}
                           disabled={isSavingAppointment || !appointmentDate}
                           className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 shadow-sm disabled:opacity-50 transition-all"
                        >
                           {isSavingAppointment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                           Guardar Cita
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* --- APPOINTMENT COMPLETION MODAL --- */}
         {showCompletionModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCompletionModal(false)}>
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 flex items-start gap-4">
                     <div className="p-3 rounded-full bg-green-100 text-green-600">
                        <ClipboardCheck className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-green-900">Registrar resultado de la cita</h3>
                        <p className="text-sm text-green-700/80 mt-1">
                           {formData.next_appointment_date && new Date(formData.next_appointment_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                           {formData.next_appointment_time && ` a las ${formData.next_appointment_time}h`}
                        </p>
                     </div>
                  </div>

                  <div className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Estado</label>
                        <div className="grid grid-cols-2 gap-3">
                           <button
                              onClick={() => setCompletionStatus('completed')}
                              className={`p-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${completionStatus === 'completed'
                                 ? 'border-green-500 bg-green-50 text-green-700'
                                 : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                 }`}
                           >
                              <CheckCircle2 className="w-4 h-4" />
                              Realizada
                           </button>
                           <button
                              onClick={() => setCompletionStatus('missed')}
                              className={`p-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${completionStatus === 'missed'
                                 ? 'border-red-500 bg-red-50 text-red-700'
                                 : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                 }`}
                           >
                              <XCircle className="w-4 h-4" />
                              No asistió
                           </button>
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                           {completionStatus === 'completed' ? 'Conclusiones / Notas de la llamada' : 'Motivo / Observaciones'}
                        </label>
                        <textarea
                           rows={4}
                           value={completionConclusions}
                           onChange={(e) => setCompletionConclusions(e.target.value)}
                           className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none"
                           placeholder={completionStatus === 'completed'
                              ? 'Ej: Se revisaron objetivos, se ajustó plan nutricional, próximo foco en...'
                              : 'Ej: No contestó, se reprogramará para...'
                           }
                        />
                        <p className="text-xs text-slate-400 mt-1">Estas notas NO son visibles para el cliente</p>
                     </div>
                  </div>

                  <div className="p-4 bg-slate-50 flex justify-end items-center gap-3 border-t border-slate-100">
                     <button
                        onClick={() => setShowCompletionModal(false)}
                        className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                     >
                        Cancelar
                     </button>
                     <button
                        onClick={handleCompleteAppointment}
                        disabled={isSavingAppointment}
                        className={`flex items-center gap-2 px-5 py-2 text-white rounded-lg font-medium shadow-sm disabled:opacity-50 transition-all ${completionStatus === 'completed'
                           ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                           : 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600'
                           }`}
                     >
                        {isSavingAppointment ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                        Guardar
                     </button>
                  </div>
               </div>
            </div>
         )}

         {showNutritionSpecialRequestModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowNutritionSpecialRequestModal(false)}>
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-blue-50 flex items-center justify-between">
                     <div>
                        <h3 className="text-lg font-bold text-slate-800">Solicitud de Plan Especial</h3>
                        <p className="text-xs text-slate-500 mt-1">{formData.name} · Esta solicitud aparecerá en Centro de Nutrición &gt; Solicitudes Especiales.</p>
                     </div>
                     <button onClick={() => setShowNutritionSpecialRequestModal(false)} className="p-2 hover:bg-white rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                     </button>
                  </div>

                  <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                           <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Motivo de la solicitud *</label>
                           <textarea
                              rows={4}
                              value={nutritionSpecialRequestForm.request_reason}
                              onChange={(e) => setNutritionSpecialRequestForm(prev => ({ ...prev, request_reason: e.target.value }))}
                              className={`mt-1 w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ${showNutritionRequestValidation && nutritionSpecialRequestErrors.request_reason
                                 ? 'border-red-400 bg-red-50/40 focus:ring-red-500/20 focus:border-red-500'
                                 : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500'
                                 }`}
                              placeholder="Explica por qué se solicita el plan especial y qué está pasando con el plan actual."
                           />
                           <p className={`text-[11px] mt-1 ${nutritionSpecialRequestForm.request_reason.trim().length >= 120 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              Mínimo 120 caracteres ({nutritionSpecialRequestForm.request_reason.trim().length}/120).
                           </p>
                           {showNutritionRequestValidation && nutritionSpecialRequestErrors.request_reason && (
                              <p className="text-[11px] text-red-600 mt-1">{nutritionSpecialRequestErrors.request_reason}</p>
                           )}
                        </div>
                        <div>
                           <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Prioridad</label>
                           <select
                              value={nutritionSpecialRequestForm.priority}
                              onChange={(e) => setNutritionSpecialRequestForm(prev => ({ ...prev, priority: e.target.value as 'normal' | 'high' }))}
                              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                           >
                              <option value="normal">Normal</option>
                              <option value="high">Alta</option>
                           </select>

                           <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mt-3 block">Fecha objetivo</label>
                           <input
                              type="date"
                              value={nutritionSpecialRequestForm.target_date}
                              onChange={(e) => setNutritionSpecialRequestForm(prev => ({ ...prev, target_date: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                           />

                           <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mt-3 block">Kcal actuales del plan</label>
                           <input
                              type="number"
                              min={0}
                              step={1}
                              value={nutritionSpecialRequestForm.current_kcal}
                              onChange={(e) => setNutritionSpecialRequestForm(prev => ({ ...prev, current_kcal: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              placeholder="Ej: 1600"
                           />

                           <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mt-3 block">Kcal deseadas por coach</label>
                           <input
                              type="number"
                              min={0}
                              step={1}
                              value={nutritionSpecialRequestForm.desired_kcal}
                              onChange={(e) => setNutritionSpecialRequestForm(prev => ({ ...prev, desired_kcal: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              placeholder="Ej: 1400"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                           <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Qué cambia respecto al plan actual *</label>
                           <textarea
                              rows={4}
                              value={nutritionSpecialRequestForm.requested_changes}
                              onChange={(e) => setNutritionSpecialRequestForm(prev => ({ ...prev, requested_changes: e.target.value }))}
                              className={`mt-1 w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ${showNutritionRequestValidation && nutritionSpecialRequestErrors.requested_changes
                                 ? 'border-red-400 bg-red-50/40 focus:ring-red-500/20 focus:border-red-500'
                                 : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500'
                                 }`}
                              placeholder="Síntomas, adherencia, horarios, digestión, glucemias, etc."
                           />
                           <p className={`text-[11px] mt-1 ${nutritionSpecialRequestForm.requested_changes.trim().length >= 80 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              Mínimo 80 caracteres ({nutritionSpecialRequestForm.requested_changes.trim().length}/80).
                           </p>
                           {showNutritionRequestValidation && nutritionSpecialRequestErrors.requested_changes && (
                              <p className="text-[11px] text-red-600 mt-1">{nutritionSpecialRequestErrors.requested_changes}</p>
                           )}
                        </div>
                        <div>
                           <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Objetivo del nuevo plan *</label>
                           <textarea
                              rows={4}
                              value={nutritionSpecialRequestForm.requested_goal}
                              onChange={(e) => setNutritionSpecialRequestForm(prev => ({ ...prev, requested_goal: e.target.value }))}
                              className={`mt-1 w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ${showNutritionRequestValidation && nutritionSpecialRequestErrors.requested_goal
                                 ? 'border-red-400 bg-red-50/40 focus:ring-red-500/20 focus:border-red-500'
                                 : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500'
                                 }`}
                              placeholder="Qué objetivo clínico o práctico se persigue con este ajuste."
                           />
                           <p className={`text-[11px] mt-1 ${nutritionSpecialRequestForm.requested_goal.trim().length >= 40 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              Mínimo 40 caracteres ({nutritionSpecialRequestForm.requested_goal.trim().length}/40).
                           </p>
                           {showNutritionRequestValidation && nutritionSpecialRequestErrors.requested_goal && (
                              <p className="text-[11px] text-red-600 mt-1">{nutritionSpecialRequestErrors.requested_goal}</p>
                           )}
                        </div>
                     </div>

                     <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">Datos pre-rellenados (editables)</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <div>
                              <label className="text-xs font-semibold text-slate-500">Enfermedades</label>
                              <input
                                 value={nutritionSpecialRequestForm.diseases}
                                 onChange={(e) => setNutritionSpecialRequestForm(prev => ({ ...prev, diseases: e.target.value }))}
                                 className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              />
                           </div>
                           <div>
                              <label className="text-xs font-semibold text-slate-500">Patologías</label>
                              <input
                                 value={nutritionSpecialRequestForm.pathologies}
                                 onChange={(e) => setNutritionSpecialRequestForm(prev => ({ ...prev, pathologies: e.target.value }))}
                                 className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              />
                           </div>
                           <div>
                              <label className="text-xs font-semibold text-slate-500">Medicación</label>
                              <input
                                 value={nutritionSpecialRequestForm.medication}
                                 onChange={(e) => setNutritionSpecialRequestForm(prev => ({ ...prev, medication: e.target.value }))}
                                 className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              />
                           </div>
                           <div>
                              <label className="text-xs font-semibold text-slate-500">Alergias / Intolerancias</label>
                              <input
                                 value={nutritionSpecialRequestForm.allergies}
                                 onChange={(e) => setNutritionSpecialRequestForm(prev => ({ ...prev, allergies: e.target.value }))}
                                 className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              />
                           </div>
                           <div>
                              <label className="text-xs font-semibold text-slate-500">Alimentos vetados</label>
                              <input
                                 value={nutritionSpecialRequestForm.excluded_foods}
                                 onChange={(e) => setNutritionSpecialRequestForm(prev => ({ ...prev, excluded_foods: e.target.value }))}
                                 className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              />
                           </div>
                           <div>
                              <label className="text-xs font-semibold text-slate-500">Tipo de alimentación preferido</label>
                              <input
                                 value={nutritionSpecialRequestForm.preferred_diet}
                                 onChange={(e) => setNutritionSpecialRequestForm(prev => ({ ...prev, preferred_diet: e.target.value }))}
                                 className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              />
                           </div>
                        </div>
                     </div>

                     <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Notas adicionales del coach</label>
                        <textarea
                           rows={3}
                           value={nutritionSpecialRequestForm.coach_notes}
                           onChange={(e) => setNutritionSpecialRequestForm(prev => ({ ...prev, coach_notes: e.target.value }))}
                           className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                           placeholder="Información extra útil para la nutricionista."
                        />
                     </div>

                     <label className={`flex items-start gap-2 p-3 rounded-xl border ${showNutritionRequestValidation && nutritionSpecialRequestErrors.confirmation_checked ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                        <input
                           type="checkbox"
                           checked={nutritionSpecialRequestForm.confirmation_checked}
                           onChange={(e) => setNutritionSpecialRequestForm(prev => ({ ...prev, confirmation_checked: e.target.checked }))}
                           className="mt-0.5"
                        />
                        <span className={`text-xs ${showNutritionRequestValidation && nutritionSpecialRequestErrors.confirmation_checked ? 'text-red-800' : 'text-amber-800'}`}>
                           Confirmo que he revisado la ficha clínica y nutricional del cliente y que la solicitud está justificada.
                        </span>
                     </label>
                     {showNutritionRequestValidation && nutritionSpecialRequestErrors.confirmation_checked && (
                        <p className="text-[11px] text-red-600 mt-1">{nutritionSpecialRequestErrors.confirmation_checked}</p>
                     )}
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                     {showNutritionRequestValidation && Object.keys(nutritionSpecialRequestErrors).length > 0 && (
                        <div className="mr-auto px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-medium">
                           Revisa los campos marcados en rojo antes de guardar la solicitud.
                        </div>
                     )}
                     <button
                        onClick={() => setShowNutritionSpecialRequestModal(false)}
                        className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                     >
                        Cancelar
                     </button>
                     <button
                        onClick={handleSubmitNutritionSpecialRequest}
                        disabled={isSubmittingNutritionRequest}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-60 inline-flex items-center gap-2"
                     >
                        {isSubmittingNutritionRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Enviar solicitud
                     </button>
                  </div>
               </div>
            </div>
         )}

         {showTrainingSpecialRequestModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowTrainingSpecialRequestModal(false)}>
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-cyan-50 flex items-center justify-between">
                     <div>
                        <h3 className="text-lg font-bold text-slate-800">Solicitud de Ajuste de Entrenamiento</h3>
                        <p className="text-xs text-slate-500 mt-1">{formData.name} · Esta solicitud aparecerá en Centro de Entrenamiento &gt; Solicitudes Especiales.</p>
                     </div>
                     <button onClick={() => setShowTrainingSpecialRequestModal(false)} className="p-2 hover:bg-white rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                     </button>
                  </div>

                  <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                           <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Motivo de la solicitud *</label>
                           <textarea
                              rows={4}
                              value={trainingSpecialRequestForm.request_reason}
                              onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, request_reason: e.target.value }))}
                              className={`mt-1 w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ${showTrainingRequestValidation && trainingSpecialRequestErrors.request_reason
                                 ? 'border-red-400 bg-red-50/40 focus:ring-red-500/20 focus:border-red-500'
                                 : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500'
                                 }`}
                              placeholder="Explica por qué se necesita ajustar el plan de entrenamiento."
                           />
                           <p className={`text-[11px] mt-1 ${trainingSpecialRequestForm.request_reason.trim().length >= 120 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              Mínimo 120 caracteres ({trainingSpecialRequestForm.request_reason.trim().length}/120).
                           </p>
                           {showTrainingRequestValidation && trainingSpecialRequestErrors.request_reason && (
                              <p className="text-[11px] text-red-600 mt-1">{trainingSpecialRequestErrors.request_reason}</p>
                           )}
                        </div>
                        <div>
                           <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Prioridad</label>
                           <select
                              value={trainingSpecialRequestForm.priority}
                              onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, priority: e.target.value as 'normal' | 'high' }))}
                              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                           >
                              <option value="normal">Normal</option>
                              <option value="high">Alta</option>
                           </select>

                           <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mt-3 block">Fecha objetivo</label>
                           <input
                              type="date"
                              value={trainingSpecialRequestForm.target_date}
                              onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, target_date: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                           />

                           <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mt-3 block">Sesiones actuales/semana</label>
                           <input
                              type="number"
                              min={0}
                              value={trainingSpecialRequestForm.current_sessions_per_week}
                              onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, current_sessions_per_week: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                           />

                           <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mt-3 block">Sesiones deseadas/semana</label>
                           <input
                              type="number"
                              min={0}
                              value={trainingSpecialRequestForm.desired_sessions_per_week}
                              onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, desired_sessions_per_week: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                           <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Qué no funciona del plan actual *</label>
                           <textarea
                              rows={4}
                              value={trainingSpecialRequestForm.requested_changes}
                              onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, requested_changes: e.target.value }))}
                              className={`mt-1 w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ${showTrainingRequestValidation && trainingSpecialRequestErrors.requested_changes
                                 ? 'border-red-400 bg-red-50/40 focus:ring-red-500/20 focus:border-red-500'
                                 : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500'
                                 }`}
                              placeholder="Adherencia, fatiga, dolor, falta de tiempo, etc."
                           />
                           <p className={`text-[11px] mt-1 ${trainingSpecialRequestForm.requested_changes.trim().length >= 80 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              Mínimo 80 caracteres ({trainingSpecialRequestForm.requested_changes.trim().length}/80).
                           </p>
                           {showTrainingRequestValidation && trainingSpecialRequestErrors.requested_changes && (
                              <p className="text-[11px] text-red-600 mt-1">{trainingSpecialRequestErrors.requested_changes}</p>
                           )}
                        </div>
                        <div>
                           <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Objetivo del nuevo plan *</label>
                           <textarea
                              rows={4}
                              value={trainingSpecialRequestForm.requested_goal}
                              onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, requested_goal: e.target.value }))}
                              className={`mt-1 w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ${showTrainingRequestValidation && trainingSpecialRequestErrors.requested_goal
                                 ? 'border-red-400 bg-red-50/40 focus:ring-red-500/20 focus:border-red-500'
                                 : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500'
                                 }`}
                              placeholder="Qué resultado debe conseguir el cliente con este ajuste."
                           />
                           <p className={`text-[11px] mt-1 ${trainingSpecialRequestForm.requested_goal.trim().length >= 40 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              Mínimo 40 caracteres ({trainingSpecialRequestForm.requested_goal.trim().length}/40).
                           </p>
                           {showTrainingRequestValidation && trainingSpecialRequestErrors.requested_goal && (
                              <p className="text-[11px] text-red-600 mt-1">{trainingSpecialRequestErrors.requested_goal}</p>
                           )}
                        </div>
                     </div>

                     <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">Datos pre-rellenados (editables)</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <div>
                              <label className="text-xs font-semibold text-slate-500">Nivel / actividad base</label>
                              <input value={trainingSpecialRequestForm.activity_level} onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, activity_level: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                           </div>
                           <div>
                              <label className="text-xs font-semibold text-slate-500">Pasos objetivo</label>
                              <input type="number" min={0} value={trainingSpecialRequestForm.steps_goal} onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, steps_goal: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                           </div>
                           <div>
                              <label className="text-xs font-semibold text-slate-500">Experiencia en fuerza</label>
                              <input value={trainingSpecialRequestForm.strength_experience} onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, strength_experience: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                           </div>
                           <div>
                              <label className="text-xs font-semibold text-slate-500">Lugar de entrenamiento</label>
                              <input value={trainingSpecialRequestForm.training_location} onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, training_location: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                           </div>
                           <div>
                              <label className="text-xs font-semibold text-slate-500">Disponibilidad semanal</label>
                              <input value={trainingSpecialRequestForm.availability} onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, availability: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                           </div>
                           <div>
                              <label className="text-xs font-semibold text-slate-500">Material disponible</label>
                              <input value={trainingSpecialRequestForm.equipment} onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, equipment: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                           </div>
                           <div className="md:col-span-2">
                              <label className="text-xs font-semibold text-slate-500">Limitaciones / molestias / notas de sensaciones</label>
                              <textarea rows={2} value={trainingSpecialRequestForm.limitations} onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, limitations: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                           </div>
                        </div>
                     </div>

                     <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Notas adicionales del coach</label>
                        <textarea rows={3} value={trainingSpecialRequestForm.coach_notes} onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, coach_notes: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Información extra útil para el equipo de entrenamiento." />
                     </div>

                     <label className={`flex items-start gap-2 p-3 rounded-xl border ${showTrainingRequestValidation && trainingSpecialRequestErrors.confirmation_checked ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                        <input type="checkbox" checked={trainingSpecialRequestForm.confirmation_checked} onChange={(e) => setTrainingSpecialRequestForm(prev => ({ ...prev, confirmation_checked: e.target.checked }))} className="mt-0.5" />
                        <span className={`text-xs ${showTrainingRequestValidation && trainingSpecialRequestErrors.confirmation_checked ? 'text-red-800' : 'text-amber-800'}`}>
                           Confirmo que he revisado la ficha de entrenamiento y que la solicitud está justificada.
                        </span>
                     </label>
                     {showTrainingRequestValidation && trainingSpecialRequestErrors.confirmation_checked && (
                        <p className="text-[11px] text-red-600 mt-1">{trainingSpecialRequestErrors.confirmation_checked}</p>
                     )}
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                     {showTrainingRequestValidation && Object.keys(trainingSpecialRequestErrors).length > 0 && (
                        <div className="mr-auto px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-medium">
                           Revisa los campos marcados en rojo antes de guardar la solicitud.
                        </div>
                     )}
                     <button onClick={() => setShowTrainingSpecialRequestModal(false)} className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium">
                        Cancelar
                     </button>
                     <button onClick={handleSubmitTrainingSpecialRequest} disabled={isSubmittingTrainingRequest} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60 inline-flex items-center gap-2">
                        {isSubmittingTrainingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Enviar solicitud
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* --- INVITATION LINK MODAL --- */}
         {showInvitationModal && (
            <InvitationLinkModal
               clientName={`${formData.firstName} ${formData.surname}`}
               invitationLink={invitationLink}
               onClose={() => setShowInvitationModal(false)}
            />
         )}

         {/* --- ACTIONS MODAL (replaces broken dropdown) --- */}
         {showActionsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowActionsModal(false)}>
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                  {/* Header */}
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                           <MoreVertical className="w-5 h-5" />
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-slate-800">Acciones</h3>
                           <p className="text-xs text-slate-500">{client.firstName} {client.surname}</p>
                        </div>
                     </div>
                     <button onClick={() => setShowActionsModal(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                     </button>
                  </div>

                  {/* Actions List */}
                  <div className="p-4 space-y-1 max-h-[60vh] overflow-y-auto">
                     {/* Communication */}
                     {onViewAsClient && (
                        <button
                           onClick={() => { onViewAsClient(); setShowActionsModal(false); }}
                           className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-purple-50 rounded-xl transition-colors"
                        >
                           <div className="p-2 rounded-lg bg-purple-100"><Eye className="w-4 h-4 text-purple-600" /></div>
                           <div className="text-left"><div className="font-medium">Ver Portal del Cliente</div><div className="text-xs text-slate-400">Vista previa del portal</div></div>
                        </button>
                     )}

                     {formData.phone && (
                        <a
                           href={`https://t.me/${formData.phone?.replace(/[^0-9]/g, '').replace(/^(?!34)/, '34')}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           onClick={() => setShowActionsModal(false)}
                           className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 rounded-xl transition-colors"
                        >
                           <div className="p-2 rounded-lg bg-blue-100"><Send className="w-4 h-4 text-blue-500" /></div>
                           <div className="text-left"><div className="font-medium">Abrir Telegram</div><div className="text-xs text-slate-400">Enviar mensaje</div></div>
                        </a>
                     )}

                     <div className="border-t border-slate-100 !my-3" />

                     {/* Admin Actions */}
                     <button
                        onClick={() => {
                           const newValue = !formData.allow_endocrine_access;
                           const updated = { ...formData, allow_endocrine_access: newValue };
                           setFormData(updated);
                           onSave(updated);
                           setShowActionsModal(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-emerald-50 rounded-xl transition-colors"
                     >
                        <div className={`p-2 rounded-lg ${formData.allow_endocrine_access ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                           <Stethoscope className={`w-4 h-4 ${formData.allow_endocrine_access ? 'text-emerald-500' : 'text-slate-400'}`} />
                        </div>
                        <div className="text-left flex-1">
                           <div className="font-medium">{formData.allow_endocrine_access ? 'Desactivar Endocrino' : 'Activar Endocrino'}</div>
                           <div className="text-xs text-slate-400">{formData.allow_endocrine_access ? 'Acceso activo' : 'Sin acceso'}</div>
                        </div>
                        {formData.allow_endocrine_access && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                     </button>

                     {!formData.user_id ? (
                        <button
                           onClick={() => { handleGenerateInvitation(); setShowActionsModal(false); }}
                           disabled={isGeneratingInvitation}
                           className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-50"
                        >
                           <div className="p-2 rounded-lg bg-emerald-100">
                              {isGeneratingInvitation ? <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> : <UserPlus className="w-4 h-4 text-emerald-500" />}
                           </div>
                           <div className="text-left"><div className="font-medium">Generar Invitación</div><div className="text-xs text-slate-400">Crear enlace de acceso</div></div>
                        </button>
                     ) : (
                        <button
                           onClick={() => { handleResetAccess(); setShowActionsModal(false); }}
                           disabled={isResettingAccess}
                           className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-orange-50 rounded-xl transition-colors disabled:opacity-50"
                        >
                           <div className="p-2 rounded-lg bg-orange-100">
                              {isResettingAccess ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <RefreshCw className="w-4 h-4 text-orange-500" />}
                           </div>
                           <div className="text-left"><div className="font-medium">Resetear Acceso</div><div className="text-xs text-slate-400">Regenerar credenciales</div></div>
                        </button>
                     )}

                     {/* Status Section */}
                      <div className="border-t border-slate-100 !my-3" />
                      <div className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cambiar Estado</div>
                      {hasMandatoryFieldsPending && (
                         <p className="px-4 pb-2 text-[11px] font-medium text-amber-600">
                            Bloqueado hasta completar: {missingMandatoryFieldsLabel}
                         </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 px-2">
                         {client.status !== ClientStatus.ACTIVE && (
                            <button
                               onClick={() => {
                                  if (client.status === ClientStatus.PAUSED) handleReactivateClient();
                                  else {
                                     if (!guardCriticalAction()) return;
                                     onUpdateStatus(client.id, ClientStatus.ACTIVE);
                                  }
                                  setShowActionsModal(false);
                               }}
                               disabled={hasMandatoryFieldsPending}
                               className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                               <Play className="w-5 h-5" />
                               <span className="text-xs font-bold">Activar</span>
                            </button>
                         )}

                         {client.status === ClientStatus.ACTIVE && (
                            <button
                               onClick={() => { setIsPauseModalOpen(true); setShowActionsModal(false); }}
                               disabled={hasMandatoryFieldsPending}
                               className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                               <PauseCircle className="w-5 h-5" />
                               <span className="text-xs font-bold">Pausar</span>
                            </button>
                         )}

                         {client.status !== ClientStatus.DROPOUT && (
                            <button
                               onClick={() => { openStatusModal(ClientStatus.DROPOUT); setShowActionsModal(false); }}
                               disabled={hasMandatoryFieldsPending}
                               className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                               <UserX className="w-5 h-5" />
                               <span className="text-xs font-bold">Abandono</span>
                            </button>
                         )}

                         {client.status !== ClientStatus.INACTIVE && (
                            <button
                               onClick={() => { openStatusModal(ClientStatus.INACTIVE); setShowActionsModal(false); }}
                               disabled={hasMandatoryFieldsPending}
                               className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                               <XCircle className="w-5 h-5" />
                               <span className="text-xs font-bold">Baja</span>
                           </button>
                        )}
                     </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50">
                     <button
                        onClick={() => setShowActionsModal(false)}
                        className="w-full py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                     >
                        Cerrar
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* ============ PREMIUM HEADER ============ */}
         <div className="relative rounded-2xl mb-6 shadow-xl">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 overflow-hidden rounded-2xl">
               <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 opacity-20 rounded-full blur-3xl -mr-32 -mt-32"></div>
               <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-indigo-500 opacity-10 rounded-full blur-3xl"></div>
            </div>

            {/* Header Content */}
            <div className="relative z-10 p-6 md:p-8">
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left: Client Info */}
                  <div className="flex items-center gap-5">
                     {!readOnly && (
                        <button onClick={onBack} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm border border-white/10">
                           <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                     )}

                     {/* Avatar Placeholder */}
                     <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-900/30 border-2 border-white/20">
                        {client.firstName?.charAt(0)}{client.surname?.charAt(0)}
                     </div>

                     <div>
                        <div className="flex items-center gap-3 flex-wrap">
                           <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                              {client.firstName} <span className="text-blue-200">{client.surname}</span>
                           </h1>
                           <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase shadow-sm ${client.status === ClientStatus.ACTIVE ? 'bg-emerald-500 text-white' :
                              client.status === ClientStatus.PAUSED ? 'bg-amber-500 text-white' :
                                 client.status === ClientStatus.DROPOUT ? 'bg-red-500 text-white' :
                                    'bg-slate-500 text-white'
                              }`}>
                              {getStatusLabel(client.status)}
                           </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-blue-100">
                           <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                              <User className="w-3.5 h-3.5" /> {client.age} años
                           </span>
                           {client.city && (
                              <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                                 <MapPin className="w-3.5 h-3.5" /> {client.city}
                              </span>
                           )}
                           <span className="flex items-center gap-1.5 bg-blue-500/30 px-2.5 py-1 rounded-lg font-medium">
                              <Briefcase className="w-3.5 h-3.5" /> Coach: {coachDisplayName || client.coach_id || 'Sin Asignar'}
                           </span>
                           {client.allow_endocrine_access && (
                              <span className="flex items-center gap-1.5 bg-emerald-500/30 px-2.5 py-1 rounded-lg font-medium">
                                 <Stethoscope className="w-3.5 h-3.5" /> Endocrino
                              </span>
                           )}
                           {/* Account Status Indicator */}
                           {formData.user_id ? (
                              <span className="flex items-center gap-1.5 bg-green-500/30 px-2.5 py-1 rounded-lg font-medium text-green-200">
                                 <CheckCircle2 className="w-3.5 h-3.5" /> Cuenta activa
                              </span>
                           ) : formData.activation_token ? (
                              <span className="flex items-center gap-1.5 bg-amber-500/30 px-2.5 py-1 rounded-lg font-medium text-amber-200">
                                 <Clock className="w-3.5 h-3.5" /> Pendiente activación
                              </span>
                           ) : (
                              <span className="flex items-center gap-1.5 bg-red-500/30 px-2.5 py-1 rounded-lg font-medium text-red-200">
                                 <AlertCircle className="w-3.5 h-3.5" /> Sin invitar
                              </span>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* Right: Simplified Quick Actions */}
                  {!readOnly && (
                     <div className="flex items-center gap-2">
                        {!isEditing ? (
                           <>
                              {/* Primary: WhatsApp Contact */}
                              {formData.phone && (
                                 <a
                                    href={`https://wa.me/${formData.phone?.replace(/[^0-9]/g, '').replace(/^(?!34)/, '34')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 rounded-xl transition-all shadow-lg shadow-green-900/30 text-white text-sm font-medium"
                                    title="WhatsApp"
                                 >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                       <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    <span className="hidden sm:inline">WhatsApp</span>
                                 </a>
                              )}

                              <button
                                 onClick={handleCopyClientAccessMessage}
                                 className="flex items-center gap-2 px-3 py-2 bg-blue-500/80 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-900/20 text-white text-sm font-medium"
                                 title="Copiar guia de acceso"
                              >
                                 <FileText className="w-4 h-4" />
                                 <span className="hidden sm:inline">Guia acceso</span>
                              </button>

                              {/* Edit Button */}
                              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 text-white text-sm font-medium transition-all">
                                 <Edit3 className="w-4 h-4" /> Editar
                              </button>

                              {/* Actions Button - Opens Modal */}
                              <button
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    setShowActionsModal(true);
                                 }}
                                 className="flex items-center gap-2 px-3 py-2 bg-white/20 border border-white/30 rounded-xl hover:bg-white/30 text-white text-sm font-medium transition-all backdrop-blur-md"
                              >
                                 <MoreVertical className="w-4 h-4" />
                                 <span className="hidden sm:inline">Acciones</span>
                              </button>
                           </>
                        ) : (
                           <>
                              <button onClick={handleCancel} className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 text-white text-sm font-medium transition-all">
                                 <X className="w-4 h-4" /> Cancelar
                              </button>
                              <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 text-sm font-medium shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50">
                                 <Save className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Guardar'}
                              </button>
                           </>
                        )}
                     </div>
                  )}
               </div>

               {hasMandatoryFieldsPending && (
                  <div className={`mt-6 rounded-2xl border p-4 md:p-5 ${isFirstCoachAccessPrompt ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300' : 'bg-white/95 border-amber-200'}`}>
                     <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                           <p className="text-xs font-black uppercase tracking-wider text-amber-700">Datos obligatorios pendientes</p>
                           <h3 className="text-base md:text-lg font-bold text-slate-900 mt-1">
                              {isFirstCoachAccessPrompt ? 'Primer acceso: completa los datos iniciales ahora' : 'Completa estos datos para poder operar con la ficha'}
                           </h3>
                           <p className="text-sm text-slate-600 mt-1">
                              Falta: <span className="font-semibold">{missingMandatoryFieldsLabel}</span>
                           </p>
                        </div>
                        <button
                           onClick={handleSaveMandatoryData}
                           disabled={isSavingMandatoryData}
                           className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-bold shadow-sm transition-colors"
                        >
                           <Save className="w-4 h-4" />
                           {isSavingMandatoryData ? 'Guardando...' : 'Guardar datos iniciales'}
                        </button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                        <div>
                           <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">ID grupo Telegram</label>
                           <input
                              type="text"
                              value={formData.telegram_group_id || ''}
                              onChange={(e) => updateField('telegram_group_id', e.target.value.trim())}
                              className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm"
                              placeholder="-100..."
                           />
                        </div>
                        <div>
                           <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fecha primer programa</label>
                           <input
                              type="date"
                              value={formData.start_date || ''}
                              onChange={(e) => updateField('start_date', e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm"
                           />
                        </div>
                        <div>
                           <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Duracion primer programa</label>
                           <select
                              value={String(formData.program_duration_months || '')}
                              onChange={(e) => updateField('program_duration_months', e.target.value ? Number(e.target.value) : 0)}
                              className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm"
                           >
                              <option value="">Seleccionar</option>
                              {Array.from({ length: 24 }, (_, idx) => idx + 1).map(month => (
                                 <option key={month} value={month}>{month} meses</option>
                              ))}
                           </select>
                        </div>
                     </div>
                  </div>
               )}

               {/* ============ QUICK STATS CARDS ============ */}
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  {/* Weight Card */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all group">
                     <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-200 uppercase tracking-wide">Peso</span>
                        {weightChange < 0 && <TrendingDown className="w-4 h-4 text-emerald-400" />}
                        {weightChange > 0 && <TrendingUp className="w-4 h-4 text-red-400" />}
                     </div>
                     <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-white">{formData.current_weight || '--'}</span>
                        <span className="text-blue-200 text-sm">kg</span>
                     </div>
                     <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-blue-300">Objetivo: {formData.target_weight || '--'}kg</span>
                        {weightChange !== 0 && (
                           <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${weightChange < 0 ? 'bg-emerald-500/30 text-emerald-300' : 'bg-red-500/30 text-red-300'}`}>
                              {weightChange > 0 ? '+' : ''}{weightChange}kg
                           </span>
                        )}
                     </div>
                  </div>

                  {/* Progress Card */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all group">
                     <span className="text-xs font-bold text-blue-200 uppercase tracking-wide">Progreso</span>
                     <div className="flex items-center gap-3 mt-2">
                        <div className="relative w-14 h-14">
                           <svg className="w-14 h-14 transform -rotate-90">
                              <circle cx="28" cy="28" r="24" stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="none" />
                              <circle
                                 cx="28" cy="28" r="24"
                                 stroke="url(#progressGradient)"
                                 strokeWidth="4"
                                 fill="none"
                                 strokeLinecap="round"
                                 strokeDasharray={`${(weightProgress / 100) * 151} 151`}
                              />
                              <defs>
                                 <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#22c55e" />
                                    <stop offset="100%" stopColor="#10b981" />
                                 </linearGradient>
                              </defs>
                           </svg>
                           <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">{weightProgress}%</span>
                        </div>
                        <div>
                           <p className="text-white font-medium">Hacia tu meta</p>
                           <p className="text-xs text-blue-300">{formData.target_weight ? `${Math.abs((formData.current_weight || 0) - formData.target_weight).toFixed(1)}kg restantes` : 'Sin objetivo'}</p>
                        </div>
                     </div>
                  </div>

                  {/* Contract Card */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all group">
                     <span className="text-xs font-bold text-blue-200 uppercase tracking-wide">Contrato</span>
                     {(() => {
                        const endDate = adjustedEndDate || formData.contract_end_date;
                        if (!endDate) return <p className="text-white text-2xl font-bold mt-2">--</p>;
                        const daysLeft = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        const isUrgent = daysLeft <= 30;
                        return (
                           <>
                              <div className="flex items-baseline gap-1 mt-2">
                                 <span className={`text-3xl font-bold ${isUrgent ? 'text-amber-400' : 'text-white'}`}>{daysLeft > 0 ? daysLeft : 0}</span>
                                 <span className="text-blue-200 text-sm">días</span>
                              </div>
                              <div className="w-full bg-white/20 rounded-full h-2 mt-2 overflow-hidden">
                                 <div
                                    className={`h-full rounded-full transition-all ${isUrgent ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`}
                                    style={{ width: `${Math.min(contractProgress, 100)}%` }}
                                 ></div>
                              </div>
                              <p className="text-xs text-blue-300 mt-1">Hasta {new Date(endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                              {pausedDays > 0 && <p className="text-xs text-amber-400">+{pausedDays} días por pausas</p>}
                           </>
                        );
                     })()}
                  </div>

                  {/* Wellness Card */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all group">
                     <span className="text-xs font-bold text-blue-200 uppercase tracking-wide">Bienestar</span>
                     <div className="flex items-center gap-3 mt-2">
                        <span className="text-4xl">😊</span>
                        <div>
                           <p className="text-white font-medium">Estado Actual</p>
                           <div className="flex gap-2 mt-1">
                              <span className="text-xs bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full">Energía 4/5</span>
                              <span className="text-xs bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full">Sueño 3/5</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* ============ SIMPLIFIED TABS (4 instead of 9) ============ */}
         <div className="bg-transparent mb-8 overflow-x-auto pb-4 no-scrollbar">
            <div className="flex gap-3 min-w-max px-2">
               <TabButton id="overview" label="Vista Rápida" icon={<Zap className="w-4 h-4" />} isActive={activeTab === 'overview'} onClick={setActiveTab} />
               <TabButton id="seguimiento" label="Seguimiento" icon={<Activity className="w-4 h-4" />} isActive={activeTab === 'seguimiento'} onClick={setActiveTab} />
               <TabButton id="health" label="Salud" icon={<HeartPulse className="w-4 h-4" />} isActive={activeTab === 'health'} onClick={setActiveTab} />
               <TabButton id="program" label="Programa" icon={<Target className="w-4 h-4" />} isActive={activeTab === 'program'} onClick={setActiveTab} />
               <TabButton id="materials" label="Materiales" icon={<FileText className="w-4 h-4" />} isActive={activeTab === 'materials'} onClick={setActiveTab} />
               <TabButton id="contract" label="Contrato" icon={<FileText className="w-4 h-4" />} isActive={activeTab === 'contract'} onClick={setActiveTab} />
            </div>
         </div>

         {/* Content */}
         <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 p-6 md:p-8 min-h-[500px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-50/30 rounded-full blur-3xl -ml-32 -mt-32 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -mr-32 -mb-32 pointer-events-none"></div>
            <div className="relative z-10">

               {/* --- OVERVIEW TAB (formerly General + Check-ins) --- */}
               {activeTab === 'overview' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                     {/* ===== BANNER DE ESTADO ===== */}
                     {(() => {
                        // Determine client status
                        const missedCount = client.missed_checkins_count || 0;
                        const isContractUrgent = daysRemaining !== null && daysRemaining < 15;
                        const isContractWarning = daysRemaining !== null && daysRemaining < 30 && daysRemaining >= 15;
                        const isCheckinUrgent = missedCount >= 3;
                        const isCheckinWarning = missedCount >= 1 && missedCount < 3;

                        const isUrgent = isContractUrgent || isCheckinUrgent;
                        const isWarning = !isUrgent && (isContractWarning || isCheckinWarning);

                        // Build status message
                        let statusMessages: string[] = [];
                        if (isContractUrgent) statusMessages.push(`Contrato vence en ${daysRemaining} días`);
                        else if (isContractWarning) statusMessages.push(`${daysRemaining} días restantes de contrato`);
                        if (isCheckinUrgent) statusMessages.push(`${missedCount} check-ins sin enviar`);
                        else if (isCheckinWarning) statusMessages.push(`${missedCount} check-in${missedCount > 1 ? 's' : ''} sin enviar`);

                        const statusText = statusMessages.length > 0 ? statusMessages.join(' • ') : 'Todo en orden';

                        return (
                           <div className={`rounded-2xl p-4 border-2 flex items-center gap-4 ${isUrgent
                              ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
                              : isWarning
                                 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
                                 : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
                              }`}>
                              <div className={`p-3 rounded-xl ${isUrgent ? 'bg-red-100' : isWarning ? 'bg-amber-100' : 'bg-emerald-100'
                                 }`}>
                                 {isUrgent ? (
                                    <AlertOctagon className="w-6 h-6 text-red-600" />
                                 ) : isWarning ? (
                                    <AlertCircle className="w-6 h-6 text-amber-600" />
                                 ) : (
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                 )}
                              </div>
                              <div className="flex-1">
                                 <p className={`text-xs font-bold uppercase tracking-wider ${isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'
                                    }`}>
                                    {isUrgent ? 'Requiere Atención' : isWarning ? 'Atención' : 'Estado'}
                                 </p>
                                 <p className={`font-semibold ${isUrgent ? 'text-red-800' : isWarning ? 'text-amber-800' : 'text-emerald-800'
                                    }`}>
                                    {statusText}
                                 </p>
                              </div>
                           </div>
                        );
                     })()}

                     {/* ===== GESTIÓN RÁPIDA DE ESTADO (Backup) ===== */}
                     <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                           <div className="p-2 rounded-lg bg-slate-200">
                              <Activity className="w-5 h-5 text-slate-600" />
                           </div>
                           <div>
                              <h3 className="text-sm font-bold text-slate-700">Cambiar estado del cliente</h3>
                              <p className="text-xs text-slate-500">Usa estos botones si el menú superior no es accesible</p>
                              {hasMandatoryFieldsPending && <p className="text-xs text-amber-600 font-medium mt-1">Completa primero los datos obligatorios iniciales.</p>}
                           </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {client.status !== ClientStatus.ACTIVE && (
                              <button
                                 onClick={() => {
                                    if (client.status === ClientStatus.PAUSED) {
                                       handleReactivateClient();
                                    } else {
                                       if (!guardCriticalAction()) return;
                                       onUpdateStatus(client.id, ClientStatus.ACTIVE);
                                    }
                                 }}
                                 disabled={hasMandatoryFieldsPending}
                                 className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-200 transition-all flex items-center gap-2 border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                 <Play className="w-4 h-4" /> Activar
                              </button>
                           )}
                           {client.status === ClientStatus.ACTIVE && (
                              <button
                                 onClick={() => setIsPauseModalOpen(true)}
                                 disabled={hasMandatoryFieldsPending}
                                 className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-200 transition-all flex items-center gap-2 border border-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                 <PauseCircle className="w-4 h-4" /> Pausar
                              </button>
                           )}
                           <button
                              onClick={() => openStatusModal(ClientStatus.DROPOUT)}
                              disabled={hasMandatoryFieldsPending}
                              className="px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-sm font-bold hover:bg-rose-200 transition-all flex items-center gap-2 border border-rose-200 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                              <UserX className="w-4 h-4" /> Abandono
                           </button>
                           <button
                              onClick={() => openStatusModal(ClientStatus.INACTIVE)}
                              disabled={hasMandatoryFieldsPending}
                              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                              <XCircle className="w-4 h-4" /> Dar de Baja
                           </button>
                        </div>
                     </div>

                     {/* ===== 3 TARJETAS COMPACTAS ===== */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Tarjeta: Cita */}
                        <div className={`bg-white rounded-2xl p-5 border ${formData.next_appointment_status === 'completed' ? 'border-green-200' : formData.next_appointment_status === 'missed' ? 'border-red-200' : 'border-slate-200'} hover:shadow-md transition-shadow group`}>
                           <div className="flex items-start justify-between mb-3">
                              <div className={`p-2.5 rounded-xl ${formData.next_appointment_status === 'completed' ? 'bg-green-100' :
                                 formData.next_appointment_status === 'missed' ? 'bg-red-100' :
                                    formData.next_appointment_date ? 'bg-amber-100' : 'bg-slate-100'
                                 }`}>
                                 {formData.next_appointment_status === 'completed' ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                 ) : formData.next_appointment_status === 'missed' ? (
                                    <XCircle className="w-5 h-5 text-red-500" />
                                 ) : (
                                    <Calendar className={`w-5 h-5 ${formData.next_appointment_date ? 'text-amber-600' : 'text-slate-400'}`} />
                                 )}
                              </div>
                              <button
                                 onClick={() => {
                                    setAppointmentDate(formData.next_appointment_date || '');
                                    setAppointmentTime(formData.next_appointment_time || '');
                                    setAppointmentNote(formData.next_appointment_note || '');
                                    setAppointmentLink(formData.next_appointment_link || '');
                                    setShowAppointmentModal(true);
                                 }}
                                 className="text-slate-300 hover:text-slate-500 transition-colors"
                              >
                                 <Edit3 className="w-4 h-4" />
                              </button>
                           </div>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                              {formData.next_appointment_status === 'completed' ? 'Cita Realizada' :
                                 formData.next_appointment_status === 'missed' ? 'No Asistió' : 'Próxima Cita'}
                           </p>
                           {formData.next_appointment_date ? (
                              <>
                                 <p className={`text-lg font-bold ${formData.next_appointment_status === 'completed' ? 'text-green-800' :
                                    formData.next_appointment_status === 'missed' ? 'text-red-700' : 'text-slate-800'
                                    }`}>
                                    {new Date(formData.next_appointment_date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    {formData.next_appointment_time && (
                                       <span className={`text-sm font-semibold ml-2 ${formData.next_appointment_status === 'completed' ? 'text-green-600' :
                                          formData.next_appointment_status === 'missed' ? 'text-red-500' : 'text-amber-600'
                                          }`}>{formData.next_appointment_time}h</span>
                                    )}
                                 </p>
                                 {formData.next_appointment_conclusions && (
                                    <p className="text-xs text-slate-500 mt-1 truncate italic">"{formData.next_appointment_conclusions}"</p>
                                 )}
                                 {!formData.next_appointment_conclusions && formData.next_appointment_note && (
                                    <p className="text-xs text-slate-500 mt-1 truncate">{formData.next_appointment_note}</p>
                                 )}
                                 {/* Mark as completed button - only for scheduled appointments */}
                                 {formData.next_appointment_status !== 'completed' && formData.next_appointment_status !== 'missed' && (
                                    <button
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          setCompletionConclusions('');
                                          setCompletionStatus('completed');
                                          setShowCompletionModal(true);
                                       }}
                                       className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                    >
                                       <ClipboardCheck className="w-3.5 h-3.5" />
                                       Marcar como realizada
                                    </button>
                                 )}
                              </>
                           ) : (
                              <button
                                 onClick={() => {
                                    setAppointmentDate('');
                                    setAppointmentTime('');
                                    setAppointmentNote('');
                                    setAppointmentLink('');
                                    setShowAppointmentModal(true);
                                 }}
                                 className="text-sm text-slate-400 hover:text-amber-600 transition-colors"
                              >
                                 Sin cita programada
                              </button>
                           )}
                        </div>

                        {/* Tarjeta: Salud */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200">
                           <div className="flex items-start justify-between mb-3">
                              <div className="p-2.5 rounded-xl bg-rose-100">
                                 <HeartPulse className="w-5 h-5 text-rose-600" />
                              </div>
                           </div>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Salud</p>
                           <div className="flex items-baseline gap-3">
                              {formData.medical?.lastHba1c ? (
                                 <p className={`text-lg font-bold ${parseFloat(formData.medical.lastHba1c) > 7 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    HbA1c: {formData.medical.lastHba1c}%
                                 </p>
                              ) : (
                                 <p className="text-sm text-slate-400">Sin datos HbA1c</p>
                              )}
                           </div>
                           {formData.current_weight && formData.initial_weight && (
                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                 Peso: {formData.current_weight}kg
                                 {formData.current_weight < formData.initial_weight ? (
                                    <span className="text-emerald-500 flex items-center">
                                       <TrendingDown className="w-3 h-3" />
                                       -{(formData.initial_weight - formData.current_weight).toFixed(1)}kg
                                    </span>
                                 ) : formData.current_weight > formData.initial_weight ? (
                                    <span className="text-red-500 flex items-center">
                                       <TrendingUp className="w-3 h-3" />
                                       +{(formData.current_weight - formData.initial_weight).toFixed(1)}kg
                                    </span>
                                 ) : (
                                    <span className="text-slate-400">=</span>
                                 )}
                              </p>
                           )}
                        </div>

                        {/* Tarjeta: Programa */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200">
                           <div className="flex items-start justify-between mb-3">
                              <div className={`p-2.5 rounded-xl ${daysRemaining !== null && daysRemaining < 30 ? 'bg-amber-100' : 'bg-blue-100'}`}>
                                 <Target className={`w-5 h-5 ${daysRemaining !== null && daysRemaining < 30 ? 'text-amber-600' : 'text-blue-600'}`} />
                              </div>
                           </div>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Programa</p>
                           {daysRemaining !== null ? (
                              <>
                                 <p className={`text-lg font-bold ${daysRemaining < 15 ? 'text-red-600' : daysRemaining < 30 ? 'text-amber-600' : 'text-slate-800'}`}>
                                    {daysRemaining} días restantes
                                 </p>
                                 {progressPercent !== null && (
                                    <div className="mt-2">
                                       <div className="flex justify-between text-xs text-slate-500 mb-1">
                                          <span>Progreso</span>
                                          <span>{Math.round(progressPercent)}%</span>
                                       </div>
                                       <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                          <div
                                             className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                                             style={{ width: `${progressPercent}%` }}
                                          />
                                       </div>
                                    </div>
                                 )}
                              </>
                           ) : (
                              <p className="text-sm text-slate-400">Sin fecha de inicio</p>
                           )}
                        </div>
                     </div>

                     {/* ===== CHECK-INS TIMELINE ===== */}
                     <div className="bg-white rounded-2xl p-5 border border-slate-200">
                        <ReviewComplianceSummary checkins={checkins} missedCount={client.missed_checkins_count} />
                        <ReviewActionPlanSummary reviews={weeklyReviews} goals={weeklyGoals} />
                     </div>

                     {/* ===== DATOS DE CONTACTO Y PERFIL (Colapsable) ===== */}
                     <details className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden group">
                        <summary className="p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-lg font-bold text-blue-600 shadow-inner border-2 border-white">
                                 {formData.firstName?.charAt(0)}{formData.surname?.charAt(0)}
                              </div>
                              <div>
                                 <p className="font-bold text-slate-800">{formData.firstName} {formData.surname}</p>
                                 <p className="text-xs text-slate-500">{formData.email} • {formData.phone}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-2 text-slate-400">
                              <span className="text-xs font-medium">Ver perfil completo</span>
                              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                           </div>
                        </summary>

                        <div className="p-6 pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {/* Datos Personales */}
                           <div className="space-y-3">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                 <User className="w-3.5 h-3.5" /> Datos Personales
                              </p>
                              <DataField label="Nombre" value={formData.firstName} path="firstName" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                              <DataField label="Apellidos" value={formData.surname} path="surname" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                              <DataField label="Fecha Nacimiento" value={formData.birthDate} path="birthDate" type="date" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                              <div className="grid grid-cols-2 gap-4">
                                 <DataField label="Edad Real" value={formData.age} path="age" type="number" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                 <DataField label="Edad Vista" value={formData.ageVisual} path="ageVisual" type="number" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                              </div>
                              <DataField label="Sexo" value={formData.gender} path="gender" type="select" options={['Hombre', 'Mujer', 'Otro']} isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                           </div>

                           {/* Contacto */}
                           <div className="space-y-3">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                 <MapPin className="w-3.5 h-3.5" /> Contacto
                              </p>
                              <DataField label="Email" value={formData.email} path="email" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                              <DataField label="Teléfono" value={formData.phone} path="phone" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                              <div className="pt-2 border-t border-slate-100">
                                 <DataField label="Dirección" value={formData.address} path="address" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                 <div className="grid grid-cols-2 gap-3 mt-2">
                                    <DataField label="Ciudad" value={formData.city} path="city" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                    <DataField label="Provincia" value={formData.province} path="province" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                 </div>
                              </div>
                           </div>

                           {/* Gestión */}
                           <div className="space-y-3">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                 <Briefcase className="w-3.5 h-3.5" /> Gestión del Programa
                              </p>
                              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
                                 <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold">
                                    {coachDisplayName?.charAt(0) || '?'}
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-[10px] text-indigo-500 font-bold uppercase">Coach</p>
                                    <p className="font-bold text-slate-800">{coachDisplayName || 'Sin Asignar'}</p>
                                 </div>
                              </div>

                              {/* Reasignar Coach - Visible cuando está en modo edición */}
                              {canAssignCoach && isEditing && (
                                 <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                    <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-2">
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                       </svg>
                                       Reasignar Coach
                                    </p>
                                    <select
                                       className="w-full text-sm p-2 rounded-lg border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                       value={formData.coach_id || ''}
                                       onChange={(e) => {
                                          const c = coaches.find(c => c.id === e.target.value);
                                          updateField('coach_id', e.target.value);
                                          if (c) updateField('property_coach', c.name);
                                       }}
                                    >
                                       <option value="">Seleccionar nuevo coach...</option>
                                       {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                 </div>
                              )}

                              <div className="grid grid-cols-2 gap-3">
                                 <DataField label="Fecha Inicio" value={formData.start_date} path="start_date" type="date" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                 <DataField label="Duración (Meses)" value={formData.program_duration_months} path="program_duration_months" type="select" options={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24']} isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                              </div>
                              {isEditing && (
                                 <DataField label="Estado" value={formData.status} path="status" type="select" options={[{ label: 'Activo', value: ClientStatus.ACTIVE }, { label: 'Baja', value: ClientStatus.INACTIVE }, { label: 'Pausado', value: ClientStatus.PAUSED }, { label: 'Abandono', value: ClientStatus.DROPOUT }]} isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} readOnly />
                              )}
                              <DataField label="Notas Internas" value={formData.internal_notes} path="internal_notes" isTextArea isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                              <DataField label="ID Telegram" value={formData.telegramId} path="telegramId" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                              <DataField label="ID Grupo Telegram" value={formData.telegram_group_id} path="telegram_group_id" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                           </div>
                        </div>
                     </details>

                     {/* ===== ACCIONES RÁPIDAS (iconos pequeños) ===== */}
                     <div className="flex items-center justify-center gap-2 pt-2">
                        <span className="text-xs text-slate-400 mr-2">Contactar:</span>

                        {/* WhatsApp */}
                        {formData.phone && (
                           <a
                              href={`https://wa.me/${formData.phone?.replace(/[^0-9]/g, '').replace(/^(?!34)/, '34')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all shadow-sm hover:shadow-md"
                              title="WhatsApp"
                           >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                           </a>
                        )}

                        {/* Telegram */}
                        {formData.telegram_group_id && (
                           <a
                              href={(() => {
                                 if (formData.telegram_group_id?.startsWith('-100')) {
                                    const pureId = formData.telegram_group_id.replace('-100', '');
                                    return `https://t.me/c/${pureId}/1`;
                                 }
                                 return `https://t.me/${formData.telegram_group_id}`;
                              })()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-all shadow-sm hover:shadow-md"
                              title="Telegram"
                           >
                              <Send className="w-5 h-5" />
                           </a>
                        )}

                        {/* Ver Portal */}
                        {onViewAsClient && (
                           <button
                              onClick={onViewAsClient}
                              className="p-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-all shadow-sm hover:shadow-md"
                              title="Ver Portal del Cliente"
                           >
                              <Eye className="w-5 h-5" />
                           </button>
                        )}

                        {/* Ver Check-ins */}
                        {checkins.length > 0 && (
                           <button
                              onClick={() => {
                                 setActiveTab('seguimiento');
                                 setSeguimientoSubTab('semanal');
                              }}
                              className="p-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all shadow-sm hover:shadow-md"
                              title={`Ver Check-ins (${checkins.length})`}
                           >
                              <CalendarCheck className="w-5 h-5" />
                           </button>
                        )}
                     </div>
                     {/* ===== MENSAJE PARA EL CLIENTE ===== */}
                     <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                        <div className="flex items-center gap-2 mb-3">
                           <MessageSquare className="w-4 h-4 text-amber-600" />
                           <p className="text-sm font-bold text-amber-900">Mensaje para el Cliente</p>
                        </div>
                        <DataField
                           label="Mensaje motivacional (visible en portal)"
                           value={formData.coach_message}
                           path="coach_message"
                           isTextArea
                           isEditing={isEditing}
                           onUpdate={updateField}
                        />
                     </div>

                     {/* IMPORTANT NOTES COMPONENT */}
                     <div className="mt-8">
                        <ClientImportantNotes clientId={client.id} />
                     </div>

                     {/* RISK ALERT SECTION */}
                     {currentUser && (
                        <div className="mt-8">
                           <ClientRiskAlertSection
                              clientId={client.id}
                              clientName={client.name || client.firstName}
                              currentUser={currentUser}
                           />
                        </div>
                     )}
                  </div>
               )
               }


               {/* --- SEGUIMIENTO TAB --- */}
               {activeTab === 'seguimiento' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                     {/* Sub-navigation for Seguimiento */}
                     <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl w-fit border border-slate-200/50 shadow-inner">
                        {[
                           { id: 'semanal', label: 'Semanal', icon: CalendarCheck, color: 'text-blue-600' },
                           { id: 'mensual', label: 'Mensual', icon: BarChart3, color: 'text-purple-600' },
                           { id: 'trimestral', label: 'Trimestral', icon: Target, color: 'text-rose-600' },
                        ].map((sub) => (
                           <button
                              key={sub.id}
                              onClick={() => setSeguimientoSubTab(sub.id as any)}
                              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${seguimientoSubTab === sub.id
                                 ? 'bg-white text-slate-900 shadow-md scale-[1.02] ring-1 ring-slate-200'
                                 : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                 }`}
                           >
                              <sub.icon className={`w-4 h-4 ${seguimientoSubTab === sub.id ? sub.color : 'text-slate-400'}`} />
                              {sub.label}
                           </button>
                        ))}
                     </div>

                     {/* --- SUB-TAB: SEMANAL --- */}
                     {seguimientoSubTab === 'semanal' && (
                        <div className="space-y-6">
                           {/* Process Score + Evolution Header */}
                           <ProcessDataCard
                              clientId={client.id}
                              startDate={formData.start_date}
                              roadmapData={formData.roadmap_data}
                              goals={formData.goals}
                              initialWeight={formData.initial_weight}
                              currentWeight={formData.current_weight}
                              targetWeight={formData.target_weight}
                              initialHba1c={formData.medical?.initialHba1c}
                              lastHba1c={formData.medical?.lastHba1c}
                           />

                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <SectionTitle title="Historial Semanal" icon={<CalendarCheck className="w-4 h-4" />} />

                              {checkins.length > 0 && (
                                 <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                                    <button
                                       onClick={() => setCheckinViewMode('cards')}
                                       className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${checkinViewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                       Fichas
                                    </button>
                                    <button
                                       onClick={() => setCheckinViewMode('table')}
                                       className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${checkinViewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                       Evolución
                                    </button>
                                 </div>
                              )}
                           </div>

                           {/* Weight & Steps Charts */}
                           {(weightHistory.length > 0 || stepsHistory.length > 0) && (
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                 {weightHistory.length > 0 && (
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                       <div className="flex items-center justify-between mb-3">
                                          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                             <Scale className="w-4 h-4 text-blue-600" /> Evolución de Peso
                                          </h4>
                                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                             {weightHistory[weightHistory.length - 1]?.weight} kg
                                          </span>
                                       </div>
                                       <div className="h-48 w-full">
                                          <ResponsiveContainer width="100%" height="100%">
                                             <AreaChart data={weightHistory.map(w => ({
                                                date: new Date(w.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                                                weight: w.weight
                                             }))}>
                                                <defs>
                                                   <linearGradient id="colorWeightCheckin" x1="0" y1="0" x2="0" y2="1">
                                                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                   </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                                <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={30} />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                                                {formData.target_weight && <ReferenceLine y={formData.target_weight} stroke="#22c55e" strokeDasharray="3 3" label={{ value: `Objetivo: ${formData.target_weight}kg`, fill: '#22c55e', fontSize: 10, position: 'insideTopRight' }} />}
                                                <Area type="linear" dataKey="weight" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorWeightCheckin)" activeDot={{ r: 4, strokeWidth: 0 }} name="Peso (kg)" />
                                             </AreaChart>
                                          </ResponsiveContainer>
                                       </div>
                                    </div>
                                 )}
                                 {stepsHistory.length > 0 && (
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                       <div className="flex items-center justify-between mb-3">
                                          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                             <Footprints className="w-4 h-4 text-orange-600" /> Pasos Diarios
                                          </h4>
                                          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                             Últimos 30 días
                                          </span>
                                       </div>
                                       <div className="h-48 w-full">
                                          <ResponsiveContainer width="100%" height="100%">
                                             <BarChart data={stepsHistory.slice(-30).map(s => ({
                                                date: new Date(s.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                                                steps: s.steps
                                             }))}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                                <YAxis hide={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={35} />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                                                {formData.training?.stepsGoal && <ReferenceLine y={Number(formData.training.stepsGoal)} stroke="#22c55e" strokeDasharray="3 3" label={{ value: `Meta: ${formData.training.stepsGoal}`, fill: '#22c55e', fontSize: 10, position: 'insideTopRight' }} />}
                                                <Bar dataKey="steps" fill="#f97316" radius={[3, 3, 0, 0]} name="Pasos" />
                                             </BarChart>
                                          </ResponsiveContainer>
                                       </div>
                                    </div>
                                 )}
                              </div>
                           )}


                           <>
                              {loadingCheckins ? (
                                 <div className="flex items-center justify-center p-12">
                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                    <span className="ml-3 text-slate-500 font-medium italic">Cargando reportes...</span>
                                 </div>
                              ) : checkins.length === 0 ? (
                                 <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">Este cliente aún no ha enviado ningún reporte semanal.</p>
                                    <p className="text-slate-400 text-xs mt-1">Los reportes enviados desde el Portal del Cliente aparecerán aquí.</p>
                                 </div>
                              ) : checkinViewMode === 'table' ? (

                                 <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in zoom-in-95 duration-500 relative">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 opacity-80"></div>
                                    <div className="overflow-x-auto custom-scrollbar">
                                       <table className="w-full text-left border-collapse min-w-[1000px]">
                                          <thead>
                                             <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200/80">
                                                <th className="sticky left-0 bg-gradient-to-r from-slate-50 to-slate-100 z-30 px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200/80 w-44">Métrica</th>
                                                {checkins.map(c => (
                                                   <th key={c.id} className="px-6 py-5 text-center border-r border-slate-100 min-w-[220px]">
                                                      <div className="flex flex-col items-center gap-1">
                                                         <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                            {new Date(c.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                         </span>
                                                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                            {new Date(c.created_at).toLocaleDateString('es-ES', { weekday: 'long' })}
                                                         </span>
                                                      </div>
                                                   </th>
                                                ))}
                                             </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                             {/* Status Row */}
                                             <tr className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200">Estado</td>
                                                {checkins.map(c => (
                                                   <td key={c.id} className="px-6 py-4 text-center border-r border-slate-50">
                                                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border shadow-sm ${c.status === 'reviewed'
                                                         ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                         : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'}`}>
                                                         {c.status === 'reviewed' ? (
                                                            <><CheckCircle2 className="w-3 h-3" /> Revisado</>
                                                         ) : (
                                                            <><Clock className="w-3 h-3" /> Pendiente</>
                                                         )}
                                                      </span>
                                                   </td>
                                                ))}
                                             </tr>
                                             {/* Weight Row */}
                                             <tr className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200">Peso Corporal</td>
                                                {checkins.map(c => (
                                                   <td key={c.id} className="px-6 py-4 text-center border-r border-slate-50">
                                                      <div className="flex flex-col items-center">
                                                         <span className="text-base font-black text-slate-900">{c.responses.weight_log || '-'} <span className="text-[10px] text-slate-400 font-bold">KG</span></span>
                                                      </div>
                                                   </td>
                                                ))}
                                             </tr>
                                             {/* Rating Row (question_6) */}
                                             <tr className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200">Sensación /10</td>
                                                {checkins.map(c => {
                                                   const val = parseInt(c.responses.question_6 || '0');
                                                   const color = val >= 8 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : val >= 6 ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-rose-600 bg-rose-50 border-rose-100';
                                                   return (
                                                      <td key={c.id} className="px-6 py-4 text-center border-r border-slate-50">
                                                         <div className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg border text-sm font-black shadow-sm ${color}`}>
                                                            <Award className="w-4 h-4" />
                                                            {val}/10
                                                         </div>
                                                      </td>
                                                   );
                                                })}
                                             </tr>
                                             {/* Main Goal Row (question_1) */}
                                             <tr className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200">Mayor Logro</td>
                                                {checkins.map(c => (
                                                   <td key={c.id} className="px-6 py-4 border-r border-slate-50 px-8">
                                                      <p className="text-[11px] text-slate-700 font-medium italic leading-relaxed text-center line-clamp-4">
                                                         "{c.responses.question_1 || '-'}"
                                                      </p>
                                                   </td>
                                                ))}
                                             </tr>
                                             {/* Obstacles Row (question_5) */}
                                             <tr className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200">Dificultades</td>
                                                {checkins.map(c => (
                                                   <td key={c.id} className="px-6 py-4 border-r border-slate-50 px-8">
                                                      <p className="text-[11px] text-slate-700 font-medium italic leading-relaxed text-center line-clamp-4">
                                                         "{c.responses.question_5 || 'Ninguna'}"
                                                      </p>
                                                   </td>
                                                ))}
                                             </tr>
                                             {/* Alimentación Row */}
                                             <tr className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200">Alimentación</td>
                                                {checkins.map(c => (
                                                   <td key={c.id} className="px-6 py-4 border-r border-slate-50 px-8">
                                                      <p className="text-[11px] text-slate-600 leading-tight line-clamp-3 text-center">
                                                         {c.responses.question_3 || '-'}
                                                      </p>
                                                   </td>
                                                ))}
                                             </tr>
                                             {/* Ejercicio Row */}
                                             <tr className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200">Ejercicio</td>
                                                {checkins.map(c => (
                                                   <td key={c.id} className="px-6 py-4 border-r border-slate-50 px-8">
                                                      <p className="text-[11px] text-slate-600 leading-tight line-clamp-3 text-center">
                                                         {c.responses.question_4 || '-'}
                                                      </p>
                                                   </td>
                                                ))}
                                             </tr>
                                             {/* Feedback Row */}
                                             <tr className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200">Feedback Coach</td>
                                                {checkins.map(c => (
                                                   <td key={c.id} className="px-6 py-4 text-center border-r border-slate-50 max-w-[200px] px-8">
                                                      {c.status === 'reviewed' ? (
                                                         <div className="flex flex-col items-center gap-1.5">
                                                            <span className="text-[10px] text-indigo-700 font-medium line-clamp-2 italic leading-tight">
                                                               {c.coach_notes?.split('\n').filter(line => !line.includes('http')).join(' ') || 'Revisión sin texto'}
                                                            </span>
                                                            {c.coach_notes?.includes('http') && (
                                                               <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase tracking-widest border border-indigo-200">
                                                                  <Video className="w-2.5 h-2.5" /> Video OK
                                                               </div>
                                                            )}
                                                         </div>
                                                      ) : (
                                                         <span className="text-[10px] font-black text-amber-500/40 uppercase tracking-widest">Esperando...</span>
                                                      )}
                                                   </td>
                                                ))}
                                             </tr>
                                             {/* Actions Row */}
                                             <tr className="bg-slate-50/30">
                                                <td className="sticky left-0 bg-white/90 backdrop-blur-sm z-10 px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200">Acción Rápida</td>
                                                {checkins.map(c => (
                                                   <td key={c.id} className="px-6 py-5 text-center border-r border-slate-50">
                                                      <button
                                                         onClick={() => {
                                                            setCheckinViewMode('cards');
                                                            setTimeout(() => {
                                                               const el = document.getElementById(`checkin-card-${c.id}`);
                                                               if (el) {
                                                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                  el.classList.add('ring-4', 'ring-indigo-500/30');
                                                                  setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-500/30'), 2000);
                                                               }
                                                            }, 150);
                                                         }}
                                                         className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-indigo-900/20"
                                                      >
                                                         Ver Detalle
                                                      </button>
                                                   </td>
                                                ))}
                                             </tr>
                                          </tbody>
                                       </table>
                                    </div>
                                 </div>
                              ) : (

                                 <div className="space-y-6">
                                    {checkins.map((checkin, idx) => (
                                       <div key={checkin.id || idx} id={`checkin-card-${checkin.id}`} className={`relative border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 bg-white/95 backdrop-blur-sm group ${checkin.status === 'reviewed' ? 'border-emerald-200/80 hover:border-emerald-300' : 'border-amber-200/80 hover:border-amber-300'
                                          }`}>
                                          {/* Status indicator stripe */}
                                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${checkin.status === 'reviewed' ? 'bg-gradient-to-b from-emerald-400 to-emerald-500' : 'bg-gradient-to-b from-amber-400 to-amber-500 animate-pulse'}`}></div>
                                          {/* Header Reporte */}
                                          <div className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ml-1.5 ${checkin.status === 'reviewed' ? 'bg-gradient-to-r from-emerald-50/50 to-white border-emerald-100/50' : 'bg-gradient-to-r from-amber-50/50 to-white border-amber-100/50'}`}>
                                             <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 shadow-sm">
                                                   <Calendar className="w-5 h-5" />
                                                </div>
                                                <div>
                                                   <p className="font-bold text-slate-800 text-sm">Reporte del {new Date(checkin.created_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                   <p className="text-xs text-slate-500 font-medium flex items-center gap-2">
                                                      <Clock className="w-3 h-3" />
                                                      {new Date(checkin.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                      <span className="text-slate-300">|</span>
                                                      <span className={`uppercase font-bold ${checkin.status === 'reviewed' ? 'text-green-600' : 'text-amber-600'}`}>
                                                         {checkin.status === 'reviewed' ? 'Revisado' : 'Pendiente Revisión'}
                                                      </span>
                                                   </p>
                                                </div>
                                             </div>

                                             <div className="flex items-center gap-3">
                                                {(() => {
                                                   const checkinDate = new Date(checkin.created_at).toISOString().split('T')[0];
                                                   const weightEntry = weightHistory.find(w => w.date === checkinDate);
                                                   return weightEntry ? (
                                                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                                                         <TrendingUp className="w-4 h-4 text-blue-500" />
                                                         <div className="flex flex-col leading-none">
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Peso</span>
                                                            <span className="text-sm font-bold text-slate-700">{weightEntry.weight} kg</span>
                                                         </div>
                                                      </div>
                                                   ) : null;
                                                })()}

                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                                                   <Award className={`w-4 h-4 ${parseInt(checkin.responses.question_6 || '0') >= 7 ? 'text-green-500' : 'text-amber-500'}`} />
                                                   <div className="flex flex-col leading-none">
                                                      <span className="text-[10px] text-slate-400 font-bold uppercase">Nota</span>
                                                      <span className={`text-sm font-bold ${parseInt(checkin.responses.question_6 || '0') >= 7 ? 'text-green-700' : 'text-amber-700'}`}>
                                                         {checkin.responses.question_6}/10
                                                      </span>
                                                   </div>
                                                </div>

                                                <button
                                                   onClick={async () => {
                                                      if (!window.confirm('¿Eliminar este check-in? Esta acción no se puede deshacer.')) return;
                                                      await mockDb.deleteCheckin(checkin.id);
                                                      setCheckins(prev => prev.filter(c => c.id !== checkin.id));
                                                   }}
                                                   title="Eliminar check-in"
                                                   className="p-2 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
                                                >
                                                   <Trash2 className="w-4 h-4" />
                                                </button>
                                             </div>
                                          </div>

                                          {/* Contenido Reporte */}
                                          <div className="p-6 space-y-6">
                                             {/* Logro y Obstáculo Destacados */}
                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                                                   <p className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase mb-2">
                                                      <Trophy className="w-3.5 h-3.5" /> Principal Logro
                                                   </p>
                                                   <p className="text-slate-800 text-sm font-medium italic leading-relaxed">"{checkin.responses.question_1}"</p>
                                                </div>
                                                <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                                                   <p className="flex items-center gap-2 text-xs font-bold text-rose-600 uppercase mb-2">
                                                      <AlertOctagon className="w-3.5 h-3.5" /> Obstáculos
                                                   </p>
                                                   <p className="text-slate-800 text-sm font-medium italic leading-relaxed">"{checkin.responses.question_5 || 'Ninguno'}"</p>
                                                </div>
                                             </div>

                                             {/* Acordeón de Detalles */}
                                             <details className="group/details open:bg-slate-50/50 open:rounded-xl transition-all p-2 -mx-2">
                                                <summary className="flex items-center gap-2 cursor-pointer font-bold text-blue-600 hover:text-blue-800 transition-colors py-2 active:scale-[0.99] w-fit select-none">
                                                   <ChevronRight className="w-4 h-4 group-open/details:rotate-90 transition-transform" />
                                                   <span className="group-open/details:hidden">Ver respuestas completas</span>
                                                   <span className="hidden group-open/details:block">Ocultar detalles</span>
                                                </summary>

                                                <div className="mt-4 grid grid-cols-1 gap-6 pl-2 md:pl-6 border-l-2 border-blue-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                                   <div className="prose prose-sm max-w-none">
                                                      <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">¿Por qué lo crees así?</p>
                                                      <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 shadow-sm">{checkin.responses.question_2}</p>
                                                   </div>

                                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                      <div>
                                                         <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide flex items-center gap-2"><Utensils className="w-3 h-3" /> Feeling Alimentación</p>
                                                         <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 shadow-sm">{checkin.responses.question_3}</p>
                                                      </div>
                                                      <div>
                                                         <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide flex items-center gap-2"><Dumbbell className="w-3 h-3" /> Feeling Ejercicio</p>
                                                         <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 shadow-sm">{checkin.responses.question_4}</p>
                                                      </div>
                                                   </div>

                                                   {/* --- ZONA DE REVISIÓN DEL COACH (SIMPLIFICADA) --- */}
                                                   {(() => {
                                                      const isReviewed = checkin.status === 'reviewed';
                                                      const isEditing = editingReviewId === checkin.id;
                                                      const showForm = !isReviewed || isEditing;

                                                      // Parse loom + notes from coach_notes
                                                      const parsedLoom = checkin.coach_notes?.split('\n')[0] || '';
                                                      const parsedNotes = checkin.coach_notes?.split('\n').slice(1).join('\n') || '';

                                                      // Get goals and assessment data
                                                      const checkinWeekNum = getWeekNumber(new Date(checkin.created_at));
                                                      let assessmentData = weeklyAssessment;
                                                      let goalsToAssess = weeklyGoals.filter(g =>
                                                         g.status === 'pending' &&
                                                         (!g.week_number || g.week_number === checkinWeekNum)
                                                      );
                                                      // Goals assigned FOR the next week during this review
                                                      const goalsAssignedHere = weeklyGoals.filter(g =>
                                                         g.week_number === checkinWeekNum + 1
                                                      );

                                                      if (isReviewed) {
                                                         const review = weeklyReviews.find(r => r.checkin_id === checkin.id);
                                                         if (review) {
                                                            // Goals that were assessed in this review (status changed to achieved/failed)
                                                            const historicalGoals = weeklyGoals.filter(g =>
                                                               g.week_number === review.week_number &&
                                                               (g.status === 'achieved' || g.status === 'failed')
                                                            );
                                                            assessmentData = {
                                                               goalAssessments: historicalGoals.map(g => ({
                                                                  goalId: g.id,
                                                                  completionStatus: (g.completion_status || (g.status === 'achieved' ? 'fulfilled' : 'not_fulfilled')) as any,
                                                                  reasonDetail: g.reason_detail || undefined
                                                               })),
                                                               feeling: null,
                                                               nextWeekDecision: null,
                                                               coachNote: '',
                                                            };
                                                            goalsToAssess = historicalGoals;
                                                         }
                                                      }

                                                      // COLLAPSED VIEW (reviewed & not editing)
                                                      if (isReviewed && !isEditing) {
                                                         return (
                                                            <div className="mt-6 pt-6 border-t border-slate-200">
                                                               <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200/60 space-y-3">
                                                                  <div className="flex items-center justify-between">
                                                                     <h4 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                                                                        <CheckCircle2 className="w-4 h-4" /> Revisión completada
                                                                     </h4>
                                                                     <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                           setEditingReviewId(checkin.id);
                                                                           setReviewVideoUrl(parsedLoom);
                                                                           setReviewNotes(parsedNotes);
                                                                        }}
                                                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
                                                                     >
                                                                        Editar
                                                                     </button>
                                                                  </div>

                                                                  {/* Goal results */}
                                                                  {goalsToAssess.length > 0 && (
                                                                     <div className="space-y-1.5">
                                                                        {goalsToAssess.map(g => {
                                                                           const achieved = g.status === 'achieved' || g.completion_status === 'fulfilled';
                                                                           return (
                                                                              <div key={g.id} className="flex items-start gap-2 text-xs">
                                                                                 {achieved ? (
                                                                                    <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Conseguido</span>
                                                                                 ) : (
                                                                                    <span className="text-red-500 font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> No conseguido</span>
                                                                                 )}
                                                                                 <span className="text-slate-600">— {g.title}</span>
                                                                                 {!achieved && g.reason_detail && (
                                                                                    <span className="text-slate-400 italic">({g.reason_detail})</span>
                                                                                 )}
                                                                              </div>
                                                                           );
                                                                        })}
                                                                     </div>
                                                                  )}

                                                                  {/* Goals assigned for next week */}
                                                                  {goalsAssignedHere.length > 0 && (
                                                                     <div className="space-y-1.5 pt-2 border-t border-emerald-100">
                                                                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                                                                           <Target className="w-3 h-3" /> Objetivos asignados para la semana siguiente
                                                                        </p>
                                                                        {goalsAssignedHere.map(g => (
                                                                           <div key={g.id} className="flex items-center gap-2 text-xs">
                                                                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${g.status === 'achieved' ? 'bg-green-500' : g.status === 'failed' ? 'bg-red-500' : 'bg-indigo-400'}`} />
                                                                              <span className="text-slate-700 font-medium">{g.title}</span>
                                                                              {g.deadline && <span className="text-slate-400">→ {new Date(g.deadline).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>}
                                                                           </div>
                                                                        ))}
                                                                     </div>
                                                                  )}

                                                                  {/* Loom + Notes */}
                                                                  {parsedLoom && parsedLoom.startsWith('http') && (
                                                                     <div className="flex items-center gap-2 text-xs">
                                                                        <Video className="w-3.5 h-3.5 text-indigo-500" />
                                                                        <a href={parsedLoom} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate">
                                                                           {parsedLoom}
                                                                        </a>
                                                                     </div>
                                                                  )}
                                                                  {parsedNotes && (
                                                                     <p className="text-xs text-slate-600 bg-white/80 rounded-lg p-2 border border-slate-100">
                                                                        <span className="font-bold text-slate-500">Notas: </span>{parsedNotes}
                                                                     </p>
                                                                  )}
                                                               </div>
                                                            </div>
                                                         );
                                                      }

                                                      // EXPANDED FORM (pending or editing)
                                                      return (
                                                         <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                                                            <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2 bg-indigo-50 p-2 rounded-lg w-fit px-3">
                                                               <Video className="w-4 h-4 text-indigo-600" /> Revisión del Coach
                                                            </h4>

                                                            {/* Valorar objetivos anteriores */}
                                                            <WeeklyAssessmentSection
                                                               activeGoals={goalsToAssess}
                                                               data={showForm ? weeklyAssessment : assessmentData}
                                                               onDataChange={setWeeklyAssessment}
                                                               isLocked={false}
                                                               checkinId={checkin.id}
                                                            />

                                                            {/* Nuevo objetivo para la semana siguiente */}
                                                            <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-200 space-y-3">
                                                               <div className="flex items-center justify-between">
                                                                  <label className="text-xs font-bold text-indigo-700 uppercase flex items-center gap-1.5">
                                                                     <Target className="w-3.5 h-3.5" /> Objetivo para la semana siguiente
                                                                  </label>
                                                                  {newObjectives.length < 3 && (
                                                                     <button type="button" onClick={() => {
                                                                        const today = new Date().toISOString().split('T')[0];
                                                                        const nextWeek = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })();
                                                                        setNewObjectives(prev => [...prev, { title: '', description: '', startDate: today, deadline: nextWeek }]);
                                                                     }} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors">
                                                                        + Añadir
                                                                     </button>
                                                                  )}
                                                               </div>
                                                               {newObjectives.map((obj, objIdx) => (
                                                                  <div key={objIdx} className="bg-white p-3 rounded-lg border border-indigo-200 space-y-2">
                                                                     <div className="flex items-center justify-between">
                                                                        <span className="text-[10px] font-bold text-indigo-500">Objetivo {objIdx + 1}</span>
                                                                        <button type="button" onClick={() => setNewObjectives(prev => prev.filter((_, i) => i !== objIdx))} className="text-slate-400 hover:text-red-500 p-0.5">
                                                                           <XCircle className="w-3.5 h-3.5" />
                                                                        </button>
                                                                     </div>
                                                                     <input type="text" placeholder="Título del objetivo *" value={obj.title}
                                                                        onChange={e => setNewObjectives(prev => prev.map((o, i) => i === objIdx ? { ...o, title: e.target.value } : o))}
                                                                        className="w-full text-sm p-2.5 border border-indigo-200 rounded-lg focus:border-indigo-500 outline-none bg-white font-medium" />
                                                                     <div className="flex gap-3">
                                                                        <div className="flex-1">
                                                                           <label className="text-[10px] font-bold text-slate-400 uppercase">Inicio</label>
                                                                           <input type="date" value={obj.startDate}
                                                                              onChange={e => setNewObjectives(prev => prev.map((o, i) => i === objIdx ? { ...o, startDate: e.target.value } : o))}
                                                                              className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:border-indigo-500 outline-none bg-white" />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                           <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha límite</label>
                                                                           <input type="date" value={obj.deadline}
                                                                              onChange={e => setNewObjectives(prev => prev.map((o, i) => i === objIdx ? { ...o, deadline: e.target.value } : o))}
                                                                              className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:border-indigo-500 outline-none bg-white" />
                                                                        </div>
                                                                     </div>
                                                                  </div>
                                                               ))}
                                                            </div>

                                                            {/* Loom URL + Notas */}
                                                            <div className="space-y-3">
                                                               <div>
                                                                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1.5">
                                                                     <Video className="w-3.5 h-3.5 text-indigo-500" /> Enlace Loom
                                                                  </label>
                                                                  <input type="url" placeholder="https://www.loom.com/share/..." value={reviewVideoUrl}
                                                                     onChange={e => setReviewVideoUrl(e.target.value)}
                                                                     className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:border-indigo-500 outline-none bg-white" />
                                                               </div>
                                                               <div>
                                                                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1.5">
                                                                     <FileText className="w-3.5 h-3.5 text-indigo-500" /> Notas de la revisión
                                                                  </label>
                                                                  <textarea placeholder="Notas sobre esta revisión..." rows={3} value={reviewNotes}
                                                                     onChange={e => setReviewNotes(e.target.value)}
                                                                     className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:border-indigo-500 outline-none bg-white resize-none" />
                                                               </div>
                                                            </div>

                                                            {/* Botón Guardar */}
                                                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                                                               {isEditing && (
                                                                  <button type="button" onClick={() => setEditingReviewId(null)}
                                                                     className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">
                                                                     Cancelar
                                                                  </button>
                                                               )}
                                                               <button type="button" onClick={async () => {
                                                                  // 1. Validar objetivos de la semana siguiente (OBLIGATORIO)
                                                                  if (newObjectives.filter(o => o.title.trim()).length === 0) {
                                                                     toast.error('Debes poner al menos un objetivo para la semana siguiente.');
                                                                     return;
                                                                  }

                                                                  // 2. Validar valoración de objetivos de la semana anterior (si los hay)
                                                                  if (goalsToAssess.length > 0) {
                                                                     const assessedGoalIds = weeklyAssessment.goalAssessments.map(a => a.goalId);
                                                                     const allAssessed = goalsToAssess.every(g => assessedGoalIds.includes(g.id));

                                                                     if (!allAssessed) {
                                                                        toast.error('Debes valorar todos los objetivos de la semana anterior antes de guardar.');
                                                                        return;
                                                                     }
                                                                  }

                                                                  const checkinDate = new Date(checkin.created_at);
                                                                  const weekStart = formatWeekStart(checkinDate);
                                                                  const weekNum = getWeekNumber(checkinDate);

                                                                  try {
                                                                     await mockDb.updateCheckin(checkin.id, {
                                                                        status: 'reviewed',
                                                                        coach_notes: `${reviewVideoUrl}\n${reviewNotes}`
                                                                     });

                                                                     let goalsFulfilled = 0, goalsNotFulfilled = 0;
                                                                     for (const assessment of weeklyAssessment.goalAssessments) {
                                                                        await updateGoalAssessmentDB(
                                                                           assessment.goalId,
                                                                           assessment.completionStatus,
                                                                           assessment.reasonCategory as any,
                                                                           assessment.reasonDetail as any,
                                                                           weekNum
                                                                        );
                                                                        if (assessment.completionStatus === 'fulfilled') goalsFulfilled++;
                                                                        else goalsNotFulfilled++;
                                                                     }

                                                                     setWeeklyGoals(prev => prev.map(g => {
                                                                        const assessment = weeklyAssessment.goalAssessments.find(a => a.goalId === g.id);
                                                                        if (!assessment) return g;
                                                                        return {
                                                                           ...g,
                                                                           status: (assessment.completionStatus === 'fulfilled' ? 'achieved' : 'failed') as 'pending' | 'achieved' | 'failed',
                                                                           completion_status: assessment.completionStatus,
                                                                           reason_detail: assessment.reasonDetail,
                                                                           completed_at: new Date().toISOString(),
                                                                           week_number: weekNum,
                                                                        };
                                                                     }));

                                                                     await saveWeeklyCoachReview({
                                                                        client_id: client.id,
                                                                        coach_id: client.coach_id,
                                                                        checkin_id: checkin.id,
                                                                        week_start: weekStart,
                                                                        week_number: weekNum,
                                                                        feeling: 'green' as any,
                                                                        next_week_decision: 'maintain' as any,
                                                                        coach_note: reviewNotes || undefined,
                                                                        goals_fulfilled: goalsFulfilled,
                                                                        goals_partial: 0,
                                                                        goals_not_fulfilled: goalsNotFulfilled,
                                                                     });

                                                                     for (const obj of newObjectives) {
                                                                        if (!obj.title.trim()) continue;
                                                                        try {
                                                                           const { data: newGoal, error: goalError } = await supabase
                                                                              .from('coach_goals')
                                                                              .insert({
                                                                                 client_id: client.id,
                                                                                 title: obj.title.trim(),
                                                                                 description: obj.description?.trim() || null,
                                                                                 goal_type: 'weekly',
                                                                                 status: 'pending',
                                                                                 start_date: obj.startDate,
                                                                                 deadline: obj.deadline,
                                                                                 week_number: weekNum + 1,
                                                                              })
                                                                              .select().single();
                                                                           if (goalError) {
                                                                              console.error('Error creating goal:', goalError);
                                                                              toast.error(`Error al guardar objetivo: ${goalError.message}`);
                                                                           }
                                                                           if (newGoal) setWeeklyGoals(prev => [newGoal, ...prev]);
                                                                        } catch (e) { console.warn('Error creating goal:', e); }
                                                                     }

                                                                     setWeeklyAssessment({ goalAssessments: [], feeling: null, nextWeekDecision: null, coachNote: '' });
                                                                     setNewObjectives([]);
                                                                     setReviewVideoUrl('');
                                                                     setReviewNotes('');
                                                                     setEditingReviewId(null);
                                                                     toast.success("Revisión guardada correctamente.");
                                                                     onBack();
                                                                  } catch (err) {
                                                                     console.error('Error saving review:', err);
                                                                     toast.error("Error al guardar la revisión.");
                                                                  }
                                                               }} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-md transition-transform active:scale-95">
                                                                  <Save className="w-4 h-4" /> Guardar Revisión
                                                               </button>
                                                            </div>
                                                         </div>
                                                      );
                                                   })()}
                                                </div>
                                             </details>
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              )}
                           </>
                        </div>
                     )}

                     {/* --- SUB-TAB: MENSUAL --- */}
                     {seguimientoSubTab === 'mensual' && (
                        <div className="space-y-6">
                           <SectionTitle title="Revisiones Mensuales" icon={<BarChart3 className="w-4 h-4" />} />
                           <MonthlyReviewPanel
                              clientId={client.id}
                              coachId={client.coach_id}
                              month={(() => {
                                 const now = new Date();
                                 if (now.getDate() <= 7) {
                                    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
                                 }
                                 return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                              })()}
                              roadmapData={formData.roadmap_data}
                              goalsData={formData.goals}
                              startDate={formData.start_date}
                              currentWeight={formData.current_weight}
                              initialWeight={formData.initial_weight}
                           />
                        </div>
                     )}

                     {/* --- SUB-TAB: TRIMESTRAL --- */}
                     {seguimientoSubTab === 'trimestral' && (
                        <div className="space-y-6">
                           <SectionTitle title="Revisiones Trimestrales y Renovación" icon={<Target className="w-4 h-4" />} />
                           <QuarterlyReviewPanel
                              client={formData}
                              coachId={client.coach_id}
                              periodStart={new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString()}
                              periodEnd={new Date().toISOString()}
                              onNavigateToRoadmap={() => {
                                 setActiveTab('program');
                                 setProgramSubTab('camino_exito');
                              }}
                           />
                           <OptimizationSurveyCard clientId={client.id} coachId={client.coach_id} />
                        </div>
                     )}

                  </div>
               )}

               {/* --- HEALTH TAB (Medical + Nutrition + Training) --- */}
               {
                  activeTab === 'health' && (
                     <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Sub-tabs for Health */}
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                           <button
                              onClick={() => setHealthSubTab('clinical')}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${healthSubTab === 'clinical' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                           >
                              <span className="flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Ficha Clínica</span>
                           </button>
                           <button
                              onClick={() => setHealthSubTab('nutrition')}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${healthSubTab === 'nutrition' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                           >
                              <span className="flex items-center gap-2"><Utensils className="w-4 h-4" /> Nutrición</span>
                           </button>
                           <button
                              onClick={() => setHealthSubTab('training')}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${healthSubTab === 'training' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                           >
                              <span className="flex items-center gap-2"><Dumbbell className="w-4 h-4" /> Físico</span>
                           </button>
                           <button
                              onClick={() => setHealthSubTab('endocrino')}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${healthSubTab === 'endocrino' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                           >
                              <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Valoración Endocrino</span>
                           </button>
                           {(formData.gender?.toLowerCase() === 'mujer' || formData.gender?.toLowerCase() === 'femenino' || formData.gender?.toLowerCase() === 'female') && (
                              <button
                                 onClick={() => setHealthSubTab('hormonal')}
                                 className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${healthSubTab === 'hormonal' ? 'bg-white text-pink-700 shadow-sm' : 'text-slate-600 hover:text-pink-700'}`}
                              >
                                 <span className="flex items-center gap-2"><Heart className="w-4 h-4" /> Hormonal</span>
                              </button>
                           )}
                        </div>

                        {/* Unified Clinical Record Sub-tab */}
                        {(healthSubTab === 'clinical' || healthSubTab === ('medical' as any)) && (

                           <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                              {isEditing ? (
                                 <>
                                    {/* 1. PANEL RESUMEN MÉDICO (Essential Diabetes Data) */}
                                    <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-lg overflow-hidden">
                                       <div className="bg-slate-50 border-b border-slate-200 p-6 flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                             <div className="p-2 bg-slate-900 rounded-xl text-white">
                                                <Activity className="w-6 h-6" />
                                             </div>
                                             <div>
                                                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Ficha Clínica Unificada</h3>
                                                <p className="text-sm text-slate-500 font-medium">Resumen integral para revisión médica y endocrinológica</p>
                                             </div>
                                          </div>
                                          <div className="flex gap-2">
                                             {formData.anamnesis?.alergias_medicamentos ? (
                                                <div className="px-4 py-2 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 animate-pulse">
                                                   <AlertCircle className="w-4 h-4 text-red-600" />
                                                   <span className="text-xs font-bold text-red-700 uppercase">Alergias: {formData.anamnesis.alergias_medicamentos}</span>
                                                </div>
                                             ) : null}
                                             <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider ${formData.medical?.diabetesType === 'Type 1' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                Diabetes {formData.medical?.diabetesType === 'Type 1' ? 'Tipo 1' : formData.medical?.diabetesType === 'Type 2' ? 'Tipo 2' : formData.medical?.diabetesType}
                                             </span>
                                          </div>
                                       </div>

                                       <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                                          <div className="space-y-1">
                                             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Insulina / Bomba</p>
                                             <p className="text-lg font-bold text-slate-900">{formData.medical?.insulin || 'No especificada'} {formData.medical?.useSensor ? '(Sensor/Bomba)' : ''}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">HbA1c Reciente</p>
                                             <p className="text-lg font-bold text-slate-900">{formData.medical?.lastHba1c || '--'}%</p>
                                          </div>
                                          <div className="space-y-1">
                                             <p className="text-xs font-bold text-slate_400 uppercase tracking-widest">Medicación Adicional</p>
                                             <p className="text-sm font-semibold text-slate-900 line-clamp-2">{formData.medical?.medication || 'Ninguna'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enfermedades Base</p>
                                             <p className="text-sm font-semibold text-slate-900 line-clamp-2">{formData.medical?.pathologies || 'Ninguna'}</p>
                                          </div>
                                       </div>
                                    </div>

                                    {/* 2. GRID DE DETALLES CLÍNICOS */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                       {/* Columna Izquierda: Hábitos y Comportamiento */}
                                       <div className="space-y-8">
                                          <div className="space-y-4">
                                             <SectionTitle title="Hábitos y Estilo de Vida" icon={<ClipboardList className="w-4 h-4 text-slate-600" />} />
                                             <div className="bg-white p-6 rounded-2xl space-y-4 border border-slate-200 shadow-sm">
                                                <div className="grid grid-cols-2 gap-4">
                                                   <DataField label="Hábito Tabaco" value={formData.anamnesis?.habito_tabaco} path="anamnesis.habito_tabaco" isEditing={isEditing} onUpdate={updateField} />
                                                   <DataField label="Consumo Alcohol" value={formData.anamnesis?.consumo_alcohol} path="anamnesis.consumo_alcohol" isEditing={isEditing} onUpdate={updateField} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                   <DataField label="Estrés (1-10)" value={formData.anamnesis?.nivel_estres} path="anamnesis.nivel_estres" isEditing={isEditing} onUpdate={updateField} />
                                                   <DataField label="Sueño Afecta Apetito" value={formData.anamnesis?.sueno_afecta_apetito} path="anamnesis.sueno_afecta_apetito" type="checkbox" isEditing={isEditing} onUpdate={updateField} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                   <DataField label="Horas Sueño" value={formData.anamnesis?.horas_sueno} path="anamnesis.horas_sueno" isEditing={isEditing} onUpdate={updateField} />
                                                   <DataField label="Calidad Sueño" value={formData.anamnesis?.calidad_sueno} path="anamnesis.calidad_sueno" isEditing={isEditing} onUpdate={updateField} />
                                                </div>
                                                <DataField label="Consumo Ultraprocesados" value={formData.anamnesis?.consumo_ultraprocesados} path="anamnesis.consumo_ultraprocesados" isEditing={isEditing} onUpdate={updateField} />
                                                <div className="grid grid-cols-2 gap-4">
                                                   <DataField label="Situaciones Especiales" value={formData.medical?.specialSituations} path="medical.specialSituations" isEditing={isEditing} onUpdate={updateField} />
                                                   <DataField label="Síntomas Iniciales" value={formData.medical?.initialSymptoms} path="medical.initialSymptoms" isEditing={isEditing} onUpdate={updateField} />
                                                </div>
                                             </div>
                                          </div>

                                          <div className="space-y-4">
                                             <SectionTitle title="Comportamiento y Digestión" icon={<Brain className="w-4 h-4 text-purple-600" />} />
                                             <div className="bg-white p-6 rounded-2xl space-y-4 border border-slate-200 shadow-sm">
                                                <div className="grid grid-cols-2 gap-4">
                                                   <DataField label="Comer Emocional" value={formData.anamnesis?.comer_emocional} path="anamnesis.comer_emocional" isEditing={isEditing} onUpdate={updateField} />
                                                   <DataField label="Episodios Atracón" value={formData.anamnesis?.episodios_atracon} path="anamnesis.episodios_atracon" isEditing={isEditing} onUpdate={updateField} />
                                                </div>
                                                <DataField label="Detalle TCA / Digestión" value={formData.anamnesis?.tca_detalle || formData.anamnesis?.problemas_digestivos} path="anamnesis.tca_detalle" isTextArea isEditing={isEditing} onUpdate={updateField} />
                                             </div>
                                          </div>
                                       </div>

                                       {/* Columna Derecha: Historia Clínica y Tratamiento */}
                                       <div className="space-y-8">
                                          <div className="space-y-4">
                                             <SectionTitle title="Historia Clínica Diabetes" icon={<History className="w-4 h-4 text-slate-600" />} />
                                             <div className="bg-white p-6 rounded-2xl space-y-4 border border-slate-200 shadow-sm">
                                                <div className="grid grid-cols-2 gap-4">
                                                   <DataField label="Fecha Diagnóstico" value={formData.anamnesis?.fecha_diagnostico_diabetes} path="anamnesis.fecha_diagnostico_diabetes" isEditing={isEditing} onUpdate={updateField} />
                                                   <DataField label="Peso Diagnóstico" value={formData.anamnesis?.peso_al_diagnostico} path="anamnesis.peso_al_diagnostico" isEditing={isEditing} onUpdate={updateField} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                   <DataField label="Hipertensión" value={formData.anamnesis?.hipertension} path="anamnesis.hipertension" type="checkbox" isEditing={isEditing} onUpdate={updateField} />
                                                   <DataField label="Dislipemia" value={formData.anamnesis?.dislipemia} path="anamnesis.dislipemia" type="checkbox" isEditing={isEditing} onUpdate={updateField} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                   <DataField label="Infarto Previo" value={formData.anamnesis?.infarto_previo} path="anamnesis.infarto_previo" type="checkbox" isEditing={isEditing} onUpdate={updateField} />
                                                   <DataField label="Ictus Previo" value={formData.anamnesis?.ictus_previo} path="anamnesis.ictus_previo" type="checkbox" isEditing={isEditing} onUpdate={updateField} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                   <DataField label="Sospecha LADA" value={formData.anamnesis?.sospecha_lada} path="anamnesis.sospecha_lada" type="checkbox" isEditing={isEditing} onUpdate={updateField} />
                                                   <DataField label="Pérdida Peso Reciente" value={formData.anamnesis?.perdida_peso_reciente} path="anamnesis.perdida_peso_reciente" isEditing={isEditing} onUpdate={updateField} />
                                                </div>
                                                <DataField label="Antecedentes Familiares" value={formData.medical?.family_history} path="medical.family_history" isTextArea isEditing={isEditing} onUpdate={updateField} />
                                                <DataField label="Enfermedades Actuales" value={formData.medical?.pathologies} path="medical.pathologies" isTextArea isEditing={isEditing} onUpdate={updateField} />
                                                <DataField label="Enfermedades/Cirugías Previas" value={(formData.anamnesis?.enfermedades_previas || '') + (formData.anamnesis?.cirugias_previas ? '\nCirugías: ' + formData.anamnesis?.cirugias_previas : '')} path="anamnesis.enfermedades_previas" isTextArea isEditing={isEditing} onUpdate={updateField} />
                                                <DataField label="Otras Condiciones" value={formData.medical?.otherConditions} path="medical.otherConditions" isTextArea isEditing={isEditing} onUpdate={updateField} />
                                             </div>
                                          </div>

                                          <div className="space-y-4">
                                             <SectionTitle title="Tratamiento Detallado" icon={<Pill className="w-4 h-4 text-blue-600" />} />
                                             <div className="bg-white p-6 rounded-2xl space-y-4 border border-slate-200 shadow-sm">
                                                <DataField label="Medicación Diaria" value={formData.medical?.medication} path="medical.medication" isTextArea isEditing={isEditing} onUpdate={updateField} />
                                                <div className="grid grid-cols-2 gap-4">
                                                   <DataField label="Marca Insulina" value={formData.medical?.insulinBrand} path="medical.insulinBrand" isEditing={isEditing} onUpdate={updateField} />
                                                   <DataField label="Hora Inyección" value={formData.medical?.insulinTime} path="medical.insulinTime" isEditing={isEditing} onUpdate={updateField} />
                                                </div>
                                                <DataField label="Pauta Insulina (Dosis)" value={formData.medical?.insulinDose} path="medical.insulinDose" isTextArea isEditing={isEditing} onUpdate={updateField} />
                                                <DataField label="Detalle Insulina Completo (Anamnesis)" value={formData.anamnesis?.detalle_insulina_completo} path="anamnesis.detalle_insulina_completo" isTextArea isEditing={isEditing} onUpdate={updateField} />
                                                <DataField label="Antidiabéticos Orales (Anamnesis)" value={formData.anamnesis?.detalle_antidiabeticos} path="anamnesis.detalle_antidiabeticos" isTextArea isEditing={isEditing} onUpdate={updateField} />
                                                <DataField label="Tratamiento Completo ONB" value={formData.anamnesis?.tratamiento_actual_completo} path="anamnesis.tratamiento_actual_completo" isTextArea isEditing={isEditing} onUpdate={updateField} />
                                             </div>
                                          </div>
                                       </div>
                                    </div>

                                    {/* 3. SALUD HORMONAL (Conditional for Women) */}
                                    {(formData.gender?.toLowerCase() === 'mujer' || formData.gender?.toLowerCase() === 'femenino' || formData.gender?.toLowerCase() === 'female') && (
                                       <div className="space-y-4">
                                          <SectionTitle title="Salud Hormonal y Ciclo" icon={<Heart className="w-4 h-4 text-pink-600" />} />
                                          <div className="bg-white p-8 rounded-3xl border border-pink-100 shadow-sm">
                                             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                <div className="space-y-6">
                                                   <DataField label="Estado Ciclo" value={formData.medical?.hormonal_cycle} path="medical.hormonal_cycle" isEditing={isEditing} onUpdate={updateField} />
                                                   <DataField label="Duración Ciclo (días)" value={formData.medical?.hormonal_duration} path="medical.hormonal_duration" type="text" isEditing={isEditing} onUpdate={updateField} />
                                                </div>
                                                <div className="space-y-6">
                                                   <DataField label="Anticonceptivos" value={formData.medical?.contraceptives} path="medical.contraceptives" isEditing={isEditing} onUpdate={updateField} />
                                                   <DataField label="Menopausia / Síntomas" value={formData.anamnesis?.sintomas_menopausia} path="anamnesis.sintomas_menopausia" isEditing={isEditing} onUpdate={updateField} />
                                                </div>
                                                <div className="space-y-6">
                                                   <DataField label="Observas Variabilidad Glucemia?" value={formData.medical?.hormonal_variability} path="medical.hormonal_variability" isEditing={isEditing} onUpdate={updateField} />
                                                   <DataField label="Notas Hormonales" value={formData.medical?.hormonal_notes} path="medical.hormonal_notes" isTextArea isEditing={isEditing} onUpdate={updateField} />
                                                </div>
                                             </div>
                                          </div>
                                       </div>
                                    )}

                                    {/* 4. ANALÍTICAS Y GLUCEMIA */}
                                    <div className="space-y-8">
                                       <div className="bg-slate-900 rounded-3xl p-8 text-white">
                                          <div className="flex items-center gap-3 mb-8">
                                             <Activity className="w-6 h-6 text-blue-400" />
                                             <h3 className="text-xl font-bold uppercase tracking-tight">Historial de Laboratorio y Control</h3>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                             <div className="space-y-4">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Evolución HbA1c</h4>
                                                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                                                   <DataField label="HbA1c Última" value={formData.medical?.lastHba1c} path="medical.lastHba1c" isEditing={isEditing} onUpdate={updateField} />
                                                   <DataField label="HbA1c Inicial" value={formData.medical?.initialHba1c} path="medical.initialHba1c" isEditing={isEditing} onUpdate={updateField} />
                                                </div>
                                             </div>
                                             <div className="space-y-4">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Otros Marcadores</h4>
                                                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                                                   <DataField label="Glucosa Ayunas (Actual)" value={formData.medical?.glucoseFastingCurrent} path="medical.glucoseFastingCurrent" isEditing={isEditing} onUpdate={updateField} />
                                                   <DataField label="Glucosa Ayunas (Inicial)" value={formData.medical?.glucoseFastingInitial} path="medical.glucoseFastingInitial" isEditing={isEditing} onUpdate={updateField} />
                                                </div>
                                             </div>
                                          </div>
                                       </div>

                                       <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                                          <SectionTitle title="Registro de Glucemias Recientes" icon={<Activity className="w-4 h-4 text-slate-600" />} />
                                          <div className="mt-6">
                                             <GlucoseHistoryTable clientId={client.id} />
                                          </div>
                                       </div>
                                    </div>

                                    {/* 5. REVISIONES MÉDICAS (Coaching notes) */}
                                    <div className="pt-4">
                                       <MedicalReviews client={formData} currentUserRole={currentUser?.role} />
                                    </div>
                                 </>
                              ) : (
                                 <>
                                    {/* 0. RESUMEN RÁPIDO PARA ENDOCRINO */}
                                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-lg">
                                       <div className="flex items-center gap-3 mb-5">
                                          <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30">
                                             <Stethoscope className="w-6 h-6 text-blue-400" />
                                          </div>
                                          <div>
                                             <h3 className="text-lg font-bold uppercase tracking-tight">Resumen Clínico</h3>
                                             <p className="text-xs text-slate-400 font-medium">Vista rápida para revisión endocrinológica</p>
                                          </div>
                                          <div className="ml-auto flex gap-2 flex-wrap justify-end">
                                             <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${formData.medical?.diabetesType === 'Type 1' ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'}`}>
                                                DM {formData.medical?.diabetesType === 'Type 1' ? 'Tipo 1' : formData.medical?.diabetesType === 'Type 2' ? 'Tipo 2' : formData.medical?.diabetesType || '?'}
                                             </span>
                                             {formData.anamnesis?.sospecha_lada && <span className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30">Sosp. LADA</span>}
                                          </div>
                                       </div>
                                       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Diagnóstico</p>
                                             <p className="text-sm font-bold">{formData.anamnesis?.fecha_diagnostico_diabetes || '--'}</p>
                                          </div>
                                          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">HbA1c</p>
                                             <p className="text-sm font-bold">{formData.medical?.lastHba1c ? `${formData.medical.lastHba1c}%` : '--'}
                                                {formData.medical?.initialHba1c && <span className={`ml-1 text-xs ${Number(formData.medical?.lastHba1c) < Number(formData.medical?.initialHba1c) ? 'text-green-400' : 'text-slate-500'}`}>(ini: {formData.medical.initialHba1c}%)</span>}
                                             </p>
                                          </div>
                                          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Glucosa Ayunas</p>
                                             <p className="text-sm font-bold">{formData.medical?.glucoseFastingCurrent || '--'} mg/dL</p>
                                          </div>
                                          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tratamiento</p>
                                             <p className="text-sm font-bold">{formData.medical?.insulin ? 'Insulina' : (formData.medical?.medication ? 'Oral' : 'Dieta')} {formData.medical?.useSensor ? '+ Sensor' : ''}</p>
                                          </div>
                                          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Peso Actual</p>
                                             <p className="text-sm font-bold">{formData.current_weight ? `${formData.current_weight} kg` : '--'}
                                                {formData.anamnesis?.peso_al_diagnostico && <span className="ml-1 text-xs text-slate-500">(Dx: {formData.anamnesis.peso_al_diagnostico}kg)</span>}
                                             </p>
                                          </div>
                                          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Riesgo CV</p>
                                             <p className="text-sm font-bold">
                                                {[formData.anamnesis?.hipertension && 'HTA', formData.anamnesis?.dislipemia && 'DLP', formData.anamnesis?.infarto_previo && 'IAM', formData.anamnesis?.ictus_previo && 'ACV'].filter(Boolean).join(', ') || 'Sin factores'}
                                             </p>
                                          </div>
                                       </div>
                                    </div>

                                    {/* 1. Alertas Críticas (mejorado) */}
                                    {(formData.anamnesis?.alergias_medicamentos || formData.anamnesis?.hipertension || formData.medical?.specialSituations || formData.anamnesis?.perdida_peso_reciente || formData.anamnesis?.enfermedades_previas || formData.anamnesis?.cirugias_previas) && (
                                       <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-2xl shadow-sm">
                                          <div className="flex items-center gap-2 mb-3">
                                             <ShieldAlert className="w-5 h-5 text-red-600" />
                                             <h4 className="text-sm font-bold text-red-800 uppercase tracking-widest">Alertas Médicas Importantes</h4>
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                             {formData.anamnesis?.alergias_medicamentos && <span className="px-3 py-1.5 bg-red-100/80 text-red-800 font-bold text-xs uppercase tracking-wider rounded-lg border border-red-200 animate-pulse">Alergia Medicamentos: {formData.anamnesis.alergias_medicamentos}</span>}
                                             {formData.anamnesis?.alergias_alimentos && <span className="px-3 py-1.5 bg-red-100/80 text-red-800 font-bold text-xs uppercase tracking-wider rounded-lg border border-red-200">Alergia Alimentos: {formData.anamnesis.alergias_alimentos}</span>}
                                             {formData.medical?.specialSituations?.toLowerCase().includes('embaraz') && <span className="px-3 py-1.5 bg-pink-100 text-pink-800 font-bold text-xs uppercase tracking-wider rounded-lg border border-pink-200 animate-pulse">EMBARAZO</span>}
                                             {formData.medical?.specialSituations?.toLowerCase().includes('lactancia') && <span className="px-3 py-1.5 bg-pink-100 text-pink-800 font-bold text-xs uppercase tracking-wider rounded-lg border border-pink-200 animate-pulse">LACTANCIA</span>}
                                             {formData.anamnesis?.hipertension && <span className="px-3 py-1.5 bg-red-100/80 text-red-800 font-bold text-xs uppercase tracking-wider rounded-lg border border-red-200">Hipertensión</span>}
                                             {formData.anamnesis?.perdida_peso_reciente && formData.anamnesis.perdida_peso_reciente !== 'No' && <span className="px-3 py-1.5 bg-amber-100 text-amber-800 font-bold text-xs uppercase tracking-wider rounded-lg border border-amber-200">Pérdida peso: {formData.anamnesis.perdida_peso_reciente}</span>}
                                             {formData.anamnesis?.enfermedades_previas && <span className="px-3 py-1.5 bg-orange-100/80 text-orange-800 font-bold text-xs uppercase tracking-wider rounded-lg border border-orange-200">Previas: {formData.anamnesis.enfermedades_previas}</span>}
                                             {formData.anamnesis?.cirugias_previas && <span className="px-3 py-1.5 bg-orange-100/80 text-orange-800 font-bold text-xs uppercase tracking-wider rounded-lg border border-orange-200">Cirugías: {formData.anamnesis.cirugias_previas}</span>}
                                          </div>
                                       </div>
                                    )}

                                    {/* 1b. Síntomas iniciales del registro */}
                                    {(formData.medical?.initialSymptoms || formData.medical?.specialSituations) && (
                                       <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl shadow-sm">
                                          <div className="flex items-center gap-2 mb-3">
                                             <AlertCircle className="w-4 h-4 text-amber-600" />
                                             <h4 className="text-xs font-bold text-amber-800 uppercase tracking-widest">Datos del Registro Inicial</h4>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                             {formData.medical?.specialSituations && (
                                                <div>
                                                   <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Situaciones Especiales</p>
                                                   <div className="flex flex-wrap gap-1.5">
                                                      {formData.medical.specialSituations.split(',').map((s: string, i: number) => (
                                                         <span key={i} className="px-2.5 py-1 bg-white text-amber-800 font-bold text-xs rounded-lg border border-amber-200">{s.trim()}</span>
                                                      ))}
                                                   </div>
                                                </div>
                                             )}
                                             {formData.medical?.initialSymptoms && (
                                                <div>
                                                   <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Síntomas Reportados</p>
                                                   <div className="flex flex-wrap gap-1.5">
                                                      {formData.medical.initialSymptoms.split(',').map((s: string, i: number) => (
                                                         <span key={i} className="px-2.5 py-1 bg-white text-amber-800 font-bold text-xs rounded-lg border border-amber-200">{s.trim()}</span>
                                                      ))}
                                                   </div>
                                                </div>
                                             )}
                                          </div>
                                       </div>
                                    )}

                                    {/* 2. Perfil Diabético */}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                       <MetricCard label="Tipo" value={`Tipo ${formData.medical?.diabetesType || '?'}`} />
                                       <MetricCard label="Diagnóstico" value={formData.anamnesis?.fecha_diagnostico_diabetes || '--'} />
                                       <MetricCard label="HbA1c" value={formData.medical?.lastHba1c ? `${formData.medical.lastHba1c}%` : '--'} sub={
                                          formData.medical?.initialHba1c ? (
                                             <span className={Number(formData.medical?.lastHba1c) < Number(formData.medical?.initialHba1c) ? 'text-green-600' : 'text-slate-500'}>
                                                Inicial: {formData.medical?.initialHba1c}%
                                             </span>
                                          ) : null
                                       } />
                                       <MetricCard label="Glucosa (A)" value={formData.medical?.glucoseFastingCurrent ? `${formData.medical.glucoseFastingCurrent}` : '--'} />
                                       <MetricCard label="Tratamiento" value={formData.medical?.insulin ? 'Insulina' : (formData.medical?.medication ? 'Oral' : 'Dieta')} sub={formData.medical?.useSensor ? 'Con Sensor' : ''} />
                                    </div>

                                    {/* 3. Grid Visual (Estilo de Vida, Riesgo, Comportamiento) */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                       {/* Col A - Estilo de Vida (con tabaco y alcohol) */}
                                       <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                                          <SectionTitle title="Estilo de Vida" icon={<ClipboardList className="w-5 h-5 text-sea-600" />} />
                                          <StressBar value={formData.anamnesis?.nivel_estres} />
                                          {formData.anamnesis?.desencadenante_estres && (
                                             <div className="text-xs text-slate-500 italic mb-2">Motivo: {formData.anamnesis.desencadenante_estres}</div>
                                          )}
                                          <div className="flex flex-col gap-2">
                                             <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-600 font-semibold">Calidad de Sueño</span>
                                                <span className="font-bold text-slate-800">{formData.anamnesis?.calidad_sueno || '--'} ({formData.anamnesis?.horas_sueno || '?'}h)</span>
                                             </div>
                                             {formData.anamnesis?.sueno_afecta_apetito && (
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                                   <AlertCircle className="w-3 h-3" /> El mal sueño le afecta al apetito
                                                </div>
                                             )}
                                          </div>
                                          <div className="pt-4 border-t border-slate-100 space-y-3">
                                             <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-600 font-semibold">Tabaco</span>
                                                <span className={`font-bold ${formData.anamnesis?.habito_tabaco && formData.anamnesis.habito_tabaco !== 'No fumo' ? 'text-red-600' : 'text-green-600'}`}>
                                                   {formData.anamnesis?.habito_tabaco || 'No fumo'}
                                                </span>
                                             </div>
                                             <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-600 font-semibold">Alcohol</span>
                                                <span className={`font-bold ${formData.anamnesis?.consumo_alcohol && formData.anamnesis.consumo_alcohol !== 'No bebo' ? 'text-amber-600' : 'text-green-600'}`}>
                                                   {formData.anamnesis?.consumo_alcohol || formData.nutrition?.alcohol || 'No bebo'}
                                                </span>
                                             </div>
                                             <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-600 font-semibold">Ultraprocesados</span>
                                                <span className="font-bold text-slate-800">{formData.anamnesis?.consumo_ultraprocesados || 'No'}</span>
                                             </div>
                                          </div>
                                       </div>

                                       {/* Col B */}
                                       <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                                          <SectionTitle title="Riesgo CV" icon={<Activity className="w-5 h-5 text-red-500" />} />
                                          <div className="flex flex-wrap gap-2">
                                             <BoolChip label="Hipertensión" value={formData.anamnesis?.hipertension} type="danger" />
                                             <BoolChip label="Dislipemia" value={formData.anamnesis?.dislipemia} type="danger" />
                                             <BoolChip label="Infarto PREV." value={formData.anamnesis?.infarto_previo} type="danger" />
                                             <BoolChip label="Ictus PREV." value={formData.anamnesis?.ictus_previo} type="danger" />
                                             <BoolChip label="Sosp. LADA" value={formData.anamnesis?.sospecha_lada} type="danger" />
                                          </div>
                                          {(formData.anamnesis?.perdida_peso_reciente || formData.anamnesis?.peso_al_diagnostico) && (
                                             <div className="pt-4 border-t border-slate-100 space-y-2">
                                                {formData.anamnesis?.peso_al_diagnostico && (
                                                   <div className="flex justify-between text-sm">
                                                      <span className="text-slate-600 font-semibold">Peso al Dx</span>
                                                      <span className="font-bold text-slate-800">{formData.anamnesis.peso_al_diagnostico} kg</span>
                                                   </div>
                                                )}
                                                {formData.anamnesis?.perdida_peso_reciente && (
                                                   <div className="flex justify-between text-sm">
                                                      <span className="text-slate-600 font-semibold">Pérdida Reciente</span>
                                                      <span className="font-bold text-slate-800">{formData.anamnesis.perdida_peso_reciente}</span>
                                                   </div>
                                                )}
                                             </div>
                                          )}
                                       </div>

                                       {/* Col C */}
                                       <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                                          <SectionTitle title="Digestión y TCA" icon={<Apple className="w-5 h-5 text-orange-500" />} />
                                          <div className="flex flex-col gap-3">
                                             <BoolChip label="Comer Emocional" value={formData.anamnesis?.comer_emocional} type="warning" />
                                             <BoolChip label="Episodios Atracón" value={formData.anamnesis?.episodios_atracon} type="warning" />
                                          </div>
                                          {formData.anamnesis?.problemas_digestivos && (
                                             <div className="pt-4 border-t border-slate-100 bg-orange-50/50 p-3 rounded-xl">
                                                <h5 className="text-xs font-bold text-orange-800 uppercase tracking-widest mb-1">Problemas Digestivos</h5>
                                                <CollapsibleText text={formData.anamnesis.problemas_digestivos} lines={3} />
                                             </div>
                                          )}
                                          {formData.anamnesis?.tca_detalle && (
                                             <div className="bg-red-50/50 p-3 rounded-xl">
                                                <h5 className="text-xs font-bold text-red-800 uppercase tracking-widest mb-1">Detalle TCA</h5>
                                                <CollapsibleText text={formData.anamnesis.tca_detalle} lines={3} />
                                             </div>
                                          )}
                                       </div>
                                    </div>

                                    {/* 4. Tratamiento Detallado (mejorado con desglose) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                       <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                                          <div className="flex justify-between items-start">
                                             <SectionTitle title="Tratamiento Diabético" icon={<Pill className="w-5 h-5 text-blue-500" />} />
                                             {formData.medical?.useSensor && (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold uppercase tracking-wider">
                                                   <Activity className="w-3.5 h-3.5" /> Sensor
                                                </div>
                                             )}
                                          </div>

                                          {formData.medical?.insulin && (
                                             <div className="pt-2">
                                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Insulina / Pauta</h5>
                                                <div className="flex items-center gap-4 text-sm font-semibold text-slate-800 mb-2">
                                                   <span>{formData.medical.insulinBrand || formData.medical.insulin}</span>
                                                   {formData.medical.insulinTime && <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{formData.medical.insulinTime}</span>}
                                                </div>
                                                {formData.medical.insulinDose && <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono text-xs">{formData.medical.insulinDose}</div>}
                                             </div>
                                          )}

                                          {/* Detalle completo insulina de anamnesis */}
                                          {formData.anamnesis?.detalle_insulina_completo && (
                                             <div className="pt-2 border-t border-slate-100">
                                                <h5 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">Detalle Insulina (Anamnesis)</h5>
                                                <div className="text-sm text-slate-700 bg-blue-50/50 p-3 rounded-xl border border-blue-100 whitespace-pre-wrap">{formData.anamnesis.detalle_insulina_completo}</div>
                                             </div>
                                          )}

                                          {/* Antidiabéticos orales desglosados */}
                                          {formData.anamnesis?.detalle_antidiabeticos && (
                                             <div className="pt-2 border-t border-slate-100">
                                                <h5 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">Antidiabéticos Orales</h5>
                                                <div className="text-sm text-slate-700 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 whitespace-pre-wrap">{formData.anamnesis.detalle_antidiabeticos}</div>
                                             </div>
                                          )}

                                          <div className="pt-2 border-t border-slate-50 mt-2">
                                             <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Otra Medicación</h5>
                                             <MedChips text={formData.medical?.medication || formData.anamnesis?.tratamiento_actual_completo} />
                                          </div>

                                          {/* Tratamiento completo de anamnesis (si difiere) */}
                                          {formData.anamnesis?.tratamiento_actual_completo && formData.anamnesis.tratamiento_actual_completo !== formData.medical?.medication && (
                                             <div className="pt-2 border-t border-slate-100">
                                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tratamiento Completo (Anamnesis)</h5>
                                                <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">{formData.anamnesis.tratamiento_actual_completo}</div>
                                             </div>
                                          )}
                                       </div>

                                       <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                                          <SectionTitle title="Antecedentes y Patologías" icon={<History className="w-5 h-5 text-slate-500" />} />

                                          <div className="space-y-4 divide-y divide-slate-50">
                                             {formData.medical?.family_history && (
                                                <div className="pt-2">
                                                   <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Familiares</h5>
                                                   <CollapsibleText text={formData.medical.family_history} lines={2} />
                                                </div>
                                             )}

                                             {formData.medical?.pathologies && (
                                                <div className="pt-3">
                                                   <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Patologías Actuales</h5>
                                                   <CollapsibleText text={formData.medical.pathologies} lines={2} />
                                                </div>
                                             )}

                                             {formData.medical?.otherConditions && (
                                                <div className="pt-3">
                                                   <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Otras Condiciones</h5>
                                                   <CollapsibleText text={formData.medical.otherConditions} lines={2} />
                                                </div>
                                             )}

                                             {formData.anamnesis?.enfermedades_previas && (
                                                <div className="pt-3">
                                                   <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Enfermedades Previas</h5>
                                                   <CollapsibleText text={formData.anamnesis.enfermedades_previas} lines={2} />
                                                </div>
                                             )}

                                             {formData.anamnesis?.cirugias_previas && (
                                                <div className="pt-3">
                                                   <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Cirugías Previas</h5>
                                                   <CollapsibleText text={formData.anamnesis.cirugias_previas} lines={2} />
                                                </div>
                                             )}

                                             {(!formData.medical?.family_history && !formData.medical?.pathologies && !formData.medical?.otherConditions && !formData.anamnesis?.enfermedades_previas && !formData.anamnesis?.cirugias_previas) && (
                                                <div className="text-slate-400 italic text-sm mt-4">Sin antecedentes reportados.</div>
                                             )}
                                          </div>
                                       </div>
                                    </div>

                                    {/* 5. Hormonal (solo si es mujer) */}
                                    {(formData.gender?.toLowerCase() === 'mujer' || formData.gender?.toLowerCase() === 'femenino' || formData.gender?.toLowerCase() === 'female') && (
                                       <div className="bg-pink-50/50 p-6 rounded-3xl border border-pink-100 shadow-sm space-y-6">
                                          <div className="flex items-center justify-between">
                                             <SectionTitle title="Salud Hormonal Femenina" icon={<Heart className="w-5 h-5 text-pink-500" />} />
                                             {formData.medical?.hormonal_cycle && (
                                                <span className="px-3 py-1.5 bg-white text-pink-700 font-bold text-xs uppercase tracking-wider rounded-xl border border-pink-200 shadow-sm">
                                                   {formData.medical.hormonal_cycle}
                                                </span>
                                             )}
                                          </div>

                                          <div className="flex flex-wrap gap-2">
                                             <BoolChip label="SOP/Irregular" value={formData.anamnesis?.ciclo_irregularidades} type="warning" />
                                             <BoolChip label="Osteoporosis" value={formData.anamnesis?.osteoporosis} type="danger" />
                                             <BoolChip label="Niebla Mental" value={formData.anamnesis?.niebla_mental} type="warning" />
                                             <BoolChip label="Candidata THM" value={formData.anamnesis?.candidata_thm} type="success" />
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-pink-100/50">
                                             {formData.anamnesis?.sintomas_menopausia && (
                                                <div>
                                                   <h5 className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-1">Síntomas Menopausia</h5>
                                                   <p className="text-sm font-semibold text-slate-800">{formData.anamnesis.sintomas_menopausia}</p>
                                                   {formData.anamnesis?.edad_menopausia && <p className="text-xs text-slate-500 mt-1 font-medium bg-white inline-block px-2 py-0.5 rounded-md">Inicio: {formData.anamnesis.edad_menopausia} años</p>}
                                                </div>
                                             )}

                                             {formData.medical?.contraceptives && (
                                                <div>
                                                   <h5 className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-1">Anticonceptivos</h5>
                                                   <p className="text-sm font-semibold text-slate-800">{formData.medical.contraceptives}</p>
                                                </div>
                                             )}

                                             {formData.medical?.hormonal_variability && (
                                                <div>
                                                   <h5 className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-1">Variabilidad Glucemia Hormonal</h5>
                                                   <p className="text-sm font-semibold text-slate-800">{formData.medical.hormonal_variability}</p>
                                                </div>
                                             )}

                                             {formData.medical?.hormonal_notes && (
                                                <div>
                                                   <h5 className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-1">Notas Adicionales</h5>
                                                   <CollapsibleText text={formData.medical.hormonal_notes} lines={2} />
                                                </div>
                                             )}
                                          </div>
                                       </div>
                                    )}

                                    {/* 6. Analíticas (mejorado - ahora incluye las de anamnesis) */}
                                    {(formData.anamnesis?.analitica_urls && formData.anamnesis.analitica_urls.length > 0) && (
                                       <div className="bg-slate-900 rounded-3xl p-6 text-white">
                                          <div className="flex items-center gap-3 mb-4">
                                             <div className="p-2 bg-slate-800 rounded-xl">
                                                <FileText className="w-5 h-5 text-blue-400" />
                                             </div>
                                             <div>
                                                <h4 className="text-sm font-bold uppercase tracking-widest">Documentos Analíticos</h4>
                                                <p className="text-xs text-slate-400">Analíticas subidas por el cliente en la anamnesis</p>
                                             </div>
                                          </div>
                                          <div className="flex flex-wrap gap-3">
                                             {formData.anamnesis.analitica_urls.map((url: string, i: number) => (
                                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 transition-colors rounded-xl border border-slate-700 text-sm font-semibold group">
                                                   <ExternalLink className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                                                   Analítica {i + 1}
                                                </a>
                                             ))}
                                          </div>
                                       </div>
                                    )}

                                    {/* 7. Tabla Glucemias (reutilizada) */}
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                       <SectionTitle title="Registro de Glucemias Recientes" icon={<Activity className="w-5 h-5 text-sea-500" />} />
                                       <div className="mt-4">
                                          <GlucoseHistoryTable clientId={client.id} />
                                       </div>
                                    </div>

                                    {/* 8. REVISIONES MÉDICAS (Coaching notes) */}
                                    <div className="pt-4">
                                       <MedicalReviews client={formData} currentUserRole={currentUser?.role} />
                                    </div>
                                 </>
                              )}
                           </div>

                        )} // end healthSubTab
                        {/* Nutrition Sub-tab */}
                        {healthSubTab === 'nutrition' && (
                           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                              {/* ===== BANNER: Aprobación + Asignación de Plan ===== */}
                              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                 <div className="flex flex-wrap items-center gap-4">
                                    {/* Estado de aprobación */}
                                    <div className="flex items-center gap-2">
                                       {formData.nutrition_approved ? (
                                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                                             <CheckCircle2 className="w-3.5 h-3.5" />
                                             Aprobado
                                             {formData.nutrition_approved_at && (
                                                <span className="text-emerald-500 font-normal ml-1">
                                                   {new Date(formData.nutrition_approved_at).toLocaleDateString('es-ES')}
                                                   {formData.nutrition_approved_by && formData.nutrition_approved_by !== 'migration' && ` por ${formData.nutrition_approved_by}`}
                                                </span>
                                             )}
                                          </span>
                                       ) : (
                                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                                             <Clock className="w-3.5 h-3.5" />
                                             Pendiente
                                          </span>
                                       )}
                                    </div>

                                    <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                                    {/* Tipo + Calorías */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                       <DataField
                                          label="Tipo"
                                          value={formData.nutrition.assigned_nutrition_type}
                                          path="nutrition.assigned_nutrition_type"
                                          type="select"
                                          options={nutritionTypes}
                                          isEditing={isEditing} onUpdate={updateField}
                                       />
                                       <DataField
                                          label="Kcal"
                                          value={Number(formData.nutrition.assigned_calories)}
                                          path="nutrition.assigned_calories"
                                          type="select"
                                          options={[
                                             { label: '1000 kcal', value: 1000 },
                                             { label: '1200 kcal', value: 1200 },
                                             { label: '1400 kcal', value: 1400 },
                                             { label: '1600 kcal', value: 1600 },
                                             { label: '1800 kcal', value: 1800 },
                                             { label: '2000 kcal', value: 2000 }
                                          ]}
                                          isEditing={isEditing} onUpdate={updateField}
                                       />
                                    </div>

                                    {/* Verificación del plan */}
                                    {nutritionVerification.message && (
                                       <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border ${nutritionVerification.status === 'found'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-200'
                                          }`}>
                                          {nutritionVerification.status === 'found' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                          {nutritionVerification.message}
                                       </span>
                                    )}

                                    <div className="ml-auto flex items-center gap-2">
                                       {isCoach && (
                                          <button
                                             onClick={openNutritionSpecialRequestModal}
                                             className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                                          >
                                             <Send className="w-3.5 h-3.5" />
                                             Solicitar Plan Especial
                                          </button>
                                       )}

                                       {!formData.nutrition_approved && (
                                          <button
                                             onClick={async () => {
                                                try {
                                                   setApprovingNutrition(true);
                                                   await nutritionService.approveClientNutrition(client.id, currentUser?.name || currentUser?.email || 'coach');
                                                   updateField('nutrition_approved', true);
                                                   updateField('nutrition_approved_at', new Date().toISOString());
                                                   updateField('nutrition_approved_by', currentUser?.name || currentUser?.email || 'coach');
                                                   toast.success('Plan nutricional aprobado');
                                                } catch (err) {
                                                   console.error('Error approving nutrition:', err);
                                                   toast.error('Error al aprobar');
                                                } finally {
                                                   setApprovingNutrition(false);
                                                }
                                             }}
                                             disabled={approvingNutrition}
                                             className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                          >
                                             {approvingNutrition ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                             ) : (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                             )}
                                             Aprobar Plan
                                          </button>
                                       )}
                                    </div>
                                 </div>
                              </div>

                              {/* ===== ROW 1: Seguridad Alimentaria + Hábitos y Conducta ===== */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                 {/* Seguridad Alimentaria */}
                                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                       <ShieldAlert className="w-4 h-4 text-emerald-600" />
                                       <h3 className="text-sm font-bold text-slate-700">Seguridad Alimentaria</h3>
                                    </div>
                                    <div className="p-5 space-y-3">
                                       {/* Alergias */}
                                       <div className={`p-3 rounded-lg border ${formData.nutrition.allergies ? 'bg-red-50 border-red-200' : 'bg-emerald-50/50 border-emerald-100'}`}>
                                          <div className="flex items-center gap-1.5 mb-1">
                                             <AlertCircle className={`w-4 h-4 ${formData.nutrition.allergies ? 'text-red-600' : 'text-emerald-500'}`} />
                                             <span className={`text-xs font-bold uppercase tracking-wide ${formData.nutrition.allergies ? 'text-red-700' : 'text-emerald-700'}`}>Alergias / Intolerancias</span>
                                          </div>
                                          {formData.nutrition.allergies ? (
                                             <p className="text-sm text-red-800 font-semibold">{formData.nutrition.allergies}</p>
                                          ) : (
                                             <p className="text-xs text-emerald-600">Sin alergias reportadas</p>
                                          )}
                                          {formData.nutrition.otherAllergies && (
                                             <p className="text-xs text-red-600 mt-1 pt-1 border-t border-red-200">{formData.nutrition.otherAllergies}</p>
                                          )}
                                          {isEditing && (
                                             <div className="mt-2 space-y-2 pt-2 border-t border-slate-200">
                                                <DataField label="Alergias/Intolerancias" value={formData.nutrition.allergies} path="nutrition.allergies" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                                <DataField label="Detalle Alergias" value={formData.nutrition.otherAllergies} path="nutrition.otherAllergies" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                             </div>
                                          )}
                                       </div>

                                       {/* Vetados */}
                                       <div className={`p-3 rounded-lg border ${formData.nutrition.dislikes ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                                          <div className="flex items-center gap-1.5 mb-1">
                                             <Ban className={`w-4 h-4 ${formData.nutrition.dislikes ? 'text-amber-600' : 'text-slate-400'}`} />
                                             <span className={`text-xs font-bold uppercase tracking-wide ${formData.nutrition.dislikes ? 'text-amber-700' : 'text-slate-500'}`}>Alimentos Vetados</span>
                                          </div>
                                          <p className={`text-sm ${formData.nutrition.dislikes ? 'text-amber-800 font-semibold' : 'text-slate-400 italic text-xs'}`}>
                                             {formData.nutrition.dislikes || 'No indicado'}
                                          </p>
                                          {isEditing && (
                                             <div className="mt-2 pt-2 border-t border-slate-200">
                                                <DataField label="Alimentos Vetados" value={formData.nutrition.dislikes} path="nutrition.dislikes" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                             </div>
                                          )}
                                       </div>

                                       {/* Preferencias */}
                                       <div className={`p-3 rounded-lg border ${formData.nutrition.preferences ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                                          <div className="flex items-center gap-1.5 mb-1">
                                             <Heart className={`w-4 h-4 ${formData.nutrition.preferences ? 'text-emerald-600' : 'text-slate-400'}`} />
                                             <span className={`text-xs font-bold uppercase tracking-wide ${formData.nutrition.preferences ? 'text-emerald-700' : 'text-slate-500'}`}>Preferencias Dietéticas</span>
                                          </div>
                                          <p className={`text-sm ${formData.nutrition.preferences ? 'text-emerald-800 font-semibold' : 'text-slate-400 italic text-xs'}`}>
                                             {formData.nutrition.preferences || 'No indicado'}
                                          </p>
                                          {isEditing && (
                                             <div className="mt-2 pt-2 border-t border-slate-200">
                                                <DataField label="Preferencias" value={formData.nutrition.preferences} path="nutrition.preferences" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                 </div>

                                 {/* Hábitos y Conducta */}
                                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                       <Utensils className="w-4 h-4 text-emerald-600" />
                                       <h3 className="text-sm font-bold text-slate-700">Hábitos y Conducta</h3>
                                    </div>
                                    <div className="p-5 space-y-3">
                                       <div className="grid grid-cols-2 gap-3">
                                          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                             <span>👨‍🍳</span>
                                             <DataField label="Cocina propia" value={formData.nutrition.cooksForSelf} path="nutrition.cooksForSelf" type="checkbox" isEditing={isEditing} onUpdate={updateField} className="!mb-0 flex-1" />
                                          </div>
                                          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                             <span>⚖️</span>
                                             <DataField label="Pesa la comida" value={formData.nutrition.willingToWeighFood} path="nutrition.willingToWeighFood" type="checkbox" isEditing={isEditing} onUpdate={updateField} className="!mb-0 flex-1" />
                                          </div>
                                          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                             <span>🥖</span>
                                             <DataField label="Con pan" value={formData.nutrition.eatsWithBread} path="nutrition.eatsWithBread" type="checkbox" isEditing={isEditing} onUpdate={updateField} className="!mb-0 flex-1" />
                                          </div>
                                          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                             <span>🍪</span>
                                             <DataField label="Pica entre horas" value={formData.nutrition.snacking} path="nutrition.snacking" type="checkbox" isEditing={isEditing} onUpdate={updateField} className="!mb-0 flex-1" />
                                          </div>
                                       </div>

                                       <DataField label="Comidas fuera (sem)" value={formData.nutrition.mealsOutPerWeek} path="nutrition.mealsOutPerWeek" type="number" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                       <DataField label="Cantidad Pan" value={formData.nutrition.breadAmount} path="nutrition.breadAmount" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                       <DataField label="Consumo Alcohol" value={formData.nutrition.alcohol} path="nutrition.alcohol" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                       <DataField label="Bebida en comidas" value={formData.nutrition.waterIntake} path="nutrition.waterIntake" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />

                                       <div className="pt-3 border-t border-slate-100 space-y-3">
                                          <DataField label="Tiene Antojos" value={formData.nutrition.cravings} path="nutrition.cravings" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                          <DataField label="Tipo Antojos" value={formData.nutrition.cravingsDetail} path="nutrition.cravingsDetail" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                          <DataField label="Qué pica" value={formData.nutrition.snackingDetail} path="nutrition.snackingDetail" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                          <DataField label="TCA Diagnosticado" value={formData.nutrition.eatingDisorder} path="nutrition.eatingDisorder" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                          <DataField label="Detalle TCA" value={formData.nutrition.eatingDisorderDetail} path="nutrition.eatingDisorderDetail" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                       </div>
                                    </div>
                                 </div>
                              </div>

                              {/* ===== ROW 2: Horarios + Plan Estructurado ===== */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                 {/* Horarios */}
                                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                       <Clock className="w-4 h-4 text-emerald-600" />
                                       <h3 className="text-sm font-bold text-slate-700">Horarios de Comidas</h3>
                                    </div>
                                    <div className="p-5 space-y-3">
                                       <DataField label="Nº Comidas/Día" value={formData.nutrition.mealsPerDay} path="nutrition.mealsPerDay" type="number" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                       <div className="space-y-2">
                                          {[
                                             { label: 'Desayuno', path: 'nutrition.schedules.breakfast', value: formData.nutrition.schedules?.breakfast, icon: '🌅' },
                                             { label: 'Media Mañana', path: 'nutrition.schedules.morningSnack', value: formData.nutrition.schedules?.morningSnack, icon: '☀️' },
                                             { label: 'Almuerzo', path: 'nutrition.schedules.lunch', value: formData.nutrition.schedules?.lunch, icon: '🍽️' },
                                             { label: 'Merienda', path: 'nutrition.schedules.afternoonSnack', value: formData.nutrition.schedules?.afternoonSnack, icon: '🍎' },
                                             { label: 'Cena', path: 'nutrition.schedules.dinner', value: formData.nutrition.schedules?.dinner, icon: '🌙' },
                                          ].map((meal, idx) => (
                                             <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                                <span className="text-base">{meal.icon}</span>
                                                <DataField label={meal.label} value={meal.value} path={meal.path} type="time" isEditing={isEditing} onUpdate={updateField} className="flex-1 !mb-0" />
                                             </div>
                                          ))}
                                       </div>
                                    </div>
                                 </div>

                                 {/* Plan Estructurado */}
                                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                       <Award className="w-4 h-4 text-emerald-600" />
                                       <h3 className="text-sm font-bold text-slate-700">Plan Estructurado</h3>
                                    </div>
                                    <div className="p-5">
                                       <ClientNutritionSelector
                                          clientId={client.id}
                                          currentUser={currentUser!}
                                          clientData={client}
                                          suggestedCalories={Number(formData.nutrition.assigned_calories)}
                                          suggestedType={formData.nutrition.assigned_nutrition_type}
                                          onPlanAssigned={() => {
                                             // Optional: refresh verification if needed
                                          }}
                                       />
                                       <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                                          Si asignas un plan aquí, el sistema dará prioridad a este plan sobre la selección automática.
                                       </p>
                                       <DataField label="Link Plan Nutricional (PDF)" value={formData.nutrition.planUrl} path="nutrition.planUrl" className="text-blue-600 font-medium mt-3" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                    </div>
                                 </div>
                              </div>

                              {/* ===== ROW 3: Alimentación habitual + Notas + Recordatorio 24h ===== */}
                              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                 <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                    <Apple className="w-4 h-4 text-emerald-600" />
                                    <h3 className="text-sm font-bold text-slate-700">Alimentación Habitual y Notas</h3>
                                 </div>
                                 <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div>
                                       <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Alimentación Habitual</span>
                                       <p className={`text-sm mt-1 ${formData.nutrition.consumedFoods ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                                          {formData.nutrition.consumedFoods || 'No indicado'}
                                       </p>
                                       {isEditing && (
                                          <div className="mt-2">
                                             <DataField label="Alimentos Habituales" value={formData.nutrition.consumedFoods} path="nutrition.consumedFoods" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                          </div>
                                       )}
                                    </div>
                                    <div>
                                       <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notas Dietéticas</span>
                                       <p className={`text-sm mt-1 ${formData.nutrition.dietaryNotes ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                                          {formData.nutrition.dietaryNotes || 'No indicado'}
                                       </p>
                                       {isEditing && (
                                          <div className="mt-2">
                                             <DataField label="Notas Dietéticas" value={formData.nutrition.dietaryNotes} path="nutrition.dietaryNotes" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                          </div>
                                       )}
                                    </div>
                                    <div>
                                       <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recordatorio 24h</span>
                                       <DataField label="Última comida que recuerda" value={formData.nutrition.lastRecallMeal} path="nutrition.lastRecallMeal" type="textarea" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                    </div>
                                 </div>
                              </div>

                           </div>
                        )}

                        {/* Training Sub-tab */}
                        {healthSubTab === 'training' && (
                           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                              {isCoach && (
                                 <div className="flex justify-end">
                                    <button
                                       onClick={openTrainingSpecialRequestModal}
                                       className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                       <Send className="w-3.5 h-3.5" />
                                       Solicitar Ajuste Especial
                                    </button>
                                 </div>
                              )}

                              <div>
                                 <SectionTitle title="Evolución del Peso" icon={<TrendingUp className="w-4 h-4 text-blue-600" />} />
                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    {/* Peso Inicial Card */}
                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden group">
                                       <div className="absolute top-0 right-0 w-16 h-16 bg-slate-200/30 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-slate-300/40 transition-all"></div>
                                       <div className="flex items-center gap-2 mb-2">
                                          <span className="text-2xl">📊</span>
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peso Inicial</p>
                                       </div>
                                       <DataField label="" value={formData.initial_weight} path="initial_weight" type="number" className="!mb-0 font-bold text-2xl text-slate-700" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                       <span className="text-xs text-slate-400 font-medium">kg</span>
                                    </div>
                                    {/* Peso Actual Card */}
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-5 rounded-2xl border border-blue-200/80 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden group">
                                       <div className="absolute top-0 right-0 w-16 h-16 bg-blue-200/30 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-blue-300/40 transition-all"></div>
                                       <div className="flex items-center gap-2 mb-2">
                                          <span className="text-2xl">⚖️</span>
                                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Peso Actual</p>
                                       </div>
                                       <DataField label="" value={formData.current_weight} path="current_weight" type="number" className="!mb-0 font-bold text-2xl text-blue-700" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                       <span className="text-xs text-blue-400 font-medium">kg</span>
                                    </div>
                                    {/* Peso Objetivo Card */}
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50/50 p-5 rounded-2xl border border-green-200/80 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden group">
                                       <div className="absolute top-0 right-0 w-16 h-16 bg-green-200/30 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-green-300/40 transition-all"></div>
                                       <div className="flex items-center gap-2 mb-2">
                                          <span className="text-2xl">🎯</span>
                                          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Peso Objetivo</p>
                                       </div>
                                       <DataField label="" value={formData.target_weight} path="target_weight" type="number" className="!mb-0 font-bold text-2xl text-green-700" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                       <span className="text-xs text-green-400 font-medium">kg</span>
                                    </div>
                                    {/* Cambio Total Card */}
                                    <div className={`${weightChange < 0 ? 'bg-gradient-to-br from-indigo-50 to-purple-50/50 border-indigo-200/80' : weightChange > 0 ? 'bg-gradient-to-br from-red-50 to-rose-50/50 border-red-200/80' : 'bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200/80'} p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden group`}>
                                       <div className={`absolute top-0 right-0 w-16 h-16 ${weightChange < 0 ? 'bg-indigo-200/30' : weightChange > 0 ? 'bg-red-200/30' : 'bg-slate-200/30'} rounded-full blur-2xl -mr-6 -mt-6`}></div>
                                       <div className="flex items-center gap-2 mb-2">
                                          <span className="text-2xl">{weightChange < 0 ? '📉' : weightChange > 0 ? '📈' : '➡️'}</span>
                                          <p className={`text-[10px] font-black uppercase tracking-widest ${weightChange < 0 ? 'text-indigo-500' : weightChange > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                             {weightChange < 0 ? 'Pérdida Total' : weightChange > 0 ? 'Ganancia Total' : 'Sin Cambio'}
                                          </p>
                                       </div>
                                       <div className="flex items-center gap-2">
                                          {weightChange < 0 ? <TrendingDown className="w-6 h-6 text-indigo-600" /> : weightChange > 0 ? <TrendingUp className="w-6 h-6 text-red-600" /> : null}
                                          <span className={`text-2xl font-bold ${weightChange < 0 ? 'text-indigo-700' : weightChange > 0 ? 'text-red-700' : 'text-slate-600'}`}>
                                             {weightChange !== 0 ? `${weightChange > 0 ? '+' : ''}${weightChange}` : '0'} kg
                                          </span>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="h-64 w-full bg-white rounded-lg border border-slate-100 p-4 shadow-sm">
                                    {formData.initial_weight && formData.current_weight ? (
                                       <ResponsiveContainer width="100%" height="100%">
                                          <LineChart data={[{ name: 'Inicio', weight: formData.initial_weight, date: formData.start_date }, { name: 'Actual', weight: formData.current_weight, date: new Date().toISOString().split('T')[0] }]}>
                                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                             <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                             <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                                             <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                             {formData.target_weight && <ReferenceLine y={formData.target_weight} stroke="green" strokeDasharray="3 3" label={{ value: 'Objetivo', fill: 'green', fontSize: 10, position: 'insideBottomRight' }} />}
                                             <Line type="monotone" dataKey="weight" stroke="#2563eb" strokeWidth={3} dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                                          </LineChart>
                                       </ResponsiveContainer>
                                    ) : (
                                       <div className="h-full flex items-center justify-center text-slate-400 text-sm">Faltan datos de peso para generar el gráfico.</div>
                                    )}
                                 </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-8 border-t border-slate-100">
                                 <div className="space-y-4">
                                    <SectionTitle title="Medidas Corporales" icon={<Activity className="w-4 h-4 text-slate-600" />} />
                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
                                       <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200/30 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                       <div className="relative z-10 space-y-4">
                                          {/* Visual body measurements */}
                                          <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-slate-100/50 hover:bg-white/80 transition-colors">
                                             <span className="text-2xl">📏</span>
                                             <DataField label="Altura" value={formData.height} path="height" type="number" isEditing={isEditing} onUpdate={updateField} className="flex-1 !mb-0" />
                                          </div>
                                          <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-slate-100/50 hover:bg-white/80 transition-colors">
                                             <span className="text-2xl">🔵</span>
                                             <DataField label="Perímetro Barriga" value={formData.abdominal_perimeter} path="abdominal_perimeter" type="number" isEditing={isEditing} onUpdate={updateField} className="flex-1 !mb-0" />
                                          </div>
                                          <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-slate-100/50 hover:bg-white/80 transition-colors">
                                             <span className="text-2xl">💪</span>
                                             <DataField label="Perímetro Brazo" value={formData.arm_perimeter} path="arm_perimeter" type="number" isEditing={isEditing} onUpdate={updateField} className="flex-1 !mb-0" />
                                          </div>
                                          <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-slate-100/50 hover:bg-white/80 transition-colors">
                                             <span className="text-2xl">🦵</span>
                                             <DataField label="Perímetro Muslo" value={formData.thigh_perimeter} path="thigh_perimeter" type="number" isEditing={isEditing} onUpdate={updateField} className="flex-1 !mb-0" />
                                          </div>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="space-y-4">
                                    <SectionTitle title="Actividad Física" icon={<Dumbbell className="w-4 h-4 text-slate-700" />} />
                                    <div className="bg-gradient-to-br from-orange-50 to-amber-50/30 p-5 rounded-2xl border border-orange-100/80 shadow-sm relative overflow-hidden">
                                       <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/30 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                       <div className="relative z-10 space-y-4">
                                          <DataField label="Tipo Trabajo/Actividad" value={formData.training.activityLevel} path="training.activityLevel" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                          <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-orange-100/50">
                                             <span className="text-2xl">👟</span>
                                             <DataField label="Pasos Diarios Objetivo" value={formData.training.stepsGoal} path="training.stepsGoal" type="number" isEditing={isEditing} onUpdate={updateField} className="flex-1 !mb-0" />
                                          </div>
                                          <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-orange-100/50">
                                             <span className="text-2xl">🏋️</span>
                                             <DataField label="Experiencia Fuerza" value={formData.training.strengthTraining} path="training.strengthTraining" type="checkbox" isEditing={isEditing} onUpdate={updateField} className="!mb-0" />
                                          </div>
                                          <DataField label="Lugar Entrenamiento" value={formData.training.trainingLocation} path="training.trainingLocation" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                          <DataField label="Horario Disponibilidad" value={formData.training.availability} path="training.availability" isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                       </div>
                                    </div>
                                 </div>

                                 {/* Registro de Pasos del Cliente */}
                                 <div className="space-y-4">
                                    <SectionTitle title="Registro de Pasos" icon={<Activity className="w-4 h-4 text-orange-600" />} />
                                    <StepsCard clientId={client.id} isClientView={false} />
                                 </div>

                                 {/* Programa de Entrenamiento Asignado */}
                                 <div className="space-y-4">
                                    <SectionTitle title="Programa de Entrenamiento" icon={<Dumbbell className="w-4 h-4 text-sea-600" />} />
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                       <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                          <Dumbbell className="w-4 h-4 text-sea-600" />
                                          <h3 className="text-sm font-bold text-slate-700">Programa Asignado</h3>
                                       </div>
                                       <div className="p-5">
                                          <ClientTrainingSelector
                                             clientId={client.id}
                                             currentUser={currentUser!}
                                             clientData={client}
                                             onAssigned={() => { }}
                                          />
                                          <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                                             El programa asignado aqui es el que el equipo seguira para el cliente.
                                          </p>
                                       </div>
                                    </div>
                                 </div>
                              </div>

                              {/* Historial de Entrenamientos Completados */}
                              <div className="mt-8 pt-8 border-t border-slate-100">
                                 <SectionTitle title="Valoracion de Fuerza" icon={<Dumbbell className="w-4 h-4 text-sea-600" />} />
                                 <p className="text-xs text-slate-400 mb-4">Selecciona ejercicios guia del cliente y registra medicion inicial + retests mensuales.</p>
                                 <StrengthBenchmarksManager clientId={client.id} currentUser={currentUser!} />
                              </div>

                              {/* Historial de Entrenamientos Completados */}
                              <div className="mt-8 pt-8 border-t border-slate-100">
                                 <SectionTitle title="Historial de Entrenamientos" icon={<Dumbbell className="w-4 h-4 text-sea-600" />} />
                                 <p className="text-xs text-slate-400 mb-4">Entrenamientos registrados para este cliente.</p>
                                 <ClientWorkoutHistory clientId={client.id} />
                              </div>
                           </div>
                        )}

                        {/* Endocrino Sub-tab */}
                        {healthSubTab === 'endocrino' && (
                           <EndocrinoAssessmentSection
                              client={client}
                              currentUser={currentUser}
                           />
                        )}

                        {/* Hormonal Sub-tab (Solo Mujeres) */}
                        {healthSubTab === 'hormonal' && (
                           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                              {/* Header con selector de estado hormonal */}
                              <div className="bg-white rounded-3xl border-2 border-pink-200 shadow-lg overflow-hidden">
                                 <div className="bg-gradient-to-r from-pink-600 to-rose-500 px-6 py-4 flex items-center gap-3">
                                    <Heart className="w-6 h-6 text-white" />
                                    <h3 className="text-lg font-black text-white uppercase tracking-wide">Seguimiento Hormonal</h3>
                                 </div>
                                 <div className="p-6">
                                    {/* Estado Hormonal Selector */}
                                    <div className="mb-6">
                                       <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Estado Hormonal</label>
                                       <div className="flex gap-3 flex-wrap">
                                          {([
                                             { value: 'pre_menopausica', label: 'Pre-menopáusica', desc: 'Ciclo regular', color: 'pink' },
                                             { value: 'perimenopausica', label: 'Perimenopáusica', desc: 'Ciclos irregulares', color: 'amber' },
                                             { value: 'menopausica', label: 'Menopáusica', desc: 'Sin ciclo', color: 'purple' },
                                          ] as const).map(opt => (
                                             <button
                                                key={opt.value}
                                                onClick={() => {
                                                   updateField('hormonal_status', opt.value);
                                                   handleQuickSave('hormonal_status', opt.value);
                                                }}
                                                className={`px-4 py-3 rounded-2xl border-2 text-left transition-all ${formData.hormonal_status === opt.value
                                                   ? `border-${opt.color}-400 bg-${opt.color}-50 shadow-md`
                                                   : 'border-slate-200 bg-white hover:border-slate-300'
                                                   }`}
                                             >
                                                <p className={`text-sm font-bold ${formData.hormonal_status === opt.value ? `text-${opt.color}-700` : 'text-slate-700'}`}>{opt.label}</p>
                                                <p className="text-xs text-slate-500">{opt.desc}</p>
                                             </button>
                                          ))}
                                       </div>
                                    </div>

                                    {/* Contenido según estado hormonal */}
                                    {!formData.hormonal_status && (
                                       <div className="text-center py-8 text-slate-400">
                                          <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                          <p className="text-sm">Selecciona el estado hormonal de la clienta para ver el panel correspondiente.</p>
                                       </div>
                                    )}

                                    {/* PRE-MENOPÁUSICA: Ciclo normal */}
                                    {formData.hormonal_status === 'pre_menopausica' && (
                                       <div className="space-y-6">
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                             <div className="p-4 rounded-2xl bg-pink-50 border-2 border-pink-200">
                                                <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1">Duración Media Ciclo</p>
                                                <div className="flex items-baseline gap-1">
                                                   {isEditing ? (
                                                      <input
                                                         type="number"
                                                         value={formData.average_cycle_length || 28}
                                                         onChange={(e) => updateField('average_cycle_length', Number(e.target.value))}
                                                         onBlur={() => handleQuickSave('average_cycle_length', formData.average_cycle_length)}
                                                         className="w-20 text-2xl font-black text-pink-700 bg-transparent border-b-2 border-pink-300 focus:outline-none"
                                                      />
                                                   ) : (
                                                      <span className="text-2xl font-black text-pink-700">{formData.average_cycle_length || 28}</span>
                                                   )}
                                                   <span className="text-sm text-pink-500 font-medium">días</span>
                                                </div>
                                             </div>
                                             <div className="p-4 rounded-2xl bg-purple-50 border-2 border-purple-200">
                                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Fase Actual Estimada</p>
                                                {(() => {
                                                   if (menstrualCycles.length === 0) return <p className="text-sm text-slate-500">Sin datos de ciclo</p>;
                                                   const lastStart = new Date(menstrualCycles[0].period_start_date);
                                                   const cycleLen = formData.average_cycle_length || 28;
                                                   const daysSinceStart = Math.floor((Date.now() - lastStart.getTime()) / (1000 * 60 * 60 * 24));
                                                   const dayInCycle = daysSinceStart % cycleLen;
                                                   let phase = 'Menstrual';
                                                   let phaseColor = 'text-red-600';
                                                   if (dayInCycle >= 1 && dayInCycle <= 5) { phase = 'Menstrual'; phaseColor = 'text-red-600'; }
                                                   else if (dayInCycle <= 13) { phase = 'Folicular'; phaseColor = 'text-green-600'; }
                                                   else if (dayInCycle <= 16) { phase = 'Ovulación'; phaseColor = 'text-blue-600'; }
                                                   else { phase = 'Lútea'; phaseColor = 'text-amber-600'; }
                                                   return (
                                                      <div>
                                                         <p className={`text-2xl font-black ${phaseColor}`}>{phase}</p>
                                                         <p className="text-xs text-slate-500">Día {dayInCycle + 1} del ciclo</p>
                                                      </div>
                                                   );
                                                })()}
                                             </div>
                                             <div className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-200">
                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Ciclos Registrados</p>
                                                <span className="text-2xl font-black text-blue-700">{menstrualCycles.length}</span>
                                             </div>
                                          </div>

                                          {/* Aviso fase lútea/menstrual */}
                                          {(() => {
                                             if (menstrualCycles.length === 0) return null;
                                             const lastStart = new Date(menstrualCycles[0].period_start_date);
                                             const cycleLen = formData.average_cycle_length || 28;
                                             const dayInCycle = Math.floor((Date.now() - lastStart.getTime()) / (1000 * 60 * 60 * 24)) % cycleLen;
                                             if (dayInCycle > 16 || dayInCycle <= 5) {
                                                return (
                                                   <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                                                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                                                      <div>
                                                         <p className="text-sm font-bold text-amber-800">Fase {dayInCycle > 16 ? 'Lútea' : 'Menstrual'}: posible retención de líquidos</p>
                                                         <p className="text-xs text-amber-600 mt-1">Es normal una subida de peso de 0.5-2kg en esta fase. No ajustar plan por estas variaciones.</p>
                                                      </div>
                                                   </div>
                                                );
                                             }
                                             return null;
                                          })()}
                                       </div>
                                    )}

                                    {/* PERIMENOPÁUSICA: Ciclos irregulares + síntomas */}
                                    {formData.hormonal_status === 'perimenopausica' && (
                                       <div className="space-y-6">
                                          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                                             <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                                             <div>
                                                <p className="text-sm font-bold text-amber-800">Perimenopausia: ajustes metabólicos en curso</p>
                                                <p className="text-xs text-amber-600 mt-1">Los ciclos pueden ser irregulares. Mayor dificultad para perder peso. Considerar ajustes nutricionales adaptativos.</p>
                                             </div>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                             <div className="p-4 rounded-2xl bg-pink-50 border-2 border-pink-200">
                                                <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1">Ciclos Registrados</p>
                                                <span className="text-2xl font-black text-pink-700">{menstrualCycles.length}</span>
                                                {menstrualCycles.length >= 2 && (
                                                   <p className="text-xs text-slate-500 mt-1">
                                                      Variabilidad: {Math.max(...menstrualCycles.filter((c: any) => c.cycle_length).map((c: any) => c.cycle_length)) - Math.min(...menstrualCycles.filter((c: any) => c.cycle_length).map((c: any) => c.cycle_length))} días
                                                   </p>
                                                )}
                                             </div>
                                             <div className="p-4 rounded-2xl bg-purple-50 border-2 border-purple-200">
                                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">THS (Terapia Hormonal)</p>
                                                {isEditing ? (
                                                   <input
                                                      type="text"
                                                      value={formData.hrt_treatment || ''}
                                                      onChange={(e) => updateField('hrt_treatment', e.target.value)}
                                                      onBlur={() => handleQuickSave('hrt_treatment', formData.hrt_treatment)}
                                                      placeholder="Ej: Estradiol 1mg/día"
                                                      className="w-full text-sm font-medium text-purple-700 bg-transparent border-b-2 border-purple-300 focus:outline-none placeholder:text-purple-300"
                                                   />
                                                ) : (
                                                   <p className="text-sm font-bold text-purple-700">{formData.hrt_treatment || 'No indicada'}</p>
                                                )}
                                             </div>
                                          </div>
                                       </div>
                                    )}

                                    {/* MENOPÁUSICA: Sin ciclo, otros síntomas */}
                                    {formData.hormonal_status === 'menopausica' && (
                                       <div className="space-y-6">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                             <div className="p-4 rounded-2xl bg-purple-50 border-2 border-purple-200">
                                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">THS (Terapia Hormonal Sustitutiva)</p>
                                                {isEditing ? (
                                                   <input
                                                      type="text"
                                                      value={formData.hrt_treatment || ''}
                                                      onChange={(e) => updateField('hrt_treatment', e.target.value)}
                                                      onBlur={() => handleQuickSave('hrt_treatment', formData.hrt_treatment)}
                                                      placeholder="Ej: Estradiol + Progesterona"
                                                      className="w-full text-sm font-medium text-purple-700 bg-transparent border-b-2 border-purple-300 focus:outline-none placeholder:text-purple-300"
                                                   />
                                                ) : (
                                                   <p className="text-sm font-bold text-purple-700">{formData.hrt_treatment || 'No indicada'}</p>
                                                )}
                                             </div>
                                             <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</p>
                                                <p className="text-sm font-bold text-slate-700">Sin ciclo menstrual activo</p>
                                                <p className="text-xs text-slate-500 mt-1">Seguimiento de síntomas menopáusicos</p>
                                             </div>
                                          </div>
                                          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                                             <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                                             <div>
                                                <p className="text-sm font-bold text-rose-800">Consideraciones nutricionales en menopausia</p>
                                                <p className="text-xs text-rose-600 mt-1">Mayor pérdida ósea, posible resistencia a insulina incrementada. Priorizar proteína, calcio y vitamina D.</p>
                                             </div>
                                          </div>
                                       </div>
                                    )}

                                    {/* Historial de Síntomas (común a todos los estados) */}
                                    {formData.hormonal_status && (
                                       <div className="mt-6">
                                          <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                             <Activity className="w-4 h-4 text-pink-500" /> Síntomas Reportados por la Clienta
                                          </h4>
                                          {loadingHormonal ? (
                                             <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-pink-400" /></div>
                                          ) : hormonalSymptoms.length === 0 ? (
                                             <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                                                <p className="text-sm">La clienta aún no ha registrado síntomas desde su portal.</p>
                                             </div>
                                          ) : (
                                             <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                                {hormonalSymptoms.map((s: any) => (
                                                   <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                      <div className="flex justify-between items-center mb-2">
                                                         <span className="text-xs font-bold text-slate-500">
                                                            {new Date(s.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                         </span>
                                                         <div className="flex gap-2">
                                                            {s.energy_level && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Energía: {s.energy_level}/5</span>}
                                                            {s.mood && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Ánimo: {s.mood}/5</span>}
                                                            {s.sleep_quality && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Sueño: {s.sleep_quality}/5</span>}
                                                         </div>
                                                      </div>
                                                      <div className="flex flex-wrap gap-1.5">
                                                         {s.bloating && <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-bold">Hinchazón</span>}
                                                         {s.cramps && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Calambres</span>}
                                                         {s.cravings && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">Antojos{s.cravings_detail ? `: ${s.cravings_detail}` : ''}</span>}
                                                         {s.headache && <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">Dolor cabeza</span>}
                                                         {s.breast_tenderness && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">Sens. mamaria</span>}
                                                         {s.irritability && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Irritabilidad</span>}
                                                         {s.hot_flashes && <span className="text-[10px] bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-bold">Sofocos</span>}
                                                         {s.night_sweats && <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold">Sudores nocturnos</span>}
                                                         {s.vaginal_dryness && <span className="text-[10px] bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full font-bold">Sequedad</span>}
                                                      </div>
                                                      {s.notes && <p className="text-xs text-slate-500 mt-2 italic">{s.notes}</p>}
                                                   </div>
                                                ))}
                                             </div>
                                          )}
                                       </div>
                                    )}

                                    {/* Historial de Ciclos (pre/peri) */}
                                    {formData.hormonal_status && formData.hormonal_status !== 'menopausica' && menstrualCycles.length > 0 && (
                                       <div className="mt-6">
                                          <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                             <Calendar className="w-4 h-4 text-pink-500" /> Historial de Ciclos
                                          </h4>
                                          <div className="overflow-x-auto">
                                             <table className="w-full text-sm">
                                                <thead>
                                                   <tr className="border-b border-slate-200">
                                                      <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase">Inicio</th>
                                                      <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase">Fin</th>
                                                      <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase">Duración Ciclo</th>
                                                      <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase">Notas</th>
                                                   </tr>
                                                </thead>
                                                <tbody>
                                                   {menstrualCycles.map((c: any) => (
                                                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                                                         <td className="py-2 px-3 font-medium text-slate-700">{new Date(c.period_start_date).toLocaleDateString('es-ES')}</td>
                                                         <td className="py-2 px-3 text-slate-600">{c.period_end_date ? new Date(c.period_end_date).toLocaleDateString('es-ES') : '-'}</td>
                                                         <td className="py-2 px-3">
                                                            {c.cycle_length ? (
                                                               <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${Math.abs(c.cycle_length - 28) <= 3 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                                  }`}>{c.cycle_length} días</span>
                                                            ) : '-'}
                                                         </td>
                                                         <td className="py-2 px-3 text-xs text-slate-500">{c.notes || '-'}</td>
                                                      </tr>
                                                   ))}
                                                </tbody>
                                             </table>
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>
                  )
               }

               {/* --- PROGRAM TAB CONTENT --- */}
               {
                  activeTab === 'program' && (
                     <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Sub-tabs for Program */}
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                           <button
                              onClick={() => setProgramSubTab('renovaciones')}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${programSubTab === 'renovaciones' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                           >
                              <span className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> Renovaciones</span>
                           </button>
                           <button
                              onClick={() => setProgramSubTab('camino_exito')}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${programSubTab === 'camino_exito' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                           >
                              <span className="flex items-center gap-2"><Rocket className="w-4 h-4" /> Camino al Éxito</span>
                           </button>
                           <button
                              onClick={() => setProgramSubTab('objetivos')}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${programSubTab === 'objetivos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                           >
                              <span className="flex items-center gap-2"><Target className="w-4 h-4" /> Objetivos</span>
                           </button>
                           <button
                              onClick={() => setProgramSubTab('testimonios')}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${programSubTab === 'testimonios' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                           >
                              <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Testimonios</span>
                           </button>
                        </div>

                        {/* Renovaciones Sub-tab */}
                        {programSubTab === 'renovaciones' && (
                           <div className="space-y-4">
                              {/* Button to jump to process view */}
                              <div className="flex justify-end">
                                 <button
                                    onClick={() => {
                                       setActiveTab('seguimiento');
                                       setSeguimientoSubTab('dashboard');
                                    }}
                                    className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                 >
                                    <BarChart3 className="w-4 h-4" />
                                    Ver ficha del proceso completa
                                 </button>
                              </div>
                              <RenewalTimeline
                                 client={client}
                                 formData={formData}
                                 isEditing={isEditing}
                                 paymentLinks={paymentLinks}
                                 paymentMethods={paymentMethods}
                                 onUpdate={updateField}
                                 onAutoActivate={async (phase: string) => {
                                    await handleAutoActivateRenewal(phase);
                                 }}
                              />
                           </div>
                        )}

                        {programSubTab === 'camino_exito' && (
                           <div className="space-y-6">
                              <SuccessCompass
                                 client={formData}
                                 onViewRoadmap={() => {
                                    document.getElementById('roadmap-editor-section')?.scrollIntoView({ behavior: 'smooth' });
                                 }}
                                 onEditMilestones={() => {
                                    roadmapEditorRef.current?.goToStep(5);
                                    setTimeout(() => {
                                       document.getElementById('roadmap-editor-section')?.scrollIntoView({ behavior: 'smooth' });
                                    }, 100);
                                 }}
                              />
                              <div id="roadmap-editor-section">
                                 <SuccessRoadmapEditor
                                    ref={roadmapEditorRef}
                                    client={formData}
                                    onUpdate={(updatedClient) => {
                                       setFormData(prev => ({ ...prev, ...updatedClient }));
                                    }}
                                 />
                              </div>
                           </div>
                        )}

                        {/* Objetivos Sub-tab */}
                        {programSubTab === 'objetivos' && (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                              <div className="space-y-4">
                                 <SectionTitle title="Motivación" icon={<Target className="w-4 h-4 text-indigo-500" />} />
                                 <div className="bg-gradient-to-br from-indigo-50 to-purple-50/30 p-5 rounded-2xl border border-indigo-100/80 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/30 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                    <div className="relative z-10 space-y-4">
                                       <DataField label="Motivo Confianza" value={formData.goals.motivation} path="goals.motivation" isTextArea isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                       <DataField label="Notas Adicionales" value={formData.general_notes} path="general_notes" isTextArea isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                       <DataField label="Recordatorio 24h" value={formData.nutrition.lastRecallMeal} path="nutrition.lastRecallMeal" isTextArea isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                    </div>
                                 </div>
                              </div>

                              <div className="space-y-4">
                                 <SectionTitle title="Objetivos Temporales (Largo Plazo)" icon={<Clock className="w-4 h-4 text-green-500" />} />

                                 {/* Visual Timeline */}
                                 <div className="bg-gradient-to-br from-slate-50 to-green-50/20 p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-100/20 rounded-full blur-3xl -mr-10 -mt-10"></div>

                                    {/* Timeline visual header */}
                                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                       <div className="flex items-center gap-4">
                                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                                             <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm"></div> Pendiente
                                          </div>
                                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                                             <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div> Conseguido
                                          </div>
                                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                                             <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></div> No Conseguido
                                          </div>
                                       </div>
                                    </div>

                                    <div className="relative z-10 space-y-0">
                                       {/* 3 Meses */}
                                       <div className="relative pl-10 pb-8">
                                          <div className={`absolute left-0 top-1 w-7 h-7 rounded-full flex items-center justify-center z-10 shadow-sm border-2 border-white ${formData.goals.goal_3_months_status === 'achieved' ? 'bg-emerald-500 text-white' :
                                             formData.goals.goal_3_months_status === 'failed' ? 'bg-red-400 text-white' :
                                                'bg-amber-400 text-white'
                                             }`}>
                                             {formData.goals.goal_3_months_status === 'achieved' ? <CheckCircle2 className="w-4 h-4" /> :
                                                formData.goals.goal_3_months_status === 'failed' ? <X className="w-4 h-4" /> :
                                                   <Clock className="w-4 h-4" />}
                                          </div>
                                          <div className="absolute left-[13px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-slate-300 to-slate-200"></div>
                                          <div className="bg-white/80 p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                             <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                   <span className="text-lg">🎯</span> Objetivo 3 Meses
                                                </span>
                                                <DataField
                                                   label=""
                                                   value={formData.goals.goal_3_months_status || 'pending'}
                                                   path="goals.goal_3_months_status"
                                                   type="select"
                                                   options={[
                                                      { label: '⏳ Pendiente', value: 'pending' },
                                                      { label: '✅ Conseguido', value: 'achieved' },
                                                      { label: '❌ No Conseguido', value: 'failed' }
                                                   ]}
                                                   isEditing={isEditing}
                                                   onUpdate={updateField}
                                                   className="!mb-0 w-36"
                                                />
                                             </div>
                                             <DataField label="" value={formData.goals.goal_3_months} path="goals.goal_3_months" isTextArea isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                          </div>
                                       </div>

                                       {/* 6 Meses */}
                                       <div className="relative pl-10 pb-8">
                                          <div className={`absolute left-0 top-1 w-7 h-7 rounded-full flex items-center justify-center z-10 shadow-sm border-2 border-white ${formData.goals.goal_6_months_status === 'achieved' ? 'bg-emerald-500 text-white' :
                                             formData.goals.goal_6_months_status === 'failed' ? 'bg-red-400 text-white' :
                                                'bg-amber-400 text-white'
                                             }`}>
                                             {formData.goals.goal_6_months_status === 'achieved' ? <CheckCircle2 className="w-4 h-4" /> :
                                                formData.goals.goal_6_months_status === 'failed' ? <X className="w-4 h-4" /> :
                                                   <Clock className="w-4 h-4" />}
                                          </div>
                                          <div className="absolute left-[13px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-slate-300 to-slate-200"></div>
                                          <div className="bg-white/80 p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                             <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                   <span className="text-lg">🚀</span> Objetivo 6 Meses
                                                </span>
                                                <DataField
                                                   label=""
                                                   value={formData.goals.goal_6_months_status || 'pending'}
                                                   path="goals.goal_6_months_status"
                                                   type="select"
                                                   options={[
                                                      { label: '⏳ Pendiente', value: 'pending' },
                                                      { label: '✅ Conseguido', value: 'achieved' },
                                                      { label: '❌ No Conseguido', value: 'failed' }
                                                   ]}
                                                   isEditing={isEditing}
                                                   onUpdate={updateField}
                                                   className="!mb-0 w-36"
                                                />
                                             </div>
                                             <DataField label="" value={formData.goals.goal_6_months} path="goals.goal_6_months" isTextArea isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                          </div>
                                       </div>

                                       {/* 1 Año */}
                                       <div className="relative pl-10">
                                          <div className={`absolute left-0 top-1 w-7 h-7 rounded-full flex items-center justify-center z-10 shadow-sm border-2 border-white ${formData.goals.goal_1_year_status === 'achieved' ? 'bg-emerald-500 text-white' :
                                             formData.goals.goal_1_year_status === 'failed' ? 'bg-red-400 text-white' :
                                                'bg-amber-400 text-white'
                                             }`}>
                                             {formData.goals.goal_1_year_status === 'achieved' ? <CheckCircle2 className="w-4 h-4" /> :
                                                formData.goals.goal_1_year_status === 'failed' ? <X className="w-4 h-4" /> :
                                                   <Clock className="w-4 h-4" />}
                                          </div>
                                          <div className="bg-white/80 p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                             <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                   <span className="text-lg">🏆</span> Objetivo 1 Año
                                                </span>
                                                <DataField
                                                   label=""
                                                   value={formData.goals.goal_1_year_status || 'pending'}
                                                   path="goals.goal_1_year_status"
                                                   type="select"
                                                   options={[
                                                      { label: '⏳ Pendiente', value: 'pending' },
                                                      { label: '✅ Conseguido', value: 'achieved' },
                                                      { label: '❌ No Conseguido', value: 'failed' }
                                                   ]}
                                                   isEditing={isEditing}
                                                   onUpdate={updateField}
                                                   className="!mb-0 w-36"
                                                />
                                             </div>
                                             <DataField label="" value={formData.goals.goal_1_year} path="goals.goal_1_year" isTextArea isEditing={isEditing} onUpdate={updateField} onQuickSave={handleQuickSave} />
                                          </div>
                                       </div>
                                    </div>
                                 </div>

                              </div>
                           </div>
                        )}

                        {/* Testimonios Sub-tab */}
                        {programSubTab === 'testimonios' && (
                           <ClientTestimonialManager
                              client={client}
                              currentUser={currentUser!}
                           />
                        )}
                     </div>
                  )
               }

               {/* --- CHECKINS SECTION (now part of Overview) --- */}
               {
                  activeTab === 'overview' && checkins.length > 0 && (
                     <div id="checkins-section" className="space-y-8 mt-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="border-t border-slate-200 pt-8">
                           <SectionTitle title="Últimos Check-ins" icon={<FileText className="w-4 h-4 text-indigo-600" />} className="mb-6" />
                        </div>

                        {/* Weight Chart for Reports */}
                        {weightHistory.length > 0 && (
                           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                              <div className="flex items-center justify-between mb-6">
                                 <div>
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                       <TrendingUp className="w-5 h-5 text-blue-600" /> Progreso de Peso
                                    </h3>
                                    <p className="text-sm text-slate-500">Evolución registrada desde {new Date(weightHistory[0].date).toLocaleDateString('es-ES')}</p>
                                 </div>
                                 <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                                    Actual: {weightHistory[weightHistory.length - 1]?.weight} kg
                                 </div>
                              </div>
                              <div className="h-64 w-full">
                                 <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={
                                       weightHistory.map(w => ({
                                          date: new Date(w.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                                          fullDate: w.date,
                                          weight: w.weight
                                       }))
                                    }>
                                       <defs>
                                          <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                             <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                             <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                          </linearGradient>
                                       </defs>
                                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                       <XAxis
                                          dataKey="date"
                                          tick={{ fontSize: 11, fill: '#64748b' }}
                                          tickLine={false}
                                          axisLine={false}
                                          dy={10}
                                       />
                                       <YAxis
                                          domain={['dataMin - 1', 'dataMax + 1']}
                                          hide={false}
                                          axisLine={false}
                                          tickLine={false}
                                          tick={{ fontSize: 11, fill: '#64748b' }}
                                          width={30}
                                       />
                                       <Tooltip
                                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                          labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                       />
                                       <Area
                                          type="linear"
                                          dataKey="weight"
                                          stroke="#2563eb"
                                          strokeWidth={3}
                                          fillOpacity={1}
                                          fill="url(#colorWeight)"
                                          activeDot={{ r: 6, strokeWidth: 0 }}
                                       />
                                    </AreaChart>
                                 </ResponsiveContainer>
                              </div>
                           </div>
                        )}


                     </div>
                  )
               }

               {/* --- MATERIALS TAB CONTENT --- */}
               {activeTab === 'performance' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <PerformanceReviewDashboard
                        client={formData}
                        checkins={checkins}
                        weeklyReviews={weeklyReviews}
                        monthlyReviews={monthlyReviews}
                        quarterlyReviews={quarterlyReviews}
                        weightHistory={weightHistory}
                        stepsHistory={stepsHistory}
                        isCoach={isCoach}
                     />
                  </div>
               )}
               {activeTab === 'materials' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="flex items-center justify-between mb-6">
                        <SectionTitle title="Materiales y Recursos" icon={<FileText className="w-4 h-4 text-violet-500" />} />
                        <div className="bg-violet-50 text-violet-700 px-3 py-1 rounded-full text-xs font-bold border border-violet-100">
                           Espacio Compartido
                        </div>
                     </div>
                     <div className="bg-white/50 p-1 rounded-2xl border border-slate-100 shadow-sm">
                        <ClientMaterials
                           clientId={client.id}
                           currentUser={currentUser}
                        />
                     </div>
                  </div>
               )}

               {/* --- CONTRACT TAB --- */}
               {
                  activeTab === 'contract' && (() => {
                     const program = formData.program || {} as any;
                     const meses = getMesesList();

                     // Contract field values with defaults
                     const contractDate = program.contract_date || '';
                     const parsedDate = contractDate ? new Date(contractDate + 'T00:00:00') : null;
                     const cDia = parsedDate ? parsedDate.getDate().toString() : '';
                     const cMes = parsedDate ? meses[parsedDate.getMonth()] : '';
                     const cAno = parsedDate ? parsedDate.getFullYear().toString() : '';
                     const cNombre = `${formData.firstName || ''} ${formData.surname || ''}`.trim();
                     const cDni = formData.idNumber || '';
                     const cDomicilio = formData.address || '';
                     const cDuracionMeses = formData.program_duration_months || 3;
                     const cDuracionDias = calculateDaysFromMonths(cDuracionMeses);
                     const cImporte = program.contract_amount || 0;
                     const cFinPlazos = program.contract_financing_installments || 0;
                     const cFinImporte = program.contract_financing_amount || 0;

                     const contractData: ContractData = {
                        fechaDia: cDia || '____',
                        fechaMes: cMes || '________',
                        fechaAno: cAno || '202_',
                        nombreCliente: cNombre,
                        dniCliente: cDni,
                        domicilioCliente: cDomicilio,
                        duracionMeses: cDuracionMeses,
                        duracionDias: cDuracionDias,
                        importe: cImporte,
                        financiacionPlazos: cFinPlazos,
                        financiacionImporte: cFinImporte
                     };

                     const contractHTML = generateContractHTML(contractData);

                     const handleContractFieldSave = async (updates: Partial<Client>) => {
                        const updatedData = { ...formData, ...updates };
                        setFormData(updatedData);
                        try {
                           await onSave(updatedData);
                           toast.success('Contrato actualizado');
                        } catch {
                           toast.error('Error al guardar');
                        }
                     };

                     const handleProgramFieldSave = async (field: string, value: any) => {
                        const updatedData = {
                           ...formData,
                           program: { ...formData.program, [field]: value }
                        };
                        setFormData(updatedData);
                        try {
                           await onSave(updatedData);
                        } catch {
                           toast.error('Error al guardar');
                        }
                     };

                     const handleSaveToHistory = async () => {
                        if (!formData.program?.contract_signed) {
                           toast.error('El contrato no está firmado');
                           return;
                        }
                        try {
                           await saveContractToHistory({
                              client_id: formData.id,
                              contract_date: contractDate,
                              duration_months: cDuracionMeses,
                              duration_days: cDuracionDias,
                              amount: cImporte,
                              financing_installments: cFinPlazos,
                              financing_amount: cFinImporte,
                              client_name: cNombre,
                              client_dni: cDni,
                              client_address: cDomicilio,
                              contract_html: contractHTML,
                              signature_image: program.contract_signature_image || '',
                              signed_at: program.contract_signed_at || new Date().toISOString()
                           });
                           const updated = await getContractHistory(formData.id);
                           setContractHistory(updated);
                           toast.success('Contrato guardado en historial');
                        } catch {
                           toast.error('Error al guardar en historial');
                        }
                     };

                     const handleDeleteHistory = async (id: string) => {
                        if (!window.confirm('¿Eliminar este contrato del historial?')) return;
                        try {
                           await deleteContractFromHistory(id);
                           setContractHistory(prev => prev.filter(c => c.id !== id));
                           toast.success('Contrato eliminado del historial');
                        } catch {
                           toast.error('Error al eliminar');
                        }
                     };

                     const handleResetSignature = async () => {
                        if (!window.confirm('¿Limpiar la firma actual? El cliente tendrá que firmar de nuevo.\n\nSi el contrato actual está firmado, se guardará automáticamente en el historial.')) return;

                        // Auto-save to history if currently signed
                        if (formData.program?.contract_signed && formData.program?.contract_signature_image) {
                           try {
                              await saveContractToHistory({
                                 client_id: formData.id,
                                 contract_date: contractDate,
                                 duration_months: cDuracionMeses,
                                 duration_days: cDuracionDias,
                                 amount: cImporte,
                                 financing_installments: cFinPlazos,
                                 financing_amount: cFinImporte,
                                 client_name: cNombre,
                                 client_dni: cDni,
                                 client_address: cDomicilio,
                                 contract_html: contractHTML,
                                 signature_image: program.contract_signature_image || '',
                                 signed_at: program.contract_signed_at || new Date().toISOString()
                              });
                              const updated = await getContractHistory(formData.id);
                              setContractHistory(updated);
                           } catch (e) {
                              console.error('Error auto-saving to history:', e);
                           }
                        }

                        const updatedProgram = {
                           ...formData.program,
                           contract_signed: false,
                           contract_signed_at: null,
                           contract_signature_image: null
                        };
                        const updatedData = { ...formData, program: updatedProgram };
                        setFormData(updatedData);
                        try {
                           await onSave(updatedData);
                           toast.success('Firma reseteada. El cliente ya puede firmar de nuevo.');
                        } catch {
                           toast.error('Error al resetear la firma');
                        }
                     };

                     return (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                           {/* Header */}
                           <div className="flex justify-between items-center">
                              <SectionTitle title="Contrato de Prestación de Servicios" icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} />
                              <div className="flex items-center gap-3 no-print">
                                 <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all text-sm font-bold shadow-lg shadow-slate-900/20 group"
                                 >
                                    <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    Imprimir / PDF
                                 </button>
                              </div>
                           </div>

                           {/* Signed Status */}
                           {formData.program?.contract_signed && (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between no-print">
                                 <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                    <div>
                                       <p className="font-bold text-emerald-900 text-sm">Contrato Firmado</p>
                                       <p className="text-xs text-emerald-700">
                                          {formData.program?.contract_signed_at
                                             ? `Firmado el ${new Date(formData.program.contract_signed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                             : 'Fecha no registrada'}
                                       </p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <button onClick={handleSaveToHistory} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-bold transition-colors">
                                       <History className="w-3 h-3" /> Guardar en Historial
                                    </button>
                                    <button onClick={handleResetSignature} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-bold border border-red-200 transition-colors">
                                       <RotateCcw className="w-3 h-3" /> Nueva Firma
                                    </button>
                                 </div>
                              </div>
                           )}

                           {/* === EDITABLE FIELDS === */}
                           <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm no-print space-y-5">
                              <div className="flex items-center justify-between">
                                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Datos del Contrato</h4>
                                 {/* Visibility Toggle */}
                                 <button
                                    onClick={async () => {
                                       const newVal = !formData.program?.contract_visible_to_client;
                                       await handleProgramFieldSave('contract_visible_to_client', newVal);
                                       toast.success(newVal ? 'Contrato visible para el cliente' : 'Contrato oculto para el cliente');
                                    }}
                                    disabled={readOnly}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${formData.program?.contract_visible_to_client
                                       ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                       : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                       } disabled:opacity-50`}
                                 >
                                    {formData.program?.contract_visible_to_client ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    {formData.program?.contract_visible_to_client ? 'Visible al cliente' : 'Oculto al cliente'}
                                 </button>
                              </div>

                              {/* Row 1: Date */}
                              <div>
                                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Fecha del contrato</label>
                                 <input
                                    type="date"
                                    value={program.contract_date || ''}
                                    onChange={(e) => setFormData({ ...formData, program: { ...formData.program, contract_date: e.target.value } })}
                                    onBlur={() => handleProgramFieldSave('contract_date', formData.program?.contract_date)}
                                    disabled={readOnly}
                                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-full max-w-xs disabled:opacity-50"
                                 />
                              </div>

                              {/* Row 2: Client Data */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Nombre completo</label>
                                    <input
                                       type="text"
                                       value={`${formData.firstName || ''} ${formData.surname || ''}`.trim()}
                                       onChange={(e) => {
                                          const parts = e.target.value.split(' ');
                                          const first = parts[0] || '';
                                          const rest = parts.slice(1).join(' ');
                                          setFormData({ ...formData, firstName: first, surname: rest });
                                       }}
                                       onBlur={() => handleContractFieldSave({ firstName: formData.firstName, surname: formData.surname })}
                                       disabled={readOnly}
                                       className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                                    />
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">DNI / NIE</label>
                                    <input
                                       type="text"
                                       value={formData.idNumber || ''}
                                       onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                                       onBlur={() => handleContractFieldSave({ idNumber: formData.idNumber })}
                                       disabled={readOnly}
                                       placeholder="12345678X"
                                       className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                                    />
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Domicilio</label>
                                    <input
                                       type="text"
                                       value={formData.address || ''}
                                       onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                       onBlur={() => handleContractFieldSave({ address: formData.address })}
                                       disabled={readOnly}
                                       placeholder="Calle, Ciudad, CP"
                                       className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                                    />
                                 </div>
                              </div>

                              {/* Row 3: Duration & Amount */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                 <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Duración (meses)</label>
                                    <select
                                       value={formData.program_duration_months || 3}
                                       onChange={(e) => {
                                          const val = parseInt(e.target.value);
                                          setFormData({ ...formData, program_duration_months: val });
                                       }}
                                       onBlur={() => handleContractFieldSave({ program_duration_months: formData.program_duration_months })}
                                       disabled={readOnly}
                                       className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                                    >
                                       {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(m => (
                                          <option key={m} value={m}>{m} {m === 1 ? 'mes' : 'meses'} ({calculateDaysFromMonths(m)} días)</option>
                                       ))}
                                    </select>
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Importe total (EUR)</label>
                                    <div className="relative">
                                       <input
                                          type="number"
                                          value={program.contract_amount || ''}
                                          onChange={(e) => setFormData({ ...formData, program: { ...formData.program, contract_amount: parseFloat(e.target.value) || 0 } })}
                                          onBlur={() => handleProgramFieldSave('contract_amount', formData.program?.contract_amount)}
                                          disabled={readOnly}
                                          placeholder="2197"
                                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 pr-8 disabled:opacity-50"
                                       />
                                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">€</span>
                                    </div>
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">N° plazos</label>
                                    <select
                                       value={program.contract_financing_installments || 0}
                                       onChange={(e) => setFormData({ ...formData, program: { ...formData.program, contract_financing_installments: parseInt(e.target.value) } })}
                                       onBlur={() => handleProgramFieldSave('contract_financing_installments', formData.program?.contract_financing_installments)}
                                       disabled={readOnly}
                                       className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                                    >
                                       <option value={0}>Pago único</option>
                                       {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                          <option key={n} value={n}>{n} plazos</option>
                                       ))}
                                    </select>
                                 </div>
                                 {(program.contract_financing_installments || 0) > 1 && (
                                    <div>
                                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Importe por plazo (EUR)</label>
                                       <div className="relative">
                                          <input
                                             type="number"
                                             value={program.contract_financing_amount || ''}
                                             onChange={(e) => setFormData({ ...formData, program: { ...formData.program, contract_financing_amount: parseFloat(e.target.value) || 0 } })}
                                             onBlur={() => handleProgramFieldSave('contract_financing_amount', formData.program?.contract_financing_amount)}
                                             disabled={readOnly}
                                             placeholder="732"
                                             className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 pr-8 disabled:opacity-50"
                                          />
                                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">€</span>
                                       </div>
                                    </div>
                                 )}
                              </div>

                              {/* Not signed - show reset button */}
                              {!formData.program?.contract_signed && (
                                 <p className="text-xs text-amber-600 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> El cliente aún no ha firmado este contrato.
                                 </p>
                              )}
                           </div>

                           {/* === CONTRACT PREVIEW === */}
                           <div id="contract-document" className="bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-8 shadow-lg shadow-slate-200/50 print:p-0 print:border-none print:shadow-none max-w-4xl mx-auto relative overflow-hidden">
                              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 opacity-80"></div>
                              <div className="prose prose-slate prose-sm max-w-none text-justify leading-relaxed">
                                 <div dangerouslySetInnerHTML={{ __html: contractHTML }} />

                                 {/* Signatures */}
                                 <div className="mt-12 grid grid-cols-2 gap-12">
                                    <div className="text-center space-y-4">
                                       <div className="h-32 border-b border-slate-300 flex items-center justify-center p-2">
                                          <img src="/firma_victor.png" alt="Firma Dr. Víctor Bravo" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                                       </div>
                                       <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Empresa (Sello/Firma)</p>
                                    </div>
                                    <div className="text-center space-y-4">
                                       <div className="h-32 border-b border-slate-300 flex items-center justify-center p-2">
                                          {formData.program?.contract_signature_image ? (
                                             <img src={formData.program.contract_signature_image} alt="Firma del Cliente" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                                          ) : (
                                             <span className="text-xs italic text-slate-400">Pendiente de Firma</span>
                                          )}
                                       </div>
                                       <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Cliente (Firma Digital)</p>
                                       {formData.program?.contract_signed && (
                                          <p className="text-[10px] text-slate-400 mt-1">
                                             FIRMADO ELECTRONICAMENTE POR {formData.firstName} {formData.surname}<br />
                                             {formData.program?.contract_signed_at || 'Fecha no registrada'}
                                          </p>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           </div>

                           {/* === CONTRACT HISTORY === */}
                           <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm no-print">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                 <History className="w-4 h-4" /> Contratos Anteriores
                              </h4>
                              {isLoadingHistory ? (
                                 <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                 </div>
                              ) : contractHistory.length === 0 ? (
                                 <p className="text-sm text-slate-400 italic py-4 text-center">No hay contratos anteriores guardados.</p>
                              ) : (
                                 <div className="space-y-2">
                                    {contractHistory.map((record) => (
                                       <div key={record.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                          <div className="flex items-center gap-3">
                                             <FileCheck className="w-5 h-5 text-emerald-500" />
                                             <div>
                                                <p className="text-sm font-bold text-slate-800">
                                                   Contrato {record.contract_date ? new Date(record.contract_date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Sin fecha'}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                   {record.duration_months} meses — {record.amount ? `${record.amount.toLocaleString('es-ES')}€` : '0€'}
                                                   {record.signed_at && ` — Firmado ${new Date(record.signed_at).toLocaleDateString('es-ES')}`}
                                                </p>
                                             </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                             <button
                                                onClick={() => {
                                                   const w = window.open('', '_blank');
                                                   if (w) {
                                                      w.document.write(`<!DOCTYPE html><html><head><title>Contrato</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;font-size:13px;line-height:1.6;text-align:justify}h2,h3{text-align:center}img{max-width:150px}</style></head><body>${record.contract_html}<div style="display:flex;justify-content:space-around;margin-top:60px"><div style="text-align:center"><img src="/firma_victor.png" /><p><small>Empresa (Sello/Firma)</small></p></div><div style="text-align:center">${record.signature_image ? `<img src="${record.signature_image}" />` : '<p>Sin firma</p>'}<p><small>Cliente (Firma Digital)</small></p></div></div></body></html>`);
                                                      w.document.close();
                                                   }
                                                }}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium transition-colors"
                                             >
                                                <Eye className="w-3 h-3" /> Ver
                                             </button>
                                             <button
                                                onClick={() => handleDeleteHistory(record.id)}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium border border-red-200 transition-colors"
                                             >
                                                <XCircle className="w-3 h-3" /> Eliminar
                                             </button>
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              )}
                           </div>
                        </div>
                     );
                  })()
               }

            </div>{/* End of relative z-10 wrapper */}
         </div >
      </div >
   );
};

export default ClientDetail;

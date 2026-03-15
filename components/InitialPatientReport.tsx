import React from 'react';
import { Client } from '../types';
import {
  Heart, Utensils, Dumbbell, Target, Ruler, Pill,
  Droplets, Activity, Scale, Clock, AlertTriangle,
  Apple, Wine, Sandwich, ChefHat, Syringe
} from 'lucide-react';

interface InitialPatientReportProps {
  client: Client;
}

function InfoField({ label, value, icon }: { label: string; value: string | number | boolean | undefined | null; icon?: React.ReactNode }) {
  const displayVal = value === undefined || value === null || value === ''
    ? 'No indicado'
    : typeof value === 'boolean'
      ? (value ? 'Sí' : 'No')
      : String(value);

  const isEmpty = displayVal === 'No indicado';

  return (
    <div className="flex items-start gap-2">
      {icon && <div className="mt-0.5 text-slate-400 shrink-0">{icon}</div>}
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={`text-sm leading-relaxed ${isEmpty ? 'text-slate-300 italic' : 'text-slate-800'}`}>{displayVal}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, icon, color }: { title: string; icon: React.ReactNode; color: string }) {
  return (
    <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-slate-100`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-800 uppercase tracking-wide">{title}</h3>
    </div>
  );
}

const InitialPatientReport: React.FC<InitialPatientReportProps> = ({ client }) => {
  const m = client.medical || {} as any;
  const n = client.nutrition || {} as any;
  const t = client.training || {} as any;
  const g = client.goals || {} as any;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold">Informe Inicial del Paciente</h2>
        <p className="text-indigo-100 text-sm mt-1">
          {client.firstName} {client.surname} &middot; {client.age ? `${client.age} años` : ''} {client.gender ? `· ${client.gender}` : ''}
        </p>
        <div className="flex flex-wrap gap-4 mt-4 text-xs">
          <span className="bg-white/20 px-3 py-1 rounded-full">Alta: {client.registration_date ? new Date(client.registration_date).toLocaleDateString('es-ES') : 'N/D'}</span>
          <span className="bg-white/20 px-3 py-1 rounded-full">Coach: {client.property_coach || client.coach_id || 'N/D'}</span>
          {client.email && <span className="bg-white/20 px-3 py-1 rounded-full">{client.email}</span>}
          {client.phone && <span className="bg-white/20 px-3 py-1 rounded-full">{client.phone}</span>}
        </div>
      </div>

      {/* MEDIDAS CORPORALES */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <SectionHeader title="Medidas Corporales" icon={<Ruler className="w-5 h-5 text-blue-600" />} color="bg-blue-50" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-blue-700">{client.height || '—'}</p>
            <p className="text-[10px] font-bold text-blue-500 uppercase">Altura (cm)</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-blue-700">{client.initial_weight || client.current_weight || '—'}</p>
            <p className="text-[10px] font-bold text-blue-500 uppercase">Peso Inicial (kg)</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-blue-700">{client.target_weight || '—'}</p>
            <p className="text-[10px] font-bold text-blue-500 uppercase">Peso Objetivo (kg)</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-blue-700">{client.abdominal_perimeter || '—'}</p>
            <p className="text-[10px] font-bold text-blue-500 uppercase">Perímetro Abdominal (cm)</p>
          </div>
        </div>
        {(client.arm_perimeter || client.thigh_perimeter) && (
          <div className="grid grid-cols-2 gap-4 mt-3">
            <InfoField label="Perímetro Brazo (cm)" value={client.arm_perimeter} />
            <InfoField label="Perímetro Muslo (cm)" value={client.thigh_perimeter} />
          </div>
        )}
      </div>

      {/* DATOS MÉDICOS */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <SectionHeader title="Historial Médico" icon={<Heart className="w-5 h-5 text-red-500" />} color="bg-red-50" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <InfoField label="Tipo de Diabetes" value={m.diabetesType} icon={<Droplets className="w-4 h-4" />} />
          <InfoField label="Años diagnosticado" value={m.yearsDiagnosed} />
          <InfoField label="Última HbA1c" value={m.lastHba1c} icon={<Activity className="w-4 h-4" />} />
          <InfoField label="HbA1c Inicial" value={m.initialHba1c} />
          <InfoField label="Glucosa en Ayunas (actual)" value={m.glucoseFastingCurrent} />
          <InfoField label="Glucosa en Ayunas (inicial)" value={m.glucoseFastingInitial} />
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <InfoField label="Usa Insulina" value={m.insulin} icon={<Syringe className="w-4 h-4" />} />
          <InfoField label="Marca de Insulina" value={m.insulinBrand} />
          <InfoField label="Dosis de Insulina" value={m.insulinDose} />
          <InfoField label="Hora de Inyección" value={m.insulinTime} />
          <InfoField label="Usa Sensor FreeStyle" value={m.useSensor} />
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 space-y-4">
          <InfoField label="Enfermedades / Patologías" value={m.pathologies} icon={<AlertTriangle className="w-4 h-4" />} />
          <InfoField label="Medicación Diaria" value={m.medication} icon={<Pill className="w-4 h-4" />} />
          <InfoField label="Otras Enfermedades / Condicionantes" value={m.otherConditions} />
        </div>
      </div>

      {/* NUTRICIÓN */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <SectionHeader title="Nutrición y Alimentación" icon={<Utensils className="w-5 h-5 text-orange-500" />} color="bg-orange-50" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <InfoField label="Alergias / Intolerancias" value={n.allergies} icon={<AlertTriangle className="w-4 h-4" />} />
          <InfoField label="Otras Alergias (detalle)" value={n.otherAllergies} />
          <InfoField label="Alimentos a Evitar" value={n.dislikes} />
          <InfoField label="Preferencias Dietéticas" value={n.preferences} />
          <InfoField label="Alimentos Consumidos Habitualmente" value={n.consumedFoods} icon={<Apple className="w-4 h-4" />} />
          <InfoField label="Cocina él/ella mismo/a" value={n.cooksForSelf} icon={<ChefHat className="w-4 h-4" />} />
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <InfoField label="Come con Pan" value={n.eatsWithBread} icon={<Sandwich className="w-4 h-4" />} />
          <InfoField label="Cantidad de Pan" value={n.breadAmount} />
          <InfoField label="Bebida en Comidas" value={n.waterIntake} />
          <InfoField label="Consumo de Alcohol" value={n.alcohol} icon={<Wine className="w-4 h-4" />} />
          <InfoField label="Número de Comidas al Día" value={n.mealsPerDay} />
          <InfoField label="Comidas Fuera por Semana" value={n.mealsOutPerWeek} />
          <InfoField label="Dispuesto/a a Pesar Comida" value={n.willingToWeighFood} icon={<Scale className="w-4 h-4" />} />
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <InfoField label="¿Tiene Antojos?" value={n.cravings} />
          <InfoField label="Tipo de Antojos" value={n.cravingsDetail} />
          <InfoField label="¿Pica entre Horas?" value={n.snacking} />
          <InfoField label="¿Qué Pica?" value={n.snackingDetail} />
          <InfoField label="TCA Diagnosticado" value={n.eatingDisorder} />
          <InfoField label="Detalle TCA" value={n.eatingDisorderDetail} />
        </div>

        {n.schedules && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Horarios de Comidas
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Desayuno', value: n.schedules.breakfast },
                { label: 'Media Mañana', value: n.schedules.morningSnack },
                { label: 'Almuerzo', value: n.schedules.lunch },
                { label: 'Merienda', value: n.schedules.afternoonSnack },
                { label: 'Cena', value: n.schedules.dinner }
              ].map(s => (
                <div key={s.label} className="bg-orange-50 rounded-lg p-2 text-center">
                  <p className="text-[10px] font-bold text-orange-600 uppercase">{s.label}</p>
                  <p className="text-sm font-semibold text-slate-700">{s.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {n.lastRecallMeal && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <InfoField label="Recordatorio 24h (última comida)" value={n.lastRecallMeal} />
          </div>
        )}

        {n.dietaryNotes && (
          <div className="mt-3">
            <InfoField label="Notas Dietéticas" value={n.dietaryNotes} />
          </div>
        )}
      </div>

      {/* ENTRENAMIENTO */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <SectionHeader title="Actividad Física y Entrenamiento" icon={<Dumbbell className="w-5 h-5 text-emerald-600" />} color="bg-emerald-50" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <InfoField label="Nivel de Actividad / Tipo de Trabajo" value={t.activityLevel} icon={<Activity className="w-4 h-4" />} />
          <InfoField label="Pasos Diarios (objetivo)" value={t.stepsGoal} />
          <InfoField label="Experiencia en Fuerza" value={t.strengthTraining} icon={<Dumbbell className="w-4 h-4" />} />
          <InfoField label="Lugar de Entrenamiento" value={t.trainingLocation} />
          <InfoField label="Disponibilidad Horaria" value={t.availability} icon={<Clock className="w-4 h-4" />} />
          <InfoField label="Lesiones / Limitaciones" value={t.injuries} icon={<AlertTriangle className="w-4 h-4" />} />
        </div>

        {t.sensations_report && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <InfoField label="Reporte de Sensaciones de Entreno" value={t.sensations_report} />
          </div>
        )}

        {t.notes && (
          <div className="mt-3">
            <InfoField label="Notas de Entrenamiento" value={t.notes} />
          </div>
        )}
      </div>

      {/* OBJETIVOS */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <SectionHeader title="Objetivos y Motivación" icon={<Target className="w-5 h-5 text-purple-600" />} color="bg-purple-50" />

        <div className="space-y-4">
          <InfoField label="Motivo de Contratación / Confianza" value={g.motivation} icon={<Target className="w-4 h-4" />} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-purple-500 uppercase mb-1">Objetivo 3 Meses</p>
              <p className="text-sm text-slate-800 leading-relaxed">{g.goal_3_months || 'No definido'}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-purple-500 uppercase mb-1">Objetivo 6 Meses</p>
              <p className="text-sm text-slate-800 leading-relaxed">{g.goal_6_months || 'No definido'}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-purple-500 uppercase mb-1">Objetivo 1 Año</p>
              <p className="text-sm text-slate-800 leading-relaxed">{g.goal_1_year || 'No definido'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* NOTAS GENERALES */}
      {(client.general_notes || client.history_food_behavior) && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <SectionHeader title="Notas Adicionales" icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} color="bg-amber-50" />
          {client.general_notes && (
            <InfoField label="Situación / Conducta Alimentaria" value={client.general_notes} />
          )}
          {client.history_food_behavior && (
            <div className="mt-3">
              <InfoField label="Historial de Conducta Alimentaria" value={client.history_food_behavior} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InitialPatientReport;

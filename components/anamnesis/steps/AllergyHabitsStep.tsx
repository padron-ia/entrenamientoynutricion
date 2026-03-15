import React from 'react';
import { ShieldAlert, Wine, Cigarette, Moon, Brain, UtensilsCrossed, Info } from 'lucide-react';

interface Props {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export function AllergyHabitsStep({ formData, updateField }: Props) {
  const tabacoOptions = ['No fumo', 'Ex fumador/a', 'Fumo ocasionalmente', 'Fumo a diario'];
  const alcoholOptions = ['No bebo', 'Ocasional (eventos)', 'Fines de semana', 'Regular'];
  const ultraprocesadosOptions = ['Nunca', 'Raramente', '1-2 veces/semana', '3-5 veces/semana', 'A diario'];
  const suenoOptions = ['Menos de 5h', '5-6h', '6-7h', '7-8h', 'Más de 8h'];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Alergias y Hábitos</h3>
        <p className="text-slate-600">Información sobre alergias, hábitos y estilo de vida</p>
      </div>

      {/* Alergias a medicamentos */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <ShieldAlert className="w-4 h-4 inline mr-1 text-red-500" />
          ¿Eres alérgico/a a algún medicamento?
        </label>
        <textarea
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
          rows={3}
          value={formData.alergias_medicamentos || ''}
          onChange={(e) => updateField('alergias_medicamentos', e.target.value)}
          placeholder="Ej: Penicilina, Ibuprofeno... Si no tienes alergias, escribe 'Ninguna'"
        />
      </div>

      {/* Alergias a alimentos */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <UtensilsCrossed className="w-4 h-4 inline mr-1 text-orange-500" />
          ¿Eres alérgico/a o intolerante a algún alimento?
        </label>
        <textarea
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
          rows={3}
          value={formData.alergias_alimentos || ''}
          onChange={(e) => updateField('alergias_alimentos', e.target.value)}
          placeholder="Ej: Gluten, lactosa, frutos secos... Si no tienes, escribe 'Ninguna'"
        />
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            Si ya indicaste tus alergias alimentarias durante el registro nutricional, esta información se heredará automáticamente. Puedes actualizarla aquí si lo necesitas.
          </p>
        </div>
      </div>

      {/* Hábito tabaco */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Cigarette className="w-4 h-4 inline mr-1 text-slate-500" />
          Consumo de tabaco
        </label>
        <select
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
          value={formData.habito_tabaco || ''}
          onChange={(e) => updateField('habito_tabaco', e.target.value)}
        >
          <option value="">Selecciona una opción</option>
          {tabacoOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {/* Consumo de alcohol */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Wine className="w-4 h-4 inline mr-1 text-purple-500" />
          Consumo de alcohol
        </label>
        <select
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
          value={formData.consumo_alcohol || ''}
          onChange={(e) => updateField('consumo_alcohol', e.target.value)}
        >
          <option value="">Selecciona una opción</option>
          {alcoholOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {/* Consumo ultraprocesados */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <UtensilsCrossed className="w-4 h-4 inline mr-1 text-amber-500" />
          Consumo de ultraprocesados
        </label>
        <select
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
          value={formData.consumo_ultraprocesados || ''}
          onChange={(e) => updateField('consumo_ultraprocesados', e.target.value)}
        >
          <option value="">Selecciona una opción</option>
          {ultraprocesadosOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {/* Horas de sueño */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Moon className="w-4 h-4 inline mr-1 text-sea-500" />
          Horas de sueño habituales
        </label>
        <select
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
          value={formData.horas_sueno || ''}
          onChange={(e) => updateField('horas_sueno', e.target.value)}
        >
          <option value="">Selecciona una opción</option>
          {suenoOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {/* Nivel de estrés */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Brain className="w-4 h-4 inline mr-1 text-rose-500" />
          Nivel de estrés percibido (1 = muy bajo, 10 = muy alto)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent-600"
            value={formData.nivel_estres || 5}
            onChange={(e) => updateField('nivel_estres', parseInt(e.target.value))}
          />
          <span className="text-lg font-bold text-accent-700 bg-accent-50 border border-accent-200 rounded-lg px-3 py-1 min-w-[48px] text-center">
            {formData.nivel_estres || 5}
          </span>
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
          <span>Muy bajo</span>
          <span>Muy alto</span>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Brain, Utensils, Moon, AlertCircle, Info } from 'lucide-react';

interface Props {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export function BehaviorDigestionStep({ formData, updateField }: Props) {
  const comerEmocionalOptions = ['Nunca', 'A veces', 'Frecuentemente', 'Siempre'];
  const episodiosAtraconOptions = ['Nunca', 'Raramente', '1-2 veces/semana', 'Más de 2 veces/semana'];
  const calidadSuenoOptions = ['Muy mala', 'Mala', 'Regular', 'Buena', 'Muy buena'];

  const showTcaDetalle = formData.episodios_atracon && formData.episodios_atracon !== 'Nunca';

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Conducta Alimentaria y Digestión</h3>
        <p className="text-slate-600">Información sobre tu relación con la comida, sueño y salud digestiva</p>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Esta sección es confidencial y nos ayuda a entender tu relación con la comida. No hay respuestas correctas o incorrectas. Sé honesto/a para que podamos ayudarte mejor.
        </p>
      </div>

      {/* Sección: Conducta Alimentaria */}
      <div className="bg-sea-50 border border-sea-100 rounded-lg p-4 mb-2">
        <h4 className="text-sm font-bold text-sea-800 flex items-center gap-2 mb-1">
          <Brain className="w-4 h-4" />
          Conducta Alimentaria
        </h4>
      </div>

      {/* Comer emocional */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Brain className="w-4 h-4 inline mr-1 text-sea-500" />
          ¿Comes de manera emocional? (por estrés, ansiedad, tristeza...)
        </label>
        <select
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
          value={formData.comer_emocional || ''}
          onChange={(e) => updateField('comer_emocional', e.target.value)}
        >
          <option value="">Selecciona una opción</option>
          {comerEmocionalOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {/* Episodios de atracón */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Utensils className="w-4 h-4 inline mr-1 text-orange-500" />
          ¿Tienes episodios de atracón? (comer en exceso sin control)
        </label>
        <select
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
          value={formData.episodios_atracon || ''}
          onChange={(e) => updateField('episodios_atracon', e.target.value)}
        >
          <option value="">Selecciona una opción</option>
          {episodiosAtraconOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {/* TCA Detalle - condicional */}
      {showTcaDetalle && (
        <div className="ml-4 border-l-4 border-orange-300 pl-4">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            <AlertCircle className="w-4 h-4 inline mr-1 text-orange-500" />
            ¿Puedes describir estos episodios?
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Cuándo suelen ocurrir, qué los desencadena, cómo te sientes después...
          </p>
          <textarea
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
            rows={3}
            value={formData.tca_detalle || ''}
            onChange={(e) => updateField('tca_detalle', e.target.value)}
            placeholder="Ej: Suelen ocurrir por las noches cuando estoy estresado/a. Normalmente como dulces o comida rápida..."
          />
        </div>
      )}

      {/* Separador */}
      <hr className="border-slate-200" />

      {/* Sección: Sueño */}
      <div className="bg-sea-50 border border-sea-100 rounded-lg p-4 mb-2">
        <h4 className="text-sm font-bold text-sea-800 flex items-center gap-2 mb-1">
          <Moon className="w-4 h-4" />
          Calidad del Sueño
        </h4>
      </div>

      {/* Calidad de sueño */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Moon className="w-4 h-4 inline mr-1 text-sea-500" />
          ¿Cómo calificas la calidad de tu sueño?
        </label>
        <select
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
          value={formData.calidad_sueno || ''}
          onChange={(e) => updateField('calidad_sueno', e.target.value)}
        >
          <option value="">Selecciona una opción</option>
          {calidadSuenoOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {/* Sueño afecta apetito */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Moon className="w-4 h-4 inline mr-1 text-sea-500" />
          ¿Notas que el sueño afecta a tu apetito?
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Por ejemplo, ¿comes más cuando duermes mal?
        </p>
        <div className="flex gap-3">
          {[
            { label: 'Sí', value: true },
            { label: 'No', value: false }
          ].map(option => (
            <label
              key={option.label}
              className={`flex items-center gap-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-all ${
                formData.sueno_afecta_apetito === option.value
                  ? 'border-accent-500 bg-accent-50'
                  : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="sueno_afecta_apetito"
                checked={formData.sueno_afecta_apetito === option.value}
                onChange={() => updateField('sueno_afecta_apetito', option.value)}
                className="w-4 h-4 text-accent-600"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Separador */}
      <hr className="border-slate-200" />

      {/* Sección: Digestión */}
      <div className="bg-green-50 border border-green-100 rounded-lg p-4 mb-2">
        <h4 className="text-sm font-bold text-green-800 flex items-center gap-2 mb-1">
          <Utensils className="w-4 h-4" />
          Salud Digestiva
        </h4>
      </div>

      {/* Problemas digestivos */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Utensils className="w-4 h-4 inline mr-1 text-green-500" />
          ¿Tienes problemas digestivos?
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Describe cualquier molestia: hinchazón, gases, estreñimiento, diarrea, reflujo, acidez, intolerancias, etc.
        </p>
        <textarea
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
          rows={4}
          value={formData.problemas_digestivos || ''}
          onChange={(e) => updateField('problemas_digestivos', e.target.value)}
          placeholder="Ej: Hinchazón frecuente después de comer, gases por las tardes, estreñimiento ocasional. Si no tienes problemas, escribe 'Ninguno'"
        />
      </div>

      {/* Final note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          <strong>Recordatorio:</strong> Toda esta información es estrictamente confidencial y solo será accesible para tu coach y el equipo médico. Nos permite diseñar un plan integral que tenga en cuenta no solo tu diabetes, sino tu bienestar general.
        </p>
      </div>
    </div>
  );
}

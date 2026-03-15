import React from 'react';
import { Heart, Brain, Bone, Pill, Info, AlertTriangle } from 'lucide-react';
import { parseIntegerFromInput } from '../../../utils/numberParsing';

interface Props {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export function MenopausalHistoryStep({ formData, updateField }: Props) {
  const renderRadioGroup = (
    field: string,
    label: string,
    description: string | null,
    icon: React.ReactNode,
    options: { label: string; value: any }[] = [
      { label: 'Sí', value: true },
      { label: 'No', value: false }
    ]
  ) => (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-2">
        {icon}
        {label}
      </label>
      {description && (
        <p className="text-xs text-slate-500 mb-2">{description}</p>
      )}
      <div className="flex gap-3">
        {options.map(option => (
          <label
            key={option.label}
            className={`flex items-center gap-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-all ${
              formData[field] === option.value
                ? 'border-accent-500 bg-accent-50'
                : 'border-slate-200'
            }`}
          >
            <input
              type="radio"
              name={field}
              checked={formData[field] === option.value}
              onChange={() => updateField(field, option.value)}
              className="w-4 h-4 text-accent-600"
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Historial Menopausia</h3>
        <p className="text-slate-600">Información sobre menopausia y salud hormonal</p>
      </div>

      {/* Info note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Si no estás en menopausia, puedes pasar al siguiente paso. Esta sección es opcional y solo aplica a mujeres en perimenopausia o menopausia.
        </p>
      </div>

      {/* Edad menopausia */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Heart className="w-4 h-4 inline mr-1 text-pink-500" />
          ¿A qué edad tuviste la menopausia?
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Si aún no has llegado a la menopausia, deja este campo vacío.
        </p>
        <input
          type="text"
          inputMode="numeric"
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
          value={formData.edad_menopausia || ''}
          onChange={(e) => updateField('edad_menopausia', e.target.value ? parseIntegerFromInput(e.target.value) : '')}
          placeholder="Ej: 50"
          min={30}
          max={65}
        />
      </div>

      {/* Síntomas menopausia */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Heart className="w-4 h-4 inline mr-1 text-pink-500" />
          ¿Qué síntomas tienes actualmente?
        </label>
        <textarea
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
          rows={3}
          value={formData.sintomas_menopausia || ''}
          onChange={(e) => updateField('sintomas_menopausia', e.target.value)}
          placeholder="Ej: Sofocos, insomnio, cambios de humor, sequedad, aumento de peso..."
        />
      </div>

      {/* Osteoporosis */}
      {renderRadioGroup(
        'osteoporosis',
        'Osteoporosis',
        '¿Te han diagnosticado osteoporosis u osteopenia?',
        <Bone className="w-4 h-4 inline mr-1 text-slate-500" />
      )}

      {/* Niebla mental */}
      {renderRadioGroup(
        'niebla_mental',
        'Niebla mental',
        '¿Sufres de niebla mental o falta de concentración?',
        <Brain className="w-4 h-4 inline mr-1 text-sea-500" />
      )}

      {/* Candidata THM */}
      {renderRadioGroup(
        'candidata_thm',
        'Terapia Hormonal de la Menopausia (THM)',
        '¿Eres candidata o estás actualmente en Terapia Hormonal de la Menopausia (THM)?',
        <Pill className="w-4 h-4 inline mr-1 text-blue-500" />,
        [
          { label: 'Sí', value: true },
          { label: 'No', value: false },
          { label: 'No sé', value: null }
        ]
      )}

      {/* Warning about THM */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          <strong>Importante:</strong> La menopausia puede afectar significativamente al control de la diabetes y la composición corporal. Toda esta información nos ayuda a adaptar tu plan de manera personalizada.
        </p>
      </div>
    </div>
  );
}

import React from 'react';
import { Heart, Activity, Scale, AlertTriangle } from 'lucide-react';

interface Props {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export function CardiovascularDiabeticStep({ formData, updateField }: Props) {
  const perdidaPesoOptions = [
    'No',
    'Sí, menos de 5kg',
    'Sí, entre 5-10kg',
    'Sí, más de 10kg'
  ];

  const renderRadioGroup = (
    field: string,
    label: string,
    description: string | null,
    icon: React.ReactNode
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
        {[{ label: 'Sí', value: true }, { label: 'No', value: false }].map(option => (
          <label
            key={option.label}
            className={`flex items-center gap-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-all ${
              formData[field] === option.value ? 'border-accent-500 bg-accent-50' : 'border-slate-200'
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
        <h3 className="text-xl font-bold text-slate-900 mb-2">Historial Cardiovascular</h3>
        <p className="text-slate-600">Información sobre tu salud cardiovascular — relevante para adaptar la intensidad del entrenamiento</p>
      </div>

      <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-2">
        <h4 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-1">
          <Heart className="w-4 h-4" />
          Historial Cardiovascular
        </h4>
        <p className="text-xs text-red-700">Marca si has sido diagnosticado/a con alguna de estas condiciones.</p>
      </div>

      {renderRadioGroup('hipertension', 'Hipertensión', '¿Te han diagnosticado hipertensión arterial?', <Heart className="w-4 h-4 inline mr-1 text-red-500" />)}
      {renderRadioGroup('dislipemia', 'Dislipemia', '¿Colesterol o triglicéridos elevados?', <Activity className="w-4 h-4 inline mr-1 text-orange-500" />)}
      {renderRadioGroup('infarto_previo', 'Infarto previo', '¿Has sufrido algún infarto de miocardio?', <Heart className="w-4 h-4 inline mr-1 text-red-600" />)}
      {renderRadioGroup('ictus_previo', 'Ictus previo', '¿Has sufrido algún ictus o accidente cerebrovascular?', <Activity className="w-4 h-4 inline mr-1 text-red-600" />)}

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Scale className="w-4 h-4 inline mr-1 text-accent-500" />
          ¿Has tenido una pérdida de peso reciente no intencionada?
        </label>
        <select
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
          value={formData.perdida_peso_reciente || ''}
          onChange={(e) => updateField('perdida_peso_reciente', e.target.value)}
        >
          <option value="">Selecciona una opción</option>
          {perdidaPesoOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          <strong>Importante:</strong> Esta información nos permite adaptar la intensidad y tipo de entrenamiento a tu estado de salud cardiovascular.
        </p>
      </div>
    </div>
  );
}

import React from 'react';
import { Heart, Activity, Calendar, Scale, AlertTriangle } from 'lucide-react';
import { parseLocalizedNumber } from '../../../utils/numberParsing';

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
    icon: React.ReactNode,
    options: { label: string; value: boolean }[] = [
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
        <h3 className="text-xl font-bold text-slate-900 mb-2">Historial Cardiovascular y Diabético</h3>
        <p className="text-slate-600">Información detallada sobre tu historial cardiovascular y diabético</p>
      </div>

      {/* Sección Cardiovascular */}
      <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-2">
        <h4 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-1">
          <Heart className="w-4 h-4" />
          Historial Cardiovascular
        </h4>
        <p className="text-xs text-red-700">Marca si has sido diagnosticado/a con alguna de estas condiciones.</p>
      </div>

      {renderRadioGroup(
        'hipertension',
        'Hipertensión',
        '¿Te han diagnosticado hipertensión arterial?',
        <Heart className="w-4 h-4 inline mr-1 text-red-500" />
      )}

      {renderRadioGroup(
        'dislipemia',
        'Dislipemia',
        '¿Colesterol o triglicéridos elevados?',
        <Activity className="w-4 h-4 inline mr-1 text-orange-500" />
      )}

      {renderRadioGroup(
        'infarto_previo',
        'Infarto previo',
        '¿Has sufrido algún infarto de miocardio?',
        <Heart className="w-4 h-4 inline mr-1 text-red-600" />
      )}

      {renderRadioGroup(
        'ictus_previo',
        'Ictus previo',
        '¿Has sufrido algún ictus o accidente cerebrovascular?',
        <Activity className="w-4 h-4 inline mr-1 text-red-600" />
      )}

      {/* Separador */}
      <hr className="border-slate-200" />

      {/* Sección Diabética */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-2">
        <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4" />
          Historial Diabético Detallado
        </h4>
        <p className="text-xs text-blue-700">Estos datos nos ayudan a personalizar tu plan al máximo.</p>
      </div>

      {/* Fecha diagnóstico */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Calendar className="w-4 h-4 inline mr-1 text-blue-500" />
          ¿En qué año te diagnosticaron diabetes?
        </label>
        <input
          type="text"
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
          value={formData.fecha_diagnostico_diabetes || ''}
          onChange={(e) => updateField('fecha_diagnostico_diabetes', e.target.value)}
          placeholder="Ej: 2018"
          maxLength={4}
        />
      </div>

      {/* Peso al diagnóstico */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Scale className="w-4 h-4 inline mr-1 text-blue-500" />
          ¿Cuánto pesabas en el momento del diagnóstico? (kg)
        </label>
        <input
          type="text"
          inputMode="decimal"
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
          value={formData.peso_al_diagnostico || ''}
          onChange={(e) => updateField('peso_al_diagnostico', e.target.value ? parseLocalizedNumber(e.target.value) : '')}
          placeholder="Ej: 85"
          min={30}
          max={300}
          step={0.1}
        />
      </div>

      {/* Pérdida de peso reciente */}
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

      {/* Sospecha LADA */}
      {renderRadioGroup(
        'sospecha_lada',
        'Sospecha de diabetes LADA',
        '¿Algún médico ha mencionado la posibilidad de diabetes LADA (autoinmune de aparición tardía)?',
        <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-500" />
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          <strong>Nota:</strong> Si te diagnosticaron diabetes tipo 2 siendo delgado/a, o si tienes mala respuesta a antidiabéticos orales, comenta esto con tu equipo médico. Podría ser LADA.
        </p>
      </div>
    </div>
  );
}

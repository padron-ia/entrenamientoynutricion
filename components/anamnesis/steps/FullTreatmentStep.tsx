import React from 'react';
import { ClipboardList, Info, AlertTriangle } from 'lucide-react';

interface Props {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export function FullTreatmentStep({ formData, updateField }: Props) {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Tratamiento Completo</h3>
        <p className="text-slate-600">Detalla toda tu medicación actual para que podamos personalizar tu plan</p>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Conocer tu medicación nos permite adaptar la nutrición y el entrenamiento correctamente. Incluye dosis y horarios siempre que sea posible.
        </p>
      </div>

      {/* Tratamiento actual completo */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <ClipboardList className="w-4 h-4 inline mr-1 text-blue-500" />
          Lista toda tu medicación actual, incluyendo suplementos
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Incluye medicamentos recetados, suplementos, vitaminas, probióticos, etc. con dosis y frecuencia.
        </p>
        <textarea
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
          rows={5}
          value={formData.tratamiento_actual_completo || ''}
          onChange={(e) => updateField('tratamiento_actual_completo', e.target.value)}
          placeholder="Ej:
- Omeprazol 20mg (1 al día, mañana)
- Eutirox 75mcg (en ayunas)
- Vitamina D 2000UI (1 al día)
- Omega 3 (1 al día con comida)
- Magnesio (antes de dormir)"
        />
      </div>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          <strong>Importante:</strong> Nunca modifiques tu medicación por tu cuenta. Cualquier ajuste debe ser supervisado por tu médico. Tu coach tendrá en cuenta esta información para personalizar tu plan.
        </p>
      </div>
    </div>
  );
}

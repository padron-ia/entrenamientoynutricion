import React from 'react';
import { Stethoscope, Scissors, Info } from 'lucide-react';

interface Props {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export function DiseaseSurgeryStep({ formData, updateField }: Props) {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Enfermedades y Cirugías Previas</h3>
        <p className="text-slate-600">Historial de enfermedades y cirugías relevantes</p>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Incluye cualquier enfermedad o cirugía relevante, aunque pienses que no está relacionada con la diabetes. Algunas condiciones pueden influir en tu plan de nutrición y entrenamiento.
        </p>
      </div>

      {/* Enfermedades previas */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Stethoscope className="w-4 h-4 inline mr-1 text-blue-500" />
          Enfermedades previas (aparte de diabetes/obesidad)
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Incluye enfermedades pasadas y actuales: tiroides, autoinmunes, respiratorias, renales, hepáticas, digestivas, psicológicas, etc.
        </p>
        <textarea
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
          rows={5}
          value={formData.enfermedades_previas || ''}
          onChange={(e) => updateField('enfermedades_previas', e.target.value)}
          placeholder="Ej: Hipotiroidismo diagnosticado en 2015, hernia discal L4-L5, ansiedad tratada con medicación..."
        />
      </div>

      {/* Cirugías previas */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          <Scissors className="w-4 h-4 inline mr-1 text-rose-500" />
          Cirugías previas
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Lista todas las cirugías que hayas tenido, incluyendo el año aproximado si lo recuerdas.
        </p>
        <textarea
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
          rows={5}
          value={formData.cirugias_previas || ''}
          onChange={(e) => updateField('cirugias_previas', e.target.value)}
          placeholder="Ej: Apendicectomía (2010), cirugía bariátrica (2019), prótesis de rodilla derecha (2022)..."
        />
      </div>

      {/* Amber note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          <strong>Nota:</strong> Si no tienes enfermedades ni cirugías previas, simplemente escribe "Ninguna" en cada campo. Es importante que lo confirmes para que tu equipo lo tenga en cuenta.
        </p>
      </div>
    </div>
  );
}

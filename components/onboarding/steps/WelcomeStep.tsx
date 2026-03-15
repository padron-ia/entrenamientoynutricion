import React from 'react';
import { Heart, Clock, Clipboard, Scale, Pill } from 'lucide-react';

export function WelcomeStep() {
    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">¡Bienvenido/a a tu nueva vida!</h2>
                <p className="text-slate-600">Estamos emocionados de acompañarte en este camino hacia una vida más saludable</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
                    <Clipboard className="w-5 h-5" />
                    Antes de empezar, ten a mano:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 bg-white p-4 rounded-lg">
                        <Clock className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <div>
                            <p className="font-bold text-slate-900">20 minutos</p>
                            <p className="text-sm text-slate-600">de tiempo sin interrupciones</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white p-4 rounded-lg">
                        <Pill className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <div>
                            <p className="font-bold text-slate-900">Tu medicación actual</p>
                            <p className="text-sm text-slate-600">nombres y dosis</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white p-4 rounded-lg">
                        <Clipboard className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <div>
                            <p className="font-bold text-slate-900">Últimos análisis</p>
                            <p className="text-sm text-slate-600">HbA1c, glucosa en ayunas</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white p-4 rounded-lg">
                        <Scale className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <div>
                            <p className="font-bold text-slate-900">Tu peso actual</p>
                            <p className="text-sm text-slate-600">en ayunas, si es posible</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                    <strong>💡 Consejo:</strong> Completa el formulario con la mayor precisión posible.
                    Estos datos permitirán a tu coach diseñar el mejor plan personalizado para ti.
                </p>
            </div>
        </div>
    );
}

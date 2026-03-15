import React from 'react';
import { Heart, ClipboardList, Clock, Shield } from 'lucide-react';

export function RegistrationWelcome() {
    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-3">Bienvenido/a a Padron Trainer</h2>
                <p className="text-slate-600 max-w-xl mx-auto">
                    Estamos encantados de que formes parte de nuestra comunidad. Este formulario nos ayudará a conocerte mejor
                    para personalizar tu experiencia al máximo.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-accent-50 border border-accent-200 rounded-xl p-5 flex gap-4">
                    <div className="w-10 h-10 bg-accent-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ClipboardList className="w-5 h-5 text-accent-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm mb-1">Datos personales y médicos</h3>
                        <p className="text-xs text-slate-600">Ten a mano tu medicación actual, valores de HbA1c y glucosa en ayunas.</p>
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Heart className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm mb-1">Medidas corporales</h3>
                        <p className="text-xs text-slate-600">Necesitarás una cinta métrica y una báscula.</p>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm mb-1">15-20 minutos</h3>
                        <p className="text-xs text-slate-600">Es el tiempo aproximado que tardarás en completar el formulario.</p>
                    </div>
                </div>

                <div className="bg-sea-50 border border-sea-200 rounded-xl p-5 flex gap-4">
                    <div className="w-10 h-10 bg-sea-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-sea-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm mb-1">Datos protegidos</h3>
                        <p className="text-xs text-slate-600">Tu información es confidencial y solo será vista por tu equipo asignado.</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
                <p className="text-sm text-slate-700">
                    Pulsa <strong>"Siguiente"</strong> para comenzar. Puedes volver atrás en cualquier momento.
                </p>
            </div>
        </div>
    );
}

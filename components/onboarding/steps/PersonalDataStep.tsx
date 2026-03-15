import React from 'react';
import { User, Phone, MapPin, Calendar } from 'lucide-react';

interface Props {
    formData: any;
    updateField: (field: string, value: any) => void;
}

export function PersonalDataStep({ formData, updateField }: Props) {
    const calculateAge = (birthDate: string) => {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const handleBirthDateChange = (date: string) => {
        updateField('birthDate', date);
        updateField('age', calculateAge(date));
    };

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Datos Personales</h3>
                <p className="text-slate-600">Información básica para tu perfil</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Nombre *
                    </label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-slate-50"
                        value={formData.firstName}
                        disabled
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Apellidos *
                    </label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-slate-50"
                        value={formData.surname}
                        disabled
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        DNI / NIE / Pasaporte *
                    </label>
                    <input
                        type="text"
                        required
                        placeholder="Ej: 12345678X"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                        value={formData.idNumber}
                        onChange={(e) => updateField('idNumber', e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Fecha de Nacimiento *
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="date"
                            required
                            className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                            value={formData.birthDate}
                            onChange={(e) => handleBirthDateChange(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Edad
                    </label>
                    <input
                        type="number"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50"
                        value={formData.age}
                        disabled
                    />
                    <p className="text-xs text-slate-500 mt-1">Calculada automáticamente</p>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Sexo *
                    </label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="gender"
                                value="Hombre"
                                checked={formData.gender === 'Hombre'}
                                onChange={(e) => updateField('gender', e.target.value)}
                                className="w-4 h-4 text-emerald-600"
                            />
                            <span>Hombre</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="gender"
                                value="Mujer"
                                checked={formData.gender === 'Mujer'}
                                onChange={(e) => updateField('gender', e.target.value)}
                                className="w-4 h-4 text-emerald-600"
                            />
                            <span>Mujer</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="gender"
                                value="Otro"
                                checked={formData.gender === 'Otro'}
                                onChange={(e) => updateField('gender', e.target.value)}
                                className="w-4 h-4 text-emerald-600"
                            />
                            <span>Otro</span>
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Teléfono *
                    </label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="tel"
                            required
                            className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-slate-50"
                            value={formData.phone}
                            disabled
                        />
                    </div>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Dirección Postal (Calle/Nº/CP) *
                    </label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            required
                            className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                            value={formData.address}
                            onChange={(e) => updateField('address', e.target.value)}
                            placeholder="Ej: Calle Mayor 123, 28001"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Población *
                    </label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                        value={formData.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        placeholder="Ej: Madrid"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Provincia *
                    </label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                        value={formData.province}
                        onChange={(e) => updateField('province', e.target.value)}
                        placeholder="Ej: Madrid"
                    />
                </div>
            </div>
        </div>
    );
}

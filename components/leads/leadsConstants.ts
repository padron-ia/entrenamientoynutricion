import { LeadStatus } from '../../types';

export const DEFAULT_SETTERS = ['Thais', 'Diana', 'Elena'];
export const DEFAULT_CLOSERS = ['Sergi', 'Yassine', 'Elena', 'Raquel'];
export const PROCEDENCIAS = ['Instagram', 'Formulario', 'WhatsApp', 'YouTube', 'TikTok', 'Otro'] as const;

export const KANBAN_COLUMNS: { id: LeadStatus; label: string; borderColor: string; bgColor: string }[] = [
    { id: 'NEW', label: 'Entrantes', borderColor: 'border-t-blue-500', bgColor: 'bg-blue-50' },
    { id: 'CONTACTED', label: 'Contactados', borderColor: 'border-t-amber-500', bgColor: 'bg-amber-50' },
    { id: 'SCHEDULED', label: 'Agendados', borderColor: 'border-t-purple-500', bgColor: 'bg-purple-50' },
    { id: 'WON', label: 'Ganados', borderColor: 'border-t-green-500', bgColor: 'bg-green-50' },
    { id: 'LOST', label: 'Descartados', borderColor: 'border-t-gray-400', bgColor: 'bg-gray-50' },
];

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string; color: string; textColor: string }[] = [
    { value: 'NEW', label: 'Nuevo', color: 'bg-blue-500', textColor: 'text-blue-600' },
    { value: 'CONTACTED', label: 'Contactado', color: 'bg-amber-500', textColor: 'text-amber-600' },
    { value: 'SCHEDULED', label: 'Agendado', color: 'bg-purple-500', textColor: 'text-purple-600' },
    { value: 'RE-SCHEDULED', label: 'Reagenda', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
    { value: 'NO_SHOW', label: 'No Show', color: 'bg-orange-500', textColor: 'text-orange-600' },
    { value: 'CANCELLED', label: 'Cancela', color: 'bg-red-400', textColor: 'text-red-500' },
    { value: 'NO_ENTRY', label: 'No Entra', color: 'bg-gray-400', textColor: 'text-gray-500' },
    { value: 'WON', label: 'Cerrado', color: 'bg-green-500', textColor: 'text-green-600' },
    { value: 'LOST', label: 'Perdido', color: 'bg-slate-400', textColor: 'text-slate-500' },
];

export const SETTER_COLORS: Record<string, { bg: string; text: string }> = {
    'Thais': { bg: 'bg-pink-100', text: 'text-pink-700' },
    'Thaïs': { bg: 'bg-pink-100', text: 'text-pink-700' },
    'Diana': { bg: 'bg-sky-100', text: 'text-sky-700' },
    'Elena': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

export const CLOSER_COLORS: Record<string, { bg: string; text: string }> = {
    'Sergi': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    'Yassine': { bg: 'bg-orange-100', text: 'text-orange-700' },
    'Elena': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    'Raquel': { bg: 'bg-violet-100', text: 'text-violet-700' },
};

export const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
    'Ads': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'Instagram': { bg: 'bg-pink-100', text: 'text-pink-700' },
    'Referido': { bg: 'bg-purple-100', text: 'text-purple-700' },
    'Formulario Web': { bg: 'bg-teal-100', text: 'text-teal-700' },
    'WhatsApp': { bg: 'bg-green-100', text: 'text-green-700' },
    'YouTube': { bg: 'bg-red-100', text: 'text-red-700' },
    'TikTok': { bg: 'bg-slate-100', text: 'text-slate-700' },
    'Manual': { bg: 'bg-gray-100', text: 'text-gray-600' },
};

export const DEFAULT_SETTER_COLOR = { bg: 'bg-gray-100', text: 'text-gray-600' };
export const DEFAULT_CLOSER_COLOR = { bg: 'bg-gray-100', text: 'text-gray-600' };
export const DEFAULT_SOURCE_COLOR = { bg: 'bg-slate-100', text: 'text-slate-600' };

export function getStatusOption(status: LeadStatus) {
    return LEAD_STATUS_OPTIONS.find(s => s.value === status) || LEAD_STATUS_OPTIONS[0];
}

export function getSetterColor(name: string) {
    const normalized = name.replace('ï', 'i');
    return SETTER_COLORS[name] || SETTER_COLORS[normalized] || DEFAULT_SETTER_COLOR;
}

export function getCloserColor(name: string) {
    return CLOSER_COLORS[name] || DEFAULT_CLOSER_COLOR;
}

export function getSourceColor(source: string) {
    return SOURCE_COLORS[source] || DEFAULT_SOURCE_COLOR;
}

export function getDaysAgo(dateStr: string): number {
    const created = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDaysAgoColor(days: number): string {
    if (days <= 2) return 'text-green-600 bg-green-50';
    if (days <= 7) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
}

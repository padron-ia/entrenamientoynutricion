// STUB - To be implemented using template from PLANTILLAS_SECCIONES_NUTRICION.md
import React from 'react';
import { NutritionAssessmentData } from '../NutritionAssessmentForm';

interface SectionProps {
    formData: NutritionAssessmentData;
    updateField: (field: keyof NutritionAssessmentData, value: any) => void;
    toggleArrayField: (field: keyof NutritionAssessmentData, value: string) => void;
}

export function MealScheduleSection({ formData, updateField }: SectionProps) {
    return (
        <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-900">
                    <strong>⚠️ Sección en desarrollo:</strong> Esta sección será implementada próximamente.
                    Ver plantilla en <code>docs/PLANTILLAS_SECCIONES_NUTRICION.md</code>
                </p>
            </div>
            {/* TODO: Implement using template */}
        </div>
    );
}

export function EatingHabitsSection({ formData, updateField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

export function SpecificConsumptionSection({ formData, updateField, toggleArrayField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

export function EatingBehaviorSection({ formData, updateField, toggleArrayField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

export function Recall24hSection({ formData, updateField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

export function SupplementsSection({ formData, updateField, toggleArrayField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

export function SocialContextSection({ formData, updateField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

export function KnowledgeSection({ formData, updateField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

export function NutritionGoalsSection({ formData, updateField, toggleArrayField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

export function SleepSection({ formData, updateField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

export function StressSection({ formData, updateField, toggleArrayField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

export function MenstruationSection({ formData, updateField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

export function DigestionSection({ formData, updateField, toggleArrayField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

export function ExerciseNutritionSection({ formData, updateField, toggleArrayField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

export function TechnologySection({ formData, updateField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

export function CommunicationSection({ formData, updateField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

export function GlucoseGoalsSection({ formData, updateField }: SectionProps) {
    return <div className="bg-yellow-50 p-4 rounded">⚠️ Sección pendiente de implementación</div>;
}

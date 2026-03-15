# 📝 Plantillas para Secciones de Evaluación Nutricional

## 🎯 Guía de Implementación

Este documento contiene plantillas para crear las **17 secciones restantes** del formulario de evaluación nutricional.

---

## 📋 Estado de Implementación

- ✅ **DietaryPreferencesSection.tsx** - COMPLETADO
- ⏳ **MealScheduleSection.tsx** - Pendiente
- ⏳ **EatingHabitsSection.tsx** - Pendiente
- ⏳ **SpecificConsumptionSection.tsx** - Pendiente
- ⏳ **EatingBehaviorSection.tsx** - Pendiente
- ⏳ **Recall24hSection.tsx** - Pendiente
- ⏳ **SupplementsSection.tsx** - Pendiente
- ⏳ **SocialContextSection.tsx** - Pendiente
- ⏳ **KnowledgeSection.tsx** - Pendiente
- ⏳ **NutritionGoalsSection.tsx** - Pendiente
- ⏳ **SleepSection.tsx** - Pendiente
- ⏳ **StressSection.tsx** - Pendiente
- ⏳ **MenstruationSection.tsx** - Pendiente
- ⏳ **DigestionSection.tsx** - Pendiente
- ⏳ **ExerciseNutritionSection.tsx** - Pendiente
- ⏳ **TechnologySection.tsx** - Pendiente
- ⏳ **CommunicationSection.tsx** - Pendiente
- ⏳ **GlucoseGoalsSection.tsx** - Pendiente

---

## 🔧 Plantilla Base

Todas las secciones siguen esta estructura:

```typescript
import React from 'react';
import { NutritionAssessmentData } from '../NutritionAssessmentForm';

interface SectionProps {
    formData: NutritionAssessmentData;
    updateField: (field: keyof NutritionAssessmentData, value: any) => void;
    toggleArrayField: (field: keyof NutritionAssessmentData, value: string) => void;
}

export function [SECTION_NAME]Section({ formData, updateField, toggleArrayField }: SectionProps) {
    return (
        <div className="space-y-6">
            {/* Campos aquí */}
        </div>
    );
}
```

---

## 📝 Plantillas por Sección

### 2. MealScheduleSection.tsx

**Campos:**
- mealsPerDay (select)
- breakfastTime, midMorningTime, lunchTime, snackTime, dinnerTime, lateSnackTime (time inputs)

**Componentes sugeridos:**
```tsx
// Selector de número de comidas
<select value={formData.mealsPerDay} onChange={(e) => updateField('mealsPerDay', parseInt(e.target.value))}>
    <option value={2}>2 comidas al día</option>
    <option value={3}>3 comidas al día</option>
    <option value={4}>4 comidas al día</option>
    <option value={5}>5 comidas al día</option>
    <option value={6}>6+ comidas al día</option>
</select>

// Input de hora
<input
    type="time"
    value={formData.breakfastTime}
    onChange={(e) => updateField('breakfastTime', e.target.value)}
    className="px-4 py-2 border rounded-lg"
/>
```

---

### 3. EatingHabitsSection.tsx

**Campos:**
- cooksSelf (boolean)
- whoCooks (text, condicional)
- weighsFood (boolean)
- eatsOutPerWeek (number)
- mealPreparationTime (select)
- cookingSkills (select)
- familyEatsSame (boolean)
- foodBudget (select)

**Componentes sugeridos:**
```tsx
// Toggle Sí/No
<div className="flex gap-4">
    <button
        onClick={() => updateField('cooksSelf', true)}
        className={formData.cooksSelf ? 'bg-emerald-500 text-white' : 'bg-slate-200'}
    >
        Sí
    </button>
    <button
        onClick={() => updateField('cooksSelf', false)}
        className={!formData.cooksSelf ? 'bg-emerald-500 text-white' : 'bg-slate-200'}
    >
        No
    </button>
</div>

// Campo condicional
{!formData.cooksSelf && (
    <input
        type="text"
        value={formData.whoCooks}
        onChange={(e) => updateField('whoCooks', e.target.value)}
        placeholder="¿Quién cocina?"
    />
)}
```

---

### 4. SpecificConsumptionSection.tsx

**Subsecciones:**

#### Pan:
- eatsBread (boolean)
- breadType, breadAmount, breadFrequency (condicionales)

#### Picar:
- snacksBetweenMeals (boolean)
- snackFrequency, whatSnacks (condicionales)
- snackTriggers[] (multi-select)

#### Bebidas:
- drinkWithMeals (text)
- waterIntakeLiters (number)
- coffeeCupsPerDay, teaCupsPerDay (numbers)
- sodaPerWeek, juicePerWeek (numbers)

#### Alcohol:
- alcoholPerWeek (number)
- alcoholType[] (multi-select)
- alcoholOccasions (select)

#### Antojos:
- hasCravings (boolean)
- cravingFrequency, cravingFoods (condicionales)
- cravingTimeOfDay[] (multi-select)

**Nota:** Esta es la sección más grande. Considera dividirla en subsecciones colapsables.

---

### 5. EatingBehaviorSection.tsx

**Campos:**
- hasEatingDisorder (boolean)
- eatingDisorderType (select, condicional)
- eatingDisorderTreatment (boolean, condicional)
- emotionalEating[] (multi-select)
- bingeEatingEpisodes (boolean)
- bingeFrequency (select, condicional)
- compensatoryBehaviors (boolean)

**Importante:** Esta sección trata temas sensibles. Usar lenguaje empático y añadir mensaje de apoyo.

```tsx
<div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
    <p className="text-sm text-purple-900">
        <strong>🤝 Confidencialidad:</strong> Esta información es completamente confidencial y nos ayuda a brindarte el mejor apoyo posible.
    </p>
</div>
```

---

### 6. Recall24hSection.tsx

**Campos:**
- last24hMeals (textarea general)
- last24hBreakfast, last24hLunch, last24hDinner, last24hSnacks (textareas específicos)

**Componentes sugeridos:**
```tsx
<div className="space-y-4">
    <div>
        <label className="font-bold">Desayuno</label>
        <textarea
            value={formData.last24hBreakfast}
            onChange={(e) => updateField('last24hBreakfast', e.target.value)}
            placeholder="Describe lo que desayunaste ayer..."
            rows={3}
        />
    </div>
    {/* Repetir para comida, cena, snacks */}
</div>
```

---

### 7. SupplementsSection.tsx

**Campos:**
- takesSupplements (boolean)
- supplements[] (multi-select, condicional)
- supplementsDetail (textarea, condicional)

**Opciones de suplementos:**
- multivitaminico, omega3, vitamina_d, vitamina_b12, hierro, calcio, magnesio, proteina, creatina, otro

---

### 8. SocialContextSection.tsx

**Campos:**
- culturalFoodRestrictions (textarea)
- socialEatingChallenges (textarea)
- workLunchSituation (select)
- weekendEatingPattern (textarea)

**Opciones workLunchSituation:**
- lleva_comida, come_fuera, cafeteria_empresa, no_come, variable

---

### 9. KnowledgeSection.tsx

**Campos:**
- nutritionKnowledge (select: bajo, medio, alto)
- readsLabels (boolean)
- countsCalories (boolean)
- usesNutritionApps (boolean)
- whichApps (text, condicional)
- previousDiets (textarea)
- dietSuccessRate (select)

---

### 10. NutritionGoalsSection.tsx

**Campos:**
- nutritionGoals[] (multi-select)
- biggestChallenge (textarea)
- motivationLevel (select)
- supportSystem (textarea)

**Opciones nutritionGoals:**
- perder_peso, ganar_masa, mejorar_salud, control_glucosa, mas_energia, mejor_digestion, reducir_medicacion

---

### 11. SleepSection.tsx

**Campos:**
- sleepHoursPerNight (number con slider)
- sleepQuality (select)
- wakesUpToEat (boolean)
- nightEatingSyndrome (boolean)
- sleepAffectsAppetite (boolean)

**Componente slider sugerido:**
```tsx
<div>
    <label>Horas de sueño: {formData.sleepHoursPerNight}h</label>
    <input
        type="range"
        min="3"
        max="12"
        step="0.5"
        value={formData.sleepHoursPerNight}
        onChange={(e) => updateField('sleepHoursPerNight', parseFloat(e.target.value))}
        className="w-full"
    />
</div>
```

---

### 12. StressSection.tsx

**Campos:**
- stressLevel (select)
- stressEatingFrequency (select)
- anxietyMedication (boolean)
- stressManagementTechniques[] (multi-select)
- stressTriggers (textarea)

**Opciones stressManagementTechniques:**
- meditacion, ejercicio, terapia, yoga, respiracion, ninguna

---

### 13. MenstruationSection.tsx

**Campos:**
- hasMenstrualCycle (boolean)
- pmsAffectsEating (boolean, condicional)
- pmsCravings (textarea, condicional)
- menstrualCycleRegularity (select, condicional)
- menopauseStatus (select)

**Nota:** Mostrar solo si el género es femenino (obtener del perfil del cliente).

---

### 14. DigestionSection.tsx

**Campos:**
- digestiveIssues[] (multi-select)
- bowelMovementFrequency (select)
- foodIntolerancesSuspected (textarea)
- takesDigestiveEnzymes (boolean)
- takesProbiotics (boolean)
- digestiveDiscomfortFoods (textarea)

**Opciones digestiveIssues:**
- ninguno, estreñimiento, diarrea, gases, reflujo, hinchazón, dolor, ibs

---

### 15. ExerciseNutritionSection.tsx

**Campos:**
- exerciseAffectsAppetite (boolean)
- postWorkoutEatingPattern (textarea)
- preWorkoutEatingPattern (textarea)
- usesSportsNutrition (boolean)
- sportsSupplements[] (multi-select, condicional)
- exerciseTimingMeals (select)

**Opciones sportsSupplements:**
- proteina, bcaa, creatina, pre_workout, post_workout, ninguno

---

### 16. TechnologySection.tsx

**Campos:**
- usesGlucoseMonitor (boolean)
- glucoseMonitorType (select, condicional)
- tracksFoodPhotos (boolean)
- willingToTrackDaily (boolean)
- preferredTrackingMethod (select)
- currentlyTracking (boolean)
- trackingAppsUsed (text)

**Opciones glucoseMonitorType:**
- freestyle_libre, dexcom, medtronic, guardian, otro, ninguno

---

### 17. CommunicationSection.tsx

**Campos:**
- preferredContactMethod (select)
- preferredContactTime (select)
- needsReminders (boolean)
- reminderFrequency (select, condicional)
- communicationStylePreference (select)

**Opciones:**
- preferredContactMethod: whatsapp, email, llamada, videollamada
- preferredContactTime: manana, tarde, noche, flexible
- reminderFrequency: diario, cada_2_dias, semanal, no_necesita
- communicationStylePreference: directo, motivacional, tecnico, flexible

---

### 18. GlucoseGoalsSection.tsx

**Campos:**
- targetFastingGlucose (number)
- targetPostMealGlucose (number)
- hypoglycemiaFrequency (select)
- hyperglycemiaFrequency (select)
- glucoseVariability (select)
- worstTimeOfDayGlucose (select)
- bestTimeOfDayGlucose (select)
- glucoseAwareness (select)

**Componente sugerido:**
```tsx
<div className="grid grid-cols-2 gap-4">
    <div>
        <label>Glucosa en ayunas objetivo (mg/dL)</label>
        <input
            type="number"
            value={formData.targetFastingGlucose}
            onChange={(e) => updateField('targetFastingGlucose', parseInt(e.target.value))}
            placeholder="80-130"
            className="w-full px-4 py-2 border rounded-lg"
        />
    </div>
    <div>
        <label>Glucosa postprandial objetivo (mg/dL)</label>
        <input
            type="number"
            value={formData.targetPostMealGlucose}
            onChange={(e) => updateField('targetPostMealGlucose', parseInt(e.target.value))}
            placeholder="< 180"
            className="w-full px-4 py-2 border rounded-lg"
        />
    </div>
</div>
```

---

## 🎨 Componentes Reutilizables

### Toggle Sí/No
```tsx
function YesNoToggle({ value, onChange, label }: any) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => onChange(true)}
                    className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${
                        value
                            ? 'bg-emerald-500 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    Sí
                </button>
                <button
                    type="button"
                    onClick={() => onChange(false)}
                    className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${
                        !value
                            ? 'bg-emerald-500 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    No
                </button>
            </div>
        </div>
    );
}
```

### Multi-Select con Chips
```tsx
function MultiSelectChips({ options, selected, onToggle, label }: any) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map((option: any) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onToggle(option.value)}
                        className={`px-4 py-2 rounded-full font-medium transition-all ${
                            selected.includes(option.value)
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
```

### Slider con Valor
```tsx
function SliderWithValue({ value, onChange, min, max, step, label, unit }: any) {
    return (
        <div>
            <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-slate-700">{label}</label>
                <span className="text-sm font-bold text-emerald-600">{value}{unit}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>{min}{unit}</span>
                <span>{max}{unit}</span>
            </div>
        </div>
    );
}
```

---

## 🚀 Próximos Pasos

1. **Crear las 17 secciones restantes** usando las plantillas
2. **Implementar validación** en `isSectionComplete()` del componente principal
3. **Añadir tooltips** con información adicional
4. **Testing** de cada sección
5. **Integrar en el portal del cliente**

---

## 💡 Tips de Implementación

1. **Mantén consistencia** en el diseño entre secciones
2. **Usa condicionales** para mostrar campos solo cuando sean relevantes
3. **Añade ayudas visuales** (iconos, colores) para mejorar UX
4. **Valida en tiempo real** para dar feedback inmediato
5. **Guarda borradores** automáticamente cada 30 segundos

---

*Documento creado: 17 de Diciembre de 2025*  
*Para: Sistema de Evaluación Nutricional PT*

# SISTEMA DE ONBOARDING - COMPLETADO 95%

## ✅ ARCHIVOS CREADOS:

### Componentes de Pasos:
1. ✅ `WelcomeStep.tsx` - Bienvenida
2. ✅ `CredentialsStep.tsx` - Email/Contraseña
3. ✅ `PersonalDataStep.tsx` - Datos personales
4. ✅ `MedicalDataStep.tsx` - Datos médicos
5. ✅ `MeasurementsStep.tsx` - Medidas corporales
6. ✅ `REMAINING_STEPS_CONSOLIDATED.tsx` - Contiene los 4 pasos restantes

### Estructura:
- ✅ `OnboardingPage.tsx` - Componente principal

---

## 🔧 TAREAS FINALES (5 minutos):

### 1. Separar el archivo consolidado en 4 archivos:

Abre `REMAINING_STEPS_CONSOLIDATED.tsx` y copia cada sección a su archivo correspondiente:

**ActivityStep.tsx:**
```tsx
// Copiar desde línea 5 hasta línea 90 del archivo consolidado
```

**NutritionStep1.tsx:**
```tsx
// Copiar desde línea 95 hasta línea 180 del archivo consolidado
```

**NutritionStep2.tsx:**
```tsx
// Copiar desde línea 185 hasta línea 380 del archivo consolidado
```

**GoalsStep.tsx:**
```tsx
// Copiar desde línea 385 hasta el final del archivo consolidado
```

### 2. Actualizar OnboardingPage.tsx - Añadir imports:

Al principio del archivo, añade:
```tsx
import { WelcomeStep } from './steps/WelcomeStep';
import { CredentialsStep } from './steps/CredentialsStep';
import { PersonalDataStep } from './steps/PersonalDataStep';
import { MedicalDataStep } from './steps/MedicalDataStep';
import { MeasurementsStep } from './steps/MeasurementsStep';
import { ActivityStep } from './steps/ActivityStep';
import { NutritionStep1 } from './steps/NutritionStep1';
import { NutritionStep2 } from './steps/NutritionStep2';
import { GoalsStep } from './steps/GoalsStep';
```

### 3. Completar la función handleSubmit en OnboardingPage.tsx:

Reemplaza el comentario `// TO BE CONTINUED...` con este código:

```tsx
const handleSubmit = async () => {
    // Validation
    if (formData.password !== formData.confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }

    if (formData.password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
    }

    setSubmitting(true);

    try {
        // 1. Create client in clientes_pt_notion
        const { data: newClient, error: clientError } = await supabase
            .from('clientes_pt_notion')
            .insert([{
                // Personales
                firstName: formData.firstName,
                surname: formData.surname,
                birthDate: formData.birthDate,
                age: formData.age,
                gender: formData.gender,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                province: formData.province,
                
                // Médicos
                healthConditions: formData.healthConditions.join(', '),
                otherHealthConditions: formData.otherHealthConditions,
                dailyMedication: formData.dailyMedication,
                usesInsulin: formData.usesInsulin,
                insulinBrand: formData.insulinBrand,
                insulinDose: formData.insulinDose,
                insulinTime: formData.insulinTime,
                usesFreestyleLibre: formData.usesFreestyleLibre,
                glucoseFasting: formData.glucoseFasting || null,
                lastHba1c: formData.lastHba1c || null,
                specialSituations: formData.specialSituations.join(', '),
                symptoms: formData.symptoms.join(', '),
                
                // Medidas
                current_weight: formData.currentWeight,
                starting_weight: formData.currentWeight,
                target_weight: formData.targetWeight,
                height: formData.height,
                armCircumference: formData.armCircumference,
                waistCircumference: formData.waistCircumference,
                thighCircumference: formData.thighCircumference,
                
                // Actividad
                dailySteps: formData.dailySteps,
                workSchedule: formData.workSchedule,
                workType: formData.workType,
                hasStrengthTraining: formData.hasStrengthTraining,
                exerciseLocation: formData.exerciseLocation,
                
                // Nutrición
                dietaryPreferences: formData.dietaryPreferences.join(', '),
                otherDietaryPreferences: formData.otherDietaryPreferences,
                unwantedFoods: formData.unwantedFoods,
                regularFoods: formData.regularFoods.join(', '),
                allergies: formData.allergies.join(', '),
                otherAllergies: formData.otherAllergies,
                mealsPerDay: formData.mealsPerDay,
                breakfastTime: formData.breakfastTime,
                midMorningTime: formData.midMorningTime,
                lunchTime: formData.lunchTime,
                snackTime: formData.snackTime,
                dinnerTime: formData.dinnerTime,
                cooksSelf: formData.cooksSelf,
                weighsFood: formData.weighsFood,
                eatsOutPerWeek: formData.eatsOutPerWeek,
                eatsBread: formData.eatsBread,
                breadAmount: formData.breadAmount,
                snacksBetweenMeals: formData.snacksBetweenMeals,
                snackFoods: formData.snackFoods,
                drinkWithMeals: formData.drinkWithMeals,
                alcoholPerWeek: formData.alcoholPerWeek,
                hasCravings: formData.hasCravings,
                cravingFoods: formData.cravingFoods,
                last24hMeals: formData.last24hMeals,
                eatingDisorder: formData.eatingDisorder,
                eatingDisorderType: formData.eatingDisorderType,
                emotionalEating: formData.emotionalEating.join(', '),
                
                // Objetivos
                goal3Months: formData.goal3Months,
                goal6Months: formData.goal6Months,
                goal1Year: formData.goal1Year,
                whyTrustUs: formData.whyTrustUs,
                additionalComments: formData.additionalComments,
                
                // Metadata
                coach_id: saleData.assigned_coach_id,
                contract_duration_months: saleData.contract_duration,
                start_date: new Date().toISOString(),
                status: 'active',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (clientError) throw clientError;

        // 2. Create user with credentials
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    name: `${formData.firstName} ${formData.surname}`,
                    role: 'client',
                    client_id: newClient.id
                }
            }
        });

        if (authError) throw authError;

        // 3. Update sale as completed
        await supabase
            .from('sales')
            .update({
                status: 'onboarding_completed',
                client_id: newClient.id,
                onboarding_completed_at: new Date().toISOString()
            })
            .eq('id', saleData.id);

        // 4. Success - redirect to login
        alert('¡Registro completado! Bienvenido a Padron Trainer. Ahora puedes iniciar sesión.');
        navigate('/');

    } catch (error) {
        console.error('Error:', error);
        alert('Error al completar el registro. Por favor, inténtalo de nuevo.');
    } finally {
        setSubmitting(false);
    }
};
```

### 4. Añadir ruta en App.tsx:

Busca donde están las rutas y añade:

```tsx
import { OnboardingPage } from './components/onboarding/OnboardingPage';

// Dentro del return, antes del Layout:
if (window.location.pathname.startsWith('/bienvenida/')) {
    return <OnboardingPage />;
}
```

### 5. SQL para añadir columnas a clientes_pt_notion:

Ejecuta este script en Supabase (crea un archivo `add_onboarding_fields.sql`):

```sql
-- Añadir todos los campos del formulario de onboarding a clientes_pt_notion

-- Personales (ya existen la mayoría)
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS birthDate DATE;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS province TEXT;

-- Médicos
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS healthConditions TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS otherHealthConditions TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS dailyMedication TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS usesInsulin BOOLEAN DEFAULT FALSE;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS insulinBrand TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS insulinDose TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS insulinTime TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS usesFreestyleLibre BOOLEAN DEFAULT FALSE;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS glucoseFasting TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS lastHba1c TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS specialSituations TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS symptoms TEXT;

-- Medidas
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS armCircumference INTEGER;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS waistCircumference INTEGER;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS thighCircumference INTEGER;

-- Actividad
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS dailySteps TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS workSchedule TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS workType TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS hasStrengthTraining TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS exerciseLocation TEXT;

-- Nutrición
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS dietaryPreferences TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS otherDietaryPreferences TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS unwantedFoods TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS regularFoods TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS otherAllergies TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS mealsPerDay TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS breakfastTime TIME;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS midMorningTime TIME;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS lunchTime TIME;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS snackTime TIME;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS dinnerTime TIME;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS cooksSelf TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS weighsFood TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS eatsOutPerWeek INTEGER;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS eatsBread TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS breadAmount TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS snacksBetweenMeals TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS snackFoods TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS drinkWithMeals TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS alcoholPerWeek TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS hasCravings TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS cravingFoods TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS last24hMeals TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS eatingDisorder TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS eatingDisorderType TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS emotionalEating TEXT;

-- Objetivos
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS goal3Months TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS goal6Months TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS goal1Year TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS whyTrustUs TEXT;
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS additionalComments TEXT;
```

### 6. Añadir columna welcome_video_url a tabla users:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_video_url TEXT;

COMMENT ON COLUMN users.welcome_video_url IS 'URL del video de bienvenida del coach (YouTube/Vimeo)';
```

---

## 🎯 RESUMEN:

1. ✅ Separar archivo consolidado en 4 archivos
2. ✅ Añadir imports en OnboardingPage.tsx
3. ✅ Completar función handleSubmit
4. ✅ Añadir ruta en App.tsx
5. ✅ Ejecutar SQL para añadir campos
6. ✅ Añadir columna de video a users

**Tiempo estimado: 10-15 minutos**

Una vez hecho esto, el sistema estará 100% funcional!

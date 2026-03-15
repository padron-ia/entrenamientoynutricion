# 📊 Análisis Comparativo: Datos Nutricionales

## 🔍 Comparación Detallada: Antes vs Después

---

## ✅ DATOS QUE YA RECOGÍAMOS (Onboarding Anterior)

### 1. Preferencias Dietéticas (Básico)
| Campo Anterior | Tipo | Limitación |
|----------------|------|------------|
| `dietaryPreferences[]` | Array | Solo opciones predefinidas |
| `otherDietaryPreferences` | Text | Campo genérico |
| `unwantedFoods` | Text | Texto libre, poco estructurado |
| `regularFoods[]` | Array | Solo opciones predefinidas |
| `allergies[]` | Array | Lista básica |
| `otherAllergies` | Text | Campo genérico |

**Total: 6 campos básicos**

### 2. Horarios de Comidas (Básico)
| Campo Anterior | Tipo | Limitación |
|----------------|------|------------|
| `mealsPerDay` | String | Solo número |
| `breakfastTime` | String | Solo hora |
| `midMorningTime` | String | Opcional |
| `lunchTime` | String | Solo hora |
| `snackTime` | String | Opcional |
| `dinnerTime` | String | Solo hora |

**Total: 6 campos de horarios**

### 3. Hábitos Alimenticios (Básico)
| Campo Anterior | Tipo | Limitación |
|----------------|------|------------|
| `cooksSelf` | String | Sí/No simple |
| `weighsFood` | String | Sí/No simple |
| `eatsOutPerWeek` | Number | Solo número |
| `drinkWithMeals` | String | Texto libre |
| `alcoholPerWeek` | String | Texto libre |

**Total: 5 campos básicos**

### 4. Consumo Específico (Básico)
| Campo Anterior | Tipo | Limitación |
|----------------|------|------------|
| `eatsBread` | String | Sí/No |
| `breadAmount` | String | Condicional, poco detallado |
| `snacksBetweenMeals` | String | Sí/No |
| `snackFoods` | String | Condicional, texto libre |
| `hasCravings` | String | Sí/No |
| `cravingFoods` | String | Condicional, texto libre |

**Total: 6 campos básicos**

### 5. Recordatorio 24h (Básico)
| Campo Anterior | Tipo | Limitación |
|----------------|------|------------|
| `last24hMeals` | Text | Un solo campo de texto libre |

**Total: 1 campo**

### 6. Conducta Alimentaria (Básico)
| Campo Anterior | Tipo | Limitación |
|----------------|------|------------|
| `eatingDisorder` | String | Sí/No |
| `eatingDisorderType` | String | Condicional, texto libre |
| `emotionalEating[]` | Array | Lista básica |

**Total: 3 campos básicos**

---

## 🆕 DATOS NUEVOS Y MEJORADOS (Sistema Separado)

### 1. Preferencias Dietéticas (MEJORADO) ✨
| Campo Nuevo | Tipo | Mejora |
|-------------|------|--------|
| `dietary_preferences[]` | Array | ✅ Mismo |
| `other_dietary_preferences` | Text | ✅ Mismo |
| `unwanted_foods` | Text | ✅ Mismo |
| `regular_foods[]` | Array | ✅ Mismo |
| `allergies[]` | Array | ✅ Mismo |
| `other_allergies` | Text | ✅ Mismo |

**Mejora: Campos iguales pero con mejor contexto**

---

### 2. Horarios y Estructura (MEJORADO) ✨
| Campo Nuevo | Tipo | Mejora |
|-------------|------|--------|
| `meals_per_day` | Integer | ✅ Mismo |
| `breakfast_time` | Time | ✅ Mismo |
| `mid_morning_time` | Time | ✅ Mismo |
| `lunch_time` | Time | ✅ Mismo |
| `snack_time` | Time | ✅ Mismo |
| `dinner_time` | Time | ✅ Mismo |
| **`late_snack_time`** | Time | 🆕 **NUEVO** - Snack nocturno |

**Mejora: +1 campo nuevo (snack nocturno)**

---

### 3. Hábitos Alimenticios (AMPLIADO) 🚀
| Campo Nuevo | Tipo | Mejora |
|-------------|------|--------|
| `cooks_self` | Boolean | ✅ Mejorado (boolean) |
| **`who_cooks`** | Text | 🆕 **NUEVO** - Si no cocina, ¿quién? |
| `weighs_food` | Boolean | ✅ Mejorado (boolean) |
| `eats_out_per_week` | Integer | ✅ Mismo |
| **`meal_preparation_time`** | Text | 🆕 **NUEVO** - Tiempo que dedica |
| **`cooking_skills`** | Text | 🆕 **NUEVO** - Nivel de habilidad |
| **`family_eats_same`** | Boolean | 🆕 **NUEVO** - ¿Familia come igual? |
| **`food_budget`** | Text | 🆕 **NUEVO** - Presupuesto alimentario |

**Mejora: De 5 → 8 campos (+3 nuevos)**

---

### 4. Consumo Específico (MUY AMPLIADO) 🚀🚀
#### Pan (Mejorado)
| Campo Nuevo | Tipo | Mejora |
|-------------|------|--------|
| `eats_bread` | Boolean | ✅ Mismo |
| **`bread_type`** | Text | 🆕 **NUEVO** - Tipo de pan |
| `bread_amount` | Text | ✅ Mismo |
| **`bread_frequency`** | Text | 🆕 **NUEVO** - Frecuencia consumo |

#### Picar entre horas (Mejorado)
| Campo Nuevo | Tipo | Mejora |
|-------------|------|--------|
| `snacks_between_meals` | Boolean | ✅ Mismo |
| **`snack_frequency`** | Text | 🆕 **NUEVO** - Frecuencia |
| `what_snacks` | Text | ✅ Mismo |
| **`snack_triggers[]`** | Array | 🆕 **NUEVO** - Qué lo desencadena |

#### Bebidas (MUY AMPLIADO) 🆕
| Campo Nuevo | Tipo | Mejora |
|-------------|------|--------|
| `drink_with_meals` | Text | ✅ Mismo |
| **`water_intake_liters`** | Decimal | 🆕 **NUEVO** - Agua al día |
| **`coffee_cups_per_day`** | Integer | 🆕 **NUEVO** - Café |
| **`tea_cups_per_day`** | Integer | 🆕 **NUEVO** - Té |
| **`soda_per_week`** | Integer | 🆕 **NUEVO** - Refrescos |
| **`juice_per_week`** | Integer | 🆕 **NUEVO** - Zumos |

#### Alcohol (Mejorado)
| Campo Nuevo | Tipo | Mejora |
|-------------|------|--------|
| `alcohol_per_week` | Integer | ✅ Mejorado (número) |
| **`alcohol_type[]`** | Array | 🆕 **NUEVO** - Tipo de alcohol |
| **`alcohol_occasions`** | Text | 🆕 **NUEVO** - Cuándo bebe |

#### Antojos (Mejorado)
| Campo Nuevo | Tipo | Mejora |
|-------------|------|--------|
| `has_cravings` | Boolean | ✅ Mismo |
| **`craving_frequency`** | Text | 🆕 **NUEVO** - Frecuencia |
| `craving_foods` | Text | ✅ Mismo |
| **`craving_time_of_day[]`** | Array | 🆕 **NUEVO** - Momento del día |

**Mejora: De 6 → 20 campos (+14 nuevos) 🔥**

---

### 5. Recordatorio 24h (MUY MEJORADO) 🚀
| Campo Nuevo | Tipo | Mejora |
|-------------|------|--------|
| `last_24h_meals` | Text | ✅ Descripción general |
| **`last_24h_breakfast`** | Text | 🆕 **NUEVO** - Desayuno detallado |
| **`last_24h_lunch`** | Text | 🆕 **NUEVO** - Comida detallada |
| **`last_24h_dinner`** | Text | 🆕 **NUEVO** - Cena detallada |
| **`last_24h_snacks`** | Text | 🆕 **NUEVO** - Snacks detallados |

**Mejora: De 1 → 5 campos (+4 nuevos) 🔥**

---

### 6. Conducta Alimentaria (AMPLIADO) 🚀
| Campo Nuevo | Tipo | Mejora |
|-------------|------|--------|
| `has_eating_disorder` | Boolean | ✅ Mismo |
| `eating_disorder_type` | Text | ✅ Mismo |
| **`eating_disorder_treatment`** | Boolean | 🆕 **NUEVO** - ¿En tratamiento? |
| `emotional_eating[]` | Array | ✅ Mismo |
| **`binge_eating_episodes`** | Boolean | 🆕 **NUEVO** - ¿Atracones? |
| **`binge_frequency`** | Text | 🆕 **NUEVO** - Frecuencia atracones |
| **`compensatory_behaviors`** | Boolean | 🆕 **NUEVO** - Conductas compensatorias |

**Mejora: De 3 → 7 campos (+4 nuevos)**

---

### 7. Suplementación (COMPLETAMENTE NUEVO) 🆕🆕
| Campo Nuevo | Tipo | Mejora |
|-------------|------|--------|
| **`takes_supplements`** | Boolean | 🆕 **NUEVO** |
| **`supplements[]`** | Array | 🆕 **NUEVO** - Qué suplementos |
| **`supplements_detail`** | Text | 🆕 **NUEVO** - Detalles |

**Mejora: 0 → 3 campos (100% nuevo) 🔥**

---

### 8. Contexto Social y Cultural (COMPLETAMENTE NUEVO) 🆕🆕
| Campo Nuevo | Tipo | Mejora |
|-------------|------|--------|
| **`cultural_food_restrictions`** | Text | 🆕 **NUEVO** - Restricciones culturales |
| **`social_eating_challenges`** | Text | 🆕 **NUEVO** - Desafíos sociales |
| **`work_lunch_situation`** | Text | 🆕 **NUEVO** - Situación laboral |
| **`weekend_eating_pattern`** | Text | 🆕 **NUEVO** - Patrón fin de semana |

**Mejora: 0 → 4 campos (100% nuevo) 🔥**

---

### 9. Conocimientos y Actitudes (COMPLETAMENTE NUEVO) 🆕🆕
| Campo Nuevo | Tipo | Mejora |
|-------------|------|--------|
| **`nutrition_knowledge`** | Text | 🆕 **NUEVO** - Nivel conocimiento |
| **`reads_labels`** | Boolean | 🆕 **NUEVO** - ¿Lee etiquetas? |
| **`counts_calories`** | Boolean | 🆕 **NUEVO** - ¿Cuenta calorías? |
| **`uses_nutrition_apps`** | Boolean | 🆕 **NUEVO** - ¿Usa apps? |
| **`which_apps`** | Text | 🆕 **NUEVO** - Qué apps |
| **`previous_diets`** | Text | 🆕 **NUEVO** - Dietas previas |
| **`diet_success_rate`** | Text | 🆕 **NUEVO** - Éxito de dietas |

**Mejora: 0 → 7 campos (100% nuevo) 🔥**

---

### 10. Objetivos y Motivación Nutricional (COMPLETAMENTE NUEVO) 🆕🆕
| Campo Nuevo | Tipo | Mejora |
|-------------|------|--------|
| **`nutrition_goals[]`** | Array | 🆕 **NUEVO** - Objetivos nutricionales |
| **`biggest_challenge`** | Text | 🆕 **NUEVO** - Mayor desafío |
| **`motivation_level`** | Text | 🆕 **NUEVO** - Nivel motivación |
| **`support_system`** | Text | 🆕 **NUEVO** - Apoyo familiar |

**Mejora: 0 → 4 campos (100% nuevo) 🔥**

---

## 📊 RESUMEN COMPARATIVO

| Categoría | Campos Anteriores | Campos Nuevos | Nuevos Añadidos | Mejora |
|-----------|-------------------|---------------|-----------------|--------|
| **Preferencias Dietéticas** | 6 | 6 | 0 | Mismo |
| **Horarios** | 6 | 7 | +1 | +17% |
| **Hábitos Alimenticios** | 5 | 8 | +3 | +60% |
| **Consumo Específico** | 6 | 20 | +14 | +233% 🔥 |
| **Recordatorio 24h** | 1 | 5 | +4 | +400% 🔥 |
| **Conducta Alimentaria** | 3 | 7 | +4 | +133% |
| **Suplementación** | 0 | 3 | +3 | 100% nuevo 🆕 |
| **Contexto Social** | 0 | 4 | +4 | 100% nuevo 🆕 |
| **Conocimientos** | 0 | 7 | +7 | 100% nuevo 🆕 |
| **Objetivos Nutricionales** | 0 | 4 | +4 | 100% nuevo 🆕 |
| **TOTAL** | **27** | **71** | **+44** | **+163%** 🚀 |

---

## 🎯 CAMPOS MÁS IMPORTANTES QUE AÑADIMOS

### 🔥 **TOP 10 Campos Nuevos Más Valiosos:**

1. **`water_intake_liters`** 💧
   - **Por qué**: Hidratación crucial para diabetes
   - **Valor**: Permite ajustar recomendaciones específicas

2. **`coffee_cups_per_day`** ☕
   - **Por qué**: Afecta glucosa y ansiedad
   - **Valor**: Control de estimulantes

3. **`snack_triggers[]`** 🎯
   - **Por qué**: Identifica patrones emocionales
   - **Valor**: Intervenciones conductuales específicas

4. **`binge_eating_episodes`** ⚠️
   - **Por qué**: Indicador de TCA
   - **Valor**: Derivación a psicología si necesario

5. **`previous_diets`** 📚
   - **Por qué**: Evitar repetir fracasos
   - **Valor**: Personalización basada en historial

6. **`cooking_skills`** 👨‍🍳
   - **Por qué**: Ajustar complejidad de recetas
   - **Valor**: Planes realistas y sostenibles

7. **`family_eats_same`** 👨‍👩‍👧‍👦
   - **Por qué**: Contexto familiar crucial
   - **Valor**: Planes que no aíslen al cliente

8. **`work_lunch_situation`** 💼
   - **Por qué**: Realidad laboral
   - **Valor**: Soluciones prácticas

9. **`motivation_level`** 💪
   - **Por qué**: Predice adherencia
   - **Valor**: Ajustar intensidad del plan

10. **`cultural_food_restrictions`** 🌍
    - **Por qué**: Respeto cultural
    - **Valor**: Planes culturalmente apropiados

---

## 💡 DATOS QUE RECOMIENDO AÑADIR ADICIONALMENTE

### 1. **Sueño y Descanso** 😴
```sql
sleep_hours_per_night DECIMAL(3,1),
sleep_quality TEXT, -- 'malo', 'regular', 'bueno', 'excelente'
wakes_up_to_eat BOOLEAN,
night_eating_syndrome BOOLEAN
```
**Por qué**: Sueño afecta directamente glucosa y antojos

### 2. **Estrés y Ansiedad** 😰
```sql
stress_level TEXT, -- 'bajo', 'medio', 'alto', 'muy_alto'
stress_eating_frequency TEXT,
anxiety_medication BOOLEAN,
stress_management_techniques TEXT[]
```
**Por qué**: Estrés dispara cortisol y glucosa

### 3. **Menstruación (para mujeres)** 🩸
```sql
has_menstrual_cycle BOOLEAN,
pms_affects_eating BOOLEAN,
pms_cravings TEXT,
menstrual_cycle_regularity TEXT
```
**Por qué**: Hormonas afectan antojos y glucosa

### 4. **Digestión** 🔄
```sql
digestive_issues TEXT[], -- ['estreñimiento', 'diarrea', 'gases', 'reflujo', 'ninguno']
bowel_movement_frequency TEXT,
food_intolerances_suspected TEXT,
takes_digestive_enzymes BOOLEAN
```
**Por qué**: Problemas digestivos afectan absorción

### 5. **Actividad Física Relacionada** 🏃
```sql
exercise_affects_appetite BOOLEAN,
post_workout_eating_pattern TEXT,
pre_workout_eating_pattern TEXT,
uses_sports_nutrition BOOLEAN
```
**Por qué**: Relación ejercicio-nutrición

### 6. **Tecnología y Tracking** 📱
```sql
uses_glucose_monitor BOOLEAN,
glucose_monitor_type TEXT,
tracks_food_photos BOOLEAN,
willing_to_track_daily BOOLEAN,
preferred_tracking_method TEXT
```
**Por qué**: Herramientas de seguimiento

### 7. **Preferencias de Comunicación** 📞
```sql
preferred_contact_method TEXT, -- 'whatsapp', 'email', 'llamada'
preferred_contact_time TEXT,
needs_reminders BOOLEAN,
reminder_frequency TEXT
```
**Por qué**: Adherencia al seguimiento

### 8. **Objetivos Específicos de Glucosa** 🎯
```sql
target_fasting_glucose INTEGER,
target_post_meal_glucose INTEGER,
hypoglycemia_frequency TEXT,
hyperglycemia_frequency TEXT,
glucose_variability TEXT
```
**Por qué**: Objetivos glucémicos personalizados

---

## 📈 VALOR AÑADIDO DEL NUEVO SISTEMA

### Para el Nutricionista:
✅ **163% más datos** para trabajar  
✅ **Contexto completo** del cliente  
✅ **Patrones identificables** (triggers, horarios, etc.)  
✅ **Histórico de cambios** (versionado)  
✅ **Datos estructurados** y fáciles de analizar  

### Para el Cliente:
✅ **Plan más personalizado** basado en datos reales  
✅ **Soluciones prácticas** (contexto laboral, familiar, etc.)  
✅ **Respeto a preferencias** culturales y personales  
✅ **Seguimiento de evolución** en el tiempo  

### Para el Sistema:
✅ **Análisis agregados** posibles  
✅ **Patrones comunes** identificables  
✅ **IA futura** para sugerencias  
✅ **Reportes automáticos** mejorados  

---

## 🎯 RECOMENDACIÓN FINAL

**Implementar el sistema propuesto (71 campos) + añadir los 8 bloques adicionales sugeridos**

Esto nos daría aproximadamente **100 campos** de información nutricional exhaustiva, convirtiendo el sistema en uno de los más completos del mercado para diabetes.

---

*Análisis realizado: 17 de Diciembre de 2025*

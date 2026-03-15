# 📊 Tabla nutrition_assessments - Resumen Completo

## 🎯 Sistema de Evaluación Nutricional Exhaustivo

**Total de campos: ~105 campos**

---

## 📋 Desglose por Categorías

### 1. **Preferencias Dietéticas** (6 campos)
- dietary_preferences[]
- other_dietary_preferences
- unwanted_foods
- regular_foods[]
- allergies[]
- other_allergies

### 2. **Horarios y Estructura de Comidas** (7 campos)
- meals_per_day
- breakfast_time, mid_morning_time, lunch_time
- snack_time, dinner_time, late_snack_time

### 3. **Hábitos Alimenticios** (8 campos)
- cooks_self, who_cooks
- weighs_food, eats_out_per_week
- meal_preparation_time, cooking_skills
- family_eats_same, food_budget

### 4. **Consumo Específico** (20 campos)
#### Pan (4):
- eats_bread, bread_type, bread_amount, bread_frequency

#### Picar (4):
- snacks_between_meals, snack_frequency, what_snacks, snack_triggers[]

#### Bebidas (6):
- drink_with_meals, water_intake_liters
- coffee_cups_per_day, tea_cups_per_day
- soda_per_week, juice_per_week

#### Alcohol (3):
- alcohol_per_week, alcohol_type[], alcohol_occasions

#### Antojos (4):
- has_cravings, craving_frequency
- craving_foods, craving_time_of_day[]

### 5. **Conducta Alimentaria** (7 campos)
- has_eating_disorder, eating_disorder_type, eating_disorder_treatment
- emotional_eating[], binge_eating_episodes
- binge_frequency, compensatory_behaviors

### 6. **Recordatorio 24 Horas** (5 campos)
- last_24h_meals (general)
- last_24h_breakfast, last_24h_lunch
- last_24h_dinner, last_24h_snacks

### 7. **Suplementación** (3 campos)
- takes_supplements
- supplements[]
- supplements_detail

### 8. **Contexto Social y Cultural** (4 campos)
- cultural_food_restrictions
- social_eating_challenges
- work_lunch_situation
- weekend_eating_pattern

### 9. **Conocimientos y Actitudes** (7 campos)
- nutrition_knowledge
- reads_labels, counts_calories
- uses_nutrition_apps, which_apps
- previous_diets, diet_success_rate

### 10. **Objetivos y Motivación** (4 campos)
- nutrition_goals[]
- biggest_challenge
- motivation_level
- support_system

### 11. **Sueño y Descanso** 🆕 (5 campos)
- sleep_hours_per_night
- sleep_quality
- wakes_up_to_eat
- night_eating_syndrome
- sleep_affects_appetite

### 12. **Estrés y Ansiedad** 🆕 (5 campos)
- stress_level
- stress_eating_frequency
- anxiety_medication
- stress_management_techniques[]
- stress_triggers

### 13. **Menstruación** 🆕 (5 campos)
- has_menstrual_cycle
- pms_affects_eating
- pms_cravings
- menstrual_cycle_regularity
- menopause_status

### 14. **Digestión y Salud Intestinal** 🆕 (6 campos)
- digestive_issues[]
- bowel_movement_frequency
- food_intolerances_suspected
- takes_digestive_enzymes
- takes_probiotics
- digestive_discomfort_foods

### 15. **Actividad Física y Nutrición** 🆕 (6 campos)
- exercise_affects_appetite
- post_workout_eating_pattern
- pre_workout_eating_pattern
- uses_sports_nutrition
- sports_supplements[]
- exercise_timing_meals

### 16. **Tecnología y Tracking** 🆕 (7 campos)
- uses_glucose_monitor
- glucose_monitor_type
- tracks_food_photos
- willing_to_track_daily
- preferred_tracking_method
- currently_tracking
- tracking_apps_used

### 17. **Comunicación y Seguimiento** 🆕 (5 campos)
- preferred_contact_method
- preferred_contact_time
- needs_reminders
- reminder_frequency
- communication_style_preference

### 18. **Objetivos Específicos de Glucosa** 🆕 (8 campos)
- target_fasting_glucose
- target_post_meal_glucose
- hypoglycemia_frequency
- hyperglycemia_frequency
- glucose_variability
- worst_time_of_day_glucose
- best_time_of_day_glucose
- glucose_awareness

### 19. **Metadatos y Control** (7 campos)
- id, client_id
- version, assessment_date
- completed_by_client, reviewed_by, reviewed_at
- nutritionist_notes, status, is_current_version
- created_at, updated_at

---

## 📊 Resumen Numérico

| Categoría | Campos | Tipo |
|-----------|--------|------|
| Preferencias Dietéticas | 6 | Base |
| Horarios | 7 | Base |
| Hábitos Alimenticios | 8 | Base |
| Consumo Específico | 20 | Base |
| Conducta Alimentaria | 7 | Base |
| Recordatorio 24h | 5 | Base |
| Suplementación | 3 | Base |
| Contexto Social | 4 | Base |
| Conocimientos | 7 | Base |
| Objetivos Nutricionales | 4 | Base |
| **Sueño** | **5** | **🆕 Nuevo** |
| **Estrés** | **5** | **🆕 Nuevo** |
| **Menstruación** | **5** | **🆕 Nuevo** |
| **Digestión** | **6** | **🆕 Nuevo** |
| **Ejercicio-Nutrición** | **6** | **🆕 Nuevo** |
| **Tecnología** | **7** | **🆕 Nuevo** |
| **Comunicación** | **5** | **🆕 Nuevo** |
| **Glucosa Específica** | **8** | **🆕 Nuevo** |
| Metadatos | 7 | Sistema |
| **TOTAL** | **~105** | |

---

## 🎯 Características del Sistema

### Versionado Automático
- ✅ Cada nueva evaluación incrementa la versión
- ✅ Las anteriores se marcan como históricas
- ✅ Se mantiene el histórico completo

### Triggers Implementados
1. **update_nutrition_assessment_updated_at**: Actualiza `updated_at` automáticamente
2. **manage_nutrition_assessment_versions**: Gestiona versionado automático

### Índices para Rendimiento
- `idx_nutrition_client_id`: Por cliente
- `idx_nutrition_status`: Por estado
- `idx_nutrition_reviewed_by`: Por nutricionista
- `idx_nutrition_current_version`: Versión actual por cliente
- `idx_nutrition_assessment_date`: Por fecha de evaluación

### Estados Posibles
- `pending`: Pendiente de revisión
- `in_review`: En revisión por nutricionista
- `reviewed`: Revisado
- `action_plan_created`: Plan de acción creado

---

## 🔥 Campos Más Valiosos Añadidos

### Top 15:
1. **water_intake_liters** - Hidratación crucial
2. **sleep_hours_per_night** - Afecta glucosa
3. **stress_level** - Dispara cortisol
4. **glucose_monitor_type** - Herramientas actuales
5. **target_fasting_glucose** - Objetivos personalizados
6. **snack_triggers[]** - Patrones emocionales
7. **binge_eating_episodes** - Detección TCA
8. **previous_diets** - Evitar fracasos
9. **cooking_skills** - Planes realistas
10. **family_eats_same** - Contexto familiar
11. **work_lunch_situation** - Realidad laboral
12. **pms_affects_eating** - Hormonas
13. **digestive_issues[]** - Salud intestinal
14. **exercise_affects_appetite** - Relación ejercicio-comida
15. **preferred_contact_method** - Adherencia

---

## 💡 Uso Recomendado

### Para el Cliente:
1. Completar el formulario con calma (15-20 min)
2. Ser honesto y detallado
3. Actualizar cada 3-6 meses

### Para el Nutricionista:
1. Revisar evaluación completa
2. Añadir notas en `nutritionist_notes`
3. Cambiar status a `reviewed`
4. Crear plan personalizado basado en datos

### Para el Sistema:
1. Análisis agregados de patrones
2. Identificación de grupos similares
3. Sugerencias automáticas (IA futura)
4. Reportes y dashboards

---

## 🚀 Próximos Pasos

1. ✅ SQL creado con 105 campos
2. ⏳ Crear formulario React exhaustivo
3. ⏳ Crear vista para nutricionistas
4. ⏳ Integrar en portal del cliente
5. ⏳ Sistema de notificaciones

---

*Documento actualizado: 17 de Diciembre de 2025*  
*Versión: 2.0 - Sistema Completo*

# 👥 Matriz de Permisos - ¿Quién Introduce Qué Datos?

## 🎯 **Filosofía de Diseño**

### **Principio Clave**:
- **Cliente**: Introduce sus datos diarios (peso, glucosa, comidas, actividad)
- **Coach**: Revisa, valida, corrige y añade feedback profesional
- **Admin**: Gestiona datos maestros y configuración

---

## 📊 **TABLA: PERMISOS POR ROL**

### **Leyenda**:
- ✅ **Puede crear/editar**
- 👁️ **Solo puede ver**
- ❌ **No tiene acceso**
- 🔒 **Solo admin**

---

## 1️⃣ **DATOS PERSONALES Y MAESTROS**

| Campo | Cliente | Coach | Admin |
|-------|---------|-------|-------|
| **Nombre, Apellidos** | 👁️ | ✅ | ✅ |
| **Email** | 👁️ | ✅ | ✅ |
| **Teléfono** | ✅ | ✅ | ✅ |
| **Dirección** | ✅ | ✅ | ✅ |
| **Fecha de Nacimiento** | 👁️ | ✅ | ✅ |
| **Género** | 👁️ | ✅ | ✅ |
| **Instagram, Telegram** | ✅ | ✅ | ✅ |
| **Coach Asignado** | 👁️ | 👁️ | 🔒 |
| **Estado (Activo/Pausado/Baja)** | 👁️ | ✅ | ✅ |
| **Fase del Programa** | 👁️ | ✅ | ✅ |
| **Fecha Inicio/Fin Contrato** | 👁️ | 👁️ | 🔒 |

**Razón**: Los datos maestros los gestiona el coach/admin. El cliente solo puede actualizar datos de contacto.

---

## 2️⃣ **DATOS MÉDICOS**

| Campo | Cliente | Coach | Admin |
|-------|---------|-------|-------|
| **Tipo de Diabetes** | 👁️ | ✅ | ✅ |
| **Años Diagnosticado** | 👁️ | ✅ | ✅ |
| **HbA1c Inicial** | 👁️ | ✅ | ✅ |
| **HbA1c Actual** | 👁️ | ✅ | ✅ |
| **Historial HbA1c** (`hba1c_history`) | ✅ | ✅ | ✅ |
| **Glucosa Inicial** | 👁️ | ✅ | ✅ |
| **Glucosa Actual** | 👁️ | ✅ | ✅ |
| **Lecturas de Glucosa** (`glucose_readings`) | ✅ | ✅ | ✅ |
| **Patologías** | 👁️ | ✅ | ✅ |
| **Medicación** | ✅ | ✅ | ✅ |
| **Insulina (tipo, dosis, hora)** | ✅ | ✅ | ✅ |
| **Usa Sensor Freestyle** | ✅ | ✅ | ✅ |

**Razón**: 
- **Cliente registra**: Glucosas diarias, cambios en medicación
- **Coach valida**: Datos médicos iniciales, HbA1c de laboratorio

---

## 3️⃣ **DATOS FÍSICOS Y PROGRESO**

| Campo | Cliente | Coach | Admin |
|-------|---------|-------|-------|
| **Altura** | 👁️ | ✅ | ✅ |
| **Peso Inicial** | 👁️ | ✅ | ✅ |
| **Peso Actual** | 👁️ | ✅ | ✅ |
| **Peso Objetivo** | 👁️ | ✅ | ✅ |
| **Historial de Peso** (`weight_history`) | ✅ | ✅ | ✅ |
| **Perímetro Abdominal** | ✅ | ✅ | ✅ |
| **Perímetro Brazo** | ✅ | ✅ | ✅ |
| **Perímetro Muslo** | ✅ | ✅ | ✅ |
| **Medidas Corporales** (`body_measurements`) | ✅ | ✅ | ✅ |
| **Fotos de Progreso** | ✅ | ✅ | ✅ |

**Razón**: 
- **Cliente registra**: Peso diario, medidas semanales, fotos
- **Coach valida**: Peso inicial, medidas iniciales, puede corregir errores

---

## 4️⃣ **NUTRICIÓN**

| Campo | Cliente | Coach | Admin |
|-------|---------|-------|-------|
| **Plan Nutricional (PDF)** | 👁️ | ✅ | ✅ |
| **Alergias** | ✅ | ✅ | ✅ |
| **Alimentos Vetados** | ✅ | ✅ | ✅ |
| **Preferencias Dietéticas** | ✅ | ✅ | ✅ |
| **Horarios de Comidas** | ✅ | ✅ | ✅ |
| **Registro de Comidas** (`meal_logs`) | ✅ | 👁️ + 💬 | 👁️ |
| **Fotos de Comidas** | ✅ | 👁️ + 💬 | 👁️ |
| **Feedback en Comidas** | 👁️ | ✅ | 👁️ |
| **Adherencia Score** | 👁️ | ✅ | 👁️ |

**Razón**: 
- **Cliente**: Sube fotos de comidas, registra qué comió
- **Coach**: Crea plan nutricional, da feedback, califica adherencia

---

## 5️⃣ **ACTIVIDAD FÍSICA**

| Campo | Cliente | Coach | Admin |
|-------|---------|-------|-------|
| **Nivel de Actividad** | ✅ | ✅ | ✅ |
| **Objetivo de Pasos** | 👁️ | ✅ | ✅ |
| **Lugar de Entrenamiento** | ✅ | ✅ | ✅ |
| **Lesiones** | ✅ | ✅ | ✅ |
| **Registro de Actividad** (`activity_logs`) | ✅ | ✅ | ✅ |
| **Pasos Diarios** | ✅ | 👁️ | 👁️ |
| **Ejercicios Realizados** | ✅ | 👁️ | 👁️ |

**Razón**: 
- **Cliente**: Registra pasos, ejercicios realizados
- **Coach**: Define objetivos, plan de entrenamiento

---

## 6️⃣ **CHECK-INS Y BIENESTAR**

| Campo | Cliente | Coach | Admin |
|-------|---------|-------|-------|
| **Check-in Diario** (`daily_checkins`) | ✅ | 👁️ | 👁️ |
| **Estado de Ánimo** | ✅ | 👁️ | 👁️ |
| **Nivel de Energía** | ✅ | 👁️ | 👁️ |
| **Calidad de Sueño** | ✅ | 👁️ | 👁️ |
| **Horas de Sueño** | ✅ | 👁️ | 👁️ |
| **Adherencia Percibida** | ✅ | 👁️ | 👁️ |
| **Agua Consumida** | ✅ | 👁️ | 👁️ |
| **Notas Personales** | ✅ | 👁️ | 👁️ |

**Razón**: 
- **Cliente**: Completa check-in diario (30 segundos)
- **Coach**: Ve tendencias, detecta problemas

---

## 7️⃣ **OBJETIVOS Y MOTIVACIÓN**

| Campo | Cliente | Coach | Admin |
|-------|---------|-------|-------|
| **Motivación Principal** | ✅ | ✅ | ✅ |
| **Objetivo 3 meses** | 👁️ | ✅ | ✅ |
| **Objetivo 6 meses** | 👁️ | ✅ | ✅ |
| **Objetivo 1 año** | 👁️ | ✅ | ✅ |
| **Objetivo Semanal** | 👁️ | ✅ | ✅ |
| **Historia de Éxito** | ✅ | ✅ | ✅ |
| **Testimonial** | ✅ | ✅ | ✅ |

**Razón**: 
- **Coach**: Define objetivos profesionales
- **Cliente**: Puede actualizar motivación, escribir testimonial

---

## 8️⃣ **SESIONES Y REVISIONES**

| Campo | Cliente | Coach | Admin |
|-------|---------|-------|-------|
| **Revisión Semanal (Video)** | 👁️ | ✅ | 👁️ |
| **Historial de Sesiones** (`coaching_sessions`) | 👁️ | ✅ | 👁️ |
| **Resumen de Sesión** | 👁️ | ✅ | 👁️ |
| **Tareas Asignadas** | 👁️ | ✅ | 👁️ |
| **Valoración de Sesión** | ✅ | 👁️ | 👁️ |
| **Notas de Sesión** | 👁️ | ✅ | 👁️ |

**Razón**: 
- **Coach**: Crea revisión, sube video, asigna tareas
- **Cliente**: Ve revisión, valora sesión (1-5 estrellas)

---

## 9️⃣ **COMUNICACIÓN**

| Campo | Cliente | Coach | Admin |
|-------|---------|-------|-------|
| **Mensajes** (`messages`) | ✅ | ✅ | 👁️ |
| **Enviar Mensaje** | ✅ | ✅ | ❌ |
| **Adjuntar Foto** | ✅ | ✅ | ❌ |
| **Ver Historial** | ✅ | ✅ | 👁️ |

**Razón**: 
- **Cliente y Coach**: Comunicación bidireccional
- **Admin**: Solo puede ver (para soporte)

---

## 🔟 **LOGROS Y GAMIFICACIÓN**

| Campo | Cliente | Coach | Admin |
|-------|---------|-------|-------|
| **Logros Desbloqueados** | 👁️ | 👁️ | 🔒 |
| **Puntos Totales** | 👁️ | 👁️ | 🔒 |
| **Racha Actual** | 👁️ | 👁️ | 🔒 |
| **Desbloquear Logro Manual** | ❌ | ✅ | ✅ |

**Razón**: 
- **Sistema automático**: Desbloquea logros según criterios
- **Coach**: Puede desbloquear logros manualmente (ej: "Esfuerzo Excepcional")

---

## 📋 **RESUMEN POR ROL**

### **👤 CLIENTE - Registra su día a día**

#### ✅ **Puede Introducir**:
1. **Peso diario** → `weight_history`
2. **Glucosa** (varias veces al día) → `glucose_readings`
3. **Fotos de comidas** → `meal_logs`
4. **Actividad física** (pasos, ejercicios) → `activity_logs`
5. **Check-in diario** (ánimo, sueño, energía) → `daily_checkins`
6. **Mensajes al coach** → `messages`
7. **Valoración de sesiones** → `coaching_sessions.client_feedback`
8. **Actualizar datos de contacto** (teléfono, dirección)
9. **Actualizar medicación** (si cambia)
10. **Fotos de progreso** → `body_measurements.photos`

#### 👁️ **Solo Puede Ver**:
- Su progreso (gráficos)
- Su plan nutricional
- Sus objetivos
- Sus revisiones semanales
- Sus logros
- Su coach asignado

#### ❌ **NO Puede**:
- Cambiar su coach
- Cambiar su fase
- Cambiar fechas de contrato
- Ver datos de otros clientes
- Editar datos médicos iniciales

---

### **👨‍🏫 COACH - Gestiona y supervisa**

#### ✅ **Puede Introducir**:
1. **Datos médicos iniciales** (diabetes, HbA1c inicial)
2. **Peso inicial y objetivo**
3. **Plan nutricional** (subir PDF)
4. **Objetivos** (3 meses, 6 meses, 1 año)
5. **Revisiones semanales** (video Loom) → `coaching_sessions`
6. **Feedback en comidas** → `meal_logs.coach_feedback`
7. **Adherencia score** → `meal_logs.adherence_score`
8. **Tareas asignadas** → `coaching_sessions.action_items`
9. **Notas de sesión** → `coaching_sessions.summary`
10. **Mensajes al cliente** → `messages`
11. **Corregir datos** (si el cliente se equivoca)
12. **Desbloquear logros manualmente**

#### 👁️ **Puede Ver**:
- Todos los datos de SUS clientes
- Progreso de sus clientes
- Check-ins diarios
- Registro de comidas
- Actividad física
- Mensajes

#### ❌ **NO Puede**:
- Cambiar coach asignado (solo admin)
- Cambiar fechas de contrato (solo admin)
- Ver clientes de otros coaches
- Dar de baja clientes (solo admin)

---

### **👔 ADMIN - Control total**

#### ✅ **Puede Introducir/Editar**:
1. **TODO lo que puede el coach**
2. **Asignar/cambiar coach**
3. **Cambiar estado** (activo, pausado, baja)
4. **Cambiar fase del programa**
5. **Fechas de contrato**
6. **Crear/editar usuarios** (coaches)
7. **Configuración del sistema**

#### 👁️ **Puede Ver**:
- **TODOS** los clientes (de todos los coaches)
- Métricas globales
- Reportes
- Mensajes (para soporte)

---

## 🎯 **FLUJO TÍPICO DE DATOS**

### **Día 1: Onboarding (Coach introduce)**
```
1. Coach crea ficha del cliente
2. Coach introduce:
   - Datos personales
   - Datos médicos iniciales
   - Peso inicial, objetivo
   - Alergias, preferencias
   - Objetivos
3. Coach sube plan nutricional (PDF)
4. Coach asigna objetivos
```

### **Día 2-90: Seguimiento Diario (Cliente introduce)**
```
1. Cliente se pesa → Registra peso
2. Cliente mide glucosa → Registra glucosa
3. Cliente come → Sube foto de comida
4. Cliente hace ejercicio → Registra actividad
5. Cliente completa check-in diario
```

### **Viernes: Revisión Semanal (Coach introduce)**
```
1. Coach revisa semana del cliente
2. Coach graba video de revisión (Loom)
3. Coach sube video → coaching_sessions
4. Coach escribe resumen
5. Coach asigna tareas para próxima semana
6. Coach da feedback en comidas
```

### **Cada 3 meses: Análisis (Coach introduce)**
```
1. Cliente hace análisis de sangre
2. Cliente registra nuevo HbA1c
3. Coach valida resultado
4. Coach actualiza objetivos si es necesario
```

---

## 🔒 **VALIDACIÓN Y SEGURIDAD**

### **Reglas de Negocio**:

#### **1. Peso**
```typescript
// Cliente puede registrar peso
if (user.role === 'client') {
  // Solo su propio peso
  if (weight_entry.client_id === user.id) {
    ✅ Permitir
  }
}

// Coach puede registrar/corregir peso
if (user.role === 'coach') {
  // Solo de sus clientes
  if (client.coach_id === user.id) {
    ✅ Permitir
  }
}
```

#### **2. Glucosa**
```typescript
// Cliente registra glucosa varias veces al día
if (user.role === 'client') {
  ✅ Permitir (su propia glucosa)
}

// Coach puede ver y corregir
if (user.role === 'coach') {
  ✅ Permitir ver
  ✅ Permitir editar (si hay error)
}
```

#### **3. Comidas**
```typescript
// Cliente sube foto de comida
if (user.role === 'client') {
  ✅ Permitir crear meal_log
  ❌ NO puede editar adherence_score
  ❌ NO puede editar coach_feedback
}

// Coach da feedback
if (user.role === 'coach') {
  ✅ Permitir ver meal_logs de sus clientes
  ✅ Permitir añadir coach_feedback
  ✅ Permitir calificar adherence_score (1-5)
}
```

#### **4. Revisiones**
```typescript
// Solo coach crea revisiones
if (user.role === 'coach') {
  ✅ Permitir crear coaching_session
  ✅ Permitir subir video
  ✅ Permitir escribir resumen
}

// Cliente solo valora
if (user.role === 'client') {
  👁️ Ver revisión
  ✅ Valorar sesión (1-5 estrellas)
  ❌ NO puede editar
}
```

---

## 📱 **INTERFACES POR ROL**

### **Portal del Cliente**:
```
┌─────────────────────────────────────┐
│ Dashboard                           │
│ - Ver progreso                      │
│ - Ver gráficos                      │
│                                     │
│ Registrar Datos                     │
│ - ✅ Peso                           │
│ - ✅ Glucosa                        │
│ - ✅ Foto de comida                 │
│ - ✅ Actividad                      │
│ - ✅ Check-in diario                │
│                                     │
│ Mi Plan                             │
│ - 👁️ Ver plan nutricional          │
│ - 👁️ Ver objetivos                 │
│                                     │
│ Revisiones                          │
│ - 👁️ Ver videos                    │
│ - ✅ Valorar sesión                 │
│                                     │
│ Chat                                │
│ - ✅ Enviar mensaje                 │
│ - ✅ Adjuntar foto                  │
└─────────────────────────────────────┘
```

### **Panel del Coach**:
```
┌─────────────────────────────────────┐
│ Mis Clientes                        │
│ - 👁️ Ver todos mis clientes        │
│ - ✅ Editar fichas                  │
│                                     │
│ Revisiones                          │
│ - ✅ Crear revisión semanal         │
│ - ✅ Subir video                    │
│ - ✅ Asignar tareas                 │
│                                     │
│ Seguimiento                         │
│ - 👁️ Ver comidas de clientes       │
│ - ✅ Dar feedback                   │
│ - ✅ Calificar adherencia           │
│ - 👁️ Ver check-ins                 │
│ - 👁️ Ver actividad                 │
│                                     │
│ Gestión                             │
│ - ✅ Subir planes nutricionales     │
│ - ✅ Actualizar objetivos           │
│ - ✅ Registrar datos médicos        │
│                                     │
│ Chat                                │
│ - ✅ Responder mensajes             │
└─────────────────────────────────────┘
```

---

## ✅ **RECOMENDACIÓN FINAL**

### **División Clara**:

**Cliente = Ejecutor**
- Registra su día a día
- Sube evidencias (fotos, datos)
- Completa check-ins
- Comunica con coach

**Coach = Supervisor**
- Define planes y objetivos
- Revisa y valida
- Da feedback profesional
- Ajusta estrategia

**Admin = Gestor**
- Asigna coaches
- Gestiona contratos
- Ve métricas globales
- Configura sistema

---

*Documento creado: 12 de Diciembre de 2025*  
*Versión: 1.0*

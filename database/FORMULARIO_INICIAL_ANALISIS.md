# 📝 Análisis: Formulario Inicial del Cliente

## 🎯 **DESCUBRIMIENTO CLAVE**

El cliente **SÍ introduce muchos datos iniciales** a través del formulario de onboarding (Notion/Typeform).

---

## 📋 **DATOS QUE EL CLIENTE INTRODUCE EN EL FORMULARIO**

### **Ejemplo Real: Cristina Lindoso**

#### **1. Datos Personales**
- Nombre: Cristina
- Apellidos: Lindoso alvarez
- Fecha nacimiento: 19 Feb 1975
- Sexo: Mujer
- Email: crislin75@gmail.com
- Teléfono: +34654361960
- Dirección: C Carmen 17 22400
- Población: Jaca
- Provincia: Huesca

#### **2. Datos Médicos**
- Enfermedades: Sobrepeso, Condropatía Rotuliana
- Otras: Tuvo artritis hace 2 años
- Medicación: Ninguna
- Usa insulina: No
- Glucosa ayunas: 0 (no diabética)
- HbA1c: 0 (no diabética)

#### **3. Datos Físicos**
- Peso actual: 90kg
- Peso objetivo: 70kg
- Altura: 170cm
- Perímetro brazo: 35cm
- Perímetro barriga: 110cm
- Perímetro muslo: 59cm

#### **4. Actividad**
- Pasos diarios: 7.000-10.000
- Horario trabajo: 12:00-17:00 y 17:30-24:00
- Tipo trabajo: Activo (>5-6k pasos)
- Experiencia fuerza: Lo probó pero no perseveró
- Lugar entrenamiento: Casa

#### **5. Objetivos**
- 3 meses: Perder 15kg
- 6 meses: Llegar a 70kg
- 1 año: Mantenerme
- Por qué confía: "Programa serio"

#### **6. Nutrición**
- Preferencias: Sin carne roja, verduras
- No quiere: Judías blancas
- Consume: Pollo, pescado, legumbres, huevos, pan, verduras
- Alergias: Lactosa
- Comidas/día: >5 ingestas
- Horarios: Desayuno 13:00, Comida 17:00, Cena 23:00
- Cocina: Sí
- Pesar comida: Dispuesta temporalmente
- Come fuera: 5 veces/semana
- Pan: Siempre
- Pica: Sí (pan y embutido)
- Bebe: Cerveza
- Alcohol: >4 veces/semana
- Antojos: Sí (pan)
- Última 24h: Pan con embutido, judías verdes con patatas
- TCA: No
- Situaciones: Antojos por tarde, come con estrés

#### **7. Coach**
- Coach asignado: Helena

---

## 🔄 **FLUJO REAL ACTUALIZADO**

### **Paso 1: Cliente rellena formulario** ✅
```
Cliente introduce en Notion/Typeform:
✅ TODOS los datos personales
✅ TODOS los datos médicos
✅ TODOS los datos físicos iniciales
✅ TODAS las preferencias nutricionales
✅ TODOS los objetivos
✅ Selecciona coach
```

### **Paso 2: Datos llegan a Supabase** ✅
```
Se guardan en: clientes_pt_notion
- 97 campos poblados
- Estado: Activo
- Fecha inicio: 9 Dic 2025
```

### **Paso 3: Coach valida** ✅
```
Coach (Helena):
👁️ Revisa todos los datos
✅ Valida información
✅ Crea plan nutricional basado en:
   - Sin carne roja
   - Sin judías blancas
   - Sin lactosa
   - Horarios: 13:00, 17:00, 23:00
✅ Sube plan (PDF)
```

### **Paso 4: Cliente accede al portal** ✅
```
Cliente ve:
👁️ Sus datos iniciales
👁️ Su peso inicial (90kg)
👁️ Su objetivo (70kg)
👁️ Su plan nutricional
👁️ Su coach (Helena)

Cliente puede:
✅ Registrar peso diario
✅ Subir fotos de comidas
✅ Hacer check-in diario
✅ Ver su progreso
```

---

## 📊 **IMPLICACIONES PARA EL PORTAL**

### **1. Datos Iniciales YA Existen**
```
Cuando Cristina entre al portal:
✅ Ya tiene peso inicial: 90kg
✅ Ya tiene objetivo: 70kg
✅ Ya tiene medidas: 110cm barriga
✅ Ya tiene preferencias: sin carne roja, sin lactosa
✅ Ya tiene objetivos: -15kg en 3 meses
✅ Ya tiene coach: Helena
```

### **2. Dashboard Debe Mostrar**
```
🎯 TU PROGRESO
Peso: 90kg → 87kg → 70kg (objetivo)
[████████░░░░░░░░░░] 15%
-3kg perdidos 🎉

Perímetro Barriga:
110cm → 108cm (-2cm) ✅

📊 TUS OBJETIVOS
🎯 3 meses: Perder 15kg
🎯 6 meses: Llegar a 70kg
🎯 1 año: Mantenerme

🍽️ TU PLAN
Basado en tus preferencias:
✅ Sin carne roja
✅ Sin lactosa
✅ Sin judías blancas
[Ver plan completo →]

👩‍⚕️ TU COACH
Helena
[Enviar mensaje →]
```

### **3. Cliente Puede Actualizar**
```
✅ Teléfono
✅ Dirección
✅ Preferencias nutricionales
✅ Medicación (si cambia)

❌ NO puede cambiar:
- Nombre, apellidos
- Fecha nacimiento
- Peso inicial
- Coach asignado
```

---

## 🗄️ **MIGRACIÓN DE DATOS**

### **Poblar Historial Inicial**:
```sql
-- Peso inicial
INSERT INTO weight_history (client_id, date, weight, source)
SELECT id, start_date, 90, 'initial'
FROM clientes_pt_notion
WHERE email = 'crislin75@gmail.com';

-- Medidas iniciales
INSERT INTO body_measurements (client_id, date, waist, arms, thighs)
SELECT id, start_date, 110, 35, 59
FROM clientes_pt_notion
WHERE email = 'crislin75@gmail.com';
```

---

## ✅ **CONCLUSIÓN**

**El cliente introduce MUCHOS datos en el formulario inicial**. El portal debe:

1. ✅ Mostrar estos datos iniciales
2. ✅ Permitir actualizar algunos (contacto, preferencias)
3. ✅ Comparar inicial vs actual (progreso)
4. ✅ Permitir registrar datos diarios (peso, glucosa, comidas)

**Flujo**:
Cliente rellena formulario → Datos en Supabase → Coach valida → Cliente accede al portal → Seguimiento diario

---

*Análisis: 12 Diciembre 2025*

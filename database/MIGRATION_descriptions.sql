-- ============================================================
-- MIGRACIÓN: Descripciones reales de programas y sesiones
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- 1. Añadir columna presentation a training_programs
ALTER TABLE public.training_programs 
  ADD COLUMN IF NOT EXISTS presentation TEXT,
  ADD COLUMN IF NOT EXISTS objectives TEXT,
  ADD COLUMN IF NOT EXISTS what_you_find TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'intermedio',
  ADD COLUMN IF NOT EXISTS target_audience TEXT;

-- 2. Añadir columna instructions a training_workouts
ALTER TABLE public.training_workouts
  ADD COLUMN IF NOT EXISTS instructions TEXT;

-- 3. Añadir title y description a training_program_days
ALTER TABLE public.training_program_days
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Actualizar programas con descripciones reales
UPDATE public.training_programs SET
  description = 'Programa diseñado para incorporar la actividad física a personas mayores de 60 años.',
  presentation = 'Aurum es un programa diseñado para ayudar a incorporar la actividad física en el día a personas de más de 60 años que realizan poca actividad física. ¡Sin lugar a dudas es ahora cuando más necesario es moverse! Mejora físicamente sin sobrecargar tu musculatura y articulaciones. Lleva un estilo de vida saludable, mantente en forma y reduce los síntomas relacionados con enfermedades crónicas cardiacas, artritis, osteoporosis y obesidad.',
  objectives = '- Prevenir enfermedades cardiovasculares.

- Evitar la pérdida de masa muscular.

- Mejorar el acondicionamiento general.',
  what_you_find = '- Sesiones sin impacto para cuidar las articulaciones.

- Programa de entrenamiento enfocado a trabajar el equilibrio, la flexibilidad, la movilidad y la fuerza.

- Ejercicios efectivos con una intensidad moderada, que va en aumento, para que incorpores nuevas habilidades.

- 12 sesiones de entrenamiento globales.',
  difficulty = 'principiante',
  target_audience = 'Personas mayores de 60 años con poca actividad física'
WHERE id = '57e0f665-f782-4920-83eb-3a420484720d';

UPDATE public.training_programs SET
  description = 'Entrena como lo hacía el ser humano en la prehistoria con ejercicios funcionales a alta intensidad.',
  presentation = 'Entrena como la hacía el ser humano en la prehistoria. Acostumbra a tu cuerpo a entrenar a alta intensidad con ejercicios funcionales que usan solamente el propio cuerpo.',
  objectives = '- Mejorar el acondicionamiento general.

- Ganar más intensidad en tus entrenamientos.',
  what_you_find = '- 20 sesiones de entrenamiento totales.

- Ejercicios efectivos con una intensidad, que va en aumento, para que incorpores nuevas habilidades.

- Sesiones de entrenamiento sin la necesidad de contar con material extra.',
  difficulty = 'intermedio',
  target_audience = 'Personas que quieren entrenar a alta intensidad con peso corporal'
WHERE id = 'ad9181a8-b8b7-46b5-9706-620cb27b2d2f';

-- 5. Actualizar instrucciones de sesiones AURUM
UPDATE public.training_workouts SET instructions = '1) Realiza 3 Sets de superseries de los ejercicios descritos. Cada superserie consiste en completar 3 vueltas de los ejercicios indicados con 60 segundos de descanso entre vueltas.

2) Termina la sesión completando 3 vueltas del siguiente circuito de ejercicios tan rápido como puedas. Descansa 60 segundos entre vueltas.' WHERE id = '4e95e6cb-28a1-46bf-b2ec-8f3234ba8cbe';
UPDATE public.training_workouts SET instructions = '1) Completa 5 vueltas del ejercicio indicado. No hay pausas programadas entre vueltas pero puedes descansar si lo necesitas. 

2) Descansa 60 segundos antes de pasar al siguiente bloque. 

3) Realiza 3 Sets de superseries de los ejercicios descritos. Cada superserie consiste en completar 3 vueltas de los ejercicios indicados con 60 segundos de descanso entre vueltas.' WHERE id = 'd0c15339-f886-43d1-bcdb-9d6ede7bcb5c';
UPDATE public.training_workouts SET instructions = '1) Completa 5 vueltas del ejercicio indicado. No hay pausas programadas entre vueltas pero puedes descansar si lo necesitas. 

2) Descansa 60 segundos antes de pasar al siguiente bloque. 

3) Completa 6 vueltas del siguiente circuito de ejercicios, empezando con 6 repeticiones por ejercicio y reduciendo 1 repetición en cada vuelta.' WHERE id = '4e7546f3-77c5-4e71-898a-71342a7d3b6e';
UPDATE public.training_workouts SET instructions = '1) Completa 5 vueltas del ejercicio indicado. No hay pausas programadas entre vueltas pero puedes descansar si lo necesitas. 

2) Descansa 60 segundos antes de pasar al siguiente bloque. 

3) Termina la sesión completando 4 vueltas del siguiente circuito de ejercicios tan rápido como puedas. Descansa 30 segundos entre vueltas.' WHERE id = '494dd26b-79cc-4f13-998c-5b14b99bdac6';
UPDATE public.training_workouts SET instructions = '1) Completa 8 vueltas del siguiente circuito de ejercicios, empezando con 8 repeticiones por ejercicio y reduciendo 1 repetición en cada vuelta. 

2) Descansa 60 segundos antes de pasar al siguiente bloque. 

3) Termina la sesión completando 1 vuelta del siguiente circuito de ejercicios tan rápido como puedas.' WHERE id = 'd32d7d89-5e0b-48a0-99cb-51887f3b3d0f';
UPDATE public.training_workouts SET instructions = '1) Completa 4 vueltas del ejercicio indicado. No hay pausas programadas entre vueltas pero puedes descansar si lo necesitas.

2) Descansa 60 segundos antes de pasar al siguiente bloque. 

3) Termina la sesión completando 4 vueltas del siguiente circuito de ejercicios tan rápido como puedas. Descansa 60 segundos entre vueltas.' WHERE id = '4cca32e8-17eb-48c4-9aa2-8d91f57e9e95';
UPDATE public.training_workouts SET instructions = '1) Completa un bloque de tábata (4 vueltas de un circuito de 20 segundos de trabajo y 10 segundos de descanso) para el ejercicio indicado. 

2) Descansa 60 segundos antes de pasar al siguiente bloque. 

3) Termina la sesión completando 3 vueltas del siguiente circuito de ejercicios tan rápido como puedas. Descansa 60 segundos entre vueltas.' WHERE id = 'c9f7d7f1-49ac-4909-bb5c-0d725793985b';
UPDATE public.training_workouts SET instructions = '1) Completa 5 vueltas del ejercicio indicado. No hay pausas programadas entre vueltas pero puedes descansar si lo necesitas. 

2) Descansa 60 segundos antes de pasar al siguiente bloque. 

3) Termina la sesión completando 4 vueltas del siguiente circuito de ejercicios tan rápido como puedas. Descansa 60 segundos entre vueltas.' WHERE id = '16d5d67d-4e21-4ccd-a3ad-452b10543805';
UPDATE public.training_workouts SET instructions = '1) Completa 5 vueltas del ejercicio indicado. No hay pausas programadas entre vueltas pero puedes descansar si lo necesitas. 

2) Descansa 60 segundos antes de pasar al siguiente bloque. 

3) Realiza 3 Sets de superseries de los ejercicios descritos. Cada superserie consiste en completar 3 vueltas de los ejercicios indicados. No hay pausas programadas entre vueltas pero puedes descansar si lo necesitas. Descansa 60 segundos entre cada bloque.' WHERE id = '9a88af7b-392f-4ade-a0b7-96e1441a2227';
UPDATE public.training_workouts SET instructions = '1) Completa 1 vuelta del ejercicio indicado. No hay pausas programadas pero puedes descansar si lo necesitas. 

2) Descansa 60 segundos antes de pasar al siguiente bloque. 

3) Completa un bloque de tábata (8 vueltas de un circuito de 20 segundos de trabajo y 10 segundos de descanso) para el ejercicio indicado. 

4) Descansa 60 segundos antes de pasar al siguiente bloque. 5) Completa 2 vueltas del circuito tan rápido como puedas. Intercala 30 segundos de skipping rodillas codos entre cada ejercicio.' WHERE id = '4fd51b57-3ca2-4699-9d80-59dbe095c924';
UPDATE public.training_workouts SET instructions = '1) Completa 3 bloques de tábata (8 vueltas de un circuito de 20 segundos de trabajo y 10 segundos de descanso) para el ejercicio indicado. Descansa 60 segundos entre bloques.' WHERE id = 'ef27f319-aee3-472c-9e37-5a338c1f3e5f';
UPDATE public.training_workouts SET instructions = '1) Completa 8 vueltas del siguiente circuito de ejercicios, empezando con 8 repeticiones por ejercicio y reduciendo 1 repetición en cada vuelta.' WHERE id = 'a18b6e9b-99a5-449c-9eb6-434acace89a5';

-- Sesiones PRIMAL
UPDATE public.training_workouts SET instructions = '1) Completa 3 vueltas del siguiente circuito de ejercicios tan rápido como puedas. No hay descanso entre ejercicios. 

2) Descansa 60 segundos. 

3) Completa 4 vueltas del siguiente circuito de ejercicios tan rápido como puedas. No hay descanso entre ejercicios. 

4) Descansa 60 segundos. 

5) Completa 2 bloques de tábata (4 vueltas de un circuito de 30 segundos de trabajo y 30 segundos de descanso) para cada uno de los ejercicios indicados. Realiza la mayor cantidad de repeticiones posibles en cada serie. Descansa 3 minutos entre bloques. 

6) Descansa 180 segundos. 

7) Completa 4 vueltas del siguiente circuito de ejercicios tan rápido como puedas. No hay descanso entre ejercicios.' WHERE id = '52c1c45f-8458-4a62-b6e8-60ba5ff57005';
UPDATE public.training_workouts SET instructions = '1) Completa 6 vueltas del siguiente circuito de ejercicios, empezando con 6 repeticiones por ejercicio y reduciendo 1 repetición en cada vuelta.' WHERE id = '0220d6e5-e4c0-4e25-b897-91d83f96ec88';
UPDATE public.training_workouts SET instructions = '1) Realiza 9 sprints con una duración de 20 segundos. 2) Descansa 2 minutos entre sprints.' WHERE id = '9b1bffbc-9c8a-4eed-8739-8248f58b8a0b';
UPDATE public.training_workouts SET instructions = '1) Completa 1 bloque de tábata (5 vueltas de un circuito de 30 segundos de trabajo y 30 segundos de descanso) para cada uno de los ejercicios indicados. Tu objetivo es realizar la mayor cantidad de repeticiones posibles en cada serie. 

2) Descansa 60 segundos. 

3) Completa 1 bloque de tábata (4 vueltas de un circuito de 40 segundos de trabajo y 20 segundos de descanso) para cada uno de los ejercicios indicados. Tu objetivo es realizar la mayor cantidad de repeticiones posibles en cada serie. 

4)Descansa 60 segundos. 

5) Completa 1 bloque de tábata (3 vueltas de un circuito de 50 segundos de trabajo y 10 segundos de descanso) para cada uno de los ejercicios indicados. Tu objetivo es realizar la mayor cantidad de repeticiones posibles en cada serie.' WHERE id = '0095c31e-55ae-439b-85dd-c8b46b6d70d2';
UPDATE public.training_workouts SET instructions = '1) Completa 4 vueltas del siguiente circuito de ejercicios tan rápido como puedas. No hay descanso entre ejercicios. 

2) Descansa 3 minutos. 

3) Completa 5 vueltas del siguiente circuito de ejercicios tan rápido como puedas. No hay descanso entre ejercicios.' WHERE id = '9fd08276-f2f3-4dd0-98fc-b22e0917a229';
UPDATE public.training_workouts SET instructions = '1) Completa 3 vueltas del siguiente circuito de ejercicios tan rápido como puedas. No hay descanso entre ejercicios.' WHERE id = '89b5747c-1a1a-465c-a057-27256e229cd1';
UPDATE public.training_workouts SET instructions = '1) Completa 5 bloques de tábata (8 vueltas de un circuito de 20 segundos de trabajo y 10 segundos de descanso) para cada uno de los ejercicios indicados. Tu objetivo es realizar la mayor cantidad de repeticiones posibles en cada serie. 

2) Descansa 60 segundos entre bloques.' WHERE id = '61ab1809-50a3-4385-8f7b-f55d4e11f9aa';
UPDATE public.training_workouts SET instructions = '1) Completa 5 vueltas del siguiente circuito de ejercicios tan rápido como puedas. No hay descanso entre ejercicios. 

2) Descansa 60 segundos. 

3) Completa 5 vueltas del siguiente circuito de ejercicios tan rápido como puedas. No hay descanso entre ejercicios. 

4) Descansa 3 minutos. 

5) Completa 2 bloques de tábata (5 vueltas de un circuito de 30 segundos de trabajo y 30 segundos de descanso) para cada uno de los ejercicios indicados. Tu objetivo es realizar la mayor cantidad de repeticiones posibles en cada serie. Descansa 3 minutos entre bloques. 

6) Descansa 180 segundos. 

7) Completa 5 vueltas del siguiente circuito de ejercicios tan rápido como puedas. No hay descanso entre ejercicios.' WHERE id = '339f49ff-83d9-4e42-b0fc-63f86ff94191';
UPDATE public.training_workouts SET instructions = '1) Completa 8 vueltas del siguiente circuito de ejercicios, empezando con 8 repeticiones por ejercicio y reduciendo 1 repetición en cada vuelta.' WHERE id = '89bb3df2-cd18-43fd-a3e3-fa604b023fac';
UPDATE public.training_workouts SET instructions = '1) Realiza 9 sprints con una duración de 20 segundos. 

2) Descansa 2 minutos entre sprints.' WHERE id = 'e8fd29fc-18d3-425a-a567-c3f6c27396fe';
UPDATE public.training_workouts SET instructions = '1) Completa 15 vueltas del siguiente circuito de ejercicios, empezando con 15 repeticiones por ejercicio y reduciendo 1 repetición en cada vuelta.' WHERE id = '43a1a200-4171-4b03-8962-672c549a64fc';
UPDATE public.training_workouts SET instructions = '1) Completa 3 vueltas del siguiente circuito de ejercicios tan rápido como puedas. No hay descanso entre ejercicios. 

2) Descansa 60 segundos. 

3) Completa 1 bloque de tábata (8 vueltas de un circuito de 20 segundos de trabajo y 10 segundos de descanso) para cada uno de los ejercicios indicados. Tu objetivo es realizar la mayor cantidad de repeticiones posibles en cada serie.' WHERE id = 'ee0b3d40-8766-4c00-a2ee-b3808642431a';
UPDATE public.training_workouts SET instructions = 'Intervalo a Repeticiones con Pausa & Tábata' WHERE id = 'ce2063ab-d9df-4e79-9efa-2ae2f781739b';
UPDATE public.training_workouts SET instructions = '1) Completa 15 vueltas del siguiente circuito de ejercicios, empezando con 15 repeticiones por ejercicio y reduciendo 1 repetición en cada vuelta. 

2) Descansa 60 segundos. 

3) Completa 1 bloque de tábata (8 vueltas de un circuito de 20 segundos de trabajo y 10 segundos de descanso) para cada uno de los ejercicios indicados. Tu objetivo es realizar la mayor cantidad de repeticiones posibles en cada serie.' WHERE id = 'da209389-4582-4bff-b21a-59a6a3436257';
UPDATE public.training_workouts SET instructions = '1) Completa el siguiente circuito de ejercicios en el tiempo indicado: Realiza una carrera de 7 minutos de duración. Descansa 6 minutos. Realiza una carrera de 5 minutos de duración. Descansa 4 minutos. Realiza una carrera de 3 minutos de duración. Descansa 2 minutos. Realiza una carrera de 1 minuto de duración.' WHERE id = 'cb9634b6-20f1-4171-9ac3-26316fe5a62a';
UPDATE public.training_workouts SET instructions = 'Intervalo a Repeticiones & Intervalo a Repeticiones con Pausa' WHERE id = '608bd638-b3a7-41b3-9a9d-3a27c4515685';
UPDATE public.training_workouts SET instructions = '1) Completa 6 vueltas del siguiente circuito de ejercicios tan rápido como puedas. No hay descanso entre ejercicios. 

2) Descansa 3 minutos. 

3) Realiza 2 sprints con una duración de 20 segundos. 

4) Descansa 60 segundos entre sprints.' WHERE id = 'c6df6464-1ec6-4b34-b800-a3407aa5afa0';
UPDATE public.training_workouts SET instructions = '1) Completa 4 vueltas del siguiente circuito de ejercicios tan rápido como puedas. No hay descanso entre ejercicios.' WHERE id = '04c6c822-4bc5-431b-b101-1ffabcee9788';
UPDATE public.training_workouts SET instructions = '1) Completa 4 vueltas del siguiente circuito de ejercicios tan rápido como puedas. No hay descanso entre ejercicios. 

2) Descansa 60 segundos. 

3) Completa 3 vueltas del siguiente circuito de ejercicios tan rápido como puedas. No hay descanso entre ejercicios.' WHERE id = '9b72bccd-903b-49c4-a918-f04475177aa0';
UPDATE public.training_workouts SET instructions = '1) Completa 3 bloques de tábata (8 vueltas de un circuito de 20 segundos de trabajo y 10 segundos de descanso) para cada uno de los ejercicios indicados. Tu objetivo es realizar la mayor cantidad de repeticiones posibles en cada serie. Descansa 60 segundos entre bloques. 

2) Descansa 60 segundos. 

3) Realiza una carrera corta de 8 minutos de duración. 

4) Descansa 60 segundos. 

5) Completa 3 bloques de tábata (8 vueltas de un circuito de 20 segundos de trabajo y 10 segundos de descanso) para cada uno de los ejercicios indicados. Tu objetivo es realizar la mayor cantidad de repeticiones posibles en cada serie. Descansa 60 segundos entre bloques. 

6) Descansa 60 segundos. 

7) Realiza una carrera corta de 8 minutos de duración.' WHERE id = '28a33acd-3f42-47b6-ba99-24e19d90c1df';

-- ============================================================
SELECT '✅ Descripciones actualizadas correctamente!' AS resultado;

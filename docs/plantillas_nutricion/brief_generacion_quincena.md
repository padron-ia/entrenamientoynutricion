# Brief para Generar Plan Quincenal

Usa este brief para pedirme un plan nuevo y mantener el mismo criterio en cada quincena.

```text
Tipo de dieta: Flexible
Calorias objetivo: 1400
Mes: {{1-12}}
Quincena: {{1|2}}
Reglas de exclusion: tofu, soja
Objetivo clinico principal: {{ej. perdida grasa + control glucemico}}
Estacionalidad: productos y preparaciones del mes correspondiente
Estructura: 8 desayunos, 8 comidas, 8 cenas, 6 snacks
Bloques kcal:
- breakfast: 340-355
- lunch: 490-510
- dinner: 405-420
- snack: 140-150
Requisito de variedad: recetas distintas a la quincena anterior
Formato de salida: JSON compatible con JsonMealImporter (plan + recipes)
Campo image_url: opcional (vacio o placeholder)
```

## Nota

- Si se quiere reutilizar un plan anterior, indicar `plan_id` base y yo genero variaciones manteniendo bloques.

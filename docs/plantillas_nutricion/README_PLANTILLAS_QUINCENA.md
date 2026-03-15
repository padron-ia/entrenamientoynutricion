# Plantillas Quincenales de Nutricion

Este directorio guarda la plantilla base para generar planes quincenales en formato JSON compatible con `JsonMealImporter`.

## Objetivo

- Estandarizar la creacion de planes por quincena.
- Mantener bloques caloricos estables para que el total diario se acerque al objetivo.
- Facilitar generacion fuera del CRM y posterior importacion.

## Reglas base (Flexible)

- Permitido: alimentacion variada.
- Excluido: tofu y soja.
- Estacionalidad: recetas y tecnicas acordes al mes/quincena.
- Diferenciacion: evitar repetir recetas de la quincena anterior.

## Distribucion recomendada para 1400 kcal

- `breakfast`: 340-355 kcal
- `lunch`: 490-510 kcal
- `dinner`: 405-420 kcal
- `snack`: 140-150 kcal

## Estructura recomendada por quincena

- 8 recetas de `breakfast`
- 8 recetas de `lunch`
- 8 recetas de `dinner`
- 6 recetas de `snack`

Total: 30 recetas.

## Flujo de uso

1. Copiar `plantilla_plan_quincenal_flexible_1400.json`.
2. Completar metadatos del bloque `plan` (mes, quincena, tags, instrucciones).
3. Generar recetas nuevas respetando rangos por bloque.
4. Importar en CRM con `JsonMealImporter`.
5. Revisar en editor y publicar cuando proceda.

## Checklist rapido de calidad

- [ ] Formato JSON valido (`plan` + `recipes`).
- [ ] 30 recetas en distribucion 8/8/8/6.
- [ ] Sin tofu ni soja.
- [ ] Macros y calorias informadas en cada receta.
- [ ] `preparation` informado en todas las recetas.
- [ ] Recetas distintas a la quincena previa.

## Regla antirepeticion (obligatoria)

- El sistema bloquea la importacion si el solape de nombres de recetas con la quincena anterior (mismo `diet_type` + `target_calories`) supera el 20%.
- Para que la validacion funcione, el JSON debe incluir `target_month` y `target_fortnight` en `plan`.

# Runbook de Incidente en Produccion (EasyPanel)

Objetivo: restaurar acceso de clientes en menos de 15 minutos si un despliegue falla.

## 1) Deteccion

- Sintomas criticos:
  - Login de clientes no funciona
  - App no carga en la URL de produccion
  - Error 5xx o pantalla en blanco tras deploy

## 2) Contencion inmediata (0-2 min)

1. Detener cambios nuevos a `main` (no mergear PRs hasta resolver).
2. Confirmar en EasyPanel el ultimo deploy fallido.

## 3) Recuperacion por rollback (2-8 min)

1. Abrir EasyPanel > App de produccion > Deployments.
2. Seleccionar el deployment estable anterior.
3. Ejecutar rollback/redeploy de esa version.
4. Esperar estado `healthy`.

## 4) Verificacion funcional minima (8-12 min)

1. Abrir URL de produccion.
2. Validar login de admin.
3. Validar login de cliente.
4. Validar carga de dashboard principal.

Si alguno falla, repetir rollback al deployment previo.

## 5) Verificacion tecnica (paralela)

- Revisar variables en EasyPanel:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Revisar logs del deploy y runtime.
- Confirmar que la rama conectada sea `main`.

## 6) Cierre del incidente (12-15 min)

1. Confirmar servicio operativo con evidencias (capturas/logs).
2. Comunicar estado: recuperado + causa preliminar.
3. Crear tarea de correccion definitiva antes del siguiente despliegue.

## Checklist rapido (copiar/pegar)

- [ ] Congelados nuevos merges a `main`
- [ ] Rollback aplicado en EasyPanel
- [ ] App cargando en produccion
- [ ] Login admin OK
- [ ] Login cliente OK
- [ ] Dashboard OK
- [ ] Variables de entorno revisadas
- [ ] Incidente comunicado y cerrado

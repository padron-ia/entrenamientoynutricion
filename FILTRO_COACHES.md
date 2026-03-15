# 🔒 Filtro de Clientes por Coach

## 📋 Implementación de Row Level Security (RLS)

### ✅ Funcionalidad Implementada

Los **coaches** ahora solo ven los clientes que tienen asignados, mientras que los **admins** ven todos los clientes.

---

## 🎯 Cómo Funciona

### Roles y Permisos

| Rol | Clientes que ve |
|-----|-----------------|
| **Admin** | 👁️ Todos los clientes |
| **Coach** | 👁️ Solo sus clientes asignados |
| **Cliente** | 👁️ Solo su propia ficha |

---

## 🔍 Lógica de Filtrado

### Para Coaches

El sistema filtra clientes comparando el campo `coach_id` del cliente con el nombre del coach:

```typescript
if (currentUser.role === UserRole.COACH) {
  clients = clients.filter(c => {
    const clientCoach = (c.coach_id || '').toLowerCase().trim();
    const currentCoachName = (currentUser.name || '').toLowerCase().trim();
    const currentCoachEmail = (currentUser.email || '').toLowerCase().trim();
    
    return clientCoach === currentCoachName || 
           clientCoach === currentCoachEmail ||
           clientCoach.includes(currentCoachName) ||
           clientCoach.includes(currentCoachEmail.split('@')[0]);
  });
}
```

### Métodos de Coincidencia

El filtro es **flexible** y busca coincidencias de varias formas:

1. **Por nombre exacto**: `"Ana García" === "Ana García"`
2. **Por email**: `"ana@coach.com" === "ana@coach.com"`
3. **Por nombre parcial**: `"Ana García".includes("Ana")`
4. **Por usuario de email**: `"ana@coach.com".includes("ana")`

---

## 📊 Ejemplos de Uso

### Ejemplo 1: Coach con Clientes Asignados

**Coach**: Ana García (`ana@coach.com`)

**Clientes en la base de datos**:
```
Cliente 1: coach_id = "Ana García"     ✅ Se muestra
Cliente 2: coach_id = "Pedro López"    ❌ No se muestra
Cliente 3: coach_id = "Ana García"     ✅ Se muestra
Cliente 4: coach_id = "ana@coach.com"  ✅ Se muestra
Cliente 5: coach_id = null             ❌ No se muestra
```

**Resultado**: Ana ve 3 clientes (1, 3 y 4)

### Ejemplo 2: Admin

**Admin**: Admin Demo (`admin@demo.com`)

**Resultado**: Ve **TODOS** los clientes (1, 2, 3, 4, 5)

---

## 🧪 Cómo Probar

### Paso 1: Crear un Coach

1. Login como Admin (`admin@demo.com` / `123456`)
2. Ve a "Configuración del Equipo"
3. Crea un coach:
   - Nombre: "Test Coach"
   - Email: "test@coach.com"
   - Rol: Coach
   - Contraseña: "123456"

### Paso 2: Asignar Clientes al Coach

1. Ve a "Cartera de Clientes"
2. Selecciona un cliente
3. En la ficha del cliente, busca el campo "Coach Asignado"
4. Cámbialo a "Test Coach"
5. Guarda los cambios
6. Repite con 2-3 clientes más

### Paso 3: Verificar el Filtro

1. Cierra sesión
2. Login como el coach (`test@coach.com` / `123456`)
3. Ve a "Dashboard" o "Cartera de Clientes"
4. ✅ Deberías ver **solo** los clientes asignados a "Test Coach"

### Paso 4: Verificar como Admin

1. Cierra sesión
2. Login como Admin (`admin@demo.com` / `123456`)
3. Ve a "Cartera de Clientes"
4. ✅ Deberías ver **todos** los clientes

---

## 🔍 Verificación en Consola

Cuando un coach inicia sesión, verás en la consola del navegador (F12):

```
Coach Test Coach has 3 assigned clients
```

Esto te ayuda a verificar que el filtro está funcionando.

---

## 📝 Asignación de Clientes

### Método 1: Desde la Ficha del Cliente

1. Abre la ficha de un cliente
2. Busca el campo "Coach Asignado" o "Entrenador"
3. Selecciona o escribe el nombre del coach
4. Guarda

### Método 2: Directamente en Supabase

```sql
UPDATE clientes_pt_notion
SET property_coach = 'Test Coach'
WHERE property_nombre = 'Juan';
```

### Método 3: Importación Masiva

Si tienes muchos clientes, puedes actualizar en lote:

```sql
UPDATE clientes_pt_notion
SET property_coach = 'Test Coach'
WHERE property_coach IS NULL
LIMIT 10;
```

---

## 🐛 Solución de Problemas

### Coach no ve ningún cliente

**Causa 1**: No tiene clientes asignados  
**Solución**: Asigna clientes al coach desde la ficha del cliente

**Causa 2**: El nombre no coincide  
**Solución**: Verifica que `coach_id` en la base de datos coincida con el nombre del coach

**Verifica en Supabase**:
```sql
SELECT property_nombre, property_coach 
FROM clientes_pt_notion 
WHERE property_coach LIKE '%Test%';
```

### Coach ve todos los clientes (como admin)

**Causa**: El rol del usuario es Admin en lugar de Coach  
**Solución**: Verifica el rol en la tabla users:

```sql
SELECT name, email, role FROM users WHERE email = 'test@coach.com';
```

Debe ser `'coach'`, no `'admin'`.

### Clientes sin coach asignado no aparecen

**Esto es correcto**: Los clientes sin coach asignado (`coach_id = null`) solo los ve el Admin.

**Para asignarlos**:
1. Login como Admin
2. Abre la ficha del cliente
3. Asigna un coach
4. Guarda

---

## 📊 Estructura de Datos

### Campo `coach_id` en la Base de Datos

```sql
-- Tabla: clientes_pt_notion
-- Campo: property_coach (mapeado a coach_id en la app)

Ejemplos de valores válidos:
- "Ana García"              -- Nombre del coach
- "Pedro López"             -- Nombre del coach
- "ana@coach.com"           -- Email del coach
- "Test Coach"              -- Nombre del coach
- "dec087e2-3bf5-..."       -- UUID del coach (desde nuevas altas)
- NULL (sin asignar)
```

### IMPORTANTE: Formato UUID vs Nombre

El campo `property_coach` puede contener:
1. **Nombre del coach** (formato antiguo): "Jesús", "Juan", "Helena"
2. **UUID del coach** (formato nuevo): "dec087e2-3bf5-43c7-8561-d22c049948db"

El filtro de coaches busca por AMBOS formatos:
```typescript
.or(`property_coach.ilike.%${firstName}%,property_coach.ilike.%${emailPrefix}%,property_coach.eq.${coachName},property_coach.eq.${coachId}`)
```

Si un coach no ve ciertos clientes, verificar qué valor tiene `property_coach` en la BD.

### Mapeo en la Aplicación

```typescript
// En mapRowToClient()
coach_id: parseText(getVal(row, [
  'property_coach', 
  'Coach', 
  'entrenador_asignado', 
  'coach_id'
]))
```

---

## 🔒 Seguridad

### Actual (Simulado)
- ✅ Filtrado en JavaScript (cliente)
- ⚠️ No hay RLS real en Supabase
- ⚠️ Un usuario técnico podría bypassear el filtro

### Recomendado para Producción
- 🔒 Implementar RLS en Supabase
- 🔒 Políticas de seguridad a nivel de base de datos
- 🔒 Validación server-side

### Script SQL para RLS Real (Opcional)

```sql
-- Habilitar RLS en la tabla de clientes
ALTER TABLE clientes_pt_notion ENABLE ROW LEVEL SECURITY;

-- Política: Admins ven todo
CREATE POLICY "Admins see all clients"
  ON clientes_pt_notion
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Política: Coaches ven solo sus clientes
CREATE POLICY "Coaches see their clients"
  ON clientes_pt_notion
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'coach'
      AND (
        clientes_pt_notion.property_coach = users.name OR
        clientes_pt_notion.property_coach = users.email
      )
    )
  );
```

---

## 📈 Estadísticas y Analytics

### Dashboard para Coaches

Los coaches ven estadísticas **solo de sus clientes**:
- ✅ Activos vigentes (solo suyos)
- ✅ Altas del mes (solo suyos)
- ✅ Bajas del mes (solo suyos)
- ✅ Renovaciones (solo suyos)

### Dashboard para Admins

Los admins ven estadísticas **de todos los clientes**:
- ✅ Todos los activos
- ✅ Todas las altas
- ✅ Todas las bajas
- ✅ Todas las renovaciones

---

## 🎯 Casos de Uso

### Caso 1: Equipo con Múltiples Coaches

```
Admin: Ve todos (100 clientes)
Coach Ana: Ve 30 clientes
Coach Pedro: Ve 25 clientes
Coach María: Ve 45 clientes
```

### Caso 2: Coach Nuevo sin Clientes

```
Coach Nuevo: Ve 0 clientes
→ Admin debe asignarle clientes
```

### Caso 3: Reasignación de Clientes

```
Cliente Juan: coach_id = "Ana García"
→ Admin cambia a "Pedro López"
→ Ana ya no ve a Juan
→ Pedro ahora ve a Juan
```

---

## ✅ Checklist de Implementación

- [x] Filtro implementado en `getClients()`
- [x] Comparación case-insensitive
- [x] Múltiples métodos de coincidencia
- [x] Log en consola para debugging
- [x] Funciona para Admin (ve todos)
- [x] Funciona para Coach (ve solo suyos)
- [x] Funciona para Cliente (ve solo su ficha)

---

## 🎉 Resultado Final

Ahora el sistema tiene **separación de datos por rol**:

- ✅ **Admin**: Control total, ve todos los clientes
- ✅ **Coach**: Ve solo sus clientes asignados
- ✅ **Cliente**: Ve solo su propia información

---

*Implementado: 12 de Diciembre de 2025*  
*Versión: 2.0.3*  
*Estado: ✅ Funcional*

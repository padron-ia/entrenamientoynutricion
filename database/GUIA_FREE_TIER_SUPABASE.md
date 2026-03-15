# 🆓 Guía: Plan Gratuito de Supabase

## ✅ **PLAN GRATUITO - Límites**

### **Lo que incluye GRATIS**:
```
✅ 500 MB Database
✅ 1 GB Storage (archivos/fotos)
✅ 2 GB Bandwidth/mes
✅ 50 MB File upload size
✅ 500K Edge Function invocations
✅ Unlimited API requests
✅ 2 proyectos activos
```

---

## 📊 **¿CUÁNTOS CLIENTES PUEDES TENER?**

### **Con el Plan Gratuito**:

#### **Datos de Texto** (500 MB database)
```
Datos por cliente: ~10 MB/mes
500 MB ÷ 10 MB = 50 clientes/mes

O mejor:
- 20 clientes durante 6 meses ✅
- 10 clientes durante 1 año ✅
```

#### **Fotos** (1 GB storage)
```
SIN optimizar:
- 1 cliente = 270 MB/mes
- 1 GB ÷ 270 MB = 3-4 clientes ❌ MUY POCO

CON optimizar (WebP, 400 KB):
- 1 cliente = 36 MB/mes
- 1 GB ÷ 36 MB = 27 clientes/mes ✅

O mejor:
- 10 clientes durante 3 meses ✅
- 5 clientes durante 6 meses ✅
```

---

## 🎯 **ESTRATEGIA PARA EL FREE TIER**

### **Opción 1: MVP con Pocos Clientes** ⭐ RECOMENDADO
```
Clientes: 5-10 clientes beta
Duración: 3-6 meses
Fotos: Optimizadas (WebP, 500 KB)
Retención: 3 meses

Esto te permite:
✅ Validar el producto
✅ Obtener feedback
✅ Iterar rápido
✅ Sin costo
```

### **Opción 2: Solo Datos, Sin Fotos**
```
Clientes: 20-30 clientes
Duración: 6-12 meses
Fotos: NO (solo URLs externas)
Datos: Peso, glucosa, check-ins

Esto te permite:
✅ Más clientes
✅ Más tiempo
✅ Funcionalidad core
❌ Sin fotos de comidas
```

### **Opción 3: Fotos en Servicio Externo** ⭐ MEJOR PARA ESCALAR
```
Clientes: 20-50 clientes
Duración: 6-12 meses
Fotos: Cloudflare R2 (GRATIS hasta 10 GB)
Datos: Supabase

Esto te permite:
✅ Muchos clientes
✅ Fotos ilimitadas (casi)
✅ Mejor performance
✅ Gratis o muy barato
```

---

## 💡 **OPTIMIZACIONES PARA FREE TIER**

### **1. Compresión Agresiva de Fotos** 🔥
```typescript
// Comprimir MUY agresivo para Free Tier
const compressed = await compressImage(file, {
  maxSizeMB: 0.3,        // 300 KB (vs 500 KB)
  maxWidthOrHeight: 1280, // 1280px (vs 1920px)
  quality: 0.7,          // 70% calidad
  fileType: 'image/webp'
});

Resultado:
- Foto original: 3-5 MB
- Foto comprimida: 200-300 KB
- Ahorro: 90-95%
```

### **2. Retención MUY Corta**
```typescript
// Eliminar fotos después de 2 meses
const RETENTION_DAYS = 60; // 2 meses (vs 3-6 meses)

async function cleanupOldPhotos() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  
  // Eliminar fotos antiguas
  await deletePhotosOlderThan(cutoffDate);
}

// Ejecutar cada semana
setInterval(cleanupOldPhotos, 7 * 24 * 60 * 60 * 1000);
```

### **3. Solo 1 Foto por Comida**
```typescript
// Limitar a 1 foto por comida (vs 2-3)
const MAX_PHOTOS_PER_MEAL = 1;

if (mealPhotos.length >= MAX_PHOTOS_PER_MEAL) {
  alert('Solo puedes subir 1 foto por comida');
  return;
}
```

### **4. Thumbnails MUY Pequeños**
```typescript
// Thumbnail ultra-pequeño
const thumbnail = await compressImage(file, {
  maxSizeMB: 0.02,  // 20 KB (vs 50 KB)
  maxWidthOrHeight: 200, // 200px (vs 400px)
  quality: 0.6
});
```

### **5. Lazy Delete (Marcar como eliminado)**
```typescript
// No eliminar inmediatamente, solo marcar
async function softDeletePhoto(photoId: string) {
  await supabase
    .from('meal_logs')
    .update({ photo_deleted: true })
    .eq('id', photoId);
  
  // Eliminar físicamente después (batch job)
}

// Eliminar físicamente 1 vez por semana
async function hardDeleteMarkedPhotos() {
  const { data } = await supabase
    .from('meal_logs')
    .select('photo_url')
    .eq('photo_deleted', true);
  
  for (const photo of data) {
    await supabase.storage
      .from('meal-photos')
      .remove([photo.photo_url]);
  }
}
```

---

## 📊 **CÁLCULO DETALLADO PARA FREE TIER**

### **Escenario: 10 Clientes, 3 Meses**

#### **Datos de Texto**:
```
10 clientes × 10 MB/mes × 3 meses = 300 MB
Límite: 500 MB
Uso: 60% ✅ BIEN
```

#### **Fotos Optimizadas**:
```
10 clientes × 36 MB/mes × 3 meses = 1.08 GB
Límite: 1 GB
Uso: 108% ❌ EXCEDE

Solución: Retención 2 meses
10 clientes × 36 MB/mes × 2 meses = 720 MB
Límite: 1 GB
Uso: 72% ✅ BIEN
```

#### **Bandwidth**:
```
Estimado: 500 MB/mes
Límite: 2 GB/mes
Uso: 25% ✅ BIEN
```

---

## 🚀 **PLAN DE ACCIÓN PARA FREE TIER**

### **Mes 1-3: Beta con 5 Clientes**
```
Objetivo: Validar producto

Configuración:
✅ Supabase Free
✅ 5 clientes beta
✅ Fotos optimizadas (300 KB)
✅ Retención: 2 meses
✅ Solo datos críticos

Uso estimado:
- Database: 150 MB (30%)
- Storage: 540 MB (54%)
- Bandwidth: 300 MB (15%)

Estado: ✅ PERFECTO
```

### **Mes 4-6: Expandir a 10 Clientes**
```
Objetivo: Crecer base de usuarios

Configuración:
✅ Supabase Free
✅ 10 clientes
✅ Fotos optimizadas (300 KB)
✅ Retención: 2 meses
✅ Limpieza semanal

Uso estimado:
- Database: 300 MB (60%)
- Storage: 720 MB (72%)
- Bandwidth: 600 MB (30%)

Estado: ✅ AJUSTADO pero funcional
```

### **Mes 7+: Upgrade a Pro**
```
Cuando llegues a:
- 15+ clientes activos
- >80% de storage usado
- Necesitas más de 2 meses de retención

Upgrade a Pro: $25/mes
```

---

## ⚠️ **LÍMITES A VIGILAR**

### **Alertas Automáticas**:
```typescript
// Monitorear uso de storage
async function checkStorageUsage() {
  const stats = await getStorageStats();
  
  if (stats.usagePercent > 80) {
    sendAlert('⚠️ Storage al 80%. Considera limpieza o upgrade.');
  }
  
  if (stats.usagePercent > 90) {
    sendAlert('🔴 Storage al 90%. URGENTE: Limpiar o upgrade.');
  }
}

// Ejecutar diariamente
setInterval(checkStorageUsage, 24 * 60 * 60 * 1000);
```

### **Dashboard de Uso**:
```typescript
// Mostrar uso actual
function StorageUsageDashboard() {
  const { database, storage, bandwidth } = useStorageStats();
  
  return (
    <div>
      <h3>Uso de Supabase Free Tier</h3>
      
      <ProgressBar 
        label="Database"
        current={database.used}
        max={500}
        unit="MB"
        warning={80}
        critical={90}
      />
      
      <ProgressBar 
        label="Storage"
        current={storage.used}
        max={1000}
        unit="MB"
        warning={80}
        critical={90}
      />
      
      <ProgressBar 
        label="Bandwidth"
        current={bandwidth.used}
        max={2000}
        unit="MB"
        warning={80}
        critical={90}
      />
    </div>
  );
}
```

---

## 🎯 **ALTERNATIVAS PARA FOTOS**

### **Opción 1: Cloudflare R2** ⭐ RECOMENDADO
```
Costo: GRATIS hasta 10 GB
Bandwidth: GRATIS (ilimitado)

Ventajas:
✅ 10 GB gratis (vs 1 GB Supabase)
✅ Bandwidth gratis
✅ CDN incluido
✅ Más rápido

Desventajas:
❌ Requiere configuración adicional
❌ Otro servicio que gestionar
```

### **Opción 2: ImgBB (Hosting de Imágenes)**
```
Costo: GRATIS
Límite: Ilimitado (con marca de agua en plan free)

Ventajas:
✅ Completamente gratis
✅ Fácil de usar (API simple)
✅ CDN incluido

Desventajas:
❌ Marca de agua en fotos
❌ No es profesional
❌ Puede cerrar tu cuenta
```

### **Opción 3: Cloudinary**
```
Costo: GRATIS hasta 25 GB/mes
Transformaciones: 25 créditos/mes

Ventajas:
✅ 25 GB gratis
✅ Transformaciones automáticas
✅ CDN global
✅ Profesional

Desventajas:
❌ Límite de transformaciones
❌ Más complejo
```

---

## 📋 **CHECKLIST PARA FREE TIER**

### **Antes de Empezar**:
- [ ] Crear proyecto en Supabase (free)
- [ ] Configurar compresión de imágenes (300 KB)
- [ ] Implementar retención de 2 meses
- [ ] Configurar alertas de uso
- [ ] Limitar a 5-10 clientes beta

### **Durante el MVP**:
- [ ] Monitorear uso semanalmente
- [ ] Limpiar fotos antiguas cada semana
- [ ] Optimizar queries (evitar full scans)
- [ ] Comprimir más si es necesario

### **Antes de Escalar**:
- [ ] Si >10 clientes → Considerar upgrade
- [ ] Si >80% storage → Limpiar o upgrade
- [ ] Si necesitas >2 meses retención → Upgrade
- [ ] Evaluar Cloudflare R2 para fotos

---

## ✅ **RESUMEN**

### **Con Supabase Free Tier puedes:**

✅ **5-10 clientes** durante 3-6 meses  
✅ **Fotos optimizadas** (300 KB, WebP)  
✅ **Retención 2 meses** de fotos  
✅ **Todos los datos** de texto (peso, glucosa, etc.)  
✅ **Validar el producto** sin costo  

### **Límites a respetar:**

⚠️ **500 MB** database (datos de texto)  
⚠️ **1 GB** storage (fotos)  
⚠️ **2 GB/mes** bandwidth  
⚠️ **50 MB** max file size  

### **Cuándo hacer upgrade:**

🔴 **15+ clientes** activos  
🔴 **>80% storage** usado  
🔴 **Necesitas >2 meses** de retención  
🔴 **Quieres escalar** rápido  

---

## 🎯 **RECOMENDACIÓN FINAL**

**Para empezar AHORA con Free Tier**:

```
1. Usa Supabase Free
2. Empieza con 5 clientes beta
3. Compresión agresiva (300 KB)
4. Retención 2 meses
5. Monitorea uso semanalmente

Cuando llegues a 10-15 clientes:
→ Upgrade a Pro ($25/mes)
→ O usa Cloudflare R2 para fotos
```

**El Free Tier es PERFECTO para validar tu MVP** 🚀

---

*Guía creada: 12 Diciembre 2025*

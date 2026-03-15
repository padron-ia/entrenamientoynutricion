# Integración de AssessmentTab en ClientDetail.tsx

## Paso 1: Importar el componente
Añade al inicio del archivo (línea ~22):
```typescript
import { AssessmentTab } from './AssessmentTab';
```

## Paso 2: Añadir 'assessment' al tipo de activeTab
Modifica la línea 250:
```typescript
const [activeTab, setActiveTab] = useState<'general' | 'program' | 'medical' | 'nutrition' | 'training' | 'goals' | 'checkins' | 'assessment'>('general');
```

## Paso 3: Añadir función handleRequestNewAssessment
Después de la función `handleReactivateClient` (línea ~858), añade:
```typescript
const handleRequestNewAssessment = async () => {
   if (!confirm("¿Solicitar nueva valoración profunda? El cliente volverá a entrar en modo bloqueo hasta completarla.")) return;
   
   try {
      const { error } = await supabase
         .from('clientes_pt_notion')
         .update({
            onboarding_phase2_completed: false,
            onboarding_phase2_completed_at: null
         })
         .eq('id', client.id);

      if (error) throw error;
      toast.success("Nueva valoración solicitada correctamente");
      onBack(); // Refresh by going back
   } catch (err) {
      console.error('Error requesting assessment:', err);
      toast.error("Error al solicitar valoración");
   }
};
```

## Paso 4: Añadir botón de pestaña
Busca la sección de tabs (línea ~1100) y añade después del tab de 'checkins':
```typescript
<TabButton id="assessment" label="Valoración" icon={<Sparkles className="w-4 h-4" />} />
```

## Paso 5: Añadir renderizado del tab
En la sección de renderizado de tabs (línea ~1800+), añade:
```typescript
{activeTab === 'assessment' && (
   <AssessmentTab 
      client={formData} 
      onRequestNew={handleRequestNewAssessment}
   />
)}
```

## Notas
- El componente `AssessmentTab` ya está creado y listo para usar
- Muestra las respuestas estructuradas del cliente
- Permite solicitar una nueva valoración con un botón
- Se integra perfectamente con el diseño existente de ClientDetail

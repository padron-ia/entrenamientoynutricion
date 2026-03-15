# Sistema de Anuncios Internos - Guía de Integración

## 📋 Resumen

Sistema de comunicaciones internas que permite a coaches y admins publicar anuncios que los clientes verán directamente en su portal.

## ✨ Características

- 🔔 **Notificación en tiempo real**: Campana con contador de anuncios no leídos
- 💬 **Feed de anuncios**: Dropdown con todos los anuncios activos
- 🚨 **Popups urgentes**: Anuncios importantes aparecen como modal al entrar
- 🎨 **4 tipos de anuncios**: Info, Importante, Aviso, Buenas Noticias
- ⏰ **Expiración automática**: Los anuncios pueden tener fecha de caducidad
- 📊 **Tracking de lectura**: Sabe qué clientes han leído cada anuncio
- 🎯 **Segmentación**: Envía a tus clientes o a todos (admin)

## 🗄️ Paso 1: Crear las tablas

Ejecuta el script SQL:

```bash
psql -U tu_usuario -d tu_base_de_datos -f database/create_communications_tables.sql
```

O desde Supabase Dashboard → SQL Editor → Pega y ejecuta el contenido del archivo.

### Tablas creadas:
- `announcements`: Almacena los anuncios
- `announcement_reads`: Rastrea qué clientes han leído cada anuncio

## 🎨 Paso 2: Integrar en el Portal del Cliente

En tu componente `ClientPortalView.tsx` o similar:

```typescript
import { ClientAnnouncements } from './components/ClientAnnouncements';

// En tu componente:
function ClientPortalView({ client }: { client: Client }) {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Portal del Cliente</h1>
                    
                    {/* AÑADIR AQUÍ EL COMPONENTE DE ANUNCIOS */}
                    <div className="relative">
                        <ClientAnnouncements clientId={client.id} />
                    </div>
                </div>
            </header>

            {/* Resto del portal... */}
        </div>
    );
}
```

## 🎯 Paso 3: Integrar en el Dashboard del Coach/Admin

En tu `Dashboard.tsx` o `App.tsx`:

```typescript
import { CreateAnnouncement } from './components/MassCommunication';
import { CommunicationHistory } from './components/CommunicationHistory';

function Dashboard() {
    const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    return (
        <div>
            {/* Botones en tu toolbar/header */}
            <div className="flex gap-3">
                <button 
                    onClick={() => setShowCreateAnnouncement(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2"
                >
                    <Bell className="w-5 h-5" />
                    Nuevo Anuncio
                </button>

                <button 
                    onClick={() => setShowHistory(true)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300"
                >
                    Ver Historial
                </button>
            </div>

            {/* Modales */}
            {showCreateAnnouncement && (
                <CreateAnnouncement
                    currentUser={currentUser} // Nombre del coach o 'Admin'
                    isAdmin={isAdmin} // true/false
                    clients={allClients} // Array de clientes
                    onClose={() => setShowCreateAnnouncement(false)}
                    onSuccess={() => {
                        // Opcional: mostrar toast de éxito
                        console.log('Anuncio publicado!');
                    }}
                />
            )}

            {showHistory && (
                <div className="fixed inset-0 bg-black/60 p-4 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">Historial de Anuncios</h2>
                            <button onClick={() => setShowHistory(false)}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <CommunicationHistory 
                            currentUser={currentUser} 
                            isAdmin={isAdmin} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
```

## 🎨 Tipos de Anuncios

### 1. **Info** (Azul 💡)
- Información general
- Recordatorios
- Actualizaciones menores

### 2. **Importante** (Morado ⭐)
- Anuncios destacados
- Nuevas funcionalidades
- Contenido nuevo

### 3. **Aviso** (Amarillo ⚠️)
- Advertencias
- Cambios importantes
- Acciones requeridas

### 4. **Buenas Noticias** (Verde 🎉)
- Celebraciones
- Logros
- Felicitaciones

## 🚀 Flujo de Uso

### Para el Coach/Admin:

1. Click en "Nuevo Anuncio"
2. Selecciona audiencia (Mis clientes / Todos)
3. Elige tipo de anuncio
4. Escribe título y mensaje
5. Opciones:
   - ✅ Mostrar como popup (para anuncios urgentes)
   - ⏰ Fecha de expiración
6. Click "Publicar Anuncio"

### Para el Cliente:

1. Entra a su portal
2. Si hay anuncios urgentes → Ve popup automático
3. Ve campana con número de anuncios no leídos
4. Click en campana → Ve feed de anuncios
5. Click en anuncio → Se marca como leído

## 📊 Ejemplos de Uso

### Anuncio de Bienvenida
```
Tipo: Buenas Noticias 🎉
Título: ¡Bienvenido/a a Padron Trainer!
Mensaje: Estamos encantados de tenerte aquí. Explora tu portal y comienza tu transformación hoy.
Popup: ✅ Sí
Expiración: 3 días
```

### Nueva Clase Disponible
```
Tipo: Importante ⭐
Título: Nueva clase: Manejo de Hipoglucemias
Mensaje: Ya está disponible la nueva clase sobre cómo prevenir y manejar hipoglucemias. ¡No te la pierdas!
Popup: ❌ No
Expiración: 1 semana
```

### Recordatorio Check-in
```
Tipo: Info 💡
Título: Recordatorio: Check-in Semanal
Mensaje: No olvides completar tu check-in semanal para que podamos revisar tu progreso.
Popup: ❌ No
Expiración: 1 día
```

### Mantenimiento Programado
```
Tipo: Aviso ⚠️
Título: Mantenimiento del Sistema
Mensaje: El portal estará en mantenimiento el domingo de 2-4am. Disculpa las molestias.
Popup: ✅ Sí
Expiración: 7 días
```

## 🔒 Permisos

- **Coach**: Solo puede crear anuncios para sus clientes asignados
- **Admin**: Puede crear anuncios para todos los clientes activos

## 📈 Métricas Disponibles

El sistema rastrea automáticamente:
- Número de destinatarios
- Quién ha leído el anuncio
- Quién lo ha descartado
- Fecha de lectura

## 🎯 Mejores Prácticas

1. **Usa popups con moderación**: Solo para anuncios realmente urgentes
2. **Establece expiración**: Los anuncios temporales se auto-limpian
3. **Sé conciso**: Mensajes cortos y claros funcionan mejor
4. **Usa el tipo correcto**: El color ayuda a la comprensión rápida
5. **No abuses**: Máximo 1-2 anuncios por semana por coach

## 🔮 Próximas Mejoras

- [ ] Programar anuncios para fecha/hora futura
- [ ] Adjuntar imágenes o videos
- [ ] Segmentación avanzada (por tipo diabetes, fase programa, etc.)
- [ ] Plantillas de anuncios reutilizables
- [ ] Estadísticas de engagement
- [ ] Notificaciones push (móvil)

## 🆘 Troubleshooting

### Los anuncios no aparecen
- Verifica que las tablas estén creadas
- Confirma que `is_active = true`
- Revisa que no hayan expirado
- Verifica el `target_audience` y `client_ids`

### El contador no se actualiza
- Revisa la tabla `announcement_reads`
- Confirma que el `client_id` sea correcto
- Verifica permisos de la base de datos

### El popup no aparece
- Confirma que `show_as_modal = true`
- Verifica que `priority >= 1`
- Asegúrate que el cliente no lo haya leído ya

## 💡 Tips Avanzados

### Anuncio con acción
Puedes añadir un botón de acción editando directamente en la BD:

```sql
UPDATE announcements 
SET 
    action_url = '/nutrition',
    action_label = 'Ver mi plan'
WHERE id = 'tu-announcement-id';
```

### Anuncio para cliente específico
```sql
INSERT INTO announcements (
    created_by, sender_role, title, message,
    target_audience, client_ids, announcement_type
) VALUES (
    'Coach María', 'coach', 
    'Felicidades por tu progreso!',
    'Has perdido 5kg este mes. ¡Sigue así!',
    'specific_clients', 
    ARRAY['client-id-123'],
    'success'
);
```

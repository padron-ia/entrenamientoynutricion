# Despliegue de Edge Functions para Testimonios

## Función: notion-testimonials

Esta Edge Function se encarga de:
1. Crear automáticamente una página en Notion cuando se registra un nuevo testimonio
2. Programar la fecha de publicación según disponibilidad (prioridad: Miércoles, Domingo, Lunes, Viernes)
3. Enviar notificación a Slack mencionando a Mario Segura

## Requisitos previos

1. **Supabase CLI instalado**:
   ```bash
   npm install -g supabase
   ```

2. **Login en Supabase**:
   ```bash
   supabase login
   ```

3. **Link al proyecto**:
   ```bash
   supabase link --project-ref zugtswtpoohnpycnjwrp
   ```

## Variables de entorno necesarias

Debes configurar estos secrets en Supabase:

```bash
supabase secrets set NOTION_TOKEN=tu_token_de_notion
```

El webhook de Slack ya está hardcodeado en el código (canal #testimonios).

## Despliegue

Ejecuta este comando desde la raíz del proyecto:

```bash
supabase functions deploy notion-testimonials
```

## Verificación

Para probar que funciona:

1. Ve al CRM como coach
2. Registra un nuevo testimonio
3. Verifica que:
   - Se crea una página en Notion con la fecha programada
   - Llega una notificación al canal #testimonios de Slack
   - Mario Segura (@U09PVANRWH3) es mencionado

## Troubleshooting

Si no funciona:

1. **Ver logs de la función**:
   ```bash
   supabase functions logs notion-testimonials
   ```

2. **Verificar que el NOTION_TOKEN está configurado**:
   - Ve a Supabase Dashboard → Edge Functions → notion-testimonials → Secrets

3. **Verificar permisos de Notion**:
   - El token debe tener acceso a la base de datos ID: `2f17c005-e400-813e-8953-ea613df5adba`

4. **Verificar webhook de Slack**:
   - URL: `https://hooks.slack.com/services/<workspace>/<channel>/<token>`
   - Debe estar configurado para el canal #testimonios

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SEGURIDAD: Todas las credenciales se cargan desde variables de entorno
// Configurar en Supabase Dashboard > Edge Functions > Secrets
const NOTION_TOKEN = Deno.env.get('NOTION_TOKEN') || '';
const NOTION_DATABASE_ID = Deno.env.get('NOTION_TESTIMONIALS_DB_ID') || '2f17c005-e400-813e-8953-ea613df5adba';
const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_TESTIMONIALS') || '';
const MARIO_SEGURA_NOTION_ID = Deno.env.get('NOTION_RESPONSABLE_ID') || '25fd872b-594c-8135-9392-000243bdc8ba';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('[notion-testimonials] Received request at', new Date().toISOString());

  try {
    const body = await req.json();
    const { clientName, coachName, mediaUrl, type, notes } = body;

    console.log('[notion-testimonials] Processing testimonial for:', clientName);

    if (!clientName || !mediaUrl) {
      console.error('[notion-testimonials] Missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing clientName or mediaUrl' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Fetch existing testimonials for the next 60 days to find a slot
    const now = new Date();
    const rangeEnd = new Date();
    rangeEnd.setDate(now.getDate() + 60);

    console.log('[notion-testimonials] Querying Notion for occupied dates...');
    const searchResponse = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'Fecha',
          date: {
            on_or_after: now.toISOString().split('T')[0],
            on_or_before: rangeEnd.toISOString().split('T')[0]
          }
        }
      })
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[notion-testimonials] Notion query failed:', errorText);
      throw new Error(`Notion query failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const occupiedDates = new Set(
      searchData.results?.map((p: any) => p.properties.Fecha?.date?.start).filter(Boolean)
    );

    // 2. Find the first available slot based on priority:
    // Priority: Wed (3), Sun (0) -> THEN Mon (1), Fri (5)
    // We check week by week.
    let targetDateStr = '';
    let found = false;
    let weekOffset = 0;

    // Determine the start of the current week (Monday)
    const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = (currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek);
    const mondayOfCurrentWeek = new Date(now);
    mondayOfCurrentWeek.setDate(now.getDate() + diffToMonday);
    mondayOfCurrentWeek.setHours(0, 0, 0, 0);

    // We'll search up to 12 weeks ahead
    while (!found && weekOffset < 12) {
      const priorityDays = [3, 0, 1, 5]; // Wed, Sun, Mon, Fri

      for (const dayOfWeek of priorityDays) {
        // Calculate the specific date for this day in the current iteration's week
        const d = new Date(mondayOfCurrentWeek);
        d.setDate(d.getDate() + (weekOffset * 7));

        // Adjust from Monday to the target dayOfWeek
        // dayOfWeek: 1=Mon, 3=Wed, 5=Fri, 0=Sun
        const offsetFromMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        d.setDate(d.getDate() + offsetFromMonday);

        const dateStr = d.toISOString().split('T')[0];
        const nowStr = now.toISOString().split('T')[0];

        // Skip if the date is in the past or TODAY (we want future only)
        if (d < now || dateStr === nowStr) continue;

        if (!occupiedDates.has(dateStr)) {
          targetDateStr = dateStr;
          found = true;
          break;
        }
      }
      weekOffset++;
    }

    // fallback if no slot found (shouldn't happen with 8 weeks)
    if (!targetDateStr) {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + 1);
      targetDateStr = fallback.toISOString().split('T')[0];
    }

    let notionPageUrl = '';
    let resultMessage = '';

    const typeLabels: any = {
      video: '🎥 VÍDEO',
      image: '📸 FOTO',
      text: '✍️ TEXTO',
      audio: '🎙️ AUDIO'
    };
    const typeLabel = typeLabels[type] || '📝 OTRO';

    const properties = {
      'Name': {
        title: [{ text: { content: `TESTIMONIO - ${clientName}` } }]
      },
      'Fecha': {
        date: { start: targetDateStr }
      },
      'URL': {
        url: mediaUrl
      },
      'Etiqueta': {
        rich_text: [{ text: { content: `${clientName} (${typeLabel})` } }]
      },
      'Texto': {
        rich_text: [{ text: { content: notes || '-' } }]
      },
      'Estado 1': {
        status: { name: 'Revision' }
      },
      'Responsable': {
        people: [{ id: MARIO_SEGURA_NOTION_ID }]
      }
    };

    // Create new page (always creating new one now to avoid overwriting preferred slots if we found an empty one)
    // Actually, if we found an empty one in the logic above, we definitely create.
    console.log('[notion-testimonials] Creating Notion page for date:', targetDateStr);
    const createResponse = await fetch(`https://api.notion.com/v1/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DATABASE_ID },
        properties
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[notion-testimonials] Notion page creation failed:', errorText);
      throw new Error(`Notion page creation failed: ${createResponse.status}`);
    }

    const createData = await createResponse.json();
    notionPageUrl = createData.url;
    resultMessage = 'Nueva ficha creada en Notion';
    console.log('[notion-testimonials] Page created successfully:', notionPageUrl);

    // 3. Send Slack Notification to Testimonios channel
    if (SLACK_WEBHOOK_URL) {
      try {
        const slackResponse = await fetch(SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🎥 *Nuevo Testimonio Registrado*: ${clientName}`,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `📢 *¡Nuevo Testimonio Registrado!* \n\n*Detalles:* \n• *Cliente:* ${clientName}\n• *Coach:* ${coachName}\n• *Tipo:* ${typeLabel}\n• *Fecha programada en Notion:* ${targetDateStr}\n\n*Responsable:* <@U09PVANRWH3> (Mario Segura)`
                }
              },
              {
                type: "actions",
                elements: [
                  {
                    type: "button",
                    text: { type: "plain_text", text: "Ver en Notion 📝" },
                    url: notionPageUrl,
                    style: "primary"
                  },
                  {
                    type: "button",
                    text: { type: "plain_text", text: "Ver Material 📂" },
                    url: mediaUrl
                  }
                ]
              }
            ]
          })
        });

        if (!slackResponse.ok) {
          console.error('Slack notification failed:', await slackResponse.text());
        } else {
          console.log('Slack notification sent successfully');
        }
      } catch (slackError) {
        console.error('Error sending Slack notification:', slackError);
        // Don't fail the whole function if Slack fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: resultMessage,
        date: targetDateStr,
        notionUrl: notionPageUrl,
        notionPageId: createData.id // Return the Notion Page ID
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

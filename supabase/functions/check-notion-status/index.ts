import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const NOTION_TOKEN = Deno.env.get('NOTION_TOKEN') || '';
const NOTION_DATABASE_ID = '2f17c005-e400-813e-8953-ea613df5adba';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { pageIds = [], searchCandidates = [] } = await req.json();

        const results = {};
        const foundLinks = {};

        // 1. Process explicit Page IDs (Check Status)
        if (pageIds && pageIds.length > 0) {
            console.log(`Checking status for ${pageIds.length} pages...`);
            const chunks = [];
            const chunkSize = 3;
            for (let i = 0; i < pageIds.length; i += chunkSize) {
                chunks.push(pageIds.slice(i, i + chunkSize));
            }

            for (const chunk of chunks) {
                await Promise.all(chunk.map(async (id) => {
                    try {
                        const notionRes = await fetch(`https://api.notion.com/v1/pages/${id}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${NOTION_TOKEN}`,
                                'Notion-Version': '2022-06-28',
                            }
                        });

                        if (notionRes.ok) {
                            const data = await notionRes.json();
                            const statusName = data.properties?.['Estado 1']?.status?.name || 'Unknown';
                            results[id] = statusName;
                        } else {
                            console.error(`Error fetching page ${id}:`, notionRes.status);
                        }
                    } catch (err) {
                        console.error(`Exception fetching page ${id}:`, err);
                    }
                }));
                await new Promise(r => setTimeout(r, 300));
            }
        }

        // 2. Process Search Candidates (Find Missing IDs)
        if (searchCandidates && searchCandidates.length > 0) {
            console.log(`Searching for ${searchCandidates.length} clients in Notion...`);

            for (const candidate of searchCandidates) {
                try {
                    // Search in Database by Name (Contains)
                    const searchRes = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${NOTION_TOKEN}`,
                            'Notion-Version': '2022-06-28',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            filter: {
                                property: 'Name',
                                title: {
                                    contains: candidate.clientName
                                }
                            }
                        })
                    });

                    if (searchRes.ok) {
                        const data = await searchRes.json();
                        // Verify we found a match
                        if (data.results && data.results.length > 0) {
                            // Take the first match (most relevant usually if unique names)
                            const match = data.results[0];
                            const statusName = match.properties?.['Estado 1']?.status?.name || 'Unknown';

                            foundLinks[candidate.id] = {
                                pageId: match.id,
                                status: statusName,
                                notionUrl: match.url
                            };
                            console.log(`Found match for ${candidate.clientName}: ${match.id}`);
                        } else {
                            console.log(`No match found for ${candidate.clientName}`);
                        }
                    } else {
                        console.error(`Error searching for ${candidate.clientName}:`, await searchRes.text());
                    }
                } catch (err) {
                    console.error(`Exception searching for ${candidate.clientName}:`, err);
                }

                // Rate limiting
                await new Promise(r => setTimeout(r, 400));
            }
        }

        return new Response(
            JSON.stringify({ statuses: results, foundLinks }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})

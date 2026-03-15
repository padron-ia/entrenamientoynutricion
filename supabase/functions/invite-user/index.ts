import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Create Supabase Client with Admin Rights (Service Role)
        // This key is secure because it stays on the server (Environment Variable)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Parse Request Body
        const { email, name, role, redirectTo } = await req.json()

        if (!email) {
            throw new Error('Email is required')
        }

        // 3. Send Invitation
        // This creates the user in auth.users and sends the magic link email
        const { data: authData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                full_name: name,
                role: role || 'coach', // Metadata for the trigger
            },
            redirectTo: redirectTo || 'http://localhost:5173/update-password'
        })

        if (inviteError) throw inviteError

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Invitation sent successfully',
                user: authData.user
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { userId } = await req.json()

        if (!userId) {
            throw new Error('User ID is required')
        }

        // 1. Delete from auth.users (This will cascade to public.users if trigger/FK set)
        // Note: We delete from auth first because it's the root of truth.
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteError) throw deleteError

        // 2. Also ensure it's gone from public.users just in case
        await supabaseAdmin.from('users').delete().eq('id', userId)

        return new Response(
            JSON.stringify({
                success: true,
                message: 'User deleted successfully from Auth and Public tables'
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

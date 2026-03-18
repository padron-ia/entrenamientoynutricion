import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"

// No CORS needed — this is a server-to-server webhook

serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    try {
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // 1. Verify Stripe signature
        const body = await req.text()
        const signature = req.headers.get('stripe-signature')

        if (!signature) {
            return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), { status: 400 })
        }

        const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_GYM') ?? ''
        let event: Stripe.Event

        try {
            event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
        } catch (err: any) {
            console.error('Stripe signature verification failed:', err.message)
            return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
        }

        // 2. Only handle checkout.session.completed
        if (event.type !== 'checkout.session.completed') {
            return new Response(JSON.stringify({ received: true, ignored: event.type }), { status: 200 })
        }

        const session = event.data.object as Stripe.Checkout.Session
        const customerEmail = session.customer_details?.email || session.customer_email
        const amountTotal = session.amount_total ? session.amount_total / 100 : 0
        const currency = session.currency || 'eur'

        if (!customerEmail) {
            console.error('No customer email in checkout session:', session.id)
            return new Response(JSON.stringify({ error: 'No customer email' }), { status: 400 })
        }

        // 3. Get the line items to find the price_id
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 })
        const priceId = lineItems.data[0]?.price?.id

        if (!priceId) {
            console.error('No price_id found in checkout session:', session.id)
            return new Response(JSON.stringify({ error: 'No price_id in line items' }), { status: 400 })
        }

        // 4. Supabase admin client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 5. Find the bono by stripe_price_id
        const { data: bono, error: bonoError } = await supabase
            .from('gym_bonos')
            .select('*')
            .eq('stripe_price_id', priceId)
            .eq('is_active', true)
            .single()

        if (bonoError || !bono) {
            console.error('Bono not found for stripe_price_id:', priceId, bonoError)
            return new Response(JSON.stringify({ error: 'Bono not found for this price' }), { status: 404 })
        }

        // 6. Find the gym member by email
        const { data: member, error: memberError } = await supabase
            .from('gym_members')
            .select('*')
            .eq('email', customerEmail.toLowerCase())
            .eq('status', 'active')
            .single()

        if (memberError || !member) {
            console.error('Gym member not found for email:', customerEmail, memberError)
            return new Response(
                JSON.stringify({ error: 'No active gym member found with this email' }),
                { status: 404 }
            )
        }

        // 7. Check for duplicate payment (idempotency)
        const { data: existing } = await supabase
            .from('gym_bono_purchases')
            .select('id')
            .eq('payment_reference', session.id)
            .limit(1)

        if (existing && existing.length > 0) {
            console.log('Duplicate webhook for session:', session.id)
            return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 })
        }

        // 8. Calculate valid_until = last day of current month
        const now = new Date()
        const validFrom = now.toISOString().split('T')[0]
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        const validUntil = lastDayOfMonth.toISOString().split('T')[0]

        // 9. Create credit record
        const { data: credit, error: creditError } = await supabase
            .from('gym_member_credits')
            .insert({
                member_id: member.id,
                bono_id: bono.id,
                total_sessions: bono.sessions_count,
                used_sessions: 0,
                valid_from: validFrom,
                valid_until: validUntil,
                is_expired: false,
                payment_provider: 'stripe',
                payment_reference: session.id,
                payment_status: 'completed',
                amount_paid: amountTotal,
            })
            .select()
            .single()

        if (creditError) {
            console.error('Error creating credit:', creditError)
            return new Response(JSON.stringify({ error: 'Failed to create credit' }), { status: 500 })
        }

        // 10. Create purchase record
        const { error: purchaseError } = await supabase
            .from('gym_bono_purchases')
            .insert({
                member_id: member.id,
                bono_id: bono.id,
                credit_id: credit.id,
                amount: amountTotal,
                currency: currency,
                payment_provider: 'stripe',
                payment_reference: session.id,
                payment_status: 'completed',
                purchased_at: now.toISOString(),
            })

        if (purchaseError) {
            console.error('Error creating purchase record:', purchaseError)
            // Credit was created, purchase record is secondary — don't fail the webhook
        }

        console.log(`Gym credit created: member=${member.id}, bono=${bono.name}, sessions=${bono.sessions_count}, stripe_session=${session.id}`)

        return new Response(
            JSON.stringify({
                received: true,
                member_id: member.id,
                credit_id: credit.id,
                sessions: bono.sessions_count,
            }),
            {
                headers: { 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        console.error('Unhandled error in gym-stripe-webhook:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500 }
        )
    }
})

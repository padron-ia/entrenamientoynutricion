import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// No CORS needed — this is a server-to-server webhook

serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    try {
        const body = await req.json()

        // 1. Verify PayPal webhook (call PayPal API to validate)
        const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID') ?? ''
        const paypalSecret = Deno.env.get('PAYPAL_SECRET') ?? ''
        const paypalApiBase = Deno.env.get('PAYPAL_API_BASE') ?? 'https://api-m.paypal.com'

        // Get PayPal access token
        const tokenRes = await fetch(`${paypalApiBase}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${paypalClientId}:${paypalSecret}`),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        })

        if (!tokenRes.ok) {
            console.error('PayPal token error:', await tokenRes.text())
            return new Response(JSON.stringify({ error: 'PayPal auth failed' }), { status: 500 })
        }

        const { access_token } = await tokenRes.json()

        // Verify webhook signature
        const verifyRes = await fetch(`${paypalApiBase}/v1/notifications/verify-webhook-signature`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                auth_algo: req.headers.get('paypal-auth-algo'),
                cert_url: req.headers.get('paypal-cert-url'),
                transmission_id: req.headers.get('paypal-transmission-id'),
                transmission_sig: req.headers.get('paypal-transmission-sig'),
                transmission_time: req.headers.get('paypal-transmission-time'),
                webhook_id: Deno.env.get('PAYPAL_WEBHOOK_ID_GYM') ?? '',
                webhook_event: body,
            }),
        })

        if (!verifyRes.ok) {
            console.error('PayPal verification failed:', await verifyRes.text())
            return new Response(JSON.stringify({ error: 'PayPal verification failed' }), { status: 400 })
        }

        const verifyData = await verifyRes.json()
        if (verifyData.verification_status !== 'SUCCESS') {
            console.error('PayPal signature invalid:', verifyData)
            return new Response(JSON.stringify({ error: 'Invalid PayPal signature' }), { status: 400 })
        }

        // 2. Only handle CHECKOUT.ORDER.COMPLETED or PAYMENT.CAPTURE.COMPLETED
        const eventType = body.event_type
        if (eventType !== 'CHECKOUT.ORDER.COMPLETED' && eventType !== 'PAYMENT.CAPTURE.COMPLETED') {
            return new Response(JSON.stringify({ received: true, ignored: eventType }), { status: 200 })
        }

        // 3. Extract payment details
        const resource = body.resource
        let customerEmail: string | undefined
        let paymentId: string
        let amountPaid = 0
        let currency = 'EUR'
        let planId: string | undefined

        if (eventType === 'CHECKOUT.ORDER.COMPLETED') {
            customerEmail = resource.payer?.email_address
            paymentId = resource.id
            const capture = resource.purchase_units?.[0]?.payments?.captures?.[0]
            amountPaid = parseFloat(capture?.amount?.value || '0')
            currency = capture?.amount?.currency_code || 'EUR'
            // Try to find plan_id from custom_id or reference_id
            planId = resource.purchase_units?.[0]?.custom_id || resource.purchase_units?.[0]?.reference_id
        } else {
            // PAYMENT.CAPTURE.COMPLETED
            customerEmail = resource.payer?.email_address
            paymentId = resource.id
            amountPaid = parseFloat(resource.amount?.value || '0')
            currency = resource.amount?.currency_code || 'EUR'
            planId = resource.custom_id
        }

        if (!customerEmail) {
            console.error('No customer email in PayPal event:', body.id)
            return new Response(JSON.stringify({ error: 'No customer email' }), { status: 400 })
        }

        // 4. Supabase admin client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 5. Find the bono — try by paypal_plan_id first, then by amount match
        let bono: any = null

        if (planId) {
            const { data } = await supabase
                .from('gym_bonos')
                .select('*')
                .eq('paypal_plan_id', planId)
                .eq('is_active', true)
                .single()
            bono = data
        }

        if (!bono) {
            // Fallback: find bono by exact price match
            const { data } = await supabase
                .from('gym_bonos')
                .select('*')
                .eq('price', amountPaid)
                .eq('is_active', true)
                .limit(1)
            bono = data?.[0]
        }

        if (!bono) {
            console.error('Bono not found for PayPal payment. plan_id:', planId, 'amount:', amountPaid)
            return new Response(JSON.stringify({ error: 'Bono not found' }), { status: 404 })
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
            .eq('payment_reference', paymentId)
            .limit(1)

        if (existing && existing.length > 0) {
            console.log('Duplicate webhook for PayPal payment:', paymentId)
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
                payment_provider: 'paypal',
                payment_reference: paymentId,
                payment_status: 'completed',
                amount_paid: amountPaid,
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
                amount: amountPaid,
                currency: currency.toLowerCase(),
                payment_provider: 'paypal',
                payment_reference: paymentId,
                payment_status: 'completed',
                purchased_at: now.toISOString(),
            })

        if (purchaseError) {
            console.error('Error creating purchase record:', purchaseError)
        }

        console.log(`Gym credit created via PayPal: member=${member.id}, bono=${bono.name}, sessions=${bono.sessions_count}, paypal_id=${paymentId}`)

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
        console.error('Unhandled error in gym-paypal-webhook:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500 }
        )
    }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LeadCapturePayload = {
  firstName: string;
  surname: string;
  phone: string;
  email?: string;
  instagram_user?: string;
  notes?: string;
  source?: string;
  procedencia?: "Formulario";
  in_out?: "Inbound";
  turnstileToken: string;
  website?: string;
};

function normalizeText(value: string | undefined, max = 500): string {
  return (value || "").trim().slice(0, max);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as LeadCapturePayload;

    const firstName = normalizeText(body.firstName, 80);
    const surname = normalizeText(body.surname, 120);
    const phone = normalizeText(body.phone, 30);
    const email = normalizeText(body.email, 120).toLowerCase();
    const instagram_user = normalizeText(body.instagram_user, 80).replace(/^@+/, "");
    const notes = normalizeText(body.notes, 2000);
    const source = normalizeText(body.source, 80) || "Formulario Web";
    const procedencia = body.procedencia === "Formulario" ? "Formulario" : "Formulario";
    const in_out = body.in_out === "Inbound" ? "Inbound" : "Inbound";
    const turnstileToken = normalizeText(body.turnstileToken, 5000);
    const website = normalizeText(body.website, 120);

    if (website) {
      return new Response(JSON.stringify({ success: false, error: "Spam detected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Received fields:", JSON.stringify({ firstName, surname, phone, email, turnstileToken: turnstileToken ? "present" : "missing" }));

    if (!firstName || !surname || !phone) {
      console.error("400: Faltan campos obligatorios", { firstName, surname, phone });
      return new Response(JSON.stringify({ success: false, error: "Faltan campos obligatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isValidPhone(phone)) {
      return new Response(JSON.stringify({ success: false, error: "Teléfono no válido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (email && !isValidEmail(email)) {
      return new Response(JSON.stringify({ success: false, error: "Email no válido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!turnstileToken) {
      console.error("400: Captcha requerido - no turnstileToken in body");
      return new Response(JSON.stringify({ success: false, error: "Captcha requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!turnstileSecret) {
      throw new Error("TURNSTILE_SECRET_KEY no configurada");
    }

    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const remoteip = forwardedFor.split(",")[0]?.trim();

    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: turnstileSecret,
        response: turnstileToken,
        ...(remoteip ? { remoteip } : {}),
      }),
    });

    const verifyData = await verifyRes.json();
    console.log("Turnstile verify response:", JSON.stringify(verifyData));
    if (!verifyData.success) {
      console.error("400: Captcha inválido", JSON.stringify(verifyData));
      return new Response(JSON.stringify({ success: false, error: "Captcha inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const dedupeWindowIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const normalizedPhoneDigits = phone.replace(/\D/g, "");

    const { data: recentMatches, error: dedupeError } = await supabaseAdmin
      .from("leads")
      .select("id, phone, email, created_at")
      .gte("created_at", dedupeWindowIso)
      .or(`email.eq.${email || "__none__"},phone.ilike.%${normalizedPhoneDigits}%`)
      .limit(5);

    if (dedupeError) {
      console.error("Dedupe lookup error:", dedupeError);
    }

    if ((recentMatches || []).length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          deduplicated: true,
          message: "Ya hemos recibido tu solicitud. Te contactaremos pronto.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: insertedLead, error: insertError } = await supabaseAdmin
      .from("leads")
      .insert([
        {
          firstName,
          surname,
          email: email || null,
          phone,
          instagram_user: instagram_user || null,
          status: "NEW",
          source,
          notes: notes || null,
          in_out,
          procedencia,
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      console.error("Lead insert error:", insertError);
      throw new Error("No se pudo registrar el lead");
    }

    return new Response(
      JSON.stringify({
        success: true,
        leadId: insertedLead?.id,
        message: "Solicitud recibida. Te contactaremos pronto.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Normalize a raw URL/domain into a clean root domain */
function cleanDomain(raw: string): string {
  let d = raw.trim().toLowerCase();
  d = d.replace(/^(?:https?:\/\/)?/i, "");
  d = d.replace(/^www\./i, "");
  d = d.split("/")[0];   // remove path
  d = d.split("?")[0];   // remove query
  d = d.split("#")[0];   // remove hash
  d = d.split(":")[0];   // remove port
  return d;
}

/** Map HTTP status to a user-facing error code */
function mapFindymailError(status: number): { error_code: string; message: string } {
  switch (status) {
    case 401: case 403: return { error_code: "auth_error", message: "API key inválida o sin permisos" };
    case 402: return { error_code: "no_credits", message: "Sin créditos en Findymail" };
    case 423: return { error_code: "subscription_paused", message: "Suscripción de Findymail pausada" };
    case 429: return { error_code: "rate_limited", message: "Demasiadas solicitudes a Findymail, espera unos minutos" };
    case 400: return { error_code: "invalid_payload", message: "Datos enviados a Findymail no válidos" };
    default: return { error_code: "api_error", message: `Error de Findymail API: HTTP ${status}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.id;
    const { contact_id, full_name, domain } = await req.json();

    if (!contact_id || !full_name || !domain) {
      return new Response(JSON.stringify({ error: "contact_id, full_name and domain are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Robust domain normalization
    const normalizedDomain = cleanDomain(domain);
    if (!normalizedDomain || !normalizedDomain.includes(".")) {
      return new Response(JSON.stringify({ error_code: "invalid_domain", error: `Dominio no válido: "${domain}" → "${normalizedDomain}"` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const findymailKey = Deno.env.get("FINDYMAIL_API_KEY");
    if (!findymailKey) {
      return new Response(JSON.stringify({ error_code: "config_error", error: "FINDYMAIL_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify contact belongs to the authenticated user
    const { data: contactOwner, error: ownerError } = await supabase
      .from("contacts")
      .select("created_by, work_email")
      .eq("id", contact_id)
      .single();

    if (ownerError || !contactOwner) {
      return new Response(JSON.stringify({ error: "Contacto no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (contactOwner.created_by !== userId) {
      return new Response(JSON.stringify({ error: "No autorizado para modificar este contacto" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Split name
    const nameParts = full_name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    console.log(`Findymail request: first_name="${firstName}" last_name="${lastName}" domain="${normalizedDomain}"`);

    // Call Findymail API
    const findymailRes = await fetch("https://app.findymail.com/api/search/name", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${findymailKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        domain: normalizedDomain,
      }),
    });

    if (!findymailRes.ok) {
      const mapped = mapFindymailError(findymailRes.status);
      console.error(`Findymail API error: HTTP ${findymailRes.status} → ${mapped.error_code}`);
      // Do NOT update findymail_status on API errors — allow retries
      return new Response(JSON.stringify(mapped), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await findymailRes.json();
    console.log(`Findymail response keys: ${Object.keys(data).join(", ")}`);
    
    // Flexible email parsing
    const foundEmail = data?.email || data?.contact?.email || null;

    if (!foundEmail) {
      await supabase
        .from("contacts")
        .update({ findymail_status: "not_found", last_enriched_at: new Date().toISOString() })
        .eq("id", contact_id);

      return new Response(JSON.stringify({ status: "not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: Record<string, unknown> = {
      findymail_status: "enriched",
      last_enriched_at: new Date().toISOString(),
    };

    if (!contactOwner.work_email) {
      updates.work_email = foundEmail;
    }

    await supabase.from("contacts").update(updates).eq("id", contact_id);

    return new Response(JSON.stringify({ status: "enriched", email: foundEmail, updates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Findymail enrichment error:", err);
    return new Response(JSON.stringify({ error_code: "internal_error", error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { contact_id, full_name, domain } = await req.json();

    if (!contact_id || !full_name || !domain) {
      return new Response(JSON.stringify({ error: "contact_id, full_name and domain are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const findymailKey = Deno.env.get("FINDYMAIL_API_KEY");
    if (!findymailKey) {
      return new Response(JSON.stringify({ error: "FINDYMAIL_API_KEY not configured" }), {
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
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

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
        domain: cleanDomain,
      }),
    });

    if (!findymailRes.ok) {
      console.error(`Findymail API error: HTTP ${findymailRes.status}`);
      return new Response(JSON.stringify({ error: `Findymail API error: ${findymailRes.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await findymailRes.json();
    const foundEmail = data?.email || null;

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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

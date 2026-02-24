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
    // Validate JWT
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

    const lushaApiKey = Deno.env.get("LUSHA_API_KEY");
    if (!lushaApiKey) {
      return new Response(JSON.stringify({ error: "LUSHA_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { contact_id, first_name, last_name, company_name, linkedin_url } = await req.json();

    if (!contact_id) {
      return new Response(JSON.stringify({ error: "contact_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build query params for Lusha API V2 (GET request)
    const params = new URLSearchParams();
    if (linkedin_url) {
      params.set("linkedinUrl", linkedin_url);
    } else {
      if (first_name) params.set("firstName", first_name);
      if (last_name) params.set("lastName", last_name);
      if (company_name) params.set("companyName", company_name);
    }

    const lushaUrl = `https://api.lusha.com/v2/person?${params.toString()}`;

    const lushaResponse = await fetch(lushaUrl, {
      method: "GET",
      headers: {
        "api_key": lushaApiKey,
        "Content-Type": "application/json",
      },
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!lushaResponse.ok) {
      await supabase
        .from("contacts")
        .update({
          lusha_status: "not_found",
          last_enriched_at: new Date().toISOString(),
        })
        .eq("id", contact_id);

      return new Response(
        JSON.stringify({ success: false, status: "not_found", message: "Lusha no encontró datos para este contacto" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await lushaResponse.json();

    // Extract emails
    const emails = data.emailAddresses || data.emails || [];
    const workEmail = emails.find((e: any) => e.type === "work" || e.type === "professional")?.email || emails[0]?.email || null;
    const personalEmail = emails.find((e: any) => e.type === "personal")?.email || (emails.length > 1 ? emails[1]?.email : null);

    // Extract phones
    const phones = data.phoneNumbers || data.phones || [];
    const mobilePhone = phones.find((p: any) => p.type === "mobile")?.internationalNumber || phones.find((p: any) => p.type === "mobile")?.localizedNumber || phones[0]?.internationalNumber || phones[0]?.localizedNumber || null;
    const workPhone = phones.find((p: any) => p.type === "work" || p.type === "landline")?.internationalNumber || phones.find((p: any) => p.type === "work" || p.type === "landline")?.localizedNumber || null;

    const hasData = workEmail || personalEmail || mobilePhone || workPhone;

    const updateData: Record<string, any> = {
      lusha_status: hasData ? "enriched" : "not_found",
      last_enriched_at: new Date().toISOString(),
    };
    if (workEmail) updateData.work_email = workEmail;
    if (personalEmail) updateData.personal_email = personalEmail;
    if (mobilePhone) updateData.mobile_phone = mobilePhone;
    if (workPhone) updateData.work_phone = workPhone;

    await supabase.from("contacts").update(updateData).eq("id", contact_id);

    return new Response(
      JSON.stringify({
        success: true,
        status: hasData ? "enriched" : "not_found",
        data: { work_email: workEmail, personal_email: personalEmail, mobile_phone: mobilePhone, work_phone: workPhone },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

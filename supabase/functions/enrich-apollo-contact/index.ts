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

    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.id;

    const apolloApiKey = Deno.env.get("APOLLO_API_KEY");
    if (!apolloApiKey) {
      return new Response(JSON.stringify({ error: "APOLLO_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { contact_id, full_name, company_domain, email, linkedin_url } = await req.json();

    if (!contact_id) {
      return new Response(JSON.stringify({ error: "contact_id is required" }), {
        status: 400,
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
      .select("created_by, position, linkedin_url, work_email, personal_email, mobile_phone, work_phone, company_domain")
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

    // Split full_name into first/last
    const nameParts = (full_name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Build Apollo API request body
    const apolloBody: Record<string, any> = {
      reveal_personal_emails: true,
    };
    if (firstName) apolloBody.first_name = firstName;
    if (lastName) apolloBody.last_name = lastName;
    if (company_domain) apolloBody.domain = company_domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (email) apolloBody.email = email;
    if (linkedin_url) apolloBody.linkedin_url = linkedin_url;

    const apolloResponse = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apolloApiKey,
      },
      body: JSON.stringify(apolloBody),
    });

    if (!apolloResponse.ok) {
      const errorBody = await apolloResponse.text();
      console.error(`Apollo API error: HTTP ${apolloResponse.status}`, errorBody);
      // Do NOT update apollo_status — allow retry
      return new Response(
        JSON.stringify({ success: false, status: "api_error", message: `Apollo API error: ${apolloResponse.status}`, details: errorBody }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await apolloResponse.json();
    console.log("Apollo match result:", data.person?.name, "email:", data.person?.email, "title:", data.person?.title, "org:", data.person?.organization?.name);
    const person = data.person;

    if (!person) {
      console.warn("Apollo returned 200 but no person. Full response:", JSON.stringify(data));
      await supabase
        .from("contacts")
        .update({
          apollo_status: "not_found",
          last_enriched_at: new Date().toISOString(),
        })
        .eq("id", contact_id);

      return new Response(
        JSON.stringify({ success: false, status: "not_found", message: "Apollo.io no encontró datos para este contacto" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract data from Apollo response
    const workEmail = person.email || null;
    const personalEmails = person.personal_emails || [];
    const personalEmail = personalEmails.length > 0 ? personalEmails[0] : null;
    const phoneNumbers = person.phone_numbers || [];
    const mobilePhone = phoneNumbers.find((p: any) => p.type === "mobile")?.sanitized_number || phoneNumbers[0]?.sanitized_number || null;
    const workPhone = phoneNumbers.find((p: any) => p.type === "work_direct" || p.type === "work_hq")?.sanitized_number || null;
    const position = person.title || null;
    const linkedinUrl = person.linkedin_url || null;
    const domain = person.organization?.primary_domain || null;

    const hasData = workEmail || personalEmail || mobilePhone || workPhone || position;

    const updates: Record<string, any> = {
      apollo_status: hasData ? "enriched" : "not_found",
      last_enriched_at: new Date().toISOString(),
    };

    // Only overwrite empty fields
    if (workEmail && !contactOwner.work_email) updates.work_email = workEmail;
    if (personalEmail && !contactOwner.personal_email) updates.personal_email = personalEmail;
    if (mobilePhone && !contactOwner.mobile_phone) updates.mobile_phone = mobilePhone;
    if (workPhone && !contactOwner.work_phone) updates.work_phone = workPhone;
    if (position && !contactOwner.position) updates.position = position;
    if (linkedinUrl && !contactOwner.linkedin_url) updates.linkedin_url = linkedinUrl;
    if (domain && !contactOwner.company_domain) updates.company_domain = domain;

    await supabase.from("contacts").update(updates).eq("id", contact_id);

    return new Response(
      JSON.stringify({
        success: true,
        status: hasData ? "enriched" : "not_found",
        data: { work_email: workEmail, personal_email: personalEmail, mobile_phone: mobilePhone, work_phone: workPhone, position },
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

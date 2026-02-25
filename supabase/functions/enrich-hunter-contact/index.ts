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
    const { contact_id, email } = await req.json();

    if (!contact_id || !email) {
      return new Response(JSON.stringify({ error: "contact_id and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hunterKey = Deno.env.get("HUNTER_API_KEY");
    if (!hunterKey) {
      return new Response(JSON.stringify({ error: "HUNTER_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Hunter.io Email Finder (combined find not available, use email finder + verifier approach)
    const hunterUrl = `https://api.hunter.io/v2/email-finder?email=${encodeURIComponent(email)}&api_key=${hunterKey}`;
    const hunterRes = await fetch(hunterUrl);
    
    // Also try person search by email
    const verifyUrl = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${hunterKey}`;
    const verifyRes = await fetch(verifyUrl);

    const hunterData = hunterRes.ok ? await hunterRes.json() : null;
    const verifyData = verifyRes.ok ? await verifyRes.json() : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get current contact to avoid overwriting
    const { data: currentContact } = await supabase
      .from("contacts")
      .select("position, linkedin_url, work_email, work_phone, company_domain")
      .eq("id", contact_id)
      .single();

    const person = hunterData?.data || {};
    const verification = verifyData?.data || {};

    const isValid = verification?.status === "valid" || verification?.result === "deliverable";
    const hasData = person.first_name || person.last_name || person.position || person.linkedin || verification?.status;

    if (!hasData && !isValid) {
      await supabase
        .from("contacts")
        .update({ hunter_status: "not_found", last_enriched_at: new Date().toISOString() })
        .eq("id", contact_id);

      return new Response(JSON.stringify({ status: "not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: Record<string, unknown> = {
      hunter_status: "enriched",
      last_enriched_at: new Date().toISOString(),
    };

    if (isValid && !currentContact?.work_email) {
      updates.work_email = email;
    }
    if (person.position && !currentContact?.position) {
      updates.position = person.position;
    }
    if (person.linkedin && !currentContact?.linkedin_url) {
      updates.linkedin_url = person.linkedin;
    }
    if (person.phone_number && !currentContact?.work_phone) {
      updates.work_phone = person.phone_number;
    }
    if (person.domain && !currentContact?.company_domain) {
      updates.company_domain = person.domain;
    }

    await supabase.from("contacts").update(updates).eq("id", contact_id);

    return new Response(JSON.stringify({ status: "enriched", updates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

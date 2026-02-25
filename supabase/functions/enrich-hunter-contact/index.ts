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
    const body = await req.json();
    const { contact_id, email, domain, full_name } = body;

    if (!contact_id) {
      return new Response(JSON.stringify({ error: "contact_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email && !(domain && full_name)) {
      return new Response(JSON.stringify({ error: "Either email or (domain + full_name) is required" }), {
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

    let person: Record<string, any> = {};
    let foundEmail: string | null = null;
    let isValid = false;

    if (domain && full_name) {
      // Mode: Email Finder by domain + full_name
      const nameParts = full_name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");

      const finderUrl = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${hunterKey}`;
      const finderRes = await fetch(finderUrl);
      const finderData = finderRes.ok ? await finderRes.json() : null;

      if (finderData?.data) {
        person = finderData.data;
        foundEmail = person.email || null;
        // confidence score > 0 means likely valid
        isValid = (person.score || 0) > 30;
      }
    } else if (email) {
      // Mode: Email Verifier (original behavior)
      const verifyUrl = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${hunterKey}`;
      const verifyRes = await fetch(verifyUrl);
      const verifyData = verifyRes.ok ? await verifyRes.json() : null;

      const verification = verifyData?.data || {};
      isValid = verification?.status === "valid" || verification?.result === "deliverable";
      foundEmail = email;

      // Also try email-finder for additional data
      const hunterUrl = `https://api.hunter.io/v2/email-finder?email=${encodeURIComponent(email)}&api_key=${hunterKey}`;
      const hunterRes = await fetch(hunterUrl);
      const hunterData = hunterRes.ok ? await hunterRes.json() : null;
      person = hunterData?.data || {};
    }

    const hasData = foundEmail || person.first_name || person.last_name || person.position || person.linkedin;

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

    if (foundEmail && isValid && !currentContact?.work_email) {
      updates.work_email = foundEmail;
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

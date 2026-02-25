import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 3;

interface EnrichResult {
  contact_id: string;
  full_name: string;
  hunter: string;
  apollo: string;
  lusha: string;
}

async function enrichWithHunter(
  contact: any,
  hunterKey: string,
  supabase: any
): Promise<string> {
  if (!contact.company_domain) return "skipped";
  
  try {
    const nameParts = contact.full_name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");
    const domain = contact.company_domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    const url = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${hunterKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Hunter error for ${contact.full_name}: HTTP ${res.status}`);
      return "error";
    }
    const data = await res.json();
    const person = data?.data;
    const foundEmail = person?.email || null;
    const isValid = (person?.score || 0) > 30;

    if (!foundEmail && !person?.position) {
      await supabase.from("contacts").update({ hunter_status: "not_found", last_enriched_at: new Date().toISOString() }).eq("id", contact.id);
      return "not_found";
    }

    const updates: Record<string, any> = { hunter_status: "enriched", last_enriched_at: new Date().toISOString() };
    if (foundEmail && isValid && !contact.work_email) updates.work_email = foundEmail;
    if (person.position && !contact.position) updates.position = person.position;
    if (person.linkedin && !contact.linkedin_url) updates.linkedin_url = person.linkedin;
    if (person.phone_number && !contact.work_phone) updates.work_phone = person.phone_number;
    if (person.domain && !contact.company_domain) updates.company_domain = person.domain;

    await supabase.from("contacts").update(updates).eq("id", contact.id);
    return "enriched";
  } catch (e) {
    console.error(`Hunter exception for ${contact.full_name}:`, e.message);
    return "error";
  }
}

async function enrichWithApollo(
  contact: any,
  apolloKey: string,
  supabase: any
): Promise<string> {
  try {
    const nameParts = contact.full_name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const body: Record<string, any> = { reveal_personal_emails: true };
    if (firstName) body.first_name = firstName;
    if (lastName) body.last_name = lastName;
    if (contact.company_domain) body.domain = contact.company_domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (contact.linkedin_url) body.linkedin_url = contact.linkedin_url;

    const res = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apolloKey },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`Apollo error for ${contact.full_name}: HTTP ${res.status}`);
      return "error";
    }

    const data = await res.json();
    const person = data.person;

    if (!person) {
      await supabase.from("contacts").update({ apollo_status: "not_found", last_enriched_at: new Date().toISOString() }).eq("id", contact.id);
      return "not_found";
    }

    // Re-read contact to get latest data (Hunter may have filled some fields)
    const { data: fresh } = await supabase.from("contacts").select("work_email, personal_email, mobile_phone, work_phone, position, linkedin_url, company_domain").eq("id", contact.id).single();
    const c = fresh || contact;

    const workEmail = person.email || null;
    const personalEmails = person.personal_emails || [];
    const personalEmail = personalEmails[0] || null;
    const phones = person.phone_numbers || [];
    const mobilePhone = phones.find((p: any) => p.type === "mobile")?.sanitized_number || phones[0]?.sanitized_number || null;
    const workPhone = phones.find((p: any) => p.type === "work_direct" || p.type === "work_hq")?.sanitized_number || null;
    const position = person.title || null;
    const linkedinUrl = person.linkedin_url || null;
    const domain = person.organization?.primary_domain || null;

    const hasData = workEmail || personalEmail || mobilePhone || workPhone || position;
    const updates: Record<string, any> = { apollo_status: hasData ? "enriched" : "not_found", last_enriched_at: new Date().toISOString() };

    if (workEmail && !c.work_email) updates.work_email = workEmail;
    if (personalEmail && !c.personal_email) updates.personal_email = personalEmail;
    if (mobilePhone && !c.mobile_phone) updates.mobile_phone = mobilePhone;
    if (workPhone && !c.work_phone) updates.work_phone = workPhone;
    if (position && !c.position) updates.position = position;
    if (linkedinUrl && !c.linkedin_url) updates.linkedin_url = linkedinUrl;
    if (domain && !c.company_domain) updates.company_domain = domain;

    await supabase.from("contacts").update(updates).eq("id", contact.id);
    return hasData ? "enriched" : "not_found";
  } catch (e) {
    console.error(`Apollo exception for ${contact.full_name}:`, e.message);
    return "error";
  }
}

async function enrichWithLusha(
  contact: any,
  lushaKey: string,
  supabase: any,
  orgName: string | null
): Promise<string> {
  try {
    const nameParts = contact.full_name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const params = new URLSearchParams();
    if (contact.linkedin_url) {
      params.set("linkedinUrl", contact.linkedin_url);
    } else {
      if (firstName) params.set("firstName", firstName);
      if (lastName) params.set("lastName", lastName);
      if (orgName) params.set("companyName", orgName);
    }

    const res = await fetch(`https://api.lusha.com/v2/person?${params.toString()}`, {
      headers: { api_key: lushaKey, "Content-Type": "application/json" },
    });

    // FIX: Don't mark not_found on HTTP errors — only return "error" to allow retries
    if (!res.ok) {
      console.error(`Lusha error for ${contact.full_name}: HTTP ${res.status}`);
      return "error";
    }

    // Re-read contact to get latest data
    const { data: fresh } = await supabase.from("contacts").select("work_email, personal_email, mobile_phone, work_phone").eq("id", contact.id).single();
    const c = fresh || contact;

    const data = await res.json();
    const emails = data.emailAddresses || data.emails || [];
    const workEmail = emails.find((e: any) => e.type === "work" || e.type === "professional")?.email || emails[0]?.email || null;
    const personalEmail = emails.find((e: any) => e.type === "personal")?.email || (emails.length > 1 ? emails[1]?.email : null);

    const phones = data.phoneNumbers || data.phones || [];
    const mobilePhone = phones.find((p: any) => p.type === "mobile")?.internationalNumber || phones[0]?.internationalNumber || null;
    const workPhone = phones.find((p: any) => p.type === "work" || p.type === "landline")?.internationalNumber || null;

    const hasData = workEmail || personalEmail || mobilePhone || workPhone;
    const updates: Record<string, any> = { lusha_status: hasData ? "enriched" : "not_found", last_enriched_at: new Date().toISOString() };

    if (workEmail && !c.work_email) updates.work_email = workEmail;
    if (personalEmail && !c.personal_email) updates.personal_email = personalEmail;
    if (mobilePhone && !c.mobile_phone) updates.mobile_phone = mobilePhone;
    if (workPhone && !c.work_phone) updates.work_phone = workPhone;

    await supabase.from("contacts").update(updates).eq("id", contact.id);
    return hasData ? "enriched" : "not_found";
  } catch (e) {
    console.error(`Lusha exception for ${contact.full_name}:`, e.message);
    return "error";
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // FIX: Use getUser() instead of getClaims()
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.id;
    const hunterKey = Deno.env.get("HUNTER_API_KEY") || "";
    const apolloKey = Deno.env.get("APOLLO_API_KEY") || "";
    const lushaKey = Deno.env.get("LUSHA_API_KEY") || "";

    const { last_id = "", services = ["hunter", "apollo", "lusha"] } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // FIX: Use SQL filtering + ID-based cursor instead of offset + JS filtering
    // Only get contacts missing ALL email AND ALL phone, and not fully processed by all 3 services
    let query = supabase
      .from("contacts")
      .select("id, full_name, company_domain, email, phone, work_email, personal_email, mobile_phone, work_phone, position, linkedin_url, organization_id, hunter_status, apollo_status, lusha_status")
      .eq("created_by", userId)
      .or("email.is.null,email.eq.")
      .or("work_email.is.null,work_email.eq.")
      .or("personal_email.is.null,personal_email.eq.")
      .or("phone.is.null,phone.eq.")
      .or("mobile_phone.is.null,mobile_phone.eq.")
      .or("work_phone.is.null,work_phone.eq.")
      .order("id")
      .limit(BATCH_SIZE);

    if (last_id) {
      query = query.gt("id", last_id);
    }

    const { data: candidates, error: fetchErr } = await query;

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Post-filter: truly no email AND no phone, and at least one service still pending
    const toEnrich = (candidates || []).filter((c: any) => {
      const hasEmail = c.email || c.work_email || c.personal_email;
      const hasPhone = c.phone || c.mobile_phone || c.work_phone;
      if (hasEmail && hasPhone) return false;

      // Skip if all requested services already have definitive results
      const allDone = services.every((svc: string) => {
        const status = c[`${svc}_status`];
        return status === "enriched" || status === "not_found";
      });
      return !allDone;
    });

    if (toEnrich.length === 0) {
      return new Response(JSON.stringify({ done: true, processed: 0, results: [], message: "No quedan contactos sin datos" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get org names for Lusha
    const orgIds = [...new Set(toEnrich.map((c: any) => c.organization_id).filter(Boolean))];
    const orgMap = new Map<string, string>();
    if (orgIds.length > 0) {
      const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", orgIds);
      orgs?.forEach((o: any) => orgMap.set(o.id, o.name));
    }

    const results: EnrichResult[] = [];
    let lastProcessedId = "";

    for (const contact of toEnrich) {
      const result: EnrichResult = {
        contact_id: contact.id,
        full_name: contact.full_name,
        hunter: "skipped",
        apollo: "skipped",
        lusha: "skipped",
      };

      // Hunter (needs domain, skip if already processed)
      if (services.includes("hunter") && hunterKey && contact.company_domain && contact.hunter_status === "pending") {
        result.hunter = await enrichWithHunter(contact, hunterKey, supabase);
        await new Promise((r) => setTimeout(r, 500));
      }

      // Apollo (skip if already processed)
      if (services.includes("apollo") && apolloKey && contact.apollo_status === "pending") {
        result.apollo = await enrichWithApollo(contact, apolloKey, supabase);
        await new Promise((r) => setTimeout(r, 500));
      }

      // Lusha (skip if already processed)
      if (services.includes("lusha") && lushaKey && contact.lusha_status === "pending") {
        const orgName = contact.organization_id ? orgMap.get(contact.organization_id) || null : null;
        result.lusha = await enrichWithLusha(contact, lushaKey, supabase, orgName);
        await new Promise((r) => setTimeout(r, 500));
      }

      lastProcessedId = contact.id;
      results.push(result);
      console.log(`Enriched ${contact.full_name}: H=${result.hunter} A=${result.apollo} L=${result.lusha}`);
    }

    return new Response(
      JSON.stringify({
        done: (candidates || []).length < BATCH_SIZE,
        processed: toEnrich.length,
        last_id: lastProcessedId,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Bulk enrich error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

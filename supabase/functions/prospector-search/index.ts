import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProspectResult {
  name: string;
  position: string;
  company: string;
  domain: string;
  email: string;
  confidence: number;
  source: string;
  linkedin_url?: string;
  phone?: string;
  already_in_crm?: boolean;
}

async function searchApollo(apiKey: string, filters: any): Promise<ProspectResult[]> {
  const body: any = { page: 1, per_page: 25 };
  if (filters.job_title) body.person_titles = [filters.job_title];
  if (filters.domain) body.q_organization_domains = filters.domain;
  if (filters.company) body.q_organization_name = filters.company;
  if (filters.location) body.person_locations = [filters.location];
  if (filters.industry) body.organization_industry_tag_ids = [filters.industry];

  const res = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Apollo HTTP ${res.status}`);
  const json = await res.json();

  return (json.people || []).map((p: any) => ({
    name: p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
    position: p.title || "",
    company: p.organization?.name || "",
    domain: p.organization?.primary_domain || "",
    email: p.email || "",
    confidence: p.email_status === "verified" ? 95 : p.email ? 70 : 0,
    source: "apollo",
    linkedin_url: p.linkedin_url || "",
    phone: p.phone_numbers?.[0]?.sanitized_number || "",
  }));
}

async function searchHunter(apiKey: string, filters: any): Promise<ProspectResult[]> {
  if (!filters.domain) return [];
  const params = new URLSearchParams({ domain: filters.domain, api_key: apiKey, limit: "25" });
  if (filters.job_title) params.set("seniority", filters.job_title);

  const res = await fetch(`https://api.hunter.io/v2/domain-search?${params}`);
  if (!res.ok) throw new Error(`Hunter HTTP ${res.status}`);
  const json = await res.json();

  return (json.data?.emails || []).map((e: any) => ({
    name: `${e.first_name || ""} ${e.last_name || ""}`.trim() || "Desconocido",
    position: e.position || "",
    company: json.data?.organization || "",
    domain: filters.domain,
    email: e.value || "",
    confidence: e.confidence || 0,
    source: "hunter",
    linkedin_url: e.linkedin || "",
    phone: e.phone_number || "",
  }));
}

async function searchLusha(apiKey: string, filters: any): Promise<ProspectResult[]> {
  const params: any = {};
  if (filters.company) params.company = filters.company;
  if (filters.job_title) params.title = filters.job_title;
  if (filters.domain) params.companyDomain = filters.domain;

  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`https://api.lusha.com/v2/person?${qs}`, {
    headers: { api_key: apiKey },
  });
  if (!res.ok) throw new Error(`Lusha HTTP ${res.status}`);
  const json = await res.json();
  const people = Array.isArray(json) ? json : json.data ? (Array.isArray(json.data) ? json.data : [json.data]) : [json];

  return people.filter((p: any) => p.firstName || p.fullName).map((p: any) => ({
    name: p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim(),
    position: p.title || p.jobTitle || "",
    company: p.company?.name || p.companyName || "",
    domain: p.company?.domain || filters.domain || "",
    email: p.emails?.[0]?.email || p.emailAddress || "",
    confidence: p.emails?.[0]?.type === "professional" ? 90 : 60,
    source: "lusha",
    phone: p.phoneNumbers?.[0]?.internationalNumber || "",
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    const { provider, filters } = await req.json();

    let results: ProspectResult[] = [];

    if (provider === "apollo") {
      const key = Deno.env.get("APOLLO_API_KEY");
      if (!key) throw new Error("APOLLO_API_KEY not configured");
      results = await searchApollo(key, filters);
    } else if (provider === "hunter") {
      const key = Deno.env.get("HUNTER_API_KEY");
      if (!key) throw new Error("HUNTER_API_KEY not configured");
      results = await searchHunter(key, filters);
    } else if (provider === "lusha") {
      const key = Deno.env.get("LUSHA_API_KEY");
      if (!key) throw new Error("LUSHA_API_KEY not configured");
      results = await searchLusha(key, filters);
    } else {
      throw new Error(`Provider "${provider}" not supported`);
    }

    // Anti-duplicate check
    if (results.length > 0) {
      const emails = results.filter((r) => r.email).map((r) => r.email.toLowerCase());
      const names = results.map((r) => r.name.toLowerCase());

      const { data: existing } = await supabase
        .from("contacts")
        .select("email, full_name, company_domain")
        .or(
          emails.length > 0
            ? `email.in.(${emails.join(",")}),full_name.in.(${names.join(",")})`
            : `full_name.in.(${names.join(",")})`
        );

      if (existing && existing.length > 0) {
        const existingEmails = new Set(existing.map((c: any) => (c.email || "").toLowerCase()));
        const existingNames = new Set(existing.map((c: any) => (c.full_name || "").toLowerCase()));

        results = results.map((r) => ({
          ...r,
          already_in_crm: existingEmails.has(r.email.toLowerCase()) || existingNames.has(r.name.toLowerCase()),
        }));
      }
    }

    return new Response(JSON.stringify({ results, count: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

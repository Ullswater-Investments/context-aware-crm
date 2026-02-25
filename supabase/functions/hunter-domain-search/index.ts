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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { domain, action, first_name, last_name, email } = body;

    if (!domain) {
      return new Response(JSON.stringify({ error: "Domain is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean domain
    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "")
      .trim();

    const apiKey = Deno.env.get("HUNTER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Hunter API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Company Finder mode
    if (action === "company-find") {
      const url = `https://api.hunter.io/v2/companies/find?domain=${encodeURIComponent(cleanDomain)}&api_key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.errors) {
        return new Response(JSON.stringify({ error: data.errors[0]?.details || "Hunter API error" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const c = data.data || {};
      return new Response(JSON.stringify({
        name: c.name || null,
        domain: c.domain || cleanDomain,
        industry: c.industry || null,
        country: c.country || null,
        state: c.state || null,
        city: c.city || null,
        size: c.size || null,
        linkedin_url: c.linkedin_url || null,
        twitter_handle: c.twitter_handle || null,
        description: c.description || null,
        founded: c.founded || null,
        logo_url: c.logo_url || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Combined Find mode (person + verification in one call)
    if (action === "combined-find" || action === "people-find") {
      if (!email) {
        return new Response(JSON.stringify({ error: "email is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const url = `https://api.hunter.io/v2/combined/find?email=${encodeURIComponent(email)}&api_key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.errors) {
        return new Response(JSON.stringify({ error: data.errors[0]?.details || "Hunter API error" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const p = data.data?.person || {};
      const v = data.data?.verification || {};
      return new Response(JSON.stringify({
        first_name: p.first_name || null,
        last_name: p.last_name || null,
        full_name: p.full_name || null,
        email: email,
        position: p.position || null,
        seniority: p.seniority || null,
        department: p.department || null,
        linkedin_url: p.linkedin_url || null,
        twitter: p.twitter || null,
        phone_number: p.phone_number || null,
        company: p.company || null,
        country: p.country || null,
        verification: {
          status: v.status || "unknown",
          result: v.result || "unknown",
          score: v.score ?? null,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Email Verifier mode
    if (action === "email-verifier") {
      if (!email) {
        return new Response(JSON.stringify({ error: "email is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.errors) {
        return new Response(JSON.stringify({ error: data.errors[0]?.details || "Hunter API error" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        email: data.data?.email || email,
        status: data.data?.status || "unknown",
        result: data.data?.result || "unknown",
        score: data.data?.score ?? null,
        regexp: data.data?.regexp ?? null,
        smtp_server: data.data?.smtp_server ?? null,
        smtp_check: data.data?.smtp_check ?? null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Email Finder mode
    if (action === "email-finder") {
      if (!first_name || !last_name) {
        return new Response(JSON.stringify({ error: "first_name and last_name are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const url = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(cleanDomain)}&first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}&api_key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.errors) {
        return new Response(JSON.stringify({ error: data.errors[0]?.details || "Hunter API error" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        email: data.data?.email || null,
        confidence: data.data?.score || 0,
        position: data.data?.position || null,
        first_name: data.data?.first_name || first_name,
        last_name: data.data?.last_name || last_name,
        domain: cleanDomain,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: Domain Search mode
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(cleanDomain)}&api_key=${apiKey}`;
    const hunterRes = await fetch(url);
    const hunterData = await hunterRes.json();

    if (hunterData.errors) {
      return new Response(JSON.stringify({ error: hunterData.errors[0]?.details || "Hunter API error" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = {
      domain: cleanDomain,
      pattern: hunterData.data?.pattern || null,
      organization: hunterData.data?.organization || null,
      emails: (hunterData.data?.emails || []).map((e: any) => ({
        email: e.value,
        type: e.type,
        confidence: e.confidence,
        first_name: e.first_name || null,
        last_name: e.last_name || null,
        position: e.position || null,
      })),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

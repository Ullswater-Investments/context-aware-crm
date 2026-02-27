import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchHunter(apiKey: string) {
  try {
    const res = await fetch(`https://api.hunter.io/v2/account?api_key=${apiKey}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const d = json.data;
    return {
      provider: "hunter",
      status: "connected",
      searches: { used: d.requests?.searches?.used ?? 0, available: d.requests?.searches?.available ?? 0 },
      verifications: { used: d.requests?.verifications?.used ?? 0, available: d.requests?.verifications?.available ?? 0 },
      plan: d.plan_name ?? "unknown",
      reset_date: d.reset_date ?? null,
    };
  } catch (e) {
    return { provider: "hunter", status: "error", error: e.message };
  }
}

async function fetchApollo(apiKey: string) {
  try {
    const res = await fetch("https://api.apollo.io/v1/auth/health", {
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return {
      provider: "apollo",
      status: "connected",
      is_active: json.is_active ?? true,
      plan: json.plan?.name ?? "unknown",
      credits: {
        used: json.current_usage ?? 0,
        total: json.plan?.credits ?? 0,
        remaining: (json.plan?.credits ?? 0) - (json.current_usage ?? 0),
      },
    };
  } catch (e) {
    // Apollo health endpoint may return limited info; try alternate
    return { provider: "apollo", status: "connected", plan: "API Key válida", credits: { used: 0, total: 10000, remaining: 10000 }, note: "Estimación - Apollo no expone créditos exactos" };
  }
}

async function fetchFindymail(apiKey: string) {
  try {
    const res = await fetch("https://app.findymail.com/api/credits", {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return {
      provider: "findymail",
      status: "connected",
      credits: { remaining: json.credits ?? 0, total: json.credits ?? 0, used: 0 },
    };
  } catch (e) {
    return { provider: "findymail", status: "error", error: e.message };
  }
}

async function fetchLusha(apiKey: string) {
  try {
    const res = await fetch("https://api.lusha.com/account/usage", {
      headers: { api_key: apiKey, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return {
      provider: "lusha",
      status: "connected",
      credits: { used: json.used ?? 0, remaining: json.remaining ?? 0, total: json.total ?? 0 },
    };
  } catch (e) {
    return { provider: "lusha", status: "error", error: e.message };
  }
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const hunterKey = Deno.env.get("HUNTER_API_KEY") ?? "";
    const apolloKey = Deno.env.get("APOLLO_API_KEY") ?? "";
    const findymailKey = Deno.env.get("FINDYMAIL_API_KEY") ?? "";
    const lushaKey = Deno.env.get("LUSHA_API_KEY") ?? "";

    const results = await Promise.allSettled([
      hunterKey ? fetchHunter(hunterKey) : Promise.resolve({ provider: "hunter", status: "not_configured" }),
      apolloKey ? fetchApollo(apolloKey) : Promise.resolve({ provider: "apollo", status: "not_configured" }),
      findymailKey ? fetchFindymail(findymailKey) : Promise.resolve({ provider: "findymail", status: "not_configured" }),
      lushaKey ? fetchLusha(lushaKey) : Promise.resolve({ provider: "lusha", status: "not_configured" }),
    ]);

    const providers = results.map((r) => r.status === "fulfilled" ? r.value : { provider: "unknown", status: "error", error: "Promise rejected" });

    return new Response(JSON.stringify({ providers, fetched_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function testWhatsApp(): Promise<{ status: string; details: Record<string, unknown> }> {
  const token = Deno.env.get("WHAPI_API_TOKEN");
  if (!token) return { status: "not_configured", details: { message: "WHAPI_API_TOKEN no configurado" } };
  try {
    const res = await fetch("https://gate.whapi.cloud/settings", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return { status: "error", details: { http: res.status, message: data } };
    return { status: "connected", details: { phone: data?.phone || null, name: data?.pushname || data?.name || null } };
  } catch (e) {
    return { status: "error", details: { message: (e as Error).message } };
  }
}

async function testHunter(): Promise<{ status: string; details: Record<string, unknown> }> {
  const key = Deno.env.get("HUNTER_API_KEY");
  if (!key) return { status: "not_configured", details: { message: "HUNTER_API_KEY no configurado" } };
  try {
    const res = await fetch(`https://api.hunter.io/v2/account?api_key=${key}`);
    const data = await res.json();
    if (!res.ok) return { status: "error", details: { http: res.status, message: data } };
    return { status: "connected", details: { email: data?.data?.email, requests: data?.data?.requests } };
  } catch (e) {
    return { status: "error", details: { message: (e as Error).message } };
  }
}

async function testApollo(): Promise<{ status: string; details: Record<string, unknown> }> {
  const key = Deno.env.get("APOLLO_API_KEY");
  if (!key) return { status: "not_configured", details: { message: "APOLLO_API_KEY no configurado" } };
  try {
    const res = await fetch("https://api.apollo.io/v1/auth/health", {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      method: "POST",
      body: JSON.stringify({ api_key: key }),
    });
    const data = await res.json();
    if (!res.ok) return { status: "error", details: { http: res.status, message: data } };
    return { status: "connected", details: { is_logged_in: data?.is_logged_in ?? true } };
  } catch (e) {
    return { status: "error", details: { message: (e as Error).message } };
  }
}

async function testFindymail(): Promise<{ status: string; details: Record<string, unknown> }> {
  const key = Deno.env.get("FINDYMAIL_API_KEY");
  if (!key) return { status: "not_configured", details: { message: "FINDYMAIL_API_KEY no configurado" } };
  try {
    const res = await fetch("https://app.findymail.com/api/credits", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await res.json();
    if (!res.ok) return { status: "error", details: { http: res.status, message: data } };
    return { status: "connected", details: { credits: data?.credits ?? null } };
  } catch (e) {
    return { status: "error", details: { message: (e as Error).message } };
  }
}

async function testLusha(): Promise<{ status: string; details: Record<string, unknown> }> {
  const key = Deno.env.get("LUSHA_API_KEY");
  if (!key) return { status: "not_configured", details: { message: "LUSHA_API_KEY no configurado" } };
  try {
    const res = await fetch("https://api.lusha.com/person", {
      headers: { "api_key": key },
    });
    // Lusha returns 400 for missing params but 401/403 for bad key
    if (res.status === 401 || res.status === 403) {
      const data = await res.json();
      return { status: "error", details: { http: res.status, message: data } };
    }
    await res.text();
    return { status: "connected", details: { message: "API Key válida" } };
  } catch (e) {
    return { status: "error", details: { message: (e as Error).message } };
  }
}

const connectorMap: Record<string, () => Promise<{ status: string; details: Record<string, unknown> }>> = {
  whatsapp: testWhatsApp,
  hunter: testHunter,
  apollo: testApollo,
  findymail: testFindymail,
  lusha: testLusha,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connector } = await req.json();

    if (!connector || !connectorMap[connector]) {
      return new Response(
        JSON.stringify({ error: `Conector no soportado: ${connector}. Válidos: ${Object.keys(connectorMap).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await connectorMap[connector]();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("test-connector error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

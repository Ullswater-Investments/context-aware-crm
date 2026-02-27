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
    const token = Deno.env.get("WHAPI_API_TOKEN");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "WHAPI_API_TOKEN not configured", error_code: "no_token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action } = await req.json();

    if (action === "health") {
      const res = await fetch("https://gate.whapi.cloud/health", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`[whatsapp-qr] health status: ${res.status}`);
      
      if (res.status === 404) {
        return new Response(
          JSON.stringify({ error: "Canal no encontrado. Verifica que el token WHAPI_API_TOKEN es válido.", error_code: "channel_not_found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      console.log(`[whatsapp-qr] health data:`, JSON.stringify(data));
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "qr") {
      // Try /users/login first
      const res = await fetch("https://gate.whapi.cloud/users/login", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`[whatsapp-qr] qr login status: ${res.status}`);

      // 409 = already authenticated
      if (res.status === 409) {
        return new Response(
          JSON.stringify({ already_authenticated: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (res.status === 404) {
        return new Response(
          JSON.stringify({ error: "Canal no encontrado. Verifica que el token WHAPI_API_TOKEN es válido.", error_code: "channel_not_found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[whatsapp-qr] qr login error ${res.status}:`, errBody);
        return new Response(
          JSON.stringify({ error: `Error de Whapi (${res.status})`, error_code: "whapi_error", details: errBody }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      console.log(`[whatsapp-qr] qr data keys:`, Object.keys(data));

      // If we got a QR, return it
      const qr = data?.qr || data?.image || null;
      if (qr) {
        return new Response(JSON.stringify({ qr }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback: try /users/login/image for binary QR image
      console.log(`[whatsapp-qr] No QR in /users/login response, trying /users/login/image`);
      const imgRes = await fetch("https://gate.whapi.cloud/users/login/image", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`[whatsapp-qr] login/image status: ${imgRes.status}`);

      if (imgRes.status === 409) {
        return new Response(
          JSON.stringify({ already_authenticated: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        return new Response(
          JSON.stringify({ qr: `data:image/png;base64,${base64}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "No se pudo obtener el código QR", error_code: "no_qr" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'health' or 'qr'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[whatsapp-qr] Error:`, message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

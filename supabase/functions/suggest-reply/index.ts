import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const toneInstructions: Record<string, string> = {
  formal:
    "Usa un lenguaje corporativo, respetuoso y estructurado. Ideal para comunicaciones institucionales.",
  amigable:
    "Sé cálido, cercano y profesional. Puedes usar algún emoji amable si encaja con el contexto.",
  persuasivo:
    "Céntrate en los beneficios y el valor. Usa llamadas a la acción (CTA) claras y lenguaje convincente.",
  conciso:
    "Responde en máximo 2 o 3 frases. Ve directo al grano sin rodeos.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, body_text, to_email, tone } = await req.json();

    if (!subject || !body_text) {
      return new Response(
        JSON.stringify({ error: "Faltan campos obligatorios (subject, body_text)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toneInstruction = toneInstructions[tone] || toneInstructions.formal;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Eres un asistente de CRM profesional que redacta respuestas a emails.

ESTILO DE RESPUESTA: ${toneInstruction}

REGLAS:
1. Devuelve SOLO el cuerpo HTML de la respuesta usando etiquetas <p>, <br>, <strong>.
2. Responde en el mismo idioma que el email original.
3. No inventes datos que no conoces (cifras, fechas, nombres de productos).
4. No incluyas líneas de asunto ni cabeceras de email, solo el cuerpo.
5. Incluye un saludo apropiado al inicio y una despedida profesional al final.`,
            },
            {
              role: "user",
              content: `Genera una respuesta al siguiente email:

Asunto: ${subject}
De: ${to_email || "remitente desconocido"}

Contenido del email:
${body_text}`,
            },
          ],
          stream: false,
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA agotados. Añade créditos en la configuración del workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Error al generar la respuesta con IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const suggestion = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-reply error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Attachment {
  name: string;
  type: string;
  content: string;
}

function buildUserMessageWithAttachments(
  userContent: string,
  attachments: Attachment[]
): any {
  const parts: any[] = [];
  const textAttachments: Attachment[] = [];
  const imageAttachments: Attachment[] = [];

  for (const att of attachments) {
    if (att.type.startsWith("image/")) {
      imageAttachments.push(att);
    } else {
      textAttachments.push(att);
    }
  }

  let fullText = userContent;
  if (textAttachments.length > 0) {
    fullText += "\n\n---\nArchivos adjuntos:\n";
    for (const att of textAttachments) {
      fullText += `\n📄 **${att.name}**:\n\`\`\`\n${att.content}\n\`\`\`\n`;
    }
  }

  parts.push({ type: "text", text: fullText });

  for (const img of imageAttachments) {
    const mimeType = img.type || "image/png";
    parts.push({
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${img.content}`,
      },
    });
  }

  return { role: "user", content: parts };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Validate JWT
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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, attachments } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const hasAttachments = attachments && attachments.length > 0;
    const hasImages = hasAttachments && attachments.some((a: Attachment) => a.type.startsWith("image/"));

    const model = hasImages
      ? "google/gemini-2.5-pro"
      : "google/gemini-3-flash-preview";

    const systemMsg = {
      role: "system",
      content: `Eres el asistente IA de EuroCRM, un CRM especializado en la gestión de proyectos europeos.

Tu rol es ayudar al usuario con:
- Gestión de contactos, empresas y socios de consorcios europeos
- Seguimiento de proyectos, convocatorias y deadlines
- Redacción de emails profesionales en español, inglés u otros idiomas
- Análisis de documentos como presupuestos Lump Sum, mandatos, informes
- Resúmenes de comunicaciones e historial de interacciones
- Gestión de tareas pendientes y planificación

Responde siempre de forma profesional, concisa y orientada a la acción.
Cuando redactes emails, usa un tono formal apropiado para el contexto europeo institucional.
Puedes responder en español o en el idioma que el usuario solicite.
Cuando el usuario adjunte archivos, analízalos en detalle y responde sobre su contenido.`,
    };

    const processedMessages = [...messages];
    if (hasAttachments && processedMessages.length > 0) {
      const lastMsg = processedMessages[processedMessages.length - 1];
      if (lastMsg.role === "user") {
        processedMessages[processedMessages.length - 1] = buildUserMessageWithAttachments(
          lastMsg.content,
          attachments
        );
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [systemMsg, ...processedMessages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Espera un momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Añade fondos a tu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Error del servicio IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

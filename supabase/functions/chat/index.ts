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

const tools = [
  {
    type: "function",
    function: {
      name: "create_contact",
      description: "Crea un nuevo contacto en el CRM. Usa esta herramienta cuando el usuario pida guardar, registrar o crear un contacto nuevo. Siempre incluye etiquetas relevantes basadas en el contexto (sector, origen, tipo).",
      parameters: {
        type: "object",
        properties: {
          full_name: { type: "string", description: "Nombre completo del contacto" },
          email: { type: "string", description: "Email principal" },
          phone: { type: "string", description: "Teléfono" },
          position: { type: "string", description: "Cargo o puesto" },
          company_name: { type: "string", description: "Nombre de la empresa u organización" },
          tags: { type: "array", items: { type: "string" }, description: "Etiquetas para clasificar el contacto (ej: dental, farmaceutico, tech, lead-frio, partner-europeo)" },
        },
        required: ["full_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_contacts",
      description: "Busca contactos existentes en el CRM por nombre, email o empresa. Úsala antes de crear un contacto para evitar duplicados, o cuando el usuario pregunte por contactos existentes.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto de búsqueda (nombre, email o empresa)" },
        },
        required: ["query"],
      },
    },
  },
];

async function executeCreateContact(
  supabase: any,
  userId: string,
  args: { full_name: string; email?: string; phone?: string; position?: string; company_name?: string; tags?: string[] }
): Promise<string> {
  let organizationId: string | null = null;

  // If company_name provided, find or create organization
  if (args.company_name) {
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id, name")
      .ilike("name", args.company_name)
      .limit(1);

    if (existingOrg && existingOrg.length > 0) {
      organizationId = existingOrg[0].id;
    } else {
      const { data: newOrg, error: orgErr } = await supabase
        .from("organizations")
        .insert({ name: args.company_name, created_by: userId })
        .select("id")
        .single();
      if (newOrg) organizationId = newOrg.id;
      if (orgErr) console.error("Error creating org:", orgErr);
    }
  }

  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      full_name: args.full_name,
      email: args.email || null,
      phone: args.phone || null,
      position: args.position || null,
      tags: args.tags || [],
      organization_id: organizationId,
      created_by: userId,
    })
    .select("id, full_name, email, phone, position, tags")
    .single();

  if (error) {
    return JSON.stringify({ success: false, error: error.message });
  }

  return JSON.stringify({
    success: true,
    contact_id: contact.id,
    full_name: contact.full_name,
    email: contact.email,
    phone: contact.phone,
    position: contact.position,
    tags: contact.tags,
    organization: args.company_name || null,
  });
}

async function executeSearchContacts(
  supabase: any,
  query: string
): Promise<string> {
  const { data, error } = await supabase
    .from("contacts")
    .select("id, full_name, email, phone, position, tags, organizations(name)")
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(10);

  if (error) {
    return JSON.stringify({ success: false, error: error.message });
  }

  return JSON.stringify({
    success: true,
    count: data.length,
    contacts: data.map((c: any) => ({
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      phone: c.phone,
      position: c.position,
      tags: c.tags,
      company: c.organizations?.name || null,
    })),
  });
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

    const userId = claimsData.claims.sub as string;

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

CAPACIDADES AGÉNTICAS:
- Puedes CREAR contactos directamente en el CRM usando la herramienta create_contact.
- Puedes BUSCAR contactos existentes usando search_contacts.
- Cuando el usuario mencione guardar, registrar o crear un contacto, usa create_contact.
- SIEMPRE busca primero si el contacto ya existe antes de crearlo para evitar duplicados.
- Cuando crees un contacto, incluye ETIQUETAS relevantes basadas en el contexto (sector, origen, tipo de relación). Por ejemplo: si es del sector dental, agrega la etiqueta "dental". Si es un partner europeo, agrega "partner-europeo".
- Después de crear un contacto exitosamente, incluye en tu respuesta el marcador [CONTACT_CREATED:ID_DEL_CONTACTO] para que el frontend muestre una tarjeta visual.

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

    const aiHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };
    const aiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";

    // Tool-calling loop (non-streaming)
    let conversationMessages = [systemMsg, ...processedMessages];
    const MAX_TOOL_ROUNDS = 5;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const toolResponse = await fetch(aiUrl, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model,
          messages: conversationMessages,
          tools,
          stream: false,
        }),
      });

      if (!toolResponse.ok) {
        const status = toolResponse.status;
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "Demasiadas solicitudes. Espera un momento." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "Créditos agotados. Añade fondos a tu workspace." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const t = await toolResponse.text();
        console.error("AI gateway error:", status, t);
        return new Response(
          JSON.stringify({ error: "Error del servicio IA" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const toolResult = await toolResponse.json();
      const choice = toolResult.choices?.[0];

      if (!choice) {
        return new Response(
          JSON.stringify({ error: "No response from AI" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If no tool calls, stream the final response
      if (!choice.message?.tool_calls || choice.message.tool_calls.length === 0) {
        // Final text response - stream it
        const finalContent = choice.message?.content || "";

        // Make a streaming call for the final response
        const streamResponse = await fetch(aiUrl, {
          method: "POST",
          headers: aiHeaders,
          body: JSON.stringify({
            model,
            messages: conversationMessages,
            stream: true,
          }),
        });

        if (!streamResponse.ok) {
          // Fallback: return the non-streamed content as SSE
          const encoder = new TextEncoder();
          const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: finalContent } }] })}\n\ndata: [DONE]\n\n`;
          return new Response(encoder.encode(sseData), {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }

        return new Response(streamResponse.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      // Execute tool calls
      conversationMessages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs: any;
        try {
          fnArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          fnArgs = {};
        }

        let result: string;
        if (fnName === "create_contact") {
          result = await executeCreateContact(supabase, userId, fnArgs);
        } else if (fnName === "search_contacts") {
          result = await executeSearchContacts(supabase, fnArgs.query || "");
        } else {
          result = JSON.stringify({ error: `Unknown tool: ${fnName}` });
        }

        conversationMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }
      // Continue loop to let model process tool results
    }

    // If we exhausted rounds, return error
    return new Response(
      JSON.stringify({ error: "Demasiadas llamadas a herramientas" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

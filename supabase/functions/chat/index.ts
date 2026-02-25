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

// ─── Tool definitions ───

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
  {
    type: "function",
    function: {
      name: "list_available_tags",
      description: "Lista todas las etiquetas únicas que existen en los contactos del CRM. Úsala para verificar que una etiqueta existe antes de buscar contactos por ella, o para mostrar al usuario las etiquetas disponibles.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "search_contacts_by_tag",
      description: "Busca contactos que tengan una etiqueta específica. Devuelve solo contactos que tengan al menos un email disponible. Úsala cuando el usuario quiera enviar emails a contactos de una etiqueta o ver quiénes pertenecen a un grupo.",
      parameters: {
        type: "object",
        properties: {
          tag: { type: "string", description: "Etiqueta a buscar (ej: dental, tech, partner-europeo)" },
        },
        required: ["tag"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_campaign_email",
      description: "Envía un email masivo a todos los contactos que tengan una etiqueta específica. IMPORTANTE: Solo usar después de que el usuario haya confirmado explícitamente el envío. Máximo 50 destinatarios por campaña.",
      parameters: {
        type: "object",
        properties: {
          tag: { type: "string", description: "Etiqueta para filtrar destinatarios" },
          subject: { type: "string", description: "Asunto del email" },
          html_body: { type: "string", description: "Cuerpo del email en HTML" },
          text_body: { type: "string", description: "Cuerpo del email en texto plano" },
        },
        required: ["tag", "subject", "html_body"],
      },
    },
  },
];

// ─── Tool executors ───

async function executeCreateContact(
  supabase: any,
  userId: string,
  args: { full_name: string; email?: string; phone?: string; position?: string; company_name?: string; tags?: string[] }
): Promise<string> {
  let organizationId: string | null = null;

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

  if (error) return JSON.stringify({ success: false, error: error.message });

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

async function executeSearchContacts(supabase: any, query: string): Promise<string> {
  const { data, error } = await supabase
    .from("contacts")
    .select("id, full_name, email, phone, position, tags, organizations(name)")
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(10);

  if (error) return JSON.stringify({ success: false, error: error.message });

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

async function executeListAvailableTags(supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from("contacts")
    .select("tags");

  if (error) return JSON.stringify({ success: false, error: error.message });

  const tagSet = new Set<string>();
  for (const row of data) {
    if (row.tags && Array.isArray(row.tags)) {
      for (const t of row.tags) tagSet.add(t);
    }
  }

  const tags = Array.from(tagSet).sort();
  return JSON.stringify({ success: true, count: tags.length, tags });
}

async function executeSearchContactsByTag(supabase: any, tag: string): Promise<string> {
  const { data, error } = await supabase
    .from("contacts")
    .select("id, full_name, email, work_email, personal_email, position, tags, organizations(name)")
    .contains("tags", [tag]);

  if (error) return JSON.stringify({ success: false, error: error.message });

  // Filter to only contacts with at least one email
  const withEmail = data.filter(
    (c: any) => c.email || c.work_email || c.personal_email
  );

  return JSON.stringify({
    success: true,
    count: withEmail.length,
    contacts: withEmail.map((c: any) => ({
      id: c.id,
      full_name: c.full_name,
      email: c.work_email || c.email || c.personal_email,
      position: c.position,
      tags: c.tags,
      company: c.organizations?.name || null,
    })),
  });
}

async function executeSendCampaignEmail(
  supabase: any,
  userId: string,
  args: { tag: string; subject: string; html_body: string; text_body?: string }
): Promise<string> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" });

  // Get contacts by tag
  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("id, full_name, email, work_email, personal_email")
    .contains("tags", [args.tag]);

  if (error) return JSON.stringify({ success: false, error: error.message });

  const withEmail = contacts.filter(
    (c: any) => c.email || c.work_email || c.personal_email
  );

  if (withEmail.length === 0) {
    return JSON.stringify({ success: false, error: `No hay contactos con la etiqueta "${args.tag}" que tengan email.` });
  }

  // Rate limit: max 50
  if (withEmail.length > 50) {
    return JSON.stringify({
      success: false,
      error: `Demasiados destinatarios (${withEmail.length}). El límite es 50 por campaña. Usa etiquetas más específicas.`,
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const fromEmail = "EuroCRM <onboarding@resend.dev>";
  let sent = 0;
  let failed = 0;
  const recipients: { name: string; email: string; status: string }[] = [];

  for (const contact of withEmail) {
    const toEmail = contact.work_email || contact.email || contact.personal_email;

    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          subject: args.subject,
          html: args.html_body,
          text: args.text_body || undefined,
        }),
      });

      const resendData = await resendRes.json();
      const status = resendRes.ok ? "sent" : "failed";

      // Log to email_logs
      await supabaseAdmin.from("email_logs").insert({
        created_by: userId,
        contact_id: contact.id,
        from_email: fromEmail,
        to_email: toEmail,
        subject: args.subject,
        body_html: args.html_body,
        body_text: args.text_body || null,
        status,
        resend_id: resendData.id || null,
        error_message: resendRes.ok ? null : JSON.stringify(resendData),
        sent_at: status === "sent" ? new Date().toISOString() : null,
      });

      if (resendRes.ok) {
        sent++;
        recipients.push({ name: contact.full_name, email: toEmail, status: "sent" });
      } else {
        failed++;
        recipients.push({ name: contact.full_name, email: toEmail, status: "failed" });
      }
    } catch (e) {
      failed++;
      recipients.push({ name: contact.full_name, email: toEmail, status: "error" });
    }
  }

  return JSON.stringify({
    success: true,
    tag: args.tag,
    total: withEmail.length,
    sent,
    failed,
    recipients,
  });
}

// ─── System prompt ───

const SYSTEM_PROMPT = `Eres el asistente IA de EuroCRM, un CRM especializado en la gestión de proyectos europeos.

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

CAMPAÑAS DE EMAIL POR ETIQUETA:
- Puedes LISTAR todas las etiquetas disponibles con list_available_tags.
- Puedes BUSCAR contactos por etiqueta con search_contacts_by_tag.
- Puedes ENVIAR campañas de email masivas con send_campaign_email.
- Cuando el usuario pida enviar un email a contactos con una etiqueta:
  1. Primero usa list_available_tags para verificar que la etiqueta existe.
  2. Luego usa search_contacts_by_tag para obtener la lista de destinatarios.
  3. Muestra al usuario la lista de destinatarios y pregunta qué quiere comunicar.
  4. Redacta el email (asunto + cuerpo HTML profesional) y muéstralo al usuario.
  5. SOLO después de que el usuario confirme explícitamente ("sí", "envíalo", "confirmo"), usa send_campaign_email.
  6. NUNCA envíes sin confirmación explícita del usuario.
- Después de enviar, incluye el marcador [CAMPAIGN_SENT:etiqueta:cantidad] en tu respuesta.
- Límite: máximo 50 destinatarios por campaña.

Responde siempre de forma profesional, concisa y orientada a la acción.
Cuando redactes emails, usa un tono formal apropiado para el contexto europeo institucional.
Puedes responder en español o en el idioma que el usuario solicite.
Cuando el usuario adjunte archivos, analízalos en detalle y responde sobre su contenido.`;

// ─── Main handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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
    const model = hasImages ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";

    const processedMessages = [...messages];
    if (hasAttachments && processedMessages.length > 0) {
      const lastMsg = processedMessages[processedMessages.length - 1];
      if (lastMsg.role === "user") {
        processedMessages[processedMessages.length - 1] = buildUserMessageWithAttachments(lastMsg.content, attachments);
      }
    }

    const aiHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };
    const aiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";

    let conversationMessages: any[] = [{ role: "system", content: SYSTEM_PROMPT }, ...processedMessages];
    const MAX_TOOL_ROUNDS = 5;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const toolResponse = await fetch(aiUrl, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({ model, messages: conversationMessages, tools, stream: false }),
      });

      if (!toolResponse.ok) {
        const status = toolResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Espera un momento." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Créditos agotados. Añade fondos a tu workspace." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await toolResponse.text();
        console.error("AI gateway error:", status, t);
        return new Response(JSON.stringify({ error: "Error del servicio IA" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const toolResult = await toolResponse.json();
      const choice = toolResult.choices?.[0];

      if (!choice) {
        return new Response(JSON.stringify({ error: "No response from AI" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // No tool calls → stream final response
      if (!choice.message?.tool_calls || choice.message.tool_calls.length === 0) {
        const streamResponse = await fetch(aiUrl, {
          method: "POST",
          headers: aiHeaders,
          body: JSON.stringify({ model, messages: conversationMessages, stream: true }),
        });

        if (!streamResponse.ok) {
          const finalContent = choice.message?.content || "";
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
        try { fnArgs = JSON.parse(toolCall.function.arguments); } catch { fnArgs = {}; }

        let result: string;
        switch (fnName) {
          case "create_contact":
            result = await executeCreateContact(supabase, userId, fnArgs);
            break;
          case "search_contacts":
            result = await executeSearchContacts(supabase, fnArgs.query || "");
            break;
          case "list_available_tags":
            result = await executeListAvailableTags(supabase);
            break;
          case "search_contacts_by_tag":
            result = await executeSearchContactsByTag(supabase, fnArgs.tag || "");
            break;
          case "send_campaign_email":
            result = await executeSendCampaignEmail(supabase, userId, fnArgs);
            break;
          default:
            result = JSON.stringify({ error: `Unknown tool: ${fnName}` });
        }

        conversationMessages.push({ role: "tool", tool_call_id: toolCall.id, content: result });
      }
    }

    return new Response(JSON.stringify({ error: "Demasiadas llamadas a herramientas" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

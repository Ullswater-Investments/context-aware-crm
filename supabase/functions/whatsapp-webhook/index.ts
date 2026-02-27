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

  // GET requests for webhook verification
  if (req.method === "GET") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  try {
    // Optional webhook secret validation
    const webhookSecret = Deno.env.get("WHAPI_WEBHOOK_SECRET");
    if (webhookSecret) {
      const authHeader = req.headers.get("authorization") || req.headers.get("x-webhook-secret") || "";
      if (authHeader !== webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
        console.error("Webhook secret mismatch");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json();

    // Whapi.cloud sends messages in payload.messages array
    const messages = payload?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ status: "no_messages" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for inbound (no user auth)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find default owner (first admin user) for assigning created_by
    let defaultOwnerId: string | null = null;
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1);

    if (adminRoles && adminRoles.length > 0) {
      defaultOwnerId = adminRoles[0].user_id;
    } else {
      // Fallback: get any user from profiles
      const { data: anyProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .limit(1);
      if (anyProfile && anyProfile.length > 0) {
        defaultOwnerId = anyProfile[0].user_id;
      }
    }

    if (!defaultOwnerId) {
      console.error("whatsapp-webhook: No users found to assign as contact owner");
      return new Response(JSON.stringify({ error: "No users configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const msg of messages) {
      // Only process incoming text messages
      if (msg.from_me || msg.type !== "text") continue;

      const senderPhone = msg.chat_id?.replace("@s.whatsapp.net", "") || msg.from || "";
      const content = msg.text?.body || msg.body || "";
      const whapiMsgId = msg.id || null;

      if (!senderPhone || !content) continue;

      // Clean phone for matching
      const phoneVariants = [senderPhone];
      if (senderPhone.startsWith("34")) {
        phoneVariants.push(senderPhone.slice(2));
        phoneVariants.push("+" + senderPhone);
      }

      // Find contact by phone
      let contactId: string | null = null;
      let contactOwnerId: string | null = null;

      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, created_by")
        .or(
          phoneVariants
            .flatMap((p) => [
              `phone.eq.${p}`,
              `mobile_phone.eq.${p}`,
              `work_phone.eq.${p}`,
            ])
            .join(",")
        )
        .limit(1);

      if (contacts && contacts.length > 0) {
        contactId = contacts[0].id;
        contactOwnerId = contacts[0].created_by;
      } else {
        // Create unknown contact with owner assigned
        const { data: newContact } = await supabase
          .from("contacts")
          .insert({
            full_name: `Desconocido (${senderPhone})`,
            phone: senderPhone,
            status: "new_lead",
            created_by: defaultOwnerId,
          })
          .select("id")
          .single();
        contactId = newContact?.id || null;
        contactOwnerId = defaultOwnerId;
      }

      // Insert message with created_by so RLS allows visibility
      await supabase.from("whatsapp_messages").insert({
        contact_id: contactId,
        phone_number: senderPhone,
        direction: "inbound",
        content,
        status: "delivered",
        whapi_message_id: whapiMsgId,
        created_by: contactOwnerId || defaultOwnerId,
      });
    }

    return new Response(JSON.stringify({ status: "processed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whatsapp-webhook error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

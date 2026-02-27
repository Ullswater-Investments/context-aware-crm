import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function cleanPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  // Remove leading + for Whapi format (they want country code without +)
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  // If it starts with 0, assume Spanish number
  if (cleaned.startsWith("0")) cleaned = "34" + cleaned.slice(1);
  // If it's 9 digits, assume Spanish
  if (/^\d{9}$/.test(cleaned)) cleaned = "34" + cleaned;
  return cleaned;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { contact_id, phone, message } = await req.json();

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: "phone and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve variables if contact_id provided
    let finalMessage = message;
    if (contact_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("full_name, email, organizations(name)")
        .eq("id", contact_id)
        .single();

      if (contact) {
        const nameParts = contact.full_name.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        const company = (contact as any).organizations?.name || "";

        finalMessage = finalMessage
          .replace(/\{\{first_name\}\}/g, firstName)
          .replace(/\{\{last_name\}\}/g, lastName)
          .replace(/\{\{full_name\}\}/g, contact.full_name)
          .replace(/\{\{company\}\}/g, company)
          .replace(/\{\{email\}\}/g, contact.email || "");
      }
    }

    const cleanedPhone = cleanPhone(phone);

    // Call Whapi.cloud API
    const whapiToken = Deno.env.get("WHAPI_API_TOKEN");
    if (!whapiToken) {
      return new Response(JSON.stringify({ error: "WHAPI_API_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const whapiRes = await fetch("https://gate.whapi.cloud/messages/text", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${whapiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: cleanedPhone + "@s.whatsapp.net",
        body: finalMessage,
      }),
    });

    const whapiData = await whapiRes.json();
    console.log("Whapi response status:", whapiRes.status, "body:", JSON.stringify(whapiData));

    if (!whapiRes.ok) {
      const errorMsg = whapiData?.error?.message || whapiData?.message || JSON.stringify(whapiData);
      return new Response(
        JSON.stringify({ error: `Whapi: ${errorMsg}`, details: whapiData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save message to DB
    const { error: insertError } = await supabase.from("whatsapp_messages").insert({
      contact_id: contact_id || null,
      phone_number: cleanedPhone,
      direction: "outbound",
      content: finalMessage,
      status: "sent",
      whapi_message_id: whapiData.message?.id || null,
      created_by: userId,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    return new Response(
      JSON.stringify({ status: "sent", whapi_message_id: whapiData.message?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-whatsapp error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BOUNCE_SUBJECT_KEYWORDS = [
  "undelivered",
  "mail delivery",
  "delivery status",
  "failure notice",
  "returned to sender",
  "undeliverable",
  "delivery failed",
  "not delivered",
];

const BOUNCE_FROM_KEYWORDS = [
  "mailer-daemon",
  "mail delivery",
  "postmaster",
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

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

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Get user's email accounts to exclude them from invalid list
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userAccounts } = await supabaseAdmin
      .from("email_accounts")
      .select("email_address")
      .eq("created_by", userId);
    
    const userEmails = new Set(
      (userAccounts || []).map((a: any) => a.email_address.toLowerCase())
    );

    // Find bounce emails in email_logs
    const { data: emails, error: emailsError } = await supabase
      .from("email_logs")
      .select("id, from_email, subject, body_text, body_html")
      .eq("direction", "inbound")
      .order("sent_at", { ascending: false })
      .limit(500);

    if (emailsError) {
      return new Response(JSON.stringify({ error: emailsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bounceEmails = (emails || []).filter((e: any) => {
      const subjectLower = (e.subject || "").toLowerCase();
      const fromLower = (e.from_email || "").toLowerCase();
      const isSubjectBounce = BOUNCE_SUBJECT_KEYWORDS.some(kw => subjectLower.includes(kw));
      const isFromBounce = BOUNCE_FROM_KEYWORDS.some(kw => fromLower.includes(kw));
      return isSubjectBounce || isFromBounce;
    });

    const detectedInvalid: { email: string; reason: string; email_id: string }[] = [];

    for (const bounce of bounceEmails) {
      const text = bounce.body_text || bounce.body_html || "";
      const foundEmails = text.match(EMAIL_REGEX) || [];
      
      for (const email of foundEmails) {
        const lower = email.toLowerCase();
        // Skip user's own emails and common system addresses
        if (userEmails.has(lower)) continue;
        if (lower.includes("mailer-daemon")) continue;
        if (lower.includes("postmaster")) continue;
        if (lower.includes("noreply")) continue;
        if (lower.includes("no-reply")) continue;
        
        if (!detectedInvalid.some(d => d.email === lower)) {
          detectedInvalid.push({
            email: lower,
            reason: "bounce",
            email_id: bounce.id,
          });
        }
      }
    }

    // Insert into invalid_emails using admin client (to bypass RLS for insert with created_by)
    let insertedCount = 0;
    for (const item of detectedInvalid) {
      const { error: insertErr } = await supabaseAdmin
        .from("invalid_emails")
        .upsert(
          {
            email_address: item.email,
            reason: item.reason,
            detected_from_email_id: item.email_id,
            created_by: userId,
          },
          { onConflict: "email_address,created_by" }
        );
      if (!insertErr) insertedCount++;
    }

    return new Response(
      JSON.stringify({
        detected: detectedInvalid.length,
        inserted: insertedCount,
        emails: detectedInvalid.map(d => d.email),
        message: insertedCount > 0
          ? `${insertedCount} emails inválidos detectados`
          : "No se detectaron nuevos emails inválidos",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("detect-bounces error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

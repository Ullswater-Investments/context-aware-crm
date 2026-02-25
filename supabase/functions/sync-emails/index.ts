import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1.0.164";
import { simpleParser } from "npm:mailparser@3.7.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { account = "secondary", max_emails = 50 } = await req.json().catch(() => ({}));

    // Select IMAP credentials
    const isSecondary = account === "secondary";
    const imapHost = isSecondary ? Deno.env.get("IMAP_HOST_2") : Deno.env.get("IMAP_HOST");
    const imapPort = Number(isSecondary ? Deno.env.get("IMAP_PORT_2") : Deno.env.get("IMAP_PORT")) || 993;
    const imapUser = isSecondary ? Deno.env.get("IMAP_USER_2") : Deno.env.get("IMAP_USER");
    const imapPass = isSecondary ? Deno.env.get("IMAP_PASS_2") : Deno.env.get("IMAP_PASS");

    if (!imapHost || !imapUser || !imapPass) {
      return new Response(
        JSON.stringify({ error: "Credenciales IMAP no configuradas para esta cuenta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Connect to IMAP
    const client = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: true,
      auth: { user: imapUser, pass: imapPass },
      logger: false,
    });

    await client.connect();
    console.log("IMAP connected to", imapHost);

    const lock = await client.getMailboxLock("INBOX");
    let imported = 0;

    try {
      // Get the latest N message UIDs
      const totalMessages = client.mailbox.exists;
      if (totalMessages === 0) {
        return new Response(
          JSON.stringify({ imported: 0, message: "Buzón vacío" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch from newest to oldest, limited to max_emails
      const startSeq = Math.max(1, totalMessages - max_emails + 1);
      const range = `${startSeq}:${totalMessages}`;

      for await (const msg of client.fetch(range, { uid: true, source: true })) {
        const uid = `${account}:${msg.uid}`;

        // Check if already imported
        const { data: existing } = await supabaseAdmin
          .from("email_logs")
          .select("id")
          .eq("imap_uid", uid)
          .maybeSingle();

        if (existing) continue;

        // Parse the email
        const parsed = await simpleParser(msg.source);

        const fromAddr = parsed.from?.value?.[0]?.address || "";
        const fromText = parsed.from?.text || fromAddr;
        const toAddr = parsed.to?.text || "";
        const ccAddr = parsed.cc?.text || null;
        const emailSubject = parsed.subject || "(Sin asunto)";
        const bodyHtml = parsed.html || null;
        const bodyText = parsed.text || null;
        const emailDate = parsed.date?.toISOString() || new Date().toISOString();

        // Try to find contact by sender email
        let contactId: string | null = null;
        if (fromAddr) {
          const { data: contact } = await supabaseAdmin
            .from("contacts")
            .select("id")
            .or(`email.eq.${fromAddr},work_email.eq.${fromAddr},personal_email.eq.${fromAddr}`)
            .maybeSingle();
          if (contact) contactId = contact.id;
        }

        // Insert into email_logs
        const { error: insertErr } = await supabaseAdmin.from("email_logs").insert({
          created_by: userId,
          from_email: fromText,
          to_email: toAddr,
          cc_emails: ccAddr,
          subject: emailSubject,
          body_html: bodyHtml,
          body_text: bodyText,
          status: "received",
          direction: "inbound",
          imap_uid: uid,
          sent_at: emailDate,
          contact_id: contactId,
        });

        if (insertErr) {
          // Skip duplicates silently (unique constraint on imap_uid)
          if (insertErr.code === "23505") continue;
          console.error("Insert error:", insertErr);
          continue;
        }

        imported++;
      }
    } finally {
      lock.release();
    }

    await client.logout();
    console.log(`Sync complete: ${imported} emails imported`);

    return new Response(
      JSON.stringify({ imported, message: `${imported} emails sincronizados` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("sync-emails error:", e);
    const message = e.message || "Error desconocido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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

    const { account = "secondary", account_id, max_emails = 50 } = await req.json().catch(() => ({}));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let imapHost: string | undefined;
    let imapPort: number;
    let imapUser: string | undefined;
    let imapPass: string | undefined;
    let accountLabel: string;

    // Dynamic account from DB
    if (account_id) {
      const encKey = Deno.env.get("EMAIL_ENCRYPTION_KEY") || "";
      const { data: accData, error: accErr } = await supabaseAdmin.rpc("get_decrypted_email_account", {
        _account_id: account_id,
        _user_id: userId,
        _enc_key: encKey,
      });
      if (accErr || !accData || accData.length === 0) {
        return new Response(JSON.stringify({ error: "Cuenta de email no encontrada" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const acc = accData[0];
      imapHost = acc.imap_host;
      imapPort = acc.imap_port || 993;
      imapUser = acc.imap_user || acc.smtp_user;
      imapPass = acc.decrypted_imap_pass || acc.decrypted_smtp_pass;
      accountLabel = acc.email_address;
    } else {
      // Legacy: env vars
      const isSecondary = account === "secondary";
      imapHost = isSecondary ? Deno.env.get("IMAP_HOST_2") : Deno.env.get("IMAP_HOST");
      imapPort = Number(isSecondary ? Deno.env.get("IMAP_PORT_2") : Deno.env.get("IMAP_PORT")) || 993;
      imapUser = isSecondary ? Deno.env.get("IMAP_USER_2") : Deno.env.get("IMAP_USER");
      imapPass = isSecondary ? Deno.env.get("IMAP_PASS_2") : Deno.env.get("IMAP_PASS");
      accountLabel = account;
    }

    if (!imapHost || !imapUser || !imapPass) {
      return new Response(
        JSON.stringify({ error: "Credenciales IMAP no configuradas para esta cuenta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      const totalMessages = client.mailbox.exists;
      if (totalMessages === 0) {
        return new Response(
          JSON.stringify({ imported: 0, message: "Buzón vacío" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const startSeq = Math.max(1, totalMessages - max_emails + 1);
      const range = `${startSeq}:${totalMessages}`;

      for await (const msg of client.fetch(range, { uid: true, source: true })) {
        const uid = `${accountLabel}:${msg.uid}`;

        const { data: existing } = await supabaseAdmin
          .from("email_logs")
          .select("id")
          .eq("imap_uid", uid)
          .maybeSingle();

        if (existing) continue;

        const parsed = await simpleParser(msg.source);

        const fromAddr = parsed.from?.value?.[0]?.address || "";
        const fromText = parsed.from?.text || fromAddr;
        const toAddr = parsed.to?.text || "";
        const ccAddr = parsed.cc?.text || null;
        const emailSubject = parsed.subject || "(Sin asunto)";
        const bodyHtml = parsed.html || null;
        const bodyText = parsed.text || null;
        const emailDate = parsed.date?.toISOString() || new Date().toISOString();

        let contactId: string | null = null;
        if (fromAddr) {
          const { data: contact } = await supabaseAdmin
            .from("contacts")
            .select("id")
            .or(`email.eq.${fromAddr},work_email.eq.${fromAddr},personal_email.eq.${fromAddr}`)
            .maybeSingle();
          if (contact) contactId = contact.id;
        }

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

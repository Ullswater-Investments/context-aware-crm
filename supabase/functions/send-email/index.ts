import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.12";

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

    const {
      to, cc, bcc, subject, html, text, from,
      contact_id, organization_id, project_id,
      attachments: attachmentPaths,
      from_account,
    } = await req.json();

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "Campos 'to' y 'subject' son obligatorios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Select SMTP credentials based on from_account
    const isSecondary = from_account === "secondary";
    const smtpHost = isSecondary ? Deno.env.get("SMTP_HOST_2") : Deno.env.get("SMTP_HOST");
    const smtpPort = Number(isSecondary ? Deno.env.get("SMTP_PORT_2") : Deno.env.get("SMTP_PORT")) || 465;
    const smtpUser = isSecondary ? Deno.env.get("SMTP_USER_2") : Deno.env.get("SMTP_USER");
    const smtpPass = isSecondary ? Deno.env.get("SMTP_PASS_2") : Deno.env.get("SMTP_PASS");

    const defaultFrom = isSecondary
      ? `EuroCRM <${Deno.env.get("SMTP_USER_2")}>`
      : `EuroCRM <${Deno.env.get("SMTP_USER")}>`;
    const fromEmail = from || defaultFrom;

    // Download attachments from storage
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const mailAttachments: { filename: string; content: Buffer }[] = [];
    const attachmentRecords: { file_name: string; file_path: string; file_size?: number; file_type?: string }[] = [];

    if (attachmentPaths && Array.isArray(attachmentPaths)) {
      for (const att of attachmentPaths) {
        const { data: fileData, error: dlErr } = await supabaseAdmin.storage
          .from("email-attachments")
          .download(att.path);
        if (dlErr || !fileData) {
          console.error(`Failed to download attachment ${att.path}:`, dlErr);
          continue;
        }
        const arrayBuffer = await fileData.arrayBuffer();
        mailAttachments.push({
          filename: att.filename,
          content: Buffer.from(arrayBuffer),
        });
        attachmentRecords.push({
          file_name: att.filename,
          file_path: att.path,
          file_size: arrayBuffer.byteLength,
        });
      }
    }

    // Parse CC emails
    const ccEmails: string[] = cc
      ? (typeof cc === "string" ? cc.split(",").map((e: string) => e.trim()).filter(Boolean) : Array.isArray(cc) ? cc : [])
      : [];

    // Parse BCC emails
    const bccEmails: string[] = bcc
      ? (typeof bcc === "string" ? bcc.split(",").map((e: string) => e.trim()).filter(Boolean) : Array.isArray(bcc) ? bcc : [])
      : [];

    // Create SMTP transporter with selected account
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions: Record<string, unknown> = {
      from: fromEmail,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html: html || undefined,
      text: text || undefined,
    };
    if (ccEmails.length > 0) mailOptions.cc = ccEmails.join(", ");
    if (bccEmails.length > 0) mailOptions.bcc = bccEmails.join(", ");
    if (mailAttachments.length > 0) mailOptions.attachments = mailAttachments;

    // Send via SMTP
    let status = "sent";
    let errorMessage: string | null = null;
    let messageId: string | null = null;

    try {
      const info = await transporter.sendMail(mailOptions);
      messageId = info.messageId || null;
      console.log("Email sent via SMTP:", messageId);
    } catch (smtpErr: any) {
      status = "failed";
      errorMessage = smtpErr.message || String(smtpErr);
      console.error("SMTP error:", errorMessage);
    }

    // Log to database
    const { data: logData } = await supabaseAdmin.from("email_logs").insert({
      created_by: userId,
      contact_id: contact_id || null,
      organization_id: organization_id || null,
      project_id: project_id || null,
      from_email: fromEmail,
      to_email: Array.isArray(to) ? to.join(", ") : to,
      cc_emails: ccEmails.length > 0 ? ccEmails.join(", ") : null,
      subject,
      body_html: html || null,
      body_text: text || null,
      status,
      message_id: messageId,
      error_message: errorMessage,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      direction: "outbound",
    }).select("id").single();

    // Save attachment records
    if (logData?.id && attachmentRecords.length > 0) {
      await supabaseAdmin.from("email_attachments").insert(
        attachmentRecords.map((a) => ({
          email_log_id: logData.id,
          file_name: a.file_name,
          file_path: a.file_path,
          file_size: a.file_size,
          created_by: userId,
        }))
      );
    }

    if (status === "failed") {
      return new Response(
        JSON.stringify({ error: "Error al enviar email", details: errorMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-email error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

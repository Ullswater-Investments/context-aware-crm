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

    const { account_id } = await req.json();
    if (!account_id) {
      return new Response(JSON.stringify({ error: "account_id es obligatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const encKey = Deno.env.get("EMAIL_ENCRYPTION_KEY");
    if (!encKey) {
      return new Response(JSON.stringify({ error: "Clave de cifrado no configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set status to checking
    await supabaseAdmin.from("email_accounts").update({ status: "checking" }).eq("id", account_id).eq("created_by", userId);

    // Get account with decrypted password
    const { data: account, error: accErr } = await supabaseAdmin.rpc("get_decrypted_email_account", {
      _account_id: account_id,
      _user_id: userId,
      _enc_key: encKey,
    });

    if (accErr || !account || account.length === 0) {
      return new Response(JSON.stringify({ error: "Cuenta no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const acc = account[0];

    // Test SMTP connection
    const transporter = nodemailer.createTransport({
      host: acc.smtp_host,
      port: acc.smtp_port,
      secure: acc.smtp_secure,
      ...((!acc.smtp_secure) ? { requireTLS: true } : {}),
      auth: {
        user: acc.smtp_user,
        pass: acc.decrypted_smtp_pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    try {
      await transporter.verify();
      // Success
      await supabaseAdmin.from("email_accounts").update({
        status: "connected",
        last_check: new Date().toISOString(),
        error_message: null,
      }).eq("id", account_id).eq("created_by", userId);

      return new Response(JSON.stringify({ success: true, status: "connected" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (smtpErr: any) {
      const errMsg = smtpErr.message || String(smtpErr);
      let newStatus = "error";
      if (errMsg.includes("535") || errMsg.toLowerCase().includes("authentication") || errMsg.toLowerCase().includes("auth")) {
        newStatus = "expired";
      }

      await supabaseAdmin.from("email_accounts").update({
        status: newStatus,
        last_check: new Date().toISOString(),
        error_message: errMsg,
      }).eq("id", account_id).eq("created_by", userId);

      return new Response(JSON.stringify({ success: false, status: newStatus, error: errMsg }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("test-email-connection error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

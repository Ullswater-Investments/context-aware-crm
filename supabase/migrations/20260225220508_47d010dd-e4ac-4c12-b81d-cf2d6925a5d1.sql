
-- Create function to get email account (passwords stored as-is, protected by RLS + service role access only in edge functions)
CREATE OR REPLACE FUNCTION public.get_decrypted_email_account(
  _account_id UUID,
  _user_id UUID,
  _enc_key TEXT
)
RETURNS TABLE (
  id UUID,
  email_address TEXT,
  display_name TEXT,
  provider TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_secure BOOLEAN,
  smtp_user TEXT,
  decrypted_smtp_pass TEXT,
  imap_host TEXT,
  imap_port INTEGER,
  imap_user TEXT,
  decrypted_imap_pass TEXT,
  is_default BOOLEAN,
  is_active BOOLEAN,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ea.id,
    ea.email_address,
    ea.display_name,
    ea.provider,
    ea.smtp_host,
    ea.smtp_port,
    ea.smtp_secure,
    ea.smtp_user,
    ea.smtp_pass AS decrypted_smtp_pass,
    ea.imap_host,
    ea.imap_port,
    ea.imap_user,
    ea.imap_pass AS decrypted_imap_pass,
    ea.is_default,
    ea.is_active,
    ea.status
  FROM email_accounts ea
  WHERE ea.id = _account_id AND ea.created_by = _user_id;
$$;

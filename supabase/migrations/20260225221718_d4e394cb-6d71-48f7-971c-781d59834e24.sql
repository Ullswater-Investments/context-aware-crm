
-- Enable pgcrypto in extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Update get_decrypted_email_account to use real decryption via extensions.pgp_sym_decrypt
CREATE OR REPLACE FUNCTION public.get_decrypted_email_account(_account_id uuid, _user_id uuid, _enc_key text)
 RETURNS TABLE(id uuid, email_address text, display_name text, provider text, smtp_host text, smtp_port integer, smtp_secure boolean, smtp_user text, decrypted_smtp_pass text, imap_host text, imap_port integer, imap_user text, decrypted_imap_pass text, is_default boolean, is_active boolean, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ea.id,
    ea.email_address,
    ea.display_name,
    ea.provider,
    ea.smtp_host,
    ea.smtp_port,
    ea.smtp_secure,
    ea.smtp_user,
    CASE 
      WHEN ea.smtp_pass LIKE 'c1%' THEN 
        extensions.pgp_sym_decrypt(decode(ea.smtp_pass, 'hex'), _enc_key)
      ELSE 
        ea.smtp_pass
    END AS decrypted_smtp_pass,
    ea.imap_host,
    ea.imap_port,
    ea.imap_user,
    CASE 
      WHEN ea.imap_pass IS NOT NULL AND ea.imap_pass LIKE 'c1%' THEN 
        extensions.pgp_sym_decrypt(decode(ea.imap_pass, 'hex'), _enc_key)
      WHEN ea.imap_pass IS NOT NULL THEN
        ea.imap_pass
      ELSE NULL
    END AS decrypted_imap_pass,
    ea.is_default,
    ea.is_active,
    ea.status
  FROM email_accounts ea
  WHERE ea.id = _account_id AND ea.created_by = _user_id;
END;
$$;

-- Create a function to encrypt password on insert/update
CREATE OR REPLACE FUNCTION public.encrypt_email_passwords()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  enc_key text;
BEGIN
  enc_key := current_setting('app.settings.email_encryption_key', true);
  IF enc_key IS NULL OR enc_key = '' THEN
    RETURN NEW;
  END IF;
  
  -- Only encrypt if the value looks like plaintext (not already encrypted)
  IF NEW.smtp_pass IS NOT NULL AND NOT (NEW.smtp_pass LIKE 'c1%') THEN
    NEW.smtp_pass := encode(extensions.pgp_sym_encrypt(NEW.smtp_pass, enc_key), 'hex');
  END IF;
  
  IF NEW.imap_pass IS NOT NULL AND NOT (NEW.imap_pass LIKE 'c1%') THEN
    NEW.imap_pass := encode(extensions.pgp_sym_encrypt(NEW.imap_pass, enc_key), 'hex');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-encrypt on insert/update
DROP TRIGGER IF EXISTS encrypt_email_passwords_trigger ON email_accounts;
CREATE TRIGGER encrypt_email_passwords_trigger
  BEFORE INSERT OR UPDATE OF smtp_pass, imap_pass ON email_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_email_passwords();


-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create email_accounts table
CREATE TABLE public.email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  email_address TEXT NOT NULL,
  display_name TEXT,
  provider TEXT DEFAULT 'custom',
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 465,
  smtp_secure BOOLEAN DEFAULT true,
  smtp_user TEXT NOT NULL,
  smtp_pass TEXT NOT NULL,
  imap_host TEXT,
  imap_port INTEGER DEFAULT 993,
  imap_user TEXT,
  imap_pass TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'connected',
  last_check TIMESTAMPTZ DEFAULT now(),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies: only owner can CRUD
CREATE POLICY "Users can view own email_accounts"
  ON public.email_accounts FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create own email_accounts"
  ON public.email_accounts FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own email_accounts"
  ON public.email_accounts FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own email_accounts"
  ON public.email_accounts FOR DELETE
  USING (created_by = auth.uid());

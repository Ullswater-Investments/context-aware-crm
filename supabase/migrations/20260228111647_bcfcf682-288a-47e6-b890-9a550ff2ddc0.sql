
CREATE TABLE public.invalid_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_address text NOT NULL,
  reason text NOT NULL DEFAULT 'bounce',
  detected_from_email_id uuid REFERENCES public.email_logs(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_invalid_emails_unique ON public.invalid_emails(email_address, created_by);

ALTER TABLE public.invalid_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own invalid_emails" ON public.invalid_emails FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create own invalid_emails" ON public.invalid_emails FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can delete own invalid_emails" ON public.invalid_emails FOR DELETE USING (created_by = auth.uid());

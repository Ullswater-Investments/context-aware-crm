
-- Bucket for email attachments (public so Resend can access URLs)
INSERT INTO storage.buckets (id, name, public) VALUES ('email-attachments', 'email-attachments', true);

-- Bucket for email signatures (public for signed URLs in emails)
INSERT INTO storage.buckets (id, name, public) VALUES ('email-signatures', 'email-signatures', true);

-- Storage policies for email-attachments
CREATE POLICY "Users can upload own attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'email-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'email-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for email-signatures
CREATE POLICY "Users can upload own signatures"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'email-signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own signatures"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own signatures"
ON storage.objects FOR DELETE
USING (bucket_id = 'email-signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read for email-signatures (so signature images render in emails)
CREATE POLICY "Public can view signature images"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-signatures');

-- Public read for email-attachments (so Resend can download)
CREATE POLICY "Public can view attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-attachments');

-- Table: email_signatures
CREATE TABLE public.email_signatures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid NOT NULL,
  name text NOT NULL,
  image_path text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own signatures" ON public.email_signatures
FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create own signatures" ON public.email_signatures
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own signatures" ON public.email_signatures
FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own signatures" ON public.email_signatures
FOR DELETE USING (created_by = auth.uid());

-- Table: email_attachments
CREATE TABLE public.email_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_log_id uuid REFERENCES public.email_logs(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attachments" ON public.email_attachments
FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create own attachments" ON public.email_attachments
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own attachments" ON public.email_attachments
FOR DELETE USING (created_by = auth.uid());

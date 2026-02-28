
ALTER TABLE public.email_logs ADD COLUMN is_trashed boolean NOT NULL DEFAULT false;
ALTER TABLE public.email_logs ADD COLUMN trashed_at timestamptz;

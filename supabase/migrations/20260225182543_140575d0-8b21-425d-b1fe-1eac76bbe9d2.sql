
-- Add direction column to email_logs
ALTER TABLE public.email_logs ADD COLUMN direction TEXT NOT NULL DEFAULT 'outbound';

-- Add imap_uid column to email_logs
ALTER TABLE public.email_logs ADD COLUMN imap_uid TEXT;

-- Unique partial index on imap_uid to prevent duplicate IMAP imports
CREATE UNIQUE INDEX idx_email_logs_imap_uid ON public.email_logs (imap_uid) WHERE imap_uid IS NOT NULL;

-- Index on direction for filtering
CREATE INDEX idx_email_logs_direction ON public.email_logs (direction);

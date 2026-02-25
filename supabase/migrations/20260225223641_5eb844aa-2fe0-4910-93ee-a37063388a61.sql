
-- Add is_read column to email_logs
ALTER TABLE public.email_logs ADD COLUMN is_read boolean NOT NULL DEFAULT false;

-- Set all outbound emails as read by default
UPDATE public.email_logs SET is_read = true WHERE direction = 'outbound';

-- Enable realtime for email_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_logs;

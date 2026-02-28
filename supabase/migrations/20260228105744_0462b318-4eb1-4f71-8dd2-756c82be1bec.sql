ALTER TYPE contact_status ADD VALUE 'trash';
ALTER TABLE public.contacts ADD COLUMN trashed_at timestamptz;

-- Add contact_status enum
CREATE TYPE public.contact_status AS ENUM ('new_lead', 'contacted', 'proposal_sent', 'client', 'lost');

-- Add status column to contacts
ALTER TABLE public.contacts ADD COLUMN status public.contact_status NOT NULL DEFAULT 'new_lead';

-- Create contact_notes table for internal notes
CREATE TABLE public.contact_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view contact_notes"
ON public.contact_notes FOR SELECT USING (true);

CREATE POLICY "Authenticated can create contact_notes"
ON public.contact_notes FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated can delete contact_notes"
ON public.contact_notes FOR DELETE USING (true);

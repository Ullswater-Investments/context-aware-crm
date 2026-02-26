
-- Create whatsapp_messages table
CREATE TABLE public.whatsapp_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  whapi_message_id text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own outbound messages
CREATE POLICY "Users can view own whatsapp messages"
ON public.whatsapp_messages
FOR SELECT
USING (created_by = auth.uid());

-- RLS: Users can insert outbound messages
CREATE POLICY "Users can create own whatsapp messages"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (created_by = auth.uid());

-- RLS: Service role can insert inbound messages (webhook)
CREATE POLICY "Service role can insert inbound messages"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (direction = 'inbound');

-- RLS: Users can update own messages (status updates)
CREATE POLICY "Users can update own whatsapp messages"
ON public.whatsapp_messages
FOR UPDATE
USING (created_by = auth.uid());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;

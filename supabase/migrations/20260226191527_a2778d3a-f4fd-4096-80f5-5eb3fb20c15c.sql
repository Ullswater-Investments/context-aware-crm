
-- Fix SELECT: allow viewing messages for user's contacts (inbound have NULL created_by)
DROP POLICY "Users can view own whatsapp messages" ON whatsapp_messages;
CREATE POLICY "Users can view own whatsapp messages" ON whatsapp_messages
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = whatsapp_messages.contact_id
        AND contacts.created_by = auth.uid()
    )
  );

-- Remove broken restrictive inbound policy (service_role bypasses RLS anyway)
DROP POLICY "Service role can insert inbound messages" ON whatsapp_messages;

-- Fix UPDATE: allow updating messages for user's contacts
DROP POLICY "Users can update own whatsapp messages" ON whatsapp_messages;
CREATE POLICY "Users can update own whatsapp messages" ON whatsapp_messages
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = whatsapp_messages.contact_id
        AND contacts.created_by = auth.uid()
    )
  );

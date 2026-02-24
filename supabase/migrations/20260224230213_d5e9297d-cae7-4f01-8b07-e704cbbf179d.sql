
-- Fix RLS policies: filter by created_by = auth.uid() instead of true
-- Also add missing UPDATE/DELETE policies

-- CONTACTS
DROP POLICY IF EXISTS "Authenticated can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated can create contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated can delete contacts" ON public.contacts;

CREATE POLICY "Users can view own contacts" ON public.contacts FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create own contacts" ON public.contacts FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own contacts" ON public.contacts FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own contacts" ON public.contacts FOR DELETE USING (created_by = auth.uid());

-- ORGANIZATIONS
DROP POLICY IF EXISTS "Authenticated can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated can delete organizations" ON public.organizations;

CREATE POLICY "Users can view own organizations" ON public.organizations FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create own organizations" ON public.organizations FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own organizations" ON public.organizations FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own organizations" ON public.organizations FOR DELETE USING (created_by = auth.uid());

-- DOCUMENTS
DROP POLICY IF EXISTS "Authenticated can view documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated can create documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated can update documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated can delete documents" ON public.documents;

CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create own documents" ON public.documents FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (created_by = auth.uid());

-- TASKS
DROP POLICY IF EXISTS "Authenticated can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated can delete tasks" ON public.tasks;

CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create own tasks" ON public.tasks FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (created_by = auth.uid());

-- CONTACT NOTES
DROP POLICY IF EXISTS "Authenticated can view contact_notes" ON public.contact_notes;
DROP POLICY IF EXISTS "Authenticated can create contact_notes" ON public.contact_notes;
DROP POLICY IF EXISTS "Authenticated can delete contact_notes" ON public.contact_notes;

CREATE POLICY "Users can view own contact_notes" ON public.contact_notes FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create own contact_notes" ON public.contact_notes FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own contact_notes" ON public.contact_notes FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own contact_notes" ON public.contact_notes FOR DELETE USING (created_by = auth.uid());

-- EMAIL LOGS
DROP POLICY IF EXISTS "Authenticated can view email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "Authenticated can create email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "Authenticated can update email_logs" ON public.email_logs;

CREATE POLICY "Users can view own email_logs" ON public.email_logs FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create own email_logs" ON public.email_logs FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own email_logs" ON public.email_logs FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own email_logs" ON public.email_logs FOR DELETE USING (created_by = auth.uid());

-- KNOWLEDGE ITEMS
DROP POLICY IF EXISTS "Authenticated can view knowledge_items" ON public.knowledge_items;
DROP POLICY IF EXISTS "Authenticated can create knowledge_items" ON public.knowledge_items;
DROP POLICY IF EXISTS "Authenticated can update knowledge_items" ON public.knowledge_items;
DROP POLICY IF EXISTS "Authenticated can delete knowledge_items" ON public.knowledge_items;

CREATE POLICY "Users can view own knowledge_items" ON public.knowledge_items FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create own knowledge_items" ON public.knowledge_items FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own knowledge_items" ON public.knowledge_items FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own knowledge_items" ON public.knowledge_items FOR DELETE USING (created_by = auth.uid());

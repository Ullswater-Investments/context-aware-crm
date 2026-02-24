-- Fix permissive RLS policies on projects table
DROP POLICY IF EXISTS "Authenticated can view projects" ON projects;
DROP POLICY IF EXISTS "Authenticated can create projects" ON projects;
DROP POLICY IF EXISTS "Authenticated can update projects" ON projects;
DROP POLICY IF EXISTS "Authenticated can delete projects" ON projects;

CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (created_by = auth.uid());

-- Fix permissive RLS policies on project_partners table
-- project_partners doesn't have created_by, so we scope by project ownership
DROP POLICY IF EXISTS "Authenticated can view project_partners" ON project_partners;
DROP POLICY IF EXISTS "Authenticated can manage project_partners" ON project_partners;

CREATE POLICY "Users can view own project_partners" ON project_partners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_partners.project_id AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage own project_partners" ON project_partners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_partners.project_id AND projects.created_by = auth.uid()
    )
  );
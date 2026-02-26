
-- Create email_templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT,
  content_html TEXT NOT NULL,
  category TEXT,
  entity TEXT CHECK (entity IN ('GDC', 'NextGen', 'General')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own templates"
  ON public.email_templates FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create own templates"
  ON public.email_templates FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own templates"
  ON public.email_templates FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON public.email_templates FOR DELETE
  USING (created_by = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

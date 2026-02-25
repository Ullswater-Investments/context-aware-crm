
-- Create public bucket for inline email images
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-images', 'email-images', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view (needed for email recipients)
CREATE POLICY "Email images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-images');

-- Authenticated users can upload to their own folder
CREATE POLICY "Authenticated users can upload email images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'email-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own images
CREATE POLICY "Users can delete their own email images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'email-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

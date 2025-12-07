-- Create chat-media storage bucket if it doesn't exist
-- Note: Bucket creation should be done in Supabase Dashboard or via API
-- This file documents the RLS policies needed

-- Enable RLS on the chat-media bucket (done via Supabase Dashboard)
-- Storage bucket name: chat-media

-- Policy: Users can upload media to their match folders
-- Path structure: {matchId}/{userId}/{timestamp}.{ext}
CREATE POLICY "Users can upload chat media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-media'
  AND (
    -- User can upload to their own match folders
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM matches 
      WHERE user1 = auth.uid() OR user2 = auth.uid()
    )
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
);

-- Policy: Users can read media from their matches
CREATE POLICY "Users can read chat media"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-media'
  AND (
    -- User can read from match folders they're part of
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM matches 
      WHERE user1 = auth.uid() OR user2 = auth.uid()
    )
  )
);

-- Policy: Users can delete their own uploaded media
CREATE POLICY "Users can delete their own chat media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
);


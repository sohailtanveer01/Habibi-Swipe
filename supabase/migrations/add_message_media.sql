-- Add media support to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Add comment for documentation
COMMENT ON COLUMN messages.media_url IS 'URL to media file (image, video, etc.) stored in Supabase Storage';
COMMENT ON COLUMN messages.media_type IS 'Type of media: image, video, etc.';

-- Make content optional if media_url is provided
-- Note: This is handled at the application level, but we can add a check constraint if needed
-- For now, we'll allow both to be null (though at least one should be provided in the app logic)


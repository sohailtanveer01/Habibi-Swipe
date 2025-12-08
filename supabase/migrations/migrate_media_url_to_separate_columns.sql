-- Migration: Move data from media_url to image_url or voice_url based on media_type
-- Run this BEFORE deleting the media_url column

-- Migrate image URLs
UPDATE messages
SET image_url = media_url
WHERE media_url IS NOT NULL 
  AND (media_type = 'image' OR media_type IS NULL)
  AND image_url IS NULL;

-- Migrate voice/audio URLs
UPDATE messages
SET voice_url = media_url
WHERE media_url IS NOT NULL 
  AND (media_type = 'audio' OR media_type = 'voice')
  AND voice_url IS NULL;

-- Verify migration
SELECT 
  COUNT(*) as total_messages,
  COUNT(media_url) as messages_with_media_url,
  COUNT(image_url) as messages_with_image_url,
  COUNT(voice_url) as messages_with_voice_url
FROM messages;


-- Migration: Drop the media_url column after data migration
-- Run this AFTER running migrate_media_url_to_separate_columns.sql
-- and AFTER verifying all data has been migrated

-- Drop the media_url column
ALTER TABLE messages
DROP COLUMN IF EXISTS media_url;


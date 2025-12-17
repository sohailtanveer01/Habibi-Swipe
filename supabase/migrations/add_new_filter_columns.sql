-- Add new filter columns to user_preferences table
-- Run this migration to enable marital status, children, and religiosity filters

-- Add marital_status_preferences column (array of strings)
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS marital_status_preferences text[] DEFAULT NULL;

-- Add children_preferences column (array of strings: 'yes', 'no')
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS children_preferences text[] DEFAULT NULL;

-- Add religiosity_preferences column (array of strings)
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS religiosity_preferences text[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.marital_status_preferences IS 'Array of acceptable marital statuses: Never Married, Divorced, Widowed, Annulled';
COMMENT ON COLUMN user_preferences.children_preferences IS 'Array of children preferences: yes (has children), no (no children)';
COMMENT ON COLUMN user_preferences.religiosity_preferences IS 'Array of acceptable religiosity levels: very_practicing, practicing, moderately_practicing, not_practicing';


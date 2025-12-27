-- Add notification preference column to user_preferences table

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.user_preferences.notifications_enabled IS 'Master toggle for all push notifications';

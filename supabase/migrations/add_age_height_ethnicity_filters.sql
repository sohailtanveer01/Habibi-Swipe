-- Add age, height, and ethnicity filter columns
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS age_min INTEGER,
ADD COLUMN IF NOT EXISTS age_max INTEGER,
ADD COLUMN IF NOT EXISTS height_min_cm INTEGER,
ADD COLUMN IF NOT EXISTS height_max_cm INTEGER,
ADD COLUMN IF NOT EXISTS ethnicity_preferences TEXT[];


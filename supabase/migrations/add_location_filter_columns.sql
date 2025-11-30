-- Add new columns for location filter types
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS location_filter_type TEXT DEFAULT 'distance',
ADD COLUMN IF NOT EXISTS search_radius_miles INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS search_country TEXT;

-- Update existing search_radius_km to search_radius_miles (convert km to miles)
UPDATE public.user_preferences
SET search_radius_miles = ROUND(search_radius_km * 0.621371)
WHERE search_radius_km IS NOT NULL AND search_radius_miles IS NULL;


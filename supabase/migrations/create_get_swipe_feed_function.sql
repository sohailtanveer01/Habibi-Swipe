-- Create a Postgres function to get swipe feed with location filtering
CREATE OR REPLACE FUNCTION get_swipe_feed_profiles(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_search_location GEOGRAPHY DEFAULT NULL,
  p_search_radius_meters INTEGER DEFAULT 50000
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  name TEXT,
  photos TEXT[],
  dob DATE,
  height TEXT,
  marital_status TEXT,
  has_children BOOLEAN,
  gender TEXT,
  sect TEXT,
  born_muslim BOOLEAN,
  religious_practice TEXT,
  alcohol_habit TEXT,
  smoking_habit TEXT,
  ethnicity TEXT,
  nationality TEXT,
  education TEXT,
  profession TEXT,
  bio TEXT,
  location GEOGRAPHY,
  verified BOOLEAN,
  last_active_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.name,
    u.photos,
    u.dob,
    u.height,
    u.marital_status,
    u.has_children,
    u.gender,
    u.sect,
    u.born_muslim,
    u.religious_practice,
    u.alcohol_habit,
    u.smoking_habit,
    u.ethnicity,
    u.nationality,
    u.education,
    u.profession,
    u.bio,
    u.location,
    u.verified,
    u.last_active_at
  FROM users u
  WHERE 
    u.id != p_user_id
    AND u.id NOT IN (
      SELECT swiped_id FROM swipes WHERE swiper_id = p_user_id
    )
    AND u.photos IS NOT NULL
    AND array_length(u.photos, 1) > 0
    AND (
      -- Location filter: if search_location is provided, filter by distance
      p_search_location IS NULL
      OR u.location IS NULL
      OR ST_DWithin(
        u.location::geography,
        p_search_location::geography,
        p_search_radius_meters
      )
    )
  ORDER BY u.last_active_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_swipe_feed_profiles TO authenticated;


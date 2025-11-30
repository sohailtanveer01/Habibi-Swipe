-- Create profile_views table
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_view CHECK (viewer_id != viewed_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_id_created_at 
  ON profile_views(viewed_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_viewed 
  ON profile_views(viewer_id, viewed_id);

-- Enable RLS
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert views (when they view someone else's profile)
CREATE POLICY "Users can create profile views"
ON profile_views
FOR INSERT
WITH CHECK (
  auth.uid() = viewer_id
  AND auth.uid() != viewed_id
);

-- Policy: Users can view who has seen their profile
CREATE POLICY "Users can view their own profile views"
ON profile_views
FOR SELECT
USING (
  auth.uid() = viewed_id
);

-- Policy: Users can see their own viewing history (optional - for future use)
CREATE POLICY "Users can view their own viewing history"
ON profile_views
FOR SELECT
USING (
  auth.uid() = viewer_id
);


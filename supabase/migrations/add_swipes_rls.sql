-- Enable RLS on swipes table if not already enabled
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view swipes where they are the swiper (swipes they made)
CREATE POLICY "Users can view their own swipes"
ON swipes
FOR SELECT
USING (
  auth.uid() = swiper_id
);

-- Policy: Users can view swipes where they are the swiped (who swiped on them)
CREATE POLICY "Users can view swipes on them"
ON swipes
FOR SELECT
USING (
  auth.uid() = swiped_id
);

-- Policy: Users can insert their own swipes (when they swipe on someone)
CREATE POLICY "Users can create their own swipes"
ON swipes
FOR INSERT
WITH CHECK (
  auth.uid() = swiper_id
  AND auth.uid() != swiped_id
);


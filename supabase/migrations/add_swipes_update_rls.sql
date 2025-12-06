-- Add UPDATE policy for swipes table
-- This allows users to update their own swipes (e.g., change from "like" to "pass" to unlike someone)

CREATE POLICY "Users can update their own swipes"
ON swipes
FOR UPDATE
USING (
  auth.uid() = swiper_id
)
WITH CHECK (
  auth.uid() = swiper_id
  AND auth.uid() != swiped_id
);


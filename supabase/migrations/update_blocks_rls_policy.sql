-- Update RLS policy to allow users to view blocks where they are either blocker or blocked
-- This is needed so users can see if someone has blocked them

-- Drop the old policy
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.blocks;

-- Create new policy that allows viewing blocks where user is blocker OR blocked
CREATE POLICY "Users can view blocks they are part of"
ON public.blocks
FOR SELECT
USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);


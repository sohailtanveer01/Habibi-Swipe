-- Enable RLS on matches table if not already enabled
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists (to allow re-running migration)
DROP POLICY IF EXISTS "Users can create matches when accepting rematch" ON public.matches;

-- Policy: Users can create matches when accepting a rematch
-- This allows users to create a match if they are accepting a pending rematch request
-- Note: This assumes you already have policies for viewing matches and creating matches during swiping
CREATE POLICY "Users can create matches when accepting rematch"
ON public.matches
FOR INSERT
WITH CHECK (
  -- User must be part of the match being created
  (auth.uid() = user1 OR auth.uid() = user2)
  AND
  -- There must be a pending rematch request in unmatches table for these two users
  EXISTS (
    SELECT 1 FROM public.unmatches
    WHERE (
      (unmatches.user1_id = user1 AND unmatches.user2_id = user2)
      OR
      (unmatches.user1_id = user2 AND unmatches.user2_id = user1)
    )
    AND unmatches.rematch_status = 'pending'
    AND unmatches.rematch_requested_by != auth.uid() -- User is accepting, not requesting
    AND (unmatches.user1_id = auth.uid() OR unmatches.user2_id = auth.uid())
  )
);


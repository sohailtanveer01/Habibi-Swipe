-- Add rematch request fields to unmatches table
ALTER TABLE public.unmatches
ADD COLUMN IF NOT EXISTS rematch_requested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS rematch_status TEXT CHECK (rematch_status IN ('pending', 'accepted', 'rejected')) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rematch_requested_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for rematch queries
CREATE INDEX IF NOT EXISTS idx_unmatches_rematch_status ON public.unmatches(rematch_status);
CREATE INDEX IF NOT EXISTS idx_unmatches_rematch_requested_by ON public.unmatches(rematch_requested_by);

-- Add policy for updating rematch status
CREATE POLICY "Users can update rematch status"
ON public.unmatches
FOR UPDATE
USING (auth.uid() = user1_id OR auth.uid() = user2_id)
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Update comment
COMMENT ON TABLE public.unmatches IS 'Tracks unmatched users with rematch request status - preserves match_id for message history access';


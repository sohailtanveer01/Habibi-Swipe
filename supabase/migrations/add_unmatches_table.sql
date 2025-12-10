-- Create unmatches table to track unmatched users
CREATE TABLE IF NOT EXISTS public.unmatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL, -- The original match_id (for reference to messages)
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unmatched_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Who initiated the unmatch
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, user1_id, user2_id) -- Prevent duplicate unmatches for same match
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_unmatches_user1_id ON public.unmatches(user1_id);
CREATE INDEX IF NOT EXISTS idx_unmatches_user2_id ON public.unmatches(user2_id);
CREATE INDEX IF NOT EXISTS idx_unmatches_match_id ON public.unmatches(match_id);

-- Enable RLS
ALTER TABLE public.unmatches ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view unmatches they are part of
CREATE POLICY "Users can view their own unmatches"
ON public.unmatches
FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Policy: Users can create unmatches (when they unmatch)
CREATE POLICY "Users can create unmatches"
ON public.unmatches
FOR INSERT
WITH CHECK (auth.uid() = unmatched_by AND (auth.uid() = user1_id OR auth.uid() = user2_id));

-- Add comment
COMMENT ON TABLE public.unmatches IS 'Tracks unmatched users - preserves match_id for message history access';


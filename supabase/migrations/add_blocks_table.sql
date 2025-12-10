-- Create blocks table to track blocked users
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id) -- Prevent duplicate blocks
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON public.blocks(blocked_id);

-- Enable RLS
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own blocks
CREATE POLICY "Users can view their own blocks"
ON public.blocks
FOR SELECT
USING (auth.uid() = blocker_id);

-- Policy: Users can block other users
CREATE POLICY "Users can block other users"
ON public.blocks
FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

-- Policy: Users can unblock (delete) their own blocks
CREATE POLICY "Users can unblock their own blocks"
ON public.blocks
FOR DELETE
USING (auth.uid() = blocker_id);

-- Add comment
COMMENT ON TABLE public.blocks IS 'Tracks which users have blocked which other users';


-- Create compliments table to track compliment messages sent before matching
CREATE TABLE IF NOT EXISTS public.compliments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) <= 200), -- Character limit: 200
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ DEFAULT NULL,
  declined_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE(sender_id, recipient_id) -- Prevent multiple compliments from same sender to same recipient
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_compliments_sender_id ON public.compliments(sender_id);
CREATE INDEX IF NOT EXISTS idx_compliments_recipient_id ON public.compliments(recipient_id);
CREATE INDEX IF NOT EXISTS idx_compliments_status ON public.compliments(status);
CREATE INDEX IF NOT EXISTS idx_compliments_recipient_status ON public.compliments(recipient_id, status);

-- Enable RLS
ALTER TABLE public.compliments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view compliments they sent or received
CREATE POLICY "Users can view their own compliments"
ON public.compliments
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Policy: Users can send compliments
CREATE POLICY "Users can send compliments"
ON public.compliments
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Policy: Recipients can update compliment status (accept/decline)
CREATE POLICY "Recipients can update compliment status"
ON public.compliments
FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Add comment
COMMENT ON TABLE public.compliments IS 'Tracks compliment messages sent before matching - allows users to send one message to someone they like before matching';


-- Enable RLS on matches table if not already enabled
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can create matches when accepting compliment" ON public.matches;

-- Create policy for accepting compliments
CREATE POLICY "Users can create matches when accepting compliment"
ON public.matches
FOR INSERT
WITH CHECK (
  (auth.uid() = user1 OR auth.uid() = user2)
  AND EXISTS (
    SELECT 1 
    FROM public.compliments
    WHERE (
      (compliments.sender_id = user1 AND compliments.recipient_id = user2)
      OR (compliments.sender_id = user2 AND compliments.recipient_id = user1)
    )
    AND compliments.status = 'pending'
    AND compliments.recipient_id = auth.uid()
  )
);


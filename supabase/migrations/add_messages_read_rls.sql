-- Enable RLS on messages table if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can update the 'read' status of messages they receive
-- (messages where they are part of the match but not the sender)
CREATE POLICY "Users can mark received messages as read"
ON messages
FOR UPDATE
USING (
  -- User must be part of the match
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = messages.match_id
    AND (matches.user1 = auth.uid() OR matches.user2 = auth.uid())
  )
  -- User must not be the sender (can only mark messages they received as read)
  AND messages.sender_id != auth.uid()
)
WITH CHECK (
  -- Only allow updating the 'read' column
  -- Ensure user is still part of the match
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = messages.match_id
    AND (matches.user1 = auth.uid() OR matches.user2 = auth.uid())
  )
  AND messages.sender_id != auth.uid()
);

-- Policy: Users can read all messages in their matches
CREATE POLICY "Users can read messages in their matches"
ON messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = messages.match_id
    AND (matches.user1 = auth.uid() OR matches.user2 = auth.uid())
  )
);

-- Policy: Users can insert messages in their matches
CREATE POLICY "Users can insert messages in their matches"
ON messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = messages.match_id
    AND (matches.user1 = auth.uid() OR matches.user2 = auth.uid())
  )
  AND messages.sender_id = auth.uid()
);


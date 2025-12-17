-- Add RLS policies to allow users to receive real-time events for swipes on them
-- These policies ensure that when someone swipes on a user (INSERT) or updates a swipe (UPDATE),
-- the swiped user can receive the real-time event through postgres_changes subscriptions
--
-- IMPORTANT: Real-time subscriptions in Supabase require SELECT permission to read rows.
-- When a row is INSERTed or UPDATEd, Supabase checks SELECT policies to determine if
-- the user should receive the real-time event. Therefore, we need SELECT policies
-- that allow users to read swipes where they are the swiped_id.

-- Policy: Users can receive realtime for swipes on them - INSERT
-- This allows users to see when someone swipes on them in real-time (INSERT events)
DROP POLICY IF EXISTS "Users can receive realtime for swipes on them - INSERT" ON swipes;

CREATE POLICY "Users can receive realtime for swipes on them - INSERT"
ON swipes
FOR SELECT
USING (
  auth.uid() = swiped_id
);

-- Policy: Users can receive realtime for swipes on them - UPDATE
-- This allows users to see when someone updates a swipe on them in real-time (UPDATE events)
-- Note: UPDATE events also require SELECT permission to read the updated row
DROP POLICY IF EXISTS "Users can receive realtime for swipes on them - UPDATE" ON swipes;

CREATE POLICY "Users can receive realtime for swipes on them - UPDATE"
ON swipes
FOR SELECT
USING (
  auth.uid() = swiped_id
);

-- Note: Both policies use FOR SELECT because real-time subscriptions need SELECT permission
-- to read the row data when INSERT or UPDATE events occur. The USING clause ensures
-- users can only receive events for swipes where they are the swiped_id.

-- Verify the policies exist:
-- SELECT * FROM pg_policies WHERE tablename = 'swipes' AND policyname LIKE '%realtime%';


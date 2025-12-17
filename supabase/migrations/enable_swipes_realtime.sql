-- Enable real-time replication for swipes table
-- This allows real-time subscriptions to work for INSERT/UPDATE events
-- This is needed for the likes notification feature

-- Add swipes table to the replication publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.swipes;

-- Verify the table is in the publication (this is just for reference, won't run if already added)
-- You can check with: SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'swipes';


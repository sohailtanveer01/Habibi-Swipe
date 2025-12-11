-- Enable real-time replication for compliments table
-- This allows real-time subscriptions to work for INSERT/UPDATE events

-- Add compliments table to the replication publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.compliments;

-- Verify the table is in the publication (this is just for reference, won't run if already added)
-- You can check with: SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';


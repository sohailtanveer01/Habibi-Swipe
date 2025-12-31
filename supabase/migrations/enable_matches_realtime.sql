-- Enable real-time replication for matches and swipes
-- This fixes the CHANNEL_ERROR in the app logs

-- Add matches table if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'matches'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
    END IF;

    -- Also re-ensure swipes is present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'swipes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.swipes;
    END IF;
END $$;

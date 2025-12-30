-- Migration: Refactor foreign keys to reference public.users instead of auth.users
-- This ensures consistency across the schema and supports our manual account deletion flow.

DO $$
BEGIN
    -- 1. REFACTOR COMPLIMENTS TABLE
    -- Drop existing foreign keys to auth.users if they exist
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'compliments_sender_id_fkey') THEN
        ALTER TABLE public.compliments DROP CONSTRAINT compliments_sender_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'compliments_recipient_id_fkey') THEN
        ALTER TABLE public.compliments DROP CONSTRAINT compliments_recipient_id_fkey;
    END IF;

    -- Add new foreign keys to public.users (aliased as users)
    ALTER TABLE public.compliments
        ADD CONSTRAINT compliments_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE,
        ADD CONSTRAINT compliments_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


    -- 2. REFACTOR BLOCKS TABLE
    -- Drop existing foreign keys to auth.users if they exist
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'blocks_blocker_id_fkey') THEN
        ALTER TABLE public.blocks DROP CONSTRAINT blocks_blocker_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'blocks_blocked_id_fkey') THEN
        ALTER TABLE public.blocks DROP CONSTRAINT blocks_blocked_id_fkey;
    END IF;

    -- Add new foreign keys to public.users
    ALTER TABLE public.blocks
        ADD CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.users(id) ON DELETE CASCADE,
        ADD CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.users(id) ON DELETE CASCADE;


    -- 3. REFACTOR UNMATCHES TABLE
    -- Drop existing foreign keys to auth.users if they exist
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'unmatches_user1_id_fkey') THEN
        ALTER TABLE public.unmatches DROP CONSTRAINT unmatches_user1_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'unmatches_user2_id_fkey') THEN
        ALTER TABLE public.unmatches DROP CONSTRAINT unmatches_user2_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'unmatches_unmatched_by_fkey') THEN
        ALTER TABLE public.unmatches DROP CONSTRAINT unmatches_unmatched_by_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'unmatches_rematch_requested_by_fkey') THEN
        ALTER TABLE public.unmatches DROP CONSTRAINT unmatches_rematch_requested_by_fkey;
    END IF;

    -- Add new foreign keys to public.users
    ALTER TABLE public.unmatches
        ADD CONSTRAINT unmatches_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES public.users(id) ON DELETE CASCADE,
        ADD CONSTRAINT unmatches_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES public.users(id) ON DELETE CASCADE,
        ADD CONSTRAINT unmatches_unmatched_by_fkey FOREIGN KEY (unmatched_by) REFERENCES public.users(id) ON DELETE CASCADE,
        ADD CONSTRAINT unmatches_rematch_requested_by_fkey FOREIGN KEY (rematch_requested_by) REFERENCES public.users(id) ON DELETE CASCADE;

END $$;

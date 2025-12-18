-- Boosts: 30-minute visibility boost for a user's profile

-- Needed for exclusion constraint on (user_id, tstzrange)
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.profile_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure a user cannot have overlapping boosts (=> only one active at a time)
-- This also prevents creating a second boost while one is active.
ALTER TABLE public.profile_boosts
  ADD CONSTRAINT profile_boosts_no_overlap_per_user
  EXCLUDE USING gist (
    user_id WITH =,
    tstzrange(started_at, expires_at, '[)') WITH &&
  );

-- Helpful indexes
CREATE INDEX IF NOT EXISTS profile_boosts_user_id_idx ON public.profile_boosts (user_id);
CREATE INDEX IF NOT EXISTS profile_boosts_expires_at_idx ON public.profile_boosts (expires_at DESC);

-- RLS
ALTER TABLE public.profile_boosts ENABLE ROW LEVEL SECURITY;

-- Users can read their own boosts (for countdown/history)
CREATE POLICY "profile_boosts_select_own"
  ON public.profile_boosts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can read active boosts of others (needed to rank the feed)
CREATE POLICY "profile_boosts_select_active"
  ON public.profile_boosts
  FOR SELECT
  TO authenticated
  USING (expires_at > now());

-- Users can insert their own boost (RPC uses auth.uid() anyway; keep policy for safety)
CREATE POLICY "profile_boosts_insert_own"
  ON public.profile_boosts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());



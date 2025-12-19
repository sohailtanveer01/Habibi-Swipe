-- Store Expo push tokens for each user/device

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT,
  device_name TEXT,
  revoked BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicates per user
CREATE UNIQUE INDEX IF NOT EXISTS user_push_tokens_user_token_uniq
  ON public.user_push_tokens (user_id, token);

CREATE INDEX IF NOT EXISTS user_push_tokens_user_id_idx
  ON public.user_push_tokens (user_id);

CREATE INDEX IF NOT EXISTS user_push_tokens_active_idx
  ON public.user_push_tokens (user_id, revoked, last_seen_at DESC);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read their own tokens
CREATE POLICY "user_push_tokens_select_own"
  ON public.user_push_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own token
CREATE POLICY "user_push_tokens_insert_own"
  ON public.user_push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own token rows (refresh last_seen_at / revoke)
CREATE POLICY "user_push_tokens_update_own"
  ON public.user_push_tokens
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


